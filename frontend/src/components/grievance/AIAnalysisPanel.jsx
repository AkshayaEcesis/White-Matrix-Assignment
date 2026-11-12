import { AlertTriangle, Bot, Copy, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMeta } from '../../context/MetaContext'
import { Badge, PriorityBadge } from '../ui/Badge'

/** Shows an AI (or clearly-labelled fallback) analysis. Suggestions are advisory only. */
export function AISourceBadge({ source }) {
  if (source === 'GEMINI') return <Badge icon={Sparkles} className="bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-900 border-purple-300 font-bold shadow-xs">Google Gemini AI</Badge>
  if (source === 'FALLBACK') return <Badge icon={AlertTriangle} className="bg-amber-50 text-amber-900 border-amber-300 font-semibold">Rule-based fallback · not AI</Badge>
  if (source === 'SEED') return <Badge className="bg-slate-100 text-slate-700 border-slate-300">Demo seed data · not AI</Badge>
  return null
}

export default function AIAnalysisPanel({ analysis, showDuplicateLink = false, actions }) {
  const { labels } = useMeta()
  if (!analysis) {
    return <p className="text-sm text-slate-500">No AI analysis is available for this grievance.</p>
  }
  const isAI = analysis.source === 'GEMINI'
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <AISourceBadge source={analysis.source} />
        {analysis.model && <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">model: {analysis.model}</span>}
      </div>
      {analysis.notice && (
        <p className={`flex gap-2.5 rounded-xl p-3.5 text-xs leading-relaxed border ${
          isAI
            ? 'bg-purple-50/70 text-purple-900 border-purple-200'
            : 'bg-amber-50/70 text-amber-900 border-amber-200'
        }`}>
          <Bot className="size-4 shrink-0 mt-0.5" aria-hidden /> <span>{analysis.notice}</span>
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5">
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Suggested Department</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">{analysis.suggested_department || 'No clear match'}</dd>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5">
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Suggested Category</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">{labels.category[analysis.suggested_category] || analysis.suggested_category || '—'}</dd>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5">
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Recommended Priority</dt>
          <dd className="mt-1.5"><PriorityBadge priority={analysis.suggested_priority} /></dd>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5">
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Possible Duplicate</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">
            {analysis.duplicate_warning ? (
              <span className="inline-flex items-center gap-1 text-amber-800 font-bold"><Copy className="size-4" aria-hidden /> Flagged for review</span>
            ) : <span className="text-emerald-700 font-medium">None detected</span>}
          </dd>
        </div>
      </div>
      {analysis.summary && (
        <div className="rounded-xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/60 via-purple-50/30 to-white p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-indigo-600" /> Summary for CMO
          </p>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-800 leading-relaxed">{analysis.summary}</p>
        </div>
      )}
      {analysis.reasoning && (
        <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3.5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Reasoning</p>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed">{analysis.reasoning}</p>
        </div>
      )}
      {analysis.duplicate_message && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 leading-relaxed">{analysis.duplicate_message}</p>}
      {showDuplicateLink && analysis.duplicate_reference && (
        <p className="text-xs text-slate-600 rounded-lg bg-slate-100 p-2.5">
          {analysis.duplicate_warning ? 'Likely duplicate of: ' : 'Most similar open grievance: '}
          <Link className="font-mono font-bold text-brand-700 hover:underline" to={`/cmo/grievances/${analysis.duplicate_reference}`}>
            {analysis.duplicate_reference}
          </Link>
        </p>
      )}
      {actions}
    </div>
  )
}
