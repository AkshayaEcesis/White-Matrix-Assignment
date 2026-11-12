import {
  ArrowRight, Bot, Building2, CheckCircle2, ClipboardList, FilePlus2, FileSearch,
  MapPin, ShieldCheck, Sparkles, Timer, Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { publicApi } from '../../api/endpoints'
import Button from '../../components/ui/Button'
import DepartmentIcon from '../../components/ui/DepartmentIcon'
import { useMeta } from '../../context/MetaContext'
import { useApi } from '../../hooks/useApi'

export const STEPS = [
  {
    icon: FilePlus2,
    title: 'Submit',
    text: 'Register and describe your grievance with supporting documents. Our AI assistant helps you pick the right category.',
    tone: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    border: 'hover:border-emerald-300',
  },
  {
    icon: ClipboardList,
    title: 'CMO Review',
    text: 'The Chief Minister’s Office reviews every grievance and confirms its priority.',
    tone: 'from-amber-400 to-orange-500',
    iconBg: 'bg-amber-50 text-amber-800 ring-amber-200',
    border: 'hover:border-amber-300',
  },
  {
    icon: Building2,
    title: 'Forward to Department',
    text: 'The CMO forwards the grievance to the responsible department and designated officer.',
    tone: 'from-sky-500 to-blue-600',
    iconBg: 'bg-sky-50 text-sky-700 ring-sky-200',
    border: 'hover:border-sky-300',
  },
  {
    icon: Users,
    title: 'Action & Report',
    text: 'The department investigates on the ground, updates progress and submits an action-taken report.',
    tone: 'from-indigo-500 to-purple-600',
    iconBg: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    border: 'hover:border-indigo-300',
  },
  {
    icon: CheckCircle2,
    title: 'Verified Resolution',
    text: 'The CMO verifies the report before closing. You receive notification and can provide rating or reopen.',
    tone: 'from-teal-500 to-emerald-600',
    iconBg: 'bg-teal-50 text-teal-700 ring-teal-200',
    border: 'hover:border-teal-300',
  },
]

const DEPT_COLORS = {
  WRD: { iconBg: 'bg-sky-100 text-sky-700 ring-sky-200 group-hover:bg-sky-600 group-hover:text-white', badge: 'Water' },
  HFW: { iconBg: 'bg-rose-100 text-rose-700 ring-rose-200 group-hover:bg-rose-600 group-hover:text-white', badge: 'Health' },
  PWD: { iconBg: 'bg-amber-100 text-amber-800 ring-amber-200 group-hover:bg-amber-600 group-hover:text-white', badge: 'Works' },
  GED: { iconBg: 'bg-indigo-100 text-indigo-700 ring-indigo-200 group-hover:bg-indigo-600 group-hover:text-white', badge: 'Education' },
  REV: { iconBg: 'bg-emerald-100 text-emerald-800 ring-emerald-200 group-hover:bg-emerald-600 group-hover:text-white', badge: 'Revenue' },
  KSEB: { iconBg: 'bg-yellow-100 text-yellow-800 ring-yellow-200 group-hover:bg-yellow-500 group-hover:text-slate-950', badge: 'Power' },
  TRD: { iconBg: 'bg-blue-100 text-blue-700 ring-blue-200 group-hover:bg-blue-600 group-hover:text-white', badge: 'Transport' },
  LSG: { iconBg: 'bg-teal-100 text-teal-700 ring-teal-200 group-hover:bg-teal-600 group-hover:text-white', badge: 'Local Gov' },
}

function Stat({ value, label, icon: Icon, accent = 'text-amber-300' }) {
  return (
    <div className="group rounded-2xl bg-white/10 p-5 ring-1 ring-white/20 backdrop-blur-md transition-all duration-300 hover:bg-white/15 hover:ring-amber-300/40 hover:-translate-y-0.5 shadow-lg">
      <div className="flex items-center justify-between">
        <Icon className={`size-6 ${accent} transition-transform duration-300 group-hover:scale-110`} aria-hidden />
        <span className="inline-block size-1.5 rounded-full bg-emerald-400" />
      </div>
      <p className="mt-3 text-3xl font-extrabold tracking-tight tabular-nums text-white">{value ?? '—'}</p>
      <p className="mt-1 text-xs font-medium text-emerald-100/80">{label}</p>
    </div>
  )
}

export default function HomePage() {
  const { data: stats } = useApi(() => publicApi.stats(), [])
  const { departments } = useMeta()

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-brand-950 to-brand-900 text-white">
        {/* Ambient glow orbs */}
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-emerald-500/15 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute left-1/3 -top-32 size-80 rounded-full bg-amber-400/15 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute right-1/4 -bottom-24 size-80 rounded-full bg-teal-500/10 blur-3xl" aria-hidden />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="flex flex-col justify-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-300/30 backdrop-blur-md shadow-inner">
                <ShieldCheck className="size-4 text-amber-300" aria-hidden />
                Government of Kerala · Chief Minister&apos;s Public Redressal
              </span>
            </div>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl tracking-tight">
              Your voice, heard directly by the{' '}
              <span className="bg-gradient-to-r from-amber-300 via-gold-300 to-yellow-200 bg-clip-text text-transparent">
                Chief Minister&apos;s Office
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-emerald-100/90 leading-relaxed font-normal">
              Raise grievances about public services, track every step transparently with real-time audit trails,
              and receive verified, accountable resolutions.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button to="/citizen/grievances/new" variant="gold" size="lg" icon={FilePlus2}>
                Submit a Grievance
              </Button>
              <Button to="/track" variant="outlineLight" size="lg" icon={FileSearch}>
                Track Grievance
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-6 text-xs text-emerald-200/80">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-400" />
                <span>AI-Assisted Triage</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-amber-400" />
                <span>CMO Oversight</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-teal-400" />
                <span>Official Audit Log</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <div className="grid gap-4 sm:grid-cols-2">
              <Stat icon={ClipboardList} value={stats?.total} label="Grievances received" accent="text-amber-300" />
              <Stat icon={CheckCircle2} value={stats ? `${stats.resolution_rate}%` : null} label="Resolution rate" accent="text-emerald-400" />
              <Stat icon={Building2} value={stats?.departments} label="Connected departments" accent="text-sky-300" />
              <Stat icon={Timer} value={stats?.avg_resolution_days != null ? `${stats.avg_resolution_days} days` : '—'} label="Avg resolution time" accent="text-purple-300" />
              <div className="rounded-xl bg-white/5 p-3 text-xs text-emerald-200/70 sm:col-span-2 border border-white/10 flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live figures from the evaluation prototype database (fictional demonstration data).</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-700 ring-1 ring-brand-200">
            Transparent Workflow
          </span>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
            How your grievance is redressed
          </h2>
          <p className="mt-3 text-base text-slate-600">
            A transparent five-step process ensuring every concern is logged, forwarded, investigated, and verified.
          </p>
        </div>

        <ol className="mt-12 grid gap-6 md:grid-cols-5">
          {STEPS.map(({ icon: Icon, title, text, tone, iconBg, border }, i) => (
            <li
              key={title}
              className={`group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${border}`}
            >
              <div className="absolute top-0 inset-x-0 h-1.5 rounded-t-2xl bg-gradient-to-r opacity-90 transition-opacity" style={{ backgroundImage: `linear-gradient(to right, var(--color-brand-600), var(--color-gold-400))` }} />
              <div>
                <div className="flex items-center justify-between">
                  <span className={`grid size-12 place-items-center rounded-xl ring-1 ${iconBg} shadow-xs transition-transform duration-300 group-hover:scale-105`}>
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <span className={`grid size-7 place-items-center rounded-full bg-gradient-to-br ${tone} text-xs font-bold text-white shadow-xs`}>
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Featured Departments */}
      <section className="border-y border-slate-200/80 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center rounded-full bg-gold-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800 ring-1 ring-amber-200">
                Public Administration
              </span>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
                Featured Departments
              </h2>
              <p className="mt-2 text-base text-slate-600">
                Grievances are directed to dedicated departmental enquiry officers across Kerala.
              </p>
            </div>
            <Link
              to="/departments"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-100 hover:text-brand-800 transition-colors"
            >
              All 12 departments <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {departments.slice(0, 6).map((d) => {
              const theme = DEPT_COLORS[d.code] || {
                iconBg: 'bg-brand-50 text-brand-700 ring-brand-200 group-hover:bg-brand-600 group-hover:text-white',
                badge: 'Govt Dept',
              }
              return (
                <div
                  key={d.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-brand-400 hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <span className={`grid size-12 shrink-0 place-items-center rounded-xl ring-1 transition-all duration-300 shadow-xs ${theme.iconBg}`}>
                      <DepartmentIcon name={d.icon} className="size-6" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                          {d.code}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500">{theme.badge}</span>
                      </div>
                      <h3 className="mt-1.5 text-base font-bold text-slate-900 group-hover:text-brand-700 transition-colors">
                        {d.name}
                      </h3>
                      <p className="mt-1.5 text-xs text-slate-500 leading-relaxed line-clamp-2">
                        {d.description}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* AI Assistant Banner */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 p-8 sm:p-12 text-white shadow-2xl">
          {/* Ambient colored lighting inside card */}
          <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-purple-500/20 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute left-1/3 -bottom-20 size-80 rounded-full bg-emerald-500/15 blur-3xl" aria-hidden />

          <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-950/40 ring-4 ring-purple-400/20">
                <Sparkles className="size-8" aria-hidden />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-200 ring-1 ring-purple-400/30">
                    <Bot className="size-3.5 text-purple-300" /> Google Gemini AI
                  </span>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-200 ring-1 ring-emerald-400/30">
                    Human-in-the-loop
                  </span>
                </div>
                <h2 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl tracking-tight">
                  Intelligent Grievance Triage Assistant
                </h2>
                <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-indigo-100/90">
                  Write your grievance in simple words. Our AI assistant analyzes the description, recommends the most
                  appropriate department and urgency, and flags potential duplicates. Final routing decisions always remain
                  with human officials.
                </p>
              </div>
            </div>
            <div className="flex shrink-0">
              <Button to="/citizen/grievances/new" variant="gold" size="lg" icon={MapPin}>
                Try AI Assistant
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
