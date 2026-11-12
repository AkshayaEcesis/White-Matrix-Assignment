import { useEffect, useState } from 'react'
import { CheckCircle2, RotateCcw, Search, Send, Siren, SlidersHorizontal, XCircle } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { authApi, cmoApi } from '../../api/endpoints'
import ActionReportCard from '../../components/grievance/ActionReportCard'
import AIAnalysisPanel from '../../components/grievance/AIAnalysisPanel'
import AttachmentList from '../../components/grievance/AttachmentList'
import { GrievanceDetailsCard, GrievanceHeader } from '../../components/grievance/GrievanceOverview'
import HistoryTimeline from '../../components/grievance/HistoryTimeline'
import RemarksPanel from '../../components/grievance/RemarksPanel'
import Button from '../../components/ui/Button'
import { Card, DetailList } from '../../components/ui/Card'
import { Alert, AsyncBoundary } from '../../components/ui/Feedback'
import { Select, Textarea } from '../../components/ui/Form'
import { ReasonDialog } from '../../components/ui/Modal'
import { useMeta } from '../../context/MetaContext'
import { useAction } from '../../hooks/useAction'
import { useApi } from '../../hooks/useApi'
import { formatDateTime } from '../../utils/format'

function AssignForm({ grievance: g, onDone }) {
  const { departments } = useMeta()
  const initialDept = g.department?.id || g.ai_suggested_department?.id || ''
  const [department, setDepartment] = useState(String(initialDept))
  const [officer, setOfficer] = useState(g.assigned_officer_id ? String(g.assigned_officer_id) : '')
  const [officers, setOfficers] = useState([])
  const [instructions, setInstructions] = useState('')
  const [error, setError] = useState('')
  const { run, pending } = useAction()

  useEffect(() => {
    setOfficers([])
    if (!department) return
    let active = true
    authApi.officers(department).then((list) => active && setOfficers(list)).catch(() => {})
    return () => { active = false }
  }, [department])

  const submit = async (e) => {
    e.preventDefault()
    if (!department) return setError('Select a department.')
    setError('')
    await run(() => cmoApi.assign(g.reference_number, { department: Number(department), officer: officer ? Number(officer) : null, instructions }), {
      success: g.department ? 'Grievance reassigned.' : 'Grievance forwarded to the department.',
      onSuccess: onDone,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {g.ai_suggested_department && !g.department && (
        <p className="text-xs text-violet-700">AI suggested: {g.ai_suggested_department.name} (pre-selected, you can change it)</p>
      )}
      <Select label="Department" required value={department} onChange={(e) => { setDepartment(e.target.value); setOfficer('') }}
        options={(departments || []).map((d) => ({ value: String(d.id), label: d.name }))} error={error} />
      <Select label="Officer" value={officer} onChange={(e) => setOfficer(e.target.value)} placeholder="Department pool (any officer)"
        options={(officers || []).map((o) => ({ value: String(o.id), label: `${o.full_name}${o.designation ? ` — ${o.designation}` : ''}` }))}
        disabled={!department} />
      <Textarea label="Instructions to the department" rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} maxLength={2000} />
      <Button type="submit" icon={Send} loading={pending} className="w-full">{g.department ? 'Reassign' : 'Forward to department'}</Button>
    </form>
  )
}

function TriageForm({ grievance: g, onDone }) {
  const meta = useMeta()
  const [priority, setPriority] = useState(g.priority)
  const [category, setCategory] = useState(g.category)
  const { run, pending } = useAction()
  const submit = (e) => {
    e.preventDefault()
    run(() => cmoApi.triage(g.reference_number, { priority, category }), { success: 'Triage updated.', onSuccess: onDone })
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-xs text-slate-500">Priority source: <span className="font-medium text-slate-700">{g.priority_source_label}</span></p>
      <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)} options={meta.priorities} placeholder={null} />
      <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)} options={meta.categories} placeholder={null} />
      <Button type="submit" variant="secondary" icon={SlidersHorizontal} loading={pending} className="w-full">
        {g.priority_source === 'AI_SUGGESTED' ? 'Confirm / override' : 'Update triage'}
      </Button>
    </form>
  )
}

export default function CMOGrievanceDetail() {
  const { reference } = useParams()
  const { data: g, loading, error, reload, setData } = useApi(() => cmoApi.get(reference), [reference])
  const [dialog, setDialog] = useState(null) // 'escalate' | 'reopen' | {approve|reject, report}
  const { run, pending } = useAction()

  const act = (fn, success) => run(fn, { success, onSuccess: (updated) => { if (updated?.history) setData(updated); else reload(); setDialog(null) } })

  return (
    <AsyncBoundary loading={loading} error={error} onRetry={reload}>
      {g && (() => {
        const pendingReport = g.action_reports.find((r) => r.review_status === 'PENDING')
        const canReview = ['SUBMITTED', 'REOPENED'].includes(g.status)
        return (
          <>
            <GrievanceHeader grievance={g} backTo="/cmo/grievances" backLabel="All grievances"
              actions={
                <>
                  {canReview && (
                    <Button variant="secondary" icon={Search} loading={pending} onClick={() => act(() => cmoApi.startReview(g.reference_number, ''), 'Marked as Under Review.')}>
                      Start review
                    </Button>
                  )}
                  {g.status !== 'RESOLVED' && !g.is_escalated && <Button variant="danger" icon={Siren} onClick={() => setDialog('escalate')}>Escalate</Button>}
                  {g.status === 'RESOLVED' && <Button variant="secondary" icon={RotateCcw} onClick={() => setDialog('reopen')}>Reopen</Button>}
                </>
              } />

            {pendingReport && (
              <Alert type="warning" title="Action-taken report awaiting your review" className="mb-6">
                The department has submitted a report. Approve it to resolve the grievance, or request additional action.
              </Alert>
            )}

            <div className="grid gap-6 xl:grid-cols-3">
              <div className="space-y-6 xl:col-span-2">
                <GrievanceDetailsCard grievance={g} extra={[
                  { label: 'Assigned officer', value: g.assigned_officer || (g.department ? 'Department pool' : '—') },
                  g.escalated_at && { label: 'Escalated on', value: formatDateTime(g.escalated_at) },
                  g.reopened_count > 0 && { label: 'Times reopened', value: g.reopened_count },
                ]} />

                {(g.action_reports || []).length > 0 && (
                  <Card title="Action-taken reports">
                    <div className="space-y-4">
                      {(g.action_reports || []).map((r) => (
                        <ActionReportCard key={r.id} report={r} actions={r.review_status === 'PENDING' && (
                          <>
                            <Button variant="secondary" icon={XCircle} onClick={() => setDialog({ type: 'reject', report: r })}>Request more action</Button>
                            <Button icon={CheckCircle2} onClick={() => setDialog({ type: 'approve', report: r })}>Approve &amp; resolve</Button>
                          </>
                        )} />
                      ))}
                    </div>
                  </Card>
                )}

                <Card title="AI Grievance Assistant" subtitle="Advisory analysis — the CMO makes the decisions.">
                  <AIAnalysisPanel analysis={g.ai_analysis} showDuplicateLink />
                </Card>
                <Card title="Attachments"><AttachmentList attachments={g.attachments} /></Card>
                <Card title="Remarks" subtitle="Internal remarks are visible to staff only.">
                  <RemarksPanel remarks={g.remarks} allowVisibility
                    onAdd={async (body) => { await cmoApi.addRemark(g.reference_number, body); reload() }} />
                </Card>
                {(g.feedback || []).length > 0 && (
                  <Card title="Citizen feedback">
                    <ul className="space-y-2 text-sm">
                      {(g.feedback || []).map((f) => (
                        <li key={f.id}>
                          <span className="font-medium">{f.rating}/5</span> · {f.is_satisfied ? 'Satisfied' : 'Not satisfied'}
                          {f.comments && <span className="text-slate-600"> — {f.comments}</span>}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                {g.status !== 'RESOLVED' && (
                  <Card title={g.department ? 'Reassign' : 'Assign to department'}>
                    {pendingReport
                      ? <p className="text-sm text-slate-500">Review the pending report before reassigning.</p>
                      : <AssignForm key={g.updated_at} grievance={g} onDone={reload} />}
                  </Card>
                )}
                <Card title="Triage"><TriageForm key={g.updated_at} grievance={g} onDone={reload} /></Card>
                <Card title="Citizen">
                  <DetailList items={[
                    { label: 'Name', value: g.citizen.full_name },
                    { label: 'Email', value: g.citizen.email },
                    { label: 'Mobile', value: g.citizen.mobile || '—' },
                  ]} />
                </Card>
                <Card title="Complete history"><HistoryTimeline items={g.history} /></Card>
              </div>
            </div>

            <ReasonDialog open={dialog === 'escalate'} onClose={() => setDialog(null)} loading={pending} variant="danger"
              title="Escalate grievance" label="Reason for escalation" confirmLabel="Escalate"
              description="Escalation sets priority to High and alerts the assigned department."
              onSubmit={(reason) => act(() => cmoApi.escalate(g.reference_number, reason), 'Grievance escalated.')} />
            <ReasonDialog open={dialog === 'reopen'} onClose={() => setDialog(null)} loading={pending}
              title="Reopen grievance" label="Reason for reopening" confirmLabel="Reopen"
              onSubmit={(reason) => act(() => cmoApi.reopen(g.reference_number, reason), 'Grievance reopened.')} />
            <ReasonDialog open={dialog?.type === 'approve'} onClose={() => setDialog(null)} loading={pending} required={false} minLength={3}
              title="Approve report and resolve" label="Review remarks (optional)" confirmLabel="Approve & resolve"
              description="The grievance will be marked Resolved and the citizen will be notified."
              onSubmit={(remarks) => act(() => cmoApi.reviewReport(dialog.report.id, { decision: 'APPROVE', remarks }), 'Report approved. Grievance resolved.')} />
            <ReasonDialog open={dialog?.type === 'reject'} onClose={() => setDialog(null)} loading={pending} variant="danger"
              title="Request additional action" label="What else must the department do?" confirmLabel="Send back to department"
              onSubmit={(remarks) => act(() => cmoApi.reviewReport(dialog.report.id, { decision: 'REJECT', remarks }), 'Sent back to the department.')} />
          </>
        )
      })()}
    </AsyncBoundary>
  )
}
