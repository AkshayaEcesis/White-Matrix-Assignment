import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertOctagon, CheckCircle2, ClipboardCheck, FileCheck2, FolderKanban, Hourglass, Play, Send, TrendingUp,
} from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { officerApi } from '../../api/endpoints'
import ActionReportCard from '../../components/grievance/ActionReportCard'
import AIAnalysisPanel from '../../components/grievance/AIAnalysisPanel'
import AttachmentList from '../../components/grievance/AttachmentList'
import GrievanceFilters from '../../components/grievance/GrievanceFilters'
import { GrievanceDetailsCard, GrievanceHeader } from '../../components/grievance/GrievanceOverview'
import GrievanceTable from '../../components/grievance/GrievanceTable'
import HistoryTimeline from '../../components/grievance/HistoryTimeline'
import RemarksPanel from '../../components/grievance/RemarksPanel'
import Button from '../../components/ui/Button'
import { Card, DetailList, PageHeader, StatCard } from '../../components/ui/Card'
import { Alert, AsyncBoundary, EmptyState } from '../../components/ui/Feedback'
import { FileInput, Textarea } from '../../components/ui/Form'
import { ConfirmDialog } from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import { useAction } from '../../hooks/useAction'
import { useApi } from '../../hooks/useApi'
import { useListParams } from '../../hooks/useListParams'
import { useToast } from '../../context/ToastContext'
import { applyFieldErrors, getErrorMessage } from '../../utils/errors'
import { actionReportSchema, MAX_FILE_MB } from '../../utils/schemas'

export function OfficerDashboard() {
  const { data, loading, error, reload } = useApi(() => officerApi.dashboard(), [])
  const t = data?.totals
  return (
    <>
      <PageHeader title="Officer Dashboard" description={data ? `Grievances forwarded to ${data.department}` : 'Grievances forwarded to your department'} />
      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard label="Assigned to you / your department" value={t.total} icon={FolderKanban} to="/officer/grievances" />
              <StatCard label="Awaiting investigation" value={t.awaiting_action} icon={Hourglass} tone="amber" hint="Under review or reopened" to="/officer/grievances?status=UNDER_REVIEW" />
              <StatCard label="In progress" value={t.in_progress} icon={TrendingUp} tone="sky" to="/officer/grievances?status=IN_PROGRESS" />
              <StatCard label="Reports awaiting CMO review" value={t.pending_reports} icon={ClipboardCheck} tone="violet" />
              <StatCard label="Overdue" value={t.overdue} icon={AlertOctagon} tone="red" to="/officer/grievances?overdue=true" />
              <StatCard label="Resolved" value={t.resolved} icon={CheckCircle2} tone="brand" to="/officer/grievances?status=RESOLVED" />
            </div>
            <Card title="Recently updated" className="mt-6" bodyClassName=""
              actions={<Link to="/officer/grievances" className="text-sm font-medium text-brand-700 hover:underline">View all</Link>}>
              {data.recent.length ? (
                <GrievanceTable rows={data.recent} linkTo={(g) => `/officer/grievances/${g.reference_number}`} columns={['district', 'priority', 'officer', 'due']} />
              ) : <EmptyState title="No grievances assigned yet" message="Grievances forwarded by the CMO to your department will appear here." />}
            </Card>
          </>
        )}
      </AsyncBoundary>
    </>
  )
}

const KEYS = ['search', 'status', 'priority', 'district', 'overdue']

export function OfficerGrievancesPage() {
  const { params, setParam, reset } = useListParams(KEYS)
  const { data, loading, error, reload } = useApi(() => officerApi.list(params), [JSON.stringify(params)])
  return (
    <>
      <PageHeader title="Assigned grievances" description="Escalated and earliest-due grievances are listed first." />
      <Card bodyClassName="">
        <GrievanceFilters params={params} setParam={setParam} reset={reset} fields={['status', 'priority', 'district', 'overdue']} />
        <AsyncBoundary loading={loading} error={error} onRetry={reload} isEmpty={!data?.results.length}
          empty={<EmptyState title="No grievances found" />}>
          <GrievanceTable rows={data?.results || []} linkTo={(g) => `/officer/grievances/${g.reference_number}`}
            columns={['district', 'category', 'priority', 'officer', 'due']} />
          <Pagination page={params.page} count={data?.count} onChange={(p) => setParam('page', p)} />
        </AsyncBoundary>
      </Card>
    </>
  )
}

function ProgressForm({ reference, onDone }) {
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState('')
  const { run, pending } = useAction()
  const submit = async (e) => {
    e.preventDefault()
    if (remarks.trim().length < 10) return setError('Describe the progress in at least 10 characters.')
    setError('')
    await run(() => officerApi.progress(reference, remarks.trim()), {
      success: 'Progress update recorded. The citizen has been notified.',
      onSuccess: (g) => { setRemarks(''); onDone(g) },
    })
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <Textarea label="Progress update (visible to the citizen)" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} error={error} maxLength={2000} />
      <Button type="submit" variant="secondary" icon={TrendingUp} loading={pending} className="w-full">Record progress</Button>
    </form>
  )
}

function ActionReportForm({ reference, onDone }) {
  const toast = useToast()
  const [formError, setFormError] = useState('')
  const { control, register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(actionReportSchema),
    defaultValues: { action_taken: '', resolution_details: '', attachments: [] },
  })
  const onSubmit = async (values) => {
    setFormError('')
    try {
      await officerApi.submitReport(reference, values)
      toast.success('Action-taken report submitted to the CMO for review.')
      reset()
      onDone()
    } catch (err) {
      if (!applyFieldErrors(err, setError, ['action_taken', 'resolution_details', 'attachments'])) setFormError(getErrorMessage(err))
    }
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {formError && <Alert type="error">{formError}</Alert>}
      <Textarea label="Action taken" required rows={4} maxLength={5000} {...register('action_taken')} error={errors.action_taken?.message}
        hint="What did the department do? Include inspections, orders issued and work carried out." />
      <Textarea label="Resolution details" required rows={4} maxLength={5000} {...register('resolution_details')} error={errors.resolution_details?.message}
        hint="Shared with the citizen once the CMO approves." />
      <Controller name="attachments" control={control} render={({ field }) => (
        <FileInput label="Supporting documents (optional)" value={field.value} onChange={field.onChange}
          error={errors.attachments?.message} hint={`JPG, PNG or PDF, up to ${MAX_FILE_MB} MB each.`} />
      )} />
      <Button type="submit" icon={Send} loading={isSubmitting}>Submit report to CMO</Button>
    </form>
  )
}

export function OfficerGrievanceDetail() {
  const { reference } = useParams()
  const { data: g, loading, error, reload, setData } = useApi(() => officerApi.get(reference), [reference])
  const [confirmStart, setConfirmStart] = useState(false)
  const { run, pending } = useAction()

  const start = () =>
    run(() => officerApi.startInvestigation(reference, ''), {
      success: 'Investigation started. Status is now In Progress.',
      onSuccess: (updated) => { setData(updated); setConfirmStart(false) },
    })

  return (
    <AsyncBoundary loading={loading} error={error} onRetry={reload}>
      {g && (() => {
        const pendingReport = g.action_reports.some((r) => r.review_status === 'PENDING')
        const lastRejected = g.action_reports.find((r) => r.review_status === 'REJECTED')
        const canStart = ['UNDER_REVIEW', 'REOPENED'].includes(g.status)
        const inProgress = g.status === 'IN_PROGRESS'
        return (
          <>
            <GrievanceHeader grievance={g} backTo="/officer/grievances" backLabel="Assigned grievances"
              actions={canStart && <Button icon={Play} onClick={() => setConfirmStart(true)}>Start investigation</Button>} />

            {pendingReport && <Alert type="info" className="mb-6" title="Report submitted">Your action-taken report is awaiting CMO review. Only the CMO can resolve this grievance.</Alert>}
            {inProgress && !pendingReport && lastRejected && g.action_reports[0]?.id === lastRejected.id && (
              <Alert type="warning" className="mb-6" title="The CMO requested additional action">{lastRejected.review_remarks}</Alert>
            )}

            <div className="grid gap-6 xl:grid-cols-3">
              <div className="space-y-6 xl:col-span-2">
                <GrievanceDetailsCard grievance={g} extra={[{ label: 'Assigned officer', value: g.assigned_officer || 'Department pool' }]} />
                {inProgress && !pendingReport && (
                  <Card title={<span className="inline-flex items-center gap-2"><FileCheck2 className="size-5 text-brand-700" aria-hidden /> Action-taken report</span>}
                    subtitle="Submit when the issue has been addressed. The CMO will review and approve the resolution.">
                    <ActionReportForm reference={g.reference_number} onDone={reload} />
                  </Card>
                )}
                {g.action_reports.length > 0 && (
                  <Card title="Submitted reports">
                    <div className="space-y-4">{g.action_reports.map((r) => <ActionReportCard key={r.id} report={r} />)}</div>
                  </Card>
                )}
                <Card title="Supporting documents"><AttachmentList attachments={g.attachments} /></Card>
                <Card title="Investigation remarks" subtitle="Internal remarks are visible to the CMO and your department only.">
                  <RemarksPanel remarks={g.remarks} allowVisibility
                    onAdd={async (body) => { await officerApi.addRemark(g.reference_number, body); reload() }} />
                </Card>
              </div>
              <div className="space-y-6">
                {inProgress && <Card title="Update progress"><ProgressForm reference={g.reference_number} onDone={setData} /></Card>}
                {g.assignments[0]?.instructions && (
                  <Card title="CMO instructions">
                    <p className="whitespace-pre-line text-sm text-slate-700">{g.assignments[0].instructions}</p>
                    <p className="mt-2 text-xs text-slate-500">— {g.assignments[0].assigned_by}</p>
                  </Card>
                )}
                <Card title="AI summary"><AIAnalysisPanel analysis={g.ai_analysis} /></Card>
                <Card title="Citizen contact">
                  <DetailList items={[
                    { label: 'Name', value: g.citizen.full_name },
                    { label: 'Mobile', value: g.citizen.mobile || '—' },
                    { label: 'Email', value: g.citizen.email },
                  ]} />
                </Card>
                <Card title="History"><HistoryTimeline items={g.history} /></Card>
              </div>
            </div>
            <ConfirmDialog open={confirmStart} onClose={() => setConfirmStart(false)} onConfirm={start} loading={pending}
              title="Start investigation?" message="The status will change to In Progress and the citizen will be notified." confirmLabel="Start investigation" />
          </>
        )
      })()}
    </AsyncBoundary>
  )
}
