import type {Solution} from '../../shared/questions';
import {formatTransform} from '../../shared/geometry';
export function SolutionExplanation({solution}:{solution:Solution}){return <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-4"><h3 className="font-bold text-ink">Worked solution</h3><p className="mt-1 text-sm text-purple-900">{solution.steps.map(formatTransform).join(' → ')}</p><ol className="mt-3 list-inside list-decimal space-y-1 text-sm text-slate-700">{solution.explanation.map((line,i)=><li key={i}>{line}</li>)}</ol></div>}
