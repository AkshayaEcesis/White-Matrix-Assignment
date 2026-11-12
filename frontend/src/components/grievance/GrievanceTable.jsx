import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDate } from '../../utils/format'
import { EscalatedBadge, OverdueBadge, PriorityBadge, StatusBadge } from '../ui/Badge'

/**
 * One grievance table for all roles. `columns` picks which optional columns to show.
 * Renders a table on md+ screens and stacked cards on mobile.
 */
const ALL = {
  district: { label: 'District', render: (g) => g.district_label },
  category: { label: 'Category', render: (g) => g.category_label },
  priority: { label: 'Priority', render: (g) => <PriorityBadge priority={g.priority} /> },
  department: { label: 'Department', render: (g) => g.department?.name || <span className="text-slate-400">Not assigned</span> },
  officer: { label: 'Officer', render: (g) => g.assigned_officer || <span className="text-slate-400">Dept. pool</span> },
  citizen: { label: 'Citizen', render: (g) => g.citizen_name },
  due: { label: 'Due', render: (g) => (g.status === 'RESOLVED' ? '—' : formatDate(g.due_at)) },
  created: { label: 'Submitted', render: (g) => formatDate(g.created_at) },
  updated: { label: 'Last update', render: (g) => formatDate(g.updated_at) },
}

export default function GrievanceTable({ rows, linkTo, columns = ['category', 'created'] }) {
  const cols = columns.map((key) => ({ key, ...ALL[key] }))
  const flags = (g) => (
    <>
      {g.is_overdue && <OverdueBadge />}
      {g.is_escalated && <EscalatedBadge />}
    </>
  )

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-gradient-to-r from-slate-100/90 via-slate-50 to-slate-100/70">
            <tr>
              <th scope="col" className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Reference / Subject</th>
              <th scope="col" className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Status</th>
              {cols.map((c) => (
                <th key={c.key} scope="col" className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600">{c.label}</th>
              ))}
              <th scope="col" className="sr-only">Open</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((g) => (
              <tr key={g.id} className="transition-colors duration-150 hover:bg-emerald-50/40 group">
                <td className="max-w-xs px-5 py-3.5">
                  <Link to={linkTo(g)} className="font-mono text-xs font-bold text-brand-700 hover:text-brand-800 hover:underline">{g.reference_number}</Link>
                  <p className="truncate font-medium text-slate-900 mt-0.5" title={g.subject}>{g.subject}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">{flags(g)}</div>
                </td>
                <td className="px-4 py-3.5"><StatusBadge status={g.status} /></td>
                {cols.map((c) => (
                  <td key={c.key} className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-600">{c.render(g)}</td>
                ))}
                <td className="px-4 py-3.5 text-right">
                  <Link to={linkTo(g)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 hover:text-brand-800 transition-colors">
                    View <ChevronRight className="size-3.5" aria-hidden />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 md:hidden">
        {rows.map((g) => (
          <li key={g.id}>
            <Link to={linkTo(g)} className="block px-4 py-3.5 hover:bg-emerald-50/40 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-brand-700">{g.reference_number}</span>
                <StatusBadge status={g.status} />
              </div>
              <p className="mt-1 font-semibold text-slate-900">{g.subject}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {cols.map((c) => (
                  <span key={c.key} className="inline-flex items-center gap-1">{c.render(g)}</span>
                ))}
                {flags(g)}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
