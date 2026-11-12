import { useState } from 'react'
import { CheckCircle2, ClipboardCheck, XCircle } from 'lucide-react'
import { cmoApi } from '../../api/endpoints'
import ActionReportCard from '../../components/grievance/ActionReportCard'
import Button from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/Card'
import { AsyncBoundary, EmptyState } from '../../components/ui/Feedback'
import { ReasonDialog } from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import { useAction } from '../../hooks/useAction'
import { useApi } from '../../hooks/useApi'
import { useListParams } from '../../hooks/useListParams'

const KEYS = ['review_status']
const TABS = [['PENDING', 'Awaiting review'], ['APPROVED', 'Approved'], ['REJECTED', 'Sent back'], ['', 'All']]

export default function CMOReportsPage() {
  const { params, setParam } = useListParams(KEYS)
  const tab = params.review_status || 'PENDING'
  const status = tab === 'ALL' ? '' : tab
  const query = { page: params.page, ...(status ? { review_status: status } : {}) }
  const { data, loading, error, reload } = useApi(() => cmoApi.reports(query), [JSON.stringify(query)])
  const [dialog, setDialog] = useState(null)
  const { run, pending } = useAction()

  const review = (decision, remarks) =>
    run(() => cmoApi.reviewReport(dialog.report.id, { decision, remarks }), {
      success: decision === 'APPROVE' ? 'Report approved. Grievance resolved.' : 'Sent back to the department.',
      onSuccess: () => { setDialog(null); reload() },
    })

  return (
    <>
      <PageHeader title="Action-taken reports" description="Review department reports. Only the CMO can approve a resolution." />
      <div role="tablist" aria-label="Report status" className="mb-4 flex flex-wrap gap-2">
        {TABS.map(([value, label]) => (
          <button key={label} role="tab" aria-selected={tab === (value || 'ALL')} onClick={() => setParam('review_status', value || 'ALL')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ring-1 ${tab === (value || 'ALL') ? 'bg-brand-700 text-white ring-brand-700' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'}`}>
            {label}
          </button>
        ))}
      </div>
      <AsyncBoundary loading={loading} error={error} onRetry={reload} isEmpty={!data?.results.length}
        empty={<EmptyState icon={ClipboardCheck} title="No reports here" message="Reports submitted by department officers will appear here." />}>
        <div className="space-y-4">
          {data?.results.map((r) => (
            <ActionReportCard key={r.id} report={r} showGrievanceLink actions={r.review_status === 'PENDING' && (
              <>
                <Button variant="secondary" icon={XCircle} onClick={() => setDialog({ type: 'reject', report: r })}>Request more action</Button>
                <Button icon={CheckCircle2} onClick={() => setDialog({ type: 'approve', report: r })}>Approve &amp; resolve</Button>
              </>
            )} />
          ))}
        </div>
        <Pagination page={params.page} count={data?.count} onChange={(p) => setParam('page', p)} />
      </AsyncBoundary>

      <ReasonDialog open={dialog?.type === 'approve'} onClose={() => setDialog(null)} loading={pending} required={false} minLength={3}
        title="Approve report and resolve" label="Review remarks (optional)" confirmLabel="Approve & resolve"
        onSubmit={(remarks) => review('APPROVE', remarks)} />
      <ReasonDialog open={dialog?.type === 'reject'} onClose={() => setDialog(null)} loading={pending} variant="danger"
        title="Request additional action" label="What else must the department do?" confirmLabel="Send back"
        onSubmit={(remarks) => review('REJECT', remarks)} />
    </>
  )
}
