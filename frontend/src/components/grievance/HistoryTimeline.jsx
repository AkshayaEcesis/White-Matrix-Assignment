import { ArrowRight } from 'lucide-react'
import { formatDateTime } from '../../utils/format'
import { StatusBadge } from '../ui/Badge'

/** Vertical audit timeline of grievance history entries. */
export default function HistoryTimeline({ items = [] }) {
  if (!items.length) return <p className="text-sm text-slate-500">No history yet.</p>
  return (
    <ol className="relative space-y-6 border-l-2 border-emerald-200 pl-6 my-2">
      {items.map((h, i) => (
        <li key={h.id ?? i} className="relative">
          <span className={`absolute -left-[33px] top-1 size-4 rounded-full ring-4 ring-white shadow-xs ${h.to_status ? 'bg-gradient-to-br from-emerald-500 to-teal-700 ring-emerald-100' : 'bg-slate-300 ring-slate-100'}`} aria-hidden />
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-slate-900">{h.event_label}</p>
            {h.from_status && h.to_status && (
              <span className="inline-flex items-center gap-1.5">
                <StatusBadge status={h.from_status} /> <ArrowRight className="size-3.5 text-slate-400" aria-label="to" /> <StatusBadge status={h.to_status} />
              </span>
            )}
            {!h.from_status && h.to_status && <StatusBadge status={h.to_status} />}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {formatDateTime(h.created_at)}
            {(h.changed_by || h.actor_role) && <> · by <span className="font-semibold text-slate-700">{h.changed_by ? `${h.changed_by.full_name}${h.changed_by.full_name !== h.changed_by.role_label ? ` (${h.changed_by.role_label})` : ''}` : h.actor_role}</span></>}
          </p>
          {h.remarks && <p className="mt-2 whitespace-pre-line rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed">{h.remarks}</p>}
        </li>
      ))}
    </ol>
  )
}
