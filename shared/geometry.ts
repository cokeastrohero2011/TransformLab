export type Point = { x: number; y: number };
export type Polygon = Point[];
export type Transform =
  | { type: 'translation'; dx: number; dy: number }
  | { type: 'reflection'; line: { a: number; b: number; c: number } }
  | { type: 'rotation'; angle: 90 | 180 | 270; direction: 'clockwise' | 'anticlockwise'; center: Point }
  | { type: 'enlargement'; scale: number; center: Point };
export type TransformationType = Transform['type'] | 'combined';
const EPS = 1e-8;
export const near = (a: number, b: number) => Math.abs(a - b) < EPS;
export const pointNear = (a: Point, b: Point) => near(a.x, b.x) && near(a.y, b.y);
export const clean = (n: number) => Math.round(n * 1e9) / 1e9;
export function validPoint(p: unknown): p is Point {
  return !!p && typeof p === 'object' && Number.isFinite((p as Point).x) && Number.isFinite((p as Point).y) && Math.abs((p as Point).x) <= 100 && Math.abs((p as Point).y) <= 100;
}
export function validPolygon(p: unknown): p is Polygon { return Array.isArray(p) && p.length >= 3 && p.length <= 8 && p.every(validPoint); }
export function validTransform(t: unknown): t is Transform {
 if(!t||typeof t!=='object')return false;
 const x=t as Record<string,unknown>;
 const number=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=100;
 if(x.type==='translation')return number(x.dx)&&number(x.dy);
 if(x.type==='enlargement')return number(x.scale)&&x.scale!==0&&validPoint(x.center);
 if(x.type==='rotation')return [90,180,270].includes(Number(x.angle))&&['clockwise','anticlockwise'].includes(String(x.direction))&&validPoint(x.center);
 if(x.type==='reflection'){
  if(!x.line||typeof x.line!=='object')return false;
  const l=x.line as Record<string,unknown>;
  return number(l.a)&&number(l.b)&&number(l.c)&&Math.hypot(l.a as number,l.b as number)>0;
 }
 return false;
}
export function normalizeLine(line: { a: number; b: number; c: number }) {
  const len = Math.hypot(line.a, line.b);
  if (!Number.isFinite(len) || len < EPS) throw new Error('Invalid mirror line');
  let [a,b,c] = [line.a/len,line.b/len,line.c/len];
  if (a < -EPS || (near(a,0) && b < 0)) [a,b,c] = [-a,-b,-c];
  return { a, b, c };
}
export function applyPoint(p: Point, t: Transform): Point {
  if (t.type === 'translation') return { x: clean(p.x+t.dx), y: clean(p.y+t.dy) };
  if (t.type === 'enlargement') return { x: clean(t.center.x+t.scale*(p.x-t.center.x)), y: clean(t.center.y+t.scale*(p.y-t.center.y)) };
  if (t.type === 'reflection') {
    const {a,b,c} = normalizeLine(t.line); const d = a*p.x+b*p.y+c;
    return {x:clean(p.x-2*a*d),y:clean(p.y-2*b*d)};
  }
  const dx=p.x-t.center.x, dy=p.y-t.center.y;
  const angle=t.direction==='clockwise' ? -t.angle : t.angle;
  const q=((angle%360)+360)%360;
  const rotated=q===90?{x:-dy,y:dx}:q===180?{x:-dx,y:-dy}:{x:dy,y:-dx};
  return {x:clean(t.center.x+rotated.x),y:clean(t.center.y+rotated.y)};
}
export const applyPolygon = (shape: Polygon,t: Transform): Polygon => shape.map(p=>applyPoint(p,t));
export const applySteps = (shape: Polygon,steps: Transform[]) => steps.reduce(applyPolygon,shape);
export function samePolygon(a: Polygon,b: Polygon): boolean {
  if(a.length!==b.length) return false;
  return Array.from({length:a.length},(_,offset)=>offset).some(offset=>
    a.every((p,i)=>pointNear(p,b[(i+offset)%b.length])) ||
    a.every((p,i)=>pointNear(p,b[(offset-i+b.length)%b.length])));
}
export function matchedVertices(expected: Polygon, answer: Polygon): number {
  const used=new Set<number>(); let count=0;
  for(const p of answer) { const i=expected.findIndex((q,j)=>!used.has(j)&&pointNear(p,q)); if(i>=0){used.add(i);count++;} }
  return count;
}
export function equivalentTransform(a: Transform,b: Transform): boolean {
  if(a.type!==b.type) return false;
  if(a.type==='translation' && b.type==='translation') return near(a.dx,b.dx)&&near(a.dy,b.dy);
  if(a.type==='enlargement' && b.type==='enlargement') return near(a.scale,b.scale)&&pointNear(a.center,b.center);
  if(a.type==='reflection' && b.type==='reflection') { const x=normalizeLine(a.line),y=normalizeLine(b.line); return near(x.a,y.a)&&near(x.b,y.b)&&near(x.c,y.c); }
  if(a.type==='rotation' && b.type==='rotation') return pointNear(a.center,b.center) && ((a.direction==='clockwise'?-a.angle:a.angle)-(b.direction==='clockwise'?-b.angle:b.angle)+360)%360===0;
  return false;
}
export function lineFromString(s: string): {a:number;b:number;c:number}|null {
  const v=s.replace(/\s/g,'').toLowerCase();
  const m=/^([xy])=([-+]?\d+(?:\.\d+)?)$/.exec(v);
  if(m) return m[1]==='x'?{a:1,b:0,c:-Number(m[2])}:{a:0,b:1,c:-Number(m[2])};
  if(v==='y=x'||v==='x=y') return {a:1,b:-1,c:0};
  if(v==='y=-x'||v==='-x=y') return {a:1,b:1,c:0};
  return null;
}
export function formatNumber(n:number){if(Number.isInteger(n))return String(n);if(Number.isInteger(n*2))return `${Math.round(n*2)}/2`;if(Number.isInteger(n*4))return `${Math.round(n*4)}/4`;return String(clean(n));}
export function formatPoint(p:Point){return `(${formatNumber(p.x)}, ${formatNumber(p.y)})`;}
export function formatTransform(t:Transform):string {
  if(t.type==='translation')return `Translation by vector (${formatNumber(t.dx)}, ${formatNumber(t.dy)})`;
  if(t.type==='rotation')return `Rotation ${t.angle}° ${t.direction} about ${formatPoint(t.center)}`;
  if(t.type==='enlargement')return `Enlargement, scale factor ${formatNumber(t.scale)}, center ${formatPoint(t.center)}`;
  const {a,b,c}=normalizeLine(t.line);
  if(near(a,1)&&near(b,0))return `Reflection in x = ${formatNumber(-c)}`;
  if(near(a,0)&&near(b,1))return `Reflection in y = ${formatNumber(-c)}`;
  if(near(a,Math.SQRT1_2)&&near(b,-Math.SQRT1_2)&&near(c,0))return 'Reflection in y = x';
  if(near(a,Math.SQRT1_2)&&near(b,Math.SQRT1_2)&&near(c,0))return 'Reflection in y = -x';
  return 'Reflection in the marked line';
}
export function explainPoint(p:Point,t:Transform):string {
 const q=applyPoint(p,t), P=formatPoint(p), Q=formatPoint(q);
 if(t.type==='translation') return `${P} + (${t.dx}, ${t.dy}) = ${Q}`;
 if(t.type==='enlargement') return `Center + scale factor × (point − center): ${formatPoint(t.center)} + ${formatNumber(t.scale)} × (${P} − ${formatPoint(t.center)}) = ${Q}`;
 if(t.type==='rotation') {const dx=p.x-t.center.x,dy=p.y-t.center.y;const turn=((t.direction==='clockwise'?-t.angle:t.angle)+360)%360;const rule=turn===90?'(−dy, dx)':turn===180?'(−dx, −dy)':'(dy, −dx)';return `Subtract center ${formatPoint(t.center)}: (${dx}, ${dy}); apply ${t.angle}° ${t.direction} rule ${rule}; add center to get ${Q}.`;}
 return `${P} → ${Q}; both points are the same perpendicular distance from the mirror line.`;
}
