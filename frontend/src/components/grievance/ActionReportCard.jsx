import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDateTime } from '../../utils/format'
import { Badge } from '../ui/Badge'
import AttachmentList from './AttachmentList'

const REVIEW = {
  PENDING: { icon: Clock, cls: 'bg-amber-50 text-amber-900 border-amber-300 font-semibold shadow-xs' },
  APPROVED: { icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold shadow-xs' },
  REJECTED: { icon: XCircle, cls: 'bg-rose-50 text-rose-900 border-rose-300 font-semibold shadow-xs' },
}

export default function ActionReportCard({ report, showGrievanceLink = false, actions }) {
  const r = REVIEW[report.review_status]
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:border-slate-300">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          {showGrievanceLink && (
            <Link to={`/cmo/grievances/${report.reference_number}`} className="font-mono text-xs font-semibold text-brand-700 hover:underline">
              {report.reference_number}
            </Link>
          )}
          {showGrievanceLink && <p className="font-medium text-slate-800">{report.grievance_subject}</p>}
          <p className="text-xs text-slate-500">
            Submitted by {report.officer}{report.department ? ` · ${report.department}` : ''} · {formatDateTime(report.created_at)}
          </p>
        </div>
        <Badge icon={r.icon} className={r.cls}>{report.review_status_label}</Badge>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">Action taken</h4>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{report.action_taken}</p>
        </div>
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">Resolution details</h4>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{report.resolution_details}</p>
        </div>
      </div>
      {report.attachments?.length > 0 && (
        <div className="mt-3"><AttachmentList attachments={report.attachments} /></div>
      )}
      {report.review_status !== 'PENDING' && (
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          <span className="font-medium">CMO review{report.reviewed_by ? ` (${report.reviewed_by})` : ''}:</span>{' '}
          {report.review_remarks || 'No remarks.'} <span className="text-xs text-slate-500">· {formatDateTime(report.reviewed_at)}</span>
        </p>
      )}
      {actions && <div className="mt-3 flex flex-wrap justify-end gap-2">{actions}</div>}
    </article>
  )
}
