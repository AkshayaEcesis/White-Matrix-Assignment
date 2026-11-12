import { useEffect, useState } from 'react'
import { Building2, Calendar, FileSearch, MapPin, Search, Tag } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { publicApi } from '../../api/endpoints'
import HistoryTimeline from '../../components/grievance/HistoryTimeline'
import { StatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Alert, Spinner } from '../../components/ui/Feedback'
import { getErrorMessage } from '../../utils/errors'
import { formatDateTime } from '../../utils/format'

const REF_PATTERN = /^CMK-\d{4}-\d{5,}$/

export default function TrackPage() {
  const { reference } = useParams()
  const navigate = useNavigate()
  const [input, setInput] = useState(reference || '')
  const [inputError, setInputError] = useState('')
  const [state, setState] = useState({ loading: false, data: null, error: null })

  useEffect(() => {
    if (!reference) return
    setInput(reference)
    setState({ loading: true, data: null, error: null })
    publicApi.track(reference)
      .then((data) => setState({ loading: false, data, error: null }))
      .catch((err) => setState({
        loading: false, data: null,
        error: err.response?.status === 404 ? 'No grievance was found with this reference number.' : getErrorMessage(err),
      }))
  }, [reference])

  const submit = (e) => {
    e.preventDefault()
    const ref = input.trim().toUpperCase()
    if (!REF_PATTERN.test(ref)) return setInputError('Enter a reference number in the format CMK-2026-00001.')
    setInputError('')
    navigate(`/track/${ref}`)
  }

  const g = state.data
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="text-center max-w-xl mx-auto">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/25 ring-4 ring-emerald-100">
          <FileSearch className="size-7" aria-hidden />
        </span>
        <h1 className="mt-5 text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
          Track Your Grievance
        </h1>
        <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
          Enter your unique reference number to view real-time department routing, progress updates, and timeline history.
        </p>
      </div>

      <form onSubmit={submit} className="mx-auto mt-8 flex max-w-xl flex-col gap-2.5 sm:flex-row" noValidate>
        <div className="flex-1">
          <label htmlFor="ref" className="sr-only">Reference number</label>
          <input id="ref" value={input} onChange={(e) => setInput(e.target.value)} placeholder="CMK-2026-00001"
            aria-invalid={!!inputError} aria-describedby={inputError ? 'ref-error' : undefined}
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-mono uppercase tracking-wider text-slate-900 shadow-xs focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200" />
          {inputError && <p id="ref-error" className="mt-1 text-xs text-red-600">{inputError}</p>}
        </div>
        <Button type="submit" size="lg" icon={Search}>Track</Button>
      </form>

      <div className="mt-12">
        {state.loading && <Spinner label="Looking up grievance…" />}
        {state.error && <Alert type="error">{state.error}</Alert>}
        {g && (
          <div className="space-y-6">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs uppercase font-semibold tracking-wider text-slate-500">Reference number</p>
                  <p className="font-mono text-xl font-bold text-brand-700">{g.reference_number}</p>
                </div>
                <StatusBadge status={g.status} />
              </div>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                {[
                  [Building2, 'Assigned department', g.department || 'Awaiting assignment by the CMO', 'text-sky-600'],
                  [Tag, 'Category', g.category_label, 'text-amber-600'],
                  [MapPin, 'District', g.district_label, 'text-emerald-600'],
                  [Calendar, 'Submitted', formatDateTime(g.created_at), 'text-purple-600'],
                ].map(([Icon, label, value, iconColor]) => (
                  <div key={label} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                    <Icon className={`mt-0.5 size-5 shrink-0 ${iconColor}`} aria-hidden />
                    <div>
                      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-slate-900">{value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </Card>
            <Card title="Status history" subtitle="For citizen privacy, internal officer remarks are visible only to logged-in users.">
              <HistoryTimeline items={g.timeline.map((t, i) => ({ ...t, id: i }))} />
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
