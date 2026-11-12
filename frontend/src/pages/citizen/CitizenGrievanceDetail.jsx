import { useState } from 'react'
import { CheckCircle2, RotateCcw, Star, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { citizenApi } from '../../api/endpoints'
import AttachmentList from '../../components/grievance/AttachmentList'
import { GrievanceDetailsCard, GrievanceHeader } from '../../components/grievance/GrievanceOverview'
import HistoryTimeline from '../../components/grievance/HistoryTimeline'
import RemarksPanel from '../../components/grievance/RemarksPanel'
import Button from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { AsyncBoundary } from '../../components/ui/Feedback'
import { Textarea } from '../../components/ui/Form'
import { ReasonDialog } from '../../components/ui/Modal'
import { useAction } from '../../hooks/useAction'
import { useApi } from '../../hooks/useApi'
import { formatDateTime } from '../../utils/format'

function FeedbackForm({ reference, onDone }) {
  const [rating, setRating] = useState(0)
  const [satisfied, setSatisfied] = useState(null)
  const [comments, setComments] = useState('')
  const [error, setError] = useState('')
  const { run, pending } = useAction()

  const submit = async (e) => {
    e.preventDefault()
    if (!rating || satisfied === null) return setError('Please choose a rating and whether you are satisfied.')
    setError('')
    await run(() => citizenApi.feedback(reference, { rating, is_satisfied: satisfied, comments }), {
      success: 'Thank you for your feedback.', onSuccess: onDone,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset>
        <legend className="text-sm font-medium text-slate-700">How would you rate the resolution?</legend>
        <div className="mt-2 flex gap-1" role="radiogroup">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
              onClick={() => setRating(n)} className="rounded p-1 hover:bg-gold-100">
              <Star className={`size-7 ${n <= rating ? 'fill-gold-400 text-gold-500' : 'text-slate-300'}`} />
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium text-slate-700">Are you satisfied with the outcome?</legend>
        <div className="mt-2 flex gap-2">
          {[[true, 'Yes', ThumbsUp], [false, 'No', ThumbsDown]].map(([value, label, Icon]) => (
            <button key={label} type="button" aria-pressed={satisfied === value} onClick={() => setSatisfied(value)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm ring-1 ${satisfied === value ? 'bg-brand-700 text-white ring-brand-700' : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50'}`}>
              <Icon className="size-4" aria-hidden /> {label}
            </button>
          ))}
        </div>
      </fieldset>
      <Textarea label="Comments (optional)" rows={3} value={comments} onChange={(e) => setComments(e.target.value)} maxLength={2000} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" loading={pending}>Submit feedback</Button>
    </form>
  )
}

export default function CitizenGrievanceDetail() {
  const { reference } = useParams()
  const { data: g, loading, error, reload, setData } = useApi(() => citizenApi.get(reference), [reference])
  const [reopenOpen, setReopenOpen] = useState(false)
  const { run, pending } = useAction()

  const reopen = (reason) =>
    run(() => citizenApi.reopen(reference, reason), {
      success: 'Your grievance has been reopened and sent back to the CMO.',
      onSuccess: (updated) => { setData(updated); setReopenOpen(false) },
    })

  return (
    <AsyncBoundary loading={loading} error={error} onRetry={reload}>
      {g && (
        <>
          <GrievanceHeader grievance={g} backTo="/citizen/grievances" backLabel="My grievances"
            actions={g.can_reopen && <Button variant="secondary" icon={RotateCcw} onClick={() => setReopenOpen(true)}>Reopen</Button>} />
          <div className="grid gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              {g.resolution && (
                <Card title={<span className="inline-flex items-center gap-2 text-brand-800"><CheckCircle2 className="size-5" aria-hidden /> Resolution</span>}
                  subtitle={`Verified by the CMO on ${formatDateTime(g.resolution.approved_at)}`} className="ring-brand-200">
                  <p className="whitespace-pre-line text-sm text-slate-700">{g.resolution.resolution_details}</p>
                  <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">Action taken by the department</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{g.resolution.action_taken}</p>
                </Card>
              )}
              {g.can_give_feedback && (
                <Card title="Share your feedback" subtitle="Your rating helps the CMO monitor service quality.">
                  <FeedbackForm reference={g.reference_number} onDone={reload} />
                </Card>
              )}
              <GrievanceDetailsCard grievance={g} />
              <Card title="Supporting documents"><AttachmentList attachments={g.attachments} emptyText="You did not attach any documents." /></Card>
              <Card title="Remarks from officials">
                <RemarksPanel remarks={g.remarks} emptyText="No remarks from the CMO or department yet." />
              </Card>
            </div>
            <div className="space-y-6">
              <Card title="Progress"><HistoryTimeline items={g.history} /></Card>
              {g.feedback?.length > 0 && (
                <Card title="Your feedback">
                  <ul className="space-y-3">
                    {g.feedback.map((f) => (
                      <li key={f.id} className="text-sm">
                        <p className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`size-4 ${n <= f.rating ? 'fill-gold-400 text-gold-500' : 'text-slate-300'}`} aria-hidden />)}
                          <span className="sr-only">{f.rating} out of 5</span>
                          <span className="ml-2 text-slate-600">{f.is_satisfied ? 'Satisfied' : 'Not satisfied'}</span>
                        </p>
                        {f.comments && <p className="mt-1 text-slate-600">{f.comments}</p>}
                        <p className="text-xs text-slate-400">{formatDateTime(f.created_at)}</p>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          </div>
          <ReasonDialog open={reopenOpen} onClose={() => setReopenOpen(false)} onSubmit={reopen} loading={pending}
            title="Reopen grievance" label="Why are you reopening this grievance?" confirmLabel="Reopen grievance"
            description="Explain what remains unresolved. The CMO will review it again. You can reopen within 30 days of resolution." />
        </>
      )}
    </AsyncBoundary>
  )
}
