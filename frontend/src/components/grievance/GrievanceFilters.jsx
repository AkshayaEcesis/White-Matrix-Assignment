import { useEffect, useState } from 'react'
import { RotateCcw, Search } from 'lucide-react'
import { useMeta } from '../../context/MetaContext'

/** Reusable filter bar. `fields` selects which filters to show; values live in the URL. */
export default function GrievanceFilters({ params, setParam, reset, fields = ['status'] }) {
  const meta = useMeta()
  const [search, setSearch] = useState(params.search || '')

  useEffect(() => {
    setSearch(params.search || '')
  }, [params.search])
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.search || '') !== search) setParam('search', search)
    }, 400)
    return () => clearTimeout(t)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const selects = {
    status: { label: 'Status', options: meta.statuses },
    district: { label: 'District', options: meta.districts },
    category: { label: 'Category', options: meta.categories },
    priority: { label: 'Priority', options: meta.priorities },
    department: { label: 'Department', options: meta.departments.map((d) => ({ value: String(d.id), label: d.name })) },
  }
  const sel = 'h-10 rounded-xl border border-slate-300/80 bg-white px-3.5 text-sm text-slate-800 shadow-2xs focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200 transition-colors'
  const active = Object.keys(params).some((k) => k !== 'page')

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-100 bg-slate-50/40 p-4 rounded-t-2xl">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reference, subject…" aria-label="Search grievances" className={`${sel} w-full pl-10`} />
      </div>
      {fields.filter((f) => selects[f]).map((f) => (
        <select key={f} aria-label={`Filter by ${selects[f].label}`} value={params[f] || ''} onChange={(e) => setParam(f, e.target.value)} className={sel}>
          <option value="">All {selects[f].label.toLowerCase()}s</option>
          {selects[f].options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ))}
      {fields.includes('overdue') && (
        <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs cursor-pointer hover:bg-slate-50">
          <input type="checkbox" className="size-4 accent-red-600" checked={params.overdue === 'true'} onChange={(e) => setParam('overdue', e.target.checked ? 'true' : '')} />
          Overdue
        </label>
      )}
      {fields.includes('is_escalated') && (
        <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs cursor-pointer hover:bg-slate-50">
          <input type="checkbox" className="size-4 accent-orange-600" checked={params.is_escalated === 'true'} onChange={(e) => setParam('is_escalated', e.target.checked ? 'true' : '')} />
          Escalated
        </label>
      )}
      {active && (
        <button onClick={reset} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-2xs transition-colors cursor-pointer">
          <RotateCcw className="size-3.5" aria-hidden /> Clear
        </button>
      )}
    </div>
  )
}
