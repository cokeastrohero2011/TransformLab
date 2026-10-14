import { equivalentTransform, lineFromString, matchedVertices, near, pointNear, samePolygon, type Point, type Polygon, type Transform } from './geometry';
import type { PublicQuestion,Solution } from './questions';
export type Answer={type?:Transform['type'];dx?:number;dy?:number;line?:string;angle?:number;direction?:'clockwise'|'anticlockwise';center?:Point;scale?:number;points?:Polygon};
export type Marking={marks:number;maxMarks:number;correct:boolean;feedback:string[];mistakeCategory:string|null;incorrectVertices:number[]};
export function checkAnswer(q:PublicQuestion,s:Solution,a:Answer):Marking {
 const t=s.steps[0], feedback:string[]=[];let marks=0;const incorrectVertices:number[]=[];
 if(q.mode==='draw'||q.mode==='combined'){
  const points=Array.isArray(a.points)?a.points:[];const matches=matchedVertices(s.image,points);
  marks=samePolygon(s.image,points)?q.marks:Math.min(matches,q.marks-1);
  points.forEach((p,i)=>{if(!s.image.some(e=>pointNear(e,p)))incorrectVertices.push(i);});
  if(marks===q.marks) feedback.push('Every image vertex is correct. Vertex order is accepted in either direction.');
  else feedback.push(`${matches} of ${s.image.length} required image vertices are correctly placed. Check the highlighted points and the transformation rule.`);
 } else if(q.mode==='parameter'){
  if(t.type==='translation'){if(near(a.dx??NaN,t.dx))marks++;else feedback.push('The horizontal component is incorrect.');if(near(a.dy??NaN,t.dy))marks++;else feedback.push('The vertical component is incorrect.');}
  else if(t.type==='rotation'){if(a.center&&pointNear(a.center,t.center))marks=q.marks;else feedback.push('The center of rotation is incorrect.');}
  else if(t.type==='enlargement'){if(near(a.scale??NaN,t.scale))marks=q.marks;else feedback.push('The scale factor is incorrect.');}
  else {const line=a.line?lineFromString(a.line):null;if(line&&equivalentTransform({type:'reflection',line},t))marks=q.marks;else feedback.push('The mirror line is incorrect.');}
 }else{
  if(a.type===t.type){marks++;feedback.push('Transformation type: correct.');}else feedback.push(`Transformation type: ${a.type||'missing'} is incorrect.`);
  if(t.type==='translation'){
   if(near(a.dx??NaN,t.dx)&&near(a.dy??NaN,t.dy)){marks++;feedback.push('Translation vector: correct.');}else feedback.push('Translation vector: check both horizontal and vertical movement.');
  } else if(t.type==='reflection'){
   const line=a.line?lineFromString(a.line):null;if(line&&equivalentTransform({type:'reflection',line},t)){marks++;feedback.push('Mirror line: correct.');}else feedback.push('Mirror line: check perpendicular distances from corresponding vertices.');
  } else if(t.type==='rotation'){
   const inputAngle=a.angle===90||a.angle===180||a.angle===270?a.angle:90;
   const angleRight=a.angle===t.angle || (a.angle===360-t.angle && a.direction!==t.direction);
   if(angleRight&&a.direction&&equivalentTransform({type:'rotation',angle:inputAngle as 90|180|270,direction:a.direction,center:t.center},t)){marks++;feedback.push('Angle and direction: correct.');}else feedback.push('Angle or direction is incorrect. A 180° turn is the same in both directions.');
   if(a.center&&pointNear(a.center,t.center)){marks++;feedback.push('Center: correct.');}else feedback.push('Center of rotation is incorrect.');
  } else {
   if(near(a.scale??NaN,t.scale)){marks++;feedback.push('Scale factor: correct.');}else feedback.push('Scale factor is incorrect. Check size and whether the image lies across the center.');
   if(a.center&&pointNear(a.center,t.center)){marks++;feedback.push('Center: correct.');}else feedback.push('Center of enlargement is incorrect.');
  }
 }
 marks=Math.min(marks,q.marks);
 return {marks,maxMarks:q.marks,correct:marks===q.marks,feedback,mistakeCategory:marks===q.marks?null:q.type,incorrectVertices};
}
