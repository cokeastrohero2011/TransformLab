import type {Answer} from '../../shared/checker';
import type {PublicQuestion} from '../../shared/questions';
import {NumberField,Select} from './ui';
export function AnswerChecker({question,answer,onChange}:{question:PublicQuestion;answer:Answer;onChange:(a:Answer)=>void}){
 const set=(patch:Partial<Answer>)=>onChange({...answer,...patch});
 const type=question.mode==='parameter'?question.type:answer.type;
 return <div className="space-y-4">
  {question.mode==='identify'&&<Select label="Transformation" value={answer.type||''} onChange={v=>set({type:v as Answer['type']})}><option value="">Choose a transformation</option><option value="translation">Translation</option><option value="reflection">Reflection</option><option value="rotation">Rotation</option><option value="enlargement">Enlargement</option></Select>}
  {type==='translation'&&<div className="grid grid-cols-2 gap-3"><NumberField label="Vector x" value={answer.dx??0} onChange={dx=>set({dx})}/><NumberField label="Vector y" value={answer.dy??0} onChange={dy=>set({dy})}/></div>}
  {type==='reflection'&&<label className="block text-sm font-semibold text-slate-600">Mirror line<input className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-ink" placeholder="e.g. x = 2 or y = -x" value={answer.line||''} onChange={e=>set({line:e.target.value})}/><span className="mt-1 block text-xs font-normal text-slate-400">Use x = number, y = number, y = x, or y = -x.</span></label>}
  {type==='rotation'&&question.mode!=='parameter'&&<div className="grid grid-cols-2 gap-3"><Select label="Angle" value={String(answer.angle||90)} onChange={v=>set({angle:Number(v)})}><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></Select><Select label="Direction" value={answer.direction||'clockwise'} onChange={v=>set({direction:v as Answer['direction']})}><option value="clockwise">Clockwise</option><option value="anticlockwise">Anticlockwise</option></Select></div>}
  {type==='enlargement'&&question.mode!=='parameter'&&<NumberField label="Scale factor" value={answer.scale??1} onChange={scale=>set({scale})}/>}
  {type==='enlargement'&&question.mode==='parameter'&&<NumberField label="Scale factor" value={answer.scale??1} onChange={scale=>set({scale})}/>}
  {(type==='rotation'||type==='enlargement'&&question.mode!=='parameter')&&<div className="grid grid-cols-2 gap-3"><NumberField label="Center x" value={answer.center?.x??0} onChange={x=>set({center:{x,y:answer.center?.y??0}})}/><NumberField label="Center y" value={answer.center?.y??0} onChange={y=>set({center:{x:answer.center?.x??0,y}})}/></div>}
 </div>;
}
