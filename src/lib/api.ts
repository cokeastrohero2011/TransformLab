import type {Answer} from '../../shared/checker';
import type {PublicQuestion,Difficulty,Mode,Solution} from '../../shared/questions';
import type {Polygon,Transform} from '../../shared/geometry';
export type AttemptResult={id:string;questionId:string;marks:number;maxMarks:number;feedback:string[];solution:Solution;completedAt:string};
export type Progress={attempted:number;correct:number;accuracy:number;marksEarned:number;marksAvailable:number;currentStreak:number;bestStreak:number;byTransformation:{transformation_type:string;questions_attempted:number;questions_correct:number;marks_awarded:number;marks_available:number}[];examHistory:{id:string;started_at:string;completed_at:string;total_marks:number;marks_awarded:number;difficulty:string}[];recentMistakes:{id:string;question_data:PublicQuestion;mistake_category:string;marks_awarded:number;maximum_marks:number;completed_at:string}[]};
export type Exam={id:string;durationSeconds:number|null;totalMarks:number;questions:PublicQuestion[]};
export type ExamResult={id:string;totalMarks:number;marksAwarded:number;status:string;questions:{question:PublicQuestion;solution:Solution;answer:Answer|null;marks:number;maxMarks:number;feedback:string[]}[]};
async function request<T>(path:string,init?:RequestInit):Promise<T>{
 const res=await fetch(path,{...init,headers:{...(init?.body instanceof FormData?{}:{'content-type':'application/json'}),...(init?.method&&init.method!=='GET'?{'x-transformlab-request':'1'}:{}),...init?.headers}});
 if(!res.ok){let message=`Request failed (${res.status})`;try{message=((await res.json()) as {error?:string}).error||message;}catch{}throw new Error(message);}
 return res.json() as Promise<T>;
}
const post=<T>(path:string,data:unknown)=>request<T>(path,{method:'POST',body:JSON.stringify(data)});
export const api={
 question:(mode:Mode,difficulty:Difficulty)=>request<PublicQuestion>(`/api/question?mode=${mode}&difficulty=${difficulty}`),
 solution:(id:string)=>request<Solution>(`/api/questions/${id}/solution`),
 retryQuestion:(id:string)=>post<PublicQuestion>(`/api/questions/${id}/retry`,{}),
 submit:(questionId:string,answer:Answer,timeSpentSeconds:number,idempotencyKey:string)=>post<AttemptResult>('/api/practice/submit',{questionId,answer,timeSpentSeconds,idempotencyKey}),
 progress:()=>request<Progress>('/api/progress'),
 history:()=>request<unknown[]>('/api/practice/history'),
 reset:()=>post<{reset:boolean}>('/api/progress/reset',{confirm:'RESET'}),
 settings:()=>request<{preferredDifficulty?:Difficulty;timerEnabled?:boolean}>('/api/settings'),
 saveSetting:(key:'preferredDifficulty'|'timerEnabled',value:Difficulty|boolean)=>request<{saved:boolean}>('/api/settings',{method:'PUT',body:JSON.stringify({key,value})}),
 createExam:(difficulty:Difficulty,durationSeconds:number|null)=>post<Exam>('/api/exams',{difficulty,durationSeconds}),
 examAnswer:(id:string,questionId:string,answer:Answer,timeSpentSeconds:number,idempotencyKey:string)=>post<{saved:boolean}>(`/api/exams/${id}/answer`,{questionId,answer,timeSpentSeconds,idempotencyKey}),
 completeExam:(id:string,elapsedSeconds:number)=>post<ExamResult>(`/api/exams/${id}/complete`,{elapsedSeconds}),
 saveVisualization:(title:string,shape:Polygon,transform:Transform)=>post<{id:string}>('/api/visualizations',{title,shape,transform}),
 visualizations:()=>request<{id:string;title:string;shape_data:Polygon;transformation_data:Transform}[]>('/api/visualizations'),
 upload:async(file:File,kind:string)=>{const form=new FormData();form.append('file',file);form.append('kind',kind);return request<{id:string;filename:string}>('/api/files',{method:'POST',body:form});},
 files:()=>request<{id:string;filename:string;kind:string}[]>('/api/files')
};
