import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  CheckCircle2, ChevronDown, Eye, Gauge, Mail, MapPin, Phone, Scale, Send, ShieldCheck, Target, Users,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { publicApi } from '../../api/endpoints'
import { StatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import DepartmentIcon from '../../components/ui/DepartmentIcon'
import { AsyncBoundary, EmptyState } from '../../components/ui/Feedback'
import { Input, Textarea } from '../../components/ui/Form'
import { useMeta } from '../../context/MetaContext'
import { useToast } from '../../context/ToastContext'
import { applyFieldErrors, getErrorMessage } from '../../utils/errors'
import { contactSchema } from '../../utils/schemas'
import { STEPS } from './HomePage'

function Hero({ title, subtitle }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-brand-950 to-brand-900 text-white py-16 sm:py-20">
      <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-emerald-500/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute left-1/4 -bottom-20 size-72 rounded-full bg-amber-400/15 blur-3xl" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <h1 className="text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl tracking-tight">{title}</h1>
        {subtitle && <p className="mt-3.5 max-w-2xl text-base text-emerald-100/90 leading-relaxed">{subtitle}</p>}
      </div>
    </section>
  )
}

const ABOUT_BLOCKS = [
  {
    icon: Target,
    title: 'Purpose',
    text: 'Give every citizen a simple, direct and accountable channel to bring public-service grievances to the attention of the Chief Minister’s Office.',
    iconStyle: 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20',
    border: 'hover:border-indigo-300',
  },
  {
    icon: Eye,
    title: 'Vision',
    text: 'A responsive government where no citizen’s concern is lost, every grievance is traceable and every resolution is verified.',
    iconStyle: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20',
    border: 'hover:border-sky-300',
  },
  {
    icon: Gauge,
    title: 'Mission',
    text: 'Route each grievance to the right department quickly, monitor action against clear timelines and communicate outcomes transparently.',
    iconStyle: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20',
    border: 'hover:border-emerald-300',
  },
]

export function AboutPage() {
  const objectives = [
    'Single online window for grievances across all departments and districts',
    'Unique reference number and complete status history for every grievance',
    'CMO oversight with escalation of delayed cases',
    'Department accountability through verified action-taken reports',
    'AI-assisted triage to reduce routing delays — with humans making every decision',
    'Citizen feedback and the right to reopen unsatisfactory resolutions',
  ]
  return (
    <>
      <Hero title="About the initiative" subtitle="Listening to citizens, routing grievances to the right departments and monitoring action transparently." />
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {ABOUT_BLOCKS.map(({ icon: Icon, title, text, iconStyle, border }) => (
            <div key={title} className={`group rounded-2xl border border-slate-200/80 bg-white p-7 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${border}`}>
              <span className={`grid size-12 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-105 ${iconStyle}`}>
                <Icon className="size-6" aria-hidden />
              </span>
              <h2 className="mt-5 text-xl font-bold text-slate-900">{title}</h2>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{text}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xs">
          <h2 className="text-xl font-bold text-slate-900">Key Portal Objectives</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {objectives.map((o) => (
              <li key={o} className="flex gap-3 text-sm text-slate-700 items-start">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden />
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-amber-300/60 bg-gradient-to-r from-amber-50 to-gold-50 p-5 text-sm text-amber-950 shadow-xs">
          <strong>Assessment notice:</strong> This website is a recruitment prototype built for a technical assessment. It is not an official service and is not
          authorised or endorsed by the Government of Kerala or the Chief Minister&apos;s Office.
        </div>
      </div>
    </>
  )
}

export function HowItWorksPage() {
  const statuses = [
    ['SUBMITTED', 'Your grievance has been received and a reference number generated.'],
    ['UNDER_REVIEW', 'The CMO is reviewing it and forwarding it to the responsible department.'],
    ['IN_PROGRESS', 'The department officer is investigating and acting on it.'],
    ['RESOLVED', 'The CMO has verified the department’s action-taken report and closed the grievance.'],
    ['REOPENED', 'The resolution was not satisfactory and the grievance is being handled again.'],
  ]
  return (
    <>
      <Hero title="How it works" subtitle="From submission to verified resolution — every step is recorded and visible to you." />
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-14">
        <ol className="space-y-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="flex gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-700 font-semibold text-white">{i + 1}</span>
              <div>
                <h2 className="flex items-center gap-2 font-semibold text-slate-900"><Icon className="size-4 text-brand-600" aria-hidden /> {title}</h2>
                <p className="mt-1 text-sm text-slate-600">{text}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Grievance statuses</h2>
          <dl className="mt-4 divide-y divide-slate-100">
            {statuses.map(([s, text]) => (
              <div key={s} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-6">
                <dt className="w-40 shrink-0"><StatusBadge status={s} /></dt>
                <dd className="text-sm text-slate-600">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            [ShieldCheck, 'Secure & private', 'Only you, the CMO and the assigned department can see your grievance details.'],
            [Scale, 'Human decisions', 'AI only suggests. Routing, priority and resolution are decided by officials.'],
            [Users, 'Accountable', 'Every status change is recorded with the time and the responsible official.'],
          ].map(([Icon, title, text]) => (
            <div key={title} className="rounded-xl bg-brand-50 p-5">
              <Icon className="size-5 text-brand-700" aria-hidden />
              <h3 className="mt-2 font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

const DEPT_PAGE_COLORS = {
  WRD: 'bg-sky-50 text-sky-700 ring-sky-200 group-hover:bg-sky-600 group-hover:text-white',
  HFW: 'bg-rose-50 text-rose-700 ring-rose-200 group-hover:bg-rose-600 group-hover:text-white',
  PWD: 'bg-amber-50 text-amber-800 ring-amber-200 group-hover:bg-amber-600 group-hover:text-white',
  GED: 'bg-indigo-50 text-indigo-700 ring-indigo-200 group-hover:bg-indigo-600 group-hover:text-white',
  REV: 'bg-emerald-50 text-emerald-800 ring-emerald-200 group-hover:bg-emerald-600 group-hover:text-white',
  KSEB: 'bg-yellow-50 text-yellow-800 ring-yellow-200 group-hover:bg-yellow-500 group-hover:text-slate-950',
  TRD: 'bg-blue-50 text-blue-700 ring-blue-200 group-hover:bg-blue-600 group-hover:text-white',
  LSG: 'bg-teal-50 text-teal-700 ring-teal-200 group-hover:bg-teal-600 group-hover:text-white',
}

export function DepartmentsPage() {
  const { departments, error } = useMeta()
  return (
    <>
      <Hero title="Participating Departments" subtitle="State departments receiving, investigating, and redressing citizen grievances through the portal." />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <AsyncBoundary loading={!departments.length && !error} error={error} isEmpty={false}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(departments || []).map((d) => {
              const iconCls = DEPT_PAGE_COLORS[d.code] || 'bg-brand-50 text-brand-700 ring-brand-200 group-hover:bg-brand-600 group-hover:text-white'
              return (
                <article key={d.id} className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg">
                  <div className="flex items-start gap-4">
                    <span className={`grid size-12 shrink-0 place-items-center rounded-xl ring-1 transition-all duration-300 shadow-xs ${iconCls}`}>
                      <DepartmentIcon name={d.icon} className="size-6" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">{d.code}</span>
                      </div>
                      <h2 className="mt-1.5 text-base font-bold text-slate-900 group-hover:text-brand-700 transition-colors">{d.name}</h2>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600">{d.description}</p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </AsyncBoundary>
      </div>
    </>
  )
}

const FAQS = [
  ['Who can submit a grievance?', 'Any citizen can register with their name, email and mobile number and submit grievances about public services.'],
  ['What is a reference number?', 'Every grievance gets a unique reference number like CMK-2026-00001. Use it to track the grievance at any time, even without logging in.'],
  ['How do I track my grievance?', 'Use “Track Grievance” and enter your reference number to see the current status, the department handling it and the status history. Log in to see full details and remarks.'],
  ['What documents can I attach?', 'Up to 3 files per grievance in JPG, PNG or PDF format, each up to 4 MB.'],
  ['What does the AI assistant do?', 'It reads your description and suggests a category, department and priority, plus a short summary for the CMO. It never makes decisions — you choose the category and officials decide routing and priority.'],
  ['How long will it take?', 'Target timelines depend on priority: 7 days for high, 15 days for medium and 30 days for low priority grievances. Delayed grievances are escalated by the CMO.'],
  ['What if I am not satisfied with the resolution?', 'After resolution you can rate the outcome and reopen the grievance within 30 days, explaining why.'],
  ['Is this an official government website?', 'No. This is a recruitment prototype using fictional data. Do not submit real personal grievances here.'],
]

export function FAQPage() {
  return (
    <>
      <Hero title="Frequently asked questions" subtitle="Everything you need to know about submitting and tracking grievances." />
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-14">
        {FAQS.map(([q, a]) => (
          <details key={q} className="group rounded-xl bg-white shadow-sm ring-1 ring-slate-200 open:ring-brand-300">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium text-slate-900">
              {q}
              <ChevronDown className="size-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600">{a}</p>
          </details>
        ))}
      </div>
    </>
  )
}

export function ContactPage() {
  const toast = useToast()
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', subject: '', message: '' },
  })

  const onSubmit = async (values) => {
    try {
      await publicApi.contact(values)
      reset()
      setSent(true)
      toast.success('Thank you! Your enquiry has been received.')
    } catch (err) {
      if (!applyFieldErrors(err, setError, Object.keys(values))) toast.error(getErrorMessage(err))
    }
  }

  return (
    <>
      <Hero title="Contact us" subtitle="Questions about the portal? Send us a message. To raise a grievance, please use Submit Grievance instead." />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 lg:grid-cols-[1fr_2fr]">
        <aside className="space-y-4">
          {[
            [MapPin, 'Address', 'Grievance Cell (prototype), Thiruvananthapuram, Kerala'],
            [Mail, 'Email', 'grievance-cell@example.com'],
            [Phone, 'Helpline', '1800-000-0000 (fictional)'],
          ].map(([Icon, label, value]) => (
            <div key={label} className="flex gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <Icon className="mt-0.5 size-5 text-brand-700" aria-hidden />
              <div>
                <p className="text-sm font-medium text-slate-900">{label}</p>
                <p className="text-sm text-slate-600">{value}</p>
              </div>
            </div>
          ))}
        </aside>
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          {sent && (
            <div role="status" className="mb-5 flex items-center gap-2 rounded-lg bg-brand-50 p-3 text-sm text-brand-800">
              <CheckCircle2 className="size-4" aria-hidden /> Your enquiry was saved. Our team will get back to you.
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" required {...register('name')} error={errors.name?.message} autoComplete="name" />
            <Input label="Email" type="email" required {...register('email')} error={errors.email?.message} autoComplete="email" />
            <Input className="sm:col-span-2" label="Subject" required {...register('subject')} error={errors.subject?.message} />
            <Textarea className="sm:col-span-2" label="Message" required rows={6} {...register('message')} error={errors.message?.message} maxLength={3000} />
            <div className="sm:col-span-2">
              <Button type="submit" icon={Send} loading={isSubmitting}>Send message</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24">
      <EmptyState title="Page not found" message="The page you are looking for does not exist or has moved."
        action={<Button to="/">Go to home page</Button>} />
    </div>
  )
}
