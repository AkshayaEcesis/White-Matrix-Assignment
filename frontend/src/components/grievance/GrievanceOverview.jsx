import { ArrowLeft, Copy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { formatDate, formatDateTime } from '../../utils/format'
import { EscalatedBadge, OverdueBadge, PriorityBadge, StatusBadge } from '../ui/Badge'
import { Card, DetailList } from '../ui/Card'

export function GrievanceHeader({ grievance: g, backTo, backLabel = 'Back', actions }) {
  const toast = useToast()
  const copy = () => navigator.clipboard?.writeText(g.reference_number).then(() => toast.success('Reference number copied.'))
  return (
    <div className="mb-6">
      <Link to={backTo} className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-700 transition-colors">
        <ArrowLeft className="size-4" aria-hidden /> {backLabel}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-lg border border-brand-200/80 shadow-2xs">
              {g.reference_number}
            </span>
            <button onClick={copy} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer" aria-label="Copy reference number">
              <Copy className="size-3.5" />
            </button>
            <StatusBadge status={g.status} />
            {g.priority && <PriorityBadge priority={g.priority} />}
            {g.is_overdue && <OverdueBadge />}
            {g.is_escalated && <EscalatedBadge />}
          </div>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900 tracking-tight sm:text-3xl">{g.subject}</h1>
        </div>
        {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
      </div>
    </div>
  )
}

export function GrievanceDetailsCard({ grievance: g, extra = [] }) {
  return (
    <Card title="Grievance details">
      <DetailList
        items={[
          { label: 'District', value: g.district_label },
          { label: 'Category', value: g.category_label },
          { label: 'Department', value: g.department?.name || 'Not yet assigned' },
          { label: 'Submitted on', value: formatDateTime(g.created_at) },
          g.status !== 'RESOLVED' && { label: 'Target date', value: formatDate(g.due_at) },
          g.resolved_at && { label: 'Resolved on', value: formatDateTime(g.resolved_at) },
          ...extra,
        ]}
      />
      <div className="mt-5">
        <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Description</h3>
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">{g.description}</p>
      </div>
    </Card>
  )
}
