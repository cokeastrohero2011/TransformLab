import {describe,it,expect} from 'vitest';
import {applyPoint,applyPolygon,equivalentTransform,lineFromString,samePolygon} from './geometry';
import {checkAnswer} from './checker';
import {generateQuestion,solutionFor,type PublicQuestion} from './questions';
const p={x:-3,y:2};
describe('exact coordinate transformations',()=>{
 it('translates by signed and zero vector components',()=>expect(applyPoint(p,{type:'translation',dx:4,dy:-1})).toEqual({x:1,y:1}));
 it('reflects in offset and diagonal lines',()=>{expect(applyPoint(p,{type:'reflection',line:{a:1,b:0,c:-1}})).toEqual({x:5,y:2});expect(applyPoint(p,{type:'reflection',line:{a:1,b:-1,c:0}})).toEqual({x:2,y:-3});});
 it('rotates clockwise and anticlockwise about an arbitrary center',()=>{expect(applyPoint({x:3,y:2},{type:'rotation',angle:90,direction:'clockwise',center:{x:1,y:1}})).toEqual({x:2,y:-1});expect(applyPoint({x:3,y:2},{type:'rotation',angle:90,direction:'anticlockwise',center:{x:1,y:1}})).toEqual({x:0,y:3});});
 it('enlarges with a negative fractional factor',()=>expect(applyPoint(p,{type:'enlargement',scale:-0.5,center:{x:3,y:0}})).toEqual({x:6,y:-1}));
 it('accepts reversed and cyclic vertex order',()=>{const a=[{x:0,y:0},{x:2,y:0},{x:1,y:1}];expect(samePolygon(a,[a[1],a[2],a[0]])).toBe(true);expect(samePolygon(a,[a[0],a[2],a[1]])).toBe(true);});
 it('accepts equivalent rotation descriptions',()=>expect(equivalentTransform({type:'rotation',angle:90,direction:'clockwise',center:{x:0,y:0}},{type:'rotation',angle:270,direction:'anticlockwise',center:{x:0,y:0}})).toBe(true));
 it('parses supported reflection equations',()=>expect(lineFromString(' y = -3 ')).toEqual({a:0,b:1,c:3}));
});
describe('marking',()=>{
 const shape=[{x:-3,y:2},{x:-3,y:6},{x:-1,y:2}];const t={type:'translation' as const,dx:-3,dy:1};const solution=solutionFor(shape,[t]);
 const question:PublicQuestion={id:'1',mode:'draw',difficulty:'easy',type:'translation',prompt:'',shape,steps:[t],marks:3,hint:[],viewport:{minX:-6,maxX:-1,minY:2,maxY:7}};
 it('gives full marks for a correct drawing in reverse order',()=>expect(checkAnswer(question,solution,{points:[...solution.image].reverse()}).marks).toBe(3));
 it('gives partial credit for correctly placed vertices',()=>expect(checkAnswer(question,solution,{points:[solution.image[0],solution.image[1],{x:9,y:9}]}).marks).toBe(2));
 it('marks identification using server solution',()=>expect(checkAnswer({...question,mode:'identify',marks:2},solution,{type:'translation',dx:-3,dy:1}).marks).toBe(2));
});

describe('question generation',()=>{it('keeps the true image within its published viewport and avoids identity mappings',()=>{for(let i=0;i<100;i++){const {question,solution}=generateQuestion('identify','hard');expect(question.image).toEqual(solution.image);expect(samePolygon(question.shape,solution.image)).toBe(false);for(const p of solution.image){expect(p.x).toBeGreaterThanOrEqual(question.viewport.minX);expect(p.x).toBeLessThanOrEqual(question.viewport.maxX);expect(p.y).toBeGreaterThanOrEqual(question.viewport.minY);expect(p.y).toBeLessThanOrEqual(question.viewport.maxY);}}});});
