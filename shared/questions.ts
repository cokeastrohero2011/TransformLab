import { applySteps, applyPolygon, explainPoint, formatPoint, formatTransform, type Point, type Polygon, type Transform } from './geometry';
export type Mode='identify'|'draw'|'parameter'|'combined';
export type Difficulty='easy'|'medium'|'hard'|'mixed';
export type PublicQuestion={id:string;mode:Mode;difficulty:Difficulty;type:string;prompt:string;shape:Polygon;image?:Polygon;steps?:Transform[];marks:number;hint:string[];viewport:{minX:number;maxX:number;minY:number;maxY:number};isSample?:boolean};
export type Solution={steps:Transform[];image:Polygon;explanation:string[]};
const int=(min:number,max:number)=>Math.floor(Math.random()*(max-min+1))+min;
const pick=<T,>(a:T[])=>a[int(0,a.length-1)];
const base:Polygon=[{x:-3,y:1},{x:-2,y:4},{x:0,y:2}];
const sample:Polygon=[{x:-3,y:2},{x:-3,y:6},{x:-1,y:2}];
const shapes:Polygon[]=[base,[{x:-4,y:-1},{x:-3,y:2},{x:-1,y:1}],[{x:-4,y:0},{x:-2,y:2},{x:0,y:1},{x:-1,y:-2}]];
const lineOptions=[{a:1,b:0,c:0},{a:1,b:0,c:-2},{a:0,b:1,c:0},{a:0,b:1,c:3},{a:1,b:-1,c:0},{a:1,b:1,c:0}];
export function randomTransform(type:Transform['type'], difficulty:Difficulty):Transform {
 const hard=difficulty==='hard'||difficulty==='mixed';
 if(type==='translation') {let dx=int(-5,5),dy=int(-5,5);if(dx===0&&dy===0)dx=2;return {type,dx,dy};}
 if(type==='reflection')return {type,line:pick(difficulty==='easy'?lineOptions.slice(0,4):lineOptions)};
 if(type==='rotation')return {type,angle:pick([90,180,270] as const),direction:pick(['clockwise','anticlockwise'] as const),center:hard?{x:int(-2,2),y:int(-2,2)}:{x:0,y:0}};
 return {type,scale:pick(hard?[-2,-0.5,0.5,2]:[0.5,2]),center:hard?{x:int(-2,2),y:int(-2,2)}:{x:0,y:0}};
}
export function solutionFor(shape:Polygon,steps:Transform[]):Solution {
 let current=shape;const explanation:string[]=[];
 steps.forEach((t,i)=>{ const next=applyPolygon(current,t);explanation.push(`${steps.length>1?`Step ${i+1}: `:''}${formatTransform(t)}.`);current.forEach((p,j)=>explanation.push(`${String.fromCharCode(65+j)}: ${explainPoint(p,t)}`));current=next; });
 return {steps,image:current,explanation};
}
export function generateQuestion(mode:Mode,difficulty:Difficulty='mixed',forcedType?:Transform['type'],samplePart?:'a'|'b'|'c'):{question:PublicQuestion;solution:Solution} {
 const id=crypto.randomUUID(); let shape=pick(shapes).map(p=>({...p})); let steps:Transform[];
 if(samplePart){shape=sample;steps=[samplePart==='a'?{type:'reflection',line:{a:1,b:0,c:-1}}:samplePart==='b'?{type:'translation',dx:-3,dy:1}:{type:'enlargement',scale:-0.5,center:{x:3,y:0}}];mode='draw';}
 else if(mode==='combined') steps=[randomTransform(pick(['translation','reflection'] as const),difficulty),randomTransform(pick(['rotation','enlargement'] as const),difficulty)];
 else steps=[randomTransform(forcedType??pick(['translation','reflection','rotation','enlargement'] as const),difficulty)];
 const solution=solutionFor(shape,steps); const type=steps.length===2?'combined':steps[0].type;
 const marks=mode==='identify'? (type==='translation'?2:type==='reflection'?2:3):mode==='parameter'?2:shape.length;
 const prompt=mode==='identify'?'Describe fully the single transformation that maps shape A onto shape B.':mode==='parameter'?`Find the missing parameter: ${parameterPrompt(steps[0])}`:steps.length===2?`Draw the image after these transformations in order: (1) ${formatTransform(steps[0])}; (2) ${formatTransform(steps[1])}.`:`On the grid, draw the image of shape A after ${formatTransform(steps[0]).toLowerCase()}.`;
 const hint=mode==='identify'?['Compare orientation, size and the movement of corresponding vertices.','Check whether corresponding sides are parallel and equal; then test a transformation center or line.',`Start with vertex A ${formatPoint(shape[0])} and its image ${formatPoint(solution.image[0])}.`]:['Follow one vertex at a time, starting with A.','Use the transformation rule on every coordinate.',`The image of A lies at ${formatPoint(solution.image[0])}.`];
 const allPoints=[...shape,...solution.image];const viewport={minX:Math.min(...allPoints.map(p=>p.x)),maxX:Math.max(...allPoints.map(p=>p.x)),minY:Math.min(...allPoints.map(p=>p.y)),maxY:Math.max(...allPoints.map(p=>p.y))};
 const question:PublicQuestion={id,mode,difficulty,type,prompt,shape,viewport,image:mode==='identify'||mode==='parameter'?solution.image:undefined,steps:mode==='draw'||mode==='combined'?steps:undefined,marks,hint,isSample:!!samplePart};
 return {question,solution};
}
function parameterPrompt(t:Transform){if(t.type==='translation')return 'give the horizontal and vertical components of the translation vector.';if(t.type==='rotation')return `the rotation is ${t.angle}° ${t.direction}; give its center.`;if(t.type==='enlargement')return `the center is ${formatPoint(t.center)}; give the scale factor.`;return 'give the equation of the mirror line.';}
