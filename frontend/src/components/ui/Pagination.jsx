import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, pageSize = 10, count, onChange }) {
  const pages = Math.max(1, Math.ceil((count || 0) / pageSize))
  if (!count) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, count)
  const btn = 'inline-flex size-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-brand-700 hover:border-brand-300 disabled:opacity-40 transition-colors cursor-pointer'
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
      <p>Showing <span className="font-medium">{from}</span>–<span className="font-medium">{to}</span> of <span className="font-medium">{count}</span></p>
      <div className="flex items-center gap-2">
        <button className={btn} onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </button>
        <span className="tabular-nums">{page} / {pages}</span>
        <button className={btn} onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Next page">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  )
}
