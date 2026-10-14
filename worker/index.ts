import { checkAnswer, type Answer } from '../shared/checker';
import { generateQuestion, type Difficulty, type Mode, type PublicQuestion, type Solution } from '../shared/questions';
import { validPoint, validPolygon, validTransform } from '../shared/geometry';
interface Env { DB:D1Database; ASSETS:Fetcher }
const FILE_CHUNK_BYTES=512*1024;
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const bad=(message:string,status=400)=>json({error:message},status);
const parsed=(v:string)=>JSON.parse(v);
const isMode=(v:string):v is Mode=>['identify','draw','parameter','combined'].includes(v);
const isDifficulty=(v:string):v is Difficulty=>['easy','medium','hard','mixed'].includes(v);
const seconds=(v:unknown)=>Number.isInteger(v)&&Number(v)>=0&&Number(v)<=7200?Number(v):0;
const safeText=(v:unknown,max=100)=>typeof v==='string'&&v.trim().length>0&&v.length<=max?v.trim():null;
const validNumber=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=100;
function validAnswer(a:unknown):a is Answer {
 if(!a||typeof a!=='object')return false; const x=a as Record<string,unknown>;
 if(x.type!==undefined&&!['translation','reflection','rotation','enlargement'].includes(String(x.type)))return false;
 for(const k of ['dx','dy','angle','scale'] as const)if(x[k]!==undefined&&!validNumber(x[k]))return false;
 if(x.center!==undefined&&!validPoint(x.center))return false;
 if(x.line!==undefined&&(typeof x.line!=='string'||x.line.length>30))return false;
 if(x.direction!==undefined&&!['clockwise','anticlockwise'].includes(String(x.direction)))return false;
 if(x.points!==undefined&&!validPolygon(x.points))return false;
 return true;
}
async function body(req:Request){const ct=req.headers.get('content-type')||'';if(!ct.includes('application/json'))throw new Error('Expected JSON');const raw=await req.text();if(raw.length>20000)throw new Error('Request too large');return JSON.parse(raw) as Record<string,unknown>;}
function validateMutation(req:Request):boolean{
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return false;
 return req.headers.get('x-transformlab-request')==='1';
}
async function createQuestion(env:Env,mode:Mode,difficulty:Difficulty){
 const generated=generateQuestion(mode,difficulty);
 await env.DB.prepare('INSERT INTO practice_questions(id,mode,difficulty,transformation_type,public_data,solution_data) VALUES(?,?,?,?,?,?)').bind(generated.question.id,generated.question.mode,difficulty,generated.question.type,JSON.stringify(generated.question),JSON.stringify(generated.solution)).run();
 return generated.question;
}
async function getQuestion(env:Env,id:string){return env.DB.prepare('SELECT public_data,solution_data FROM practice_questions WHERE id=?').bind(id).first<{public_data:string;solution_data:string}>();}
async function api(req:Request,env:Env,url:URL):Promise<Response>{
 const path=url.pathname,method=req.method;
 if(path==='/api/health'&&method==='GET')return json({ok:true});
 if(path==='/api/question'&&method==='GET'){
  const mode=url.searchParams.get('mode')||'identify',difficulty=url.searchParams.get('difficulty')||'mixed';
  if(!isMode(mode)||!isDifficulty(difficulty)||url.searchParams.has('samplePart'))return bad('Invalid question options');
  return json(await createQuestion(env,mode,difficulty));
 }
 const retryMatch=/^\/api\/questions\/([a-f0-9-]{36})\/retry$/.exec(path);
 if(retryMatch&&method==='POST'){
  const row=await getQuestion(env,retryMatch[1]) || await env.DB.prepare('SELECT question_data AS public_data,solution_data FROM exam_questions WHERE id=?').bind(retryMatch[1]).first<{public_data:string;solution_data:string}>();if(!row)return bad('Question not found',404);
  const original=parsed(row.public_data) as PublicQuestion;
  const question={...original,id:crypto.randomUUID()};
  await env.DB.prepare('INSERT INTO practice_questions(id,mode,difficulty,transformation_type,public_data,solution_data) VALUES(?,?,?,?,?,?)').bind(question.id,question.mode,question.difficulty,question.type,JSON.stringify(question),row.solution_data).run();
  return json(question,201);
 }
 const solMatch=/^\/api\/questions\/([a-f0-9-]{36})\/solution$/.exec(path);
 if(solMatch&&method==='GET'){
  const row=await getQuestion(env,solMatch[1]);return row?json(parsed(row.solution_data)):bad('Question not found',404);
 }
 if(path==='/api/practice/submit'&&method==='POST'){
  const x=await body(req),questionId=safeText(x.questionId,36),key=safeText(x.idempotencyKey,80);
  if(!questionId||!key||!validAnswer(x.answer))return bad('Invalid submission');
  const existing=await env.DB.prepare('SELECT * FROM practice_attempts WHERE idempotency_key=?').bind(key).first<Record<string,unknown>>();
  if(existing){if(existing.question_id!==questionId)return bad('Idempotency key already used',409);return json(attemptResponse(existing));}
  const row=await getQuestion(env,questionId);if(!row)return bad('Question not found',404);
  const q=parsed(row.public_data) as PublicQuestion,s=parsed(row.solution_data) as Solution;
  const mark=checkAnswer(q,s,x.answer);
  await env.DB.prepare('INSERT OR IGNORE INTO practice_attempts(id,idempotency_key,question_id,question_data,transformation_type,submitted_answer,correct_answer,marks_awarded,maximum_marks,mistake_category,feedback,time_spent_seconds) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),key,questionId,row.public_data,q.type,JSON.stringify(x.answer),row.solution_data,mark.marks,mark.maxMarks,mark.mistakeCategory,JSON.stringify(mark.feedback),seconds(x.timeSpentSeconds)).run();
  const saved=await env.DB.prepare('SELECT * FROM practice_attempts WHERE idempotency_key=?').bind(key).first<Record<string,unknown>>();
  return json(attemptResponse(saved!));
 }
 if(path==='/api/practice/history'&&method==='GET'){
  const rows=await env.DB.prepare('SELECT id,question_id,question_data,transformation_type,submitted_answer,marks_awarded,maximum_marks,mistake_category,feedback,completed_at FROM practice_attempts ORDER BY completed_at DESC LIMIT 100').all();
  return json(rows.results.map(r=>({...r,question_data:parsed(String(r.question_data)),submitted_answer:parsed(String(r.submitted_answer)),feedback:parsed(String(r.feedback))})));
 }
 if(path==='/api/exams'&&method==='POST'){
  const x=await body(req),difficulty=typeof x.difficulty==='string'&&isDifficulty(x.difficulty)?x.difficulty:'mixed';
  const duration=x.durationSeconds===null?null:Number.isInteger(x.durationSeconds)&&Number(x.durationSeconds)>=60&&Number(x.durationSeconds)<=7200?Number(x.durationSeconds):null;
  const modes:Mode[]=['identify','draw','parameter','combined','identify'];
  const types=['translation','reflection','rotation','enlargement'] as const;const first=types[Math.floor(Math.random()*types.length)];const other=types.filter(t=>t!==first);const last=other[Math.floor(Math.random()*other.length)];const qs=modes.map((mode,i)=>generateQuestion(mode,difficulty,i===0?first:i===4?last:undefined));const id=crypto.randomUUID(),total=qs.reduce((n,q)=>n+q.question.marks,0);
  await env.DB.batch([env.DB.prepare('INSERT INTO exam_sessions(id,duration_seconds,total_marks,difficulty) VALUES(?,?,?,?)').bind(id,duration,total,difficulty),...qs.map((q,i)=>env.DB.prepare('INSERT INTO exam_questions(id,exam_session_id,position,question_data,solution_data,maximum_marks) VALUES(?,?,?,?,?,?)').bind(q.question.id,id,i,JSON.stringify(q.question),JSON.stringify(q.solution),q.question.marks))]);
  return json({id,durationSeconds:duration,totalMarks:total,questions:qs.map(q=>q.question)},201);
 }
 const examMatch=/^\/api\/exams\/([a-f0-9-]{36})(?:\/(answer|complete|results))?$/.exec(path);
 if(examMatch){const [,id,action]=examMatch;
  const session=await env.DB.prepare('SELECT * FROM exam_sessions WHERE id=?').bind(id).first<Record<string,unknown>>();if(!session)return bad('Exam not found',404);
  if(!action&&method==='GET'){
   const rows=await env.DB.prepare('SELECT question_data FROM exam_questions WHERE exam_session_id=? ORDER BY position').bind(id).all();
   return json({id,status:session.status,durationSeconds:session.duration_seconds,totalMarks:session.total_marks,startedAt:session.started_at,questions:rows.results.map(r=>parsed(String(r.question_data)))});
  }
  if(action==='answer'&&method==='POST'){
   if(session.status!=='in_progress')return bad('Exam already completed',409);
   const x=await body(req),qid=safeText(x.questionId,36),key=safeText(x.idempotencyKey,80);
   if(!qid||!key||!validAnswer(x.answer))return bad('Invalid answer');
   const row=await env.DB.prepare('SELECT * FROM exam_questions WHERE id=? AND exam_session_id=?').bind(qid,id).first<Record<string,unknown>>();if(!row)return bad('Question not in exam',404);
   const existing=await env.DB.prepare('SELECT * FROM exam_answers WHERE exam_question_id=?').bind(qid).first<Record<string,unknown>>();if(existing)return existing.idempotency_key===key?json({saved:true}):bad('Question already answered',409);
   const q=parsed(String(row.question_data)) as PublicQuestion,s=parsed(String(row.solution_data)) as Solution,mark=checkAnswer(q,s,x.answer);
   await env.DB.prepare('INSERT OR IGNORE INTO exam_answers(id,exam_session_id,exam_question_id,idempotency_key,question_data,submitted_answer,marks_awarded,maximum_marks,feedback,time_spent_seconds,completed_at) VALUES(?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)').bind(crypto.randomUUID(),id,qid,key,row.question_data,JSON.stringify(x.answer),mark.marks,mark.maxMarks,JSON.stringify(mark.feedback),seconds(x.timeSpentSeconds)).run();
   return json({saved:true});
  }
  if(action==='complete'&&method==='POST'){
   if(session.status==='in_progress'){
    const x=await body(req); const elapsed=seconds(x.elapsedSeconds);
    await env.DB.prepare("UPDATE exam_sessions SET status='completed',completed_at=CURRENT_TIMESTAMP,marks_awarded=(SELECT COALESCE(SUM(marks_awarded),0) FROM exam_answers WHERE exam_session_id=?),duration_seconds=COALESCE(duration_seconds,?) WHERE id=? AND status='in_progress'").bind(id,elapsed,id).run();
   }
   return examResults(env,id);
  }
  if(action==='results'&&method==='GET')return session.status==='completed'?examResults(env,id):bad('Exam is still in progress',409);
 }
 if(path==='/api/exams'&&method==='GET'){
  const rows=await env.DB.prepare('SELECT id,started_at,completed_at,duration_seconds,total_marks,marks_awarded,status,difficulty FROM exam_sessions ORDER BY started_at DESC LIMIT 50').all();return json(rows.results);
 }
 if(path==='/api/progress'&&method==='GET'){
  const [attempts,stats,exams,mistakes]=await Promise.all([
   env.DB.prepare('SELECT marks_awarded,maximum_marks,completed_at FROM practice_attempts UNION ALL SELECT marks_awarded,maximum_marks,completed_at FROM exam_answers ORDER BY completed_at ASC').all(),
   env.DB.prepare('SELECT * FROM transformation_stats ORDER BY transformation_type').all(),
   env.DB.prepare("SELECT id,started_at,completed_at,total_marks,marks_awarded,difficulty FROM exam_sessions WHERE status='completed' ORDER BY completed_at DESC LIMIT 20").all(),
   env.DB.prepare("SELECT id,question_data,mistake_category,marks_awarded,maximum_marks,completed_at FROM practice_attempts WHERE marks_awarded<maximum_marks UNION ALL SELECT id,question_data,json_extract(question_data,'$.type') AS mistake_category,marks_awarded,maximum_marks,completed_at FROM exam_answers WHERE marks_awarded<maximum_marks ORDER BY completed_at DESC LIMIT 10").all()
  ]);
  const a=attempts.results;let streak=0,best=0;for(const r of a){streak=Number(r.marks_awarded)===Number(r.maximum_marks)?streak+1:0;best=Math.max(best,streak);}
  const earned=a.reduce((n,r)=>n+Number(r.marks_awarded),0),available=a.reduce((n,r)=>n+Number(r.maximum_marks),0);
  return json({attempted:a.length,correct:a.filter(r=>r.marks_awarded===r.maximum_marks).length,accuracy:available?Math.round(100*earned/available):0,marksEarned:earned,marksAvailable:available,currentStreak:streak,bestStreak:best,byTransformation:stats.results,examHistory:exams.results,recentMistakes:mistakes.results.map(r=>({...r,question_data:parsed(String(r.question_data))}))});
 }
 if(path==='/api/visualizations'&&method==='GET'){
  const rows=await env.DB.prepare('SELECT * FROM saved_visualizations ORDER BY created_at DESC LIMIT 100').all();return json(rows.results.map(r=>({...r,shape_data:parsed(String(r.shape_data)),transformation_data:parsed(String(r.transformation_data))})));
 }
 if(path==='/api/visualizations'&&method==='POST'){
  const x=await body(req),title=safeText(x.title,80);
  if(!title||!validPolygon(x.shape)||!validTransform(x.transform))return bad('Invalid visualization');
  const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO saved_visualizations(id,title,shape_data,transformation_data) VALUES(?,?,?,?)').bind(id,title,JSON.stringify(x.shape),JSON.stringify(x.transform)).run();return json({id},201);
 }
 if(path==='/api/settings'&&method==='GET'){
  const rows=await env.DB.prepare('SELECT key,value FROM app_settings').all();return json(Object.fromEntries(rows.results.map(r=>[String(r.key),parsed(String(r.value))])));
 }
 if(path==='/api/settings'&&method==='PUT'){
  const x=await body(req),key=safeText(x.key,40);if(!key||key==='preferredDifficulty'&&!(typeof x.value==='string'&&isDifficulty(x.value))||key==='timerEnabled'&&typeof x.value!=='boolean'||!['preferredDifficulty','timerEnabled'].includes(key))return bad('Invalid setting');
  await env.DB.prepare('INSERT INTO app_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify(x.value)).run();return json({saved:true});
 }
 if(path==='/api/files'&&method==='POST'){
  const form=await req.formData(),file=form.get('file'),kind=form.get('kind');
  if(!(file instanceof File)||!['diagram','reference','report','solution'].includes(String(kind)))return bad('Invalid file');
  const allowed=['image/png','image/jpeg','image/webp','image/svg+xml','application/pdf'];
  if(!allowed.includes(file.type)||file.size>10*1024*1024||file.size===0)return bad('Use a PNG, JPEG, WebP, SVG, or PDF under 10 MB');
  const id=crypto.randomUUID(),filename=file.name.slice(0,120).replace(/[\x00-\x1f\x7f"\\]/g,'_'),bytes=new Uint8Array(await file.arrayBuffer());
  const writes=[env.DB.prepare('INSERT INTO stored_files(id,object_key,filename,content_type,size_bytes,kind) VALUES(?,?,?,?,?,?)').bind(id,`d1/${id}`,filename,file.type,bytes.length,String(kind))];
  for(let offset=0,index=0;offset<bytes.length;offset+=FILE_CHUNK_BYTES,index++){
   writes.push(env.DB.prepare('INSERT INTO stored_file_chunks(file_id,chunk_index,data) VALUES(?,?,?)').bind(id,index,bytes.subarray(offset,offset+FILE_CHUNK_BYTES)));
  }
  await env.DB.batch(writes);
  return json({id,filename,kind},201);
 }
 if(path==='/api/files'&&method==='GET'){
  const rows=await env.DB.prepare('SELECT id,filename,content_type,size_bytes,kind,created_at FROM stored_files ORDER BY created_at DESC LIMIT 100').all();return json(rows.results);
 }
 const fileMatch=/^\/api\/files\/([a-f0-9-]{36})$/.exec(path);
 if(fileMatch&&method==='GET'){
  const row=await env.DB.prepare('SELECT * FROM stored_files WHERE id=?').bind(fileMatch[1]).first<Record<string,unknown>>();if(!row)return bad('File not found',404);
  const bytes=new Uint8Array(Number(row.size_bytes));let offset=0;
  for(let index=0;index<Math.ceil(bytes.length/FILE_CHUNK_BYTES);index++){
   const chunk=await env.DB.prepare('SELECT data FROM stored_file_chunks WHERE file_id=? AND chunk_index=?').bind(fileMatch[1],index).first<{data:number[]}>();
   if(!chunk||!Array.isArray(chunk.data)||chunk.data.length!==Math.min(FILE_CHUNK_BYTES,bytes.length-offset))return bad('File is incomplete',500);
   bytes.set(chunk.data,offset);offset+=chunk.data.length;
  }
  if(offset!==bytes.length)return bad('File is incomplete',500);
  return new Response(bytes,{headers:{'content-type':String(row.content_type),'content-disposition':`inline; filename="${String(row.filename).replace(/["\\]/g,'_')}"`,'cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':'sandbox'}});
 }
 if(path==='/api/progress/reset'&&method==='POST'){
  const x=await body(req);if(x.confirm!=='RESET')return bad('Type RESET to confirm');
  await env.DB.batch([env.DB.prepare('DELETE FROM exam_answers'),env.DB.prepare('DELETE FROM exam_questions'),env.DB.prepare('DELETE FROM exam_sessions'),env.DB.prepare('DELETE FROM practice_attempts'),env.DB.prepare('DELETE FROM transformation_stats'),env.DB.prepare('DELETE FROM saved_visualizations')]);
  return json({reset:true});
 }
 return bad('Not found',404);
}
function attemptResponse(r:Record<string,unknown>){const s=parsed(String(r.correct_answer)) as Solution;return {id:r.id,questionId:r.question_id,marks:Number(r.marks_awarded),maxMarks:Number(r.maximum_marks),feedback:parsed(String(r.feedback)),solution:s,incorrectVertices:[],completedAt:r.completed_at};}
async function examResults(env:Env,id:string){
 const session=await env.DB.prepare('SELECT * FROM exam_sessions WHERE id=?').bind(id).first<Record<string,unknown>>();
 const rows=await env.DB.prepare('SELECT q.position,q.question_data,q.solution_data,q.maximum_marks AS question_maximum_marks,a.submitted_answer,a.marks_awarded,a.maximum_marks,a.feedback FROM exam_questions q LEFT JOIN exam_answers a ON a.exam_question_id=q.id WHERE q.exam_session_id=? ORDER BY q.position').bind(id).all();
 return json({id,totalMarks:session?.total_marks,marksAwarded:session?.marks_awarded,status:session?.status,questions:rows.results.map(r=>({position:r.position,question:parsed(String(r.question_data)),solution:parsed(String(r.solution_data)),answer:r.submitted_answer?parsed(String(r.submitted_answer)):null,marks:Number(r.marks_awarded||0),maxMarks:Number(r.question_maximum_marks),feedback:r.feedback?parsed(String(r.feedback)):['Not answered']}))});
}
export default {async fetch(req:Request,env:Env):Promise<Response>{
 try{
  const url=new URL(req.url);
  if(url.pathname.startsWith('/api/')){
   if(!['GET','HEAD'].includes(req.method)&&!validateMutation(req))return bad('Request origin check failed',403);
   return await api(req,env,url);
  }
  return env.ASSETS.fetch(req);
 }catch(e){return bad(e instanceof SyntaxError?'Invalid JSON':e instanceof Error&&['Expected JSON','Request too large'].includes(e.message)?e.message:'Server error',e instanceof SyntaxError||e instanceof Error&&['Expected JSON','Request too large'].includes(e.message)?400:500);}
}} satisfies ExportedHandler<Env>;
