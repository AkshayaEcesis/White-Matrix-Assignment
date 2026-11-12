import { Link } from 'react-router-dom'

export function Card({ title, subtitle, actions, children, className = '', bodyClassName = 'p-6' }) {
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all duration-200 hover:border-slate-300/80 ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/40 px-6 py-4 rounded-t-2xl">
          <div>
            {title && <h2 className="font-bold text-slate-900 text-base">{title}</h2>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

const TONES = {
  brand: {
    icon: 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400/40',
    border: 'border-l-4 border-l-emerald-500 hover:border-l-emerald-600',
    bgHover: 'hover:bg-gradient-to-br hover:from-white hover:to-emerald-50/30',
  },
  amber: {
    icon: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/20 ring-1 ring-amber-400/40',
    border: 'border-l-4 border-l-amber-500 hover:border-l-amber-600',
    bgHover: 'hover:bg-gradient-to-br hover:from-white hover:to-amber-50/30',
  },
  red: {
    icon: 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/20 ring-1 ring-rose-400/40',
    border: 'border-l-4 border-l-rose-500 hover:border-l-rose-600',
    bgHover: 'hover:bg-gradient-to-br hover:from-white hover:to-rose-50/30',
  },
  sky: {
    icon: 'bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-md shadow-sky-500/20 ring-1 ring-sky-400/40',
    border: 'border-l-4 border-l-sky-500 hover:border-l-sky-600',
    bgHover: 'hover:bg-gradient-to-br hover:from-white hover:to-sky-50/30',
  },
  violet: {
    icon: 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20 ring-1 ring-indigo-400/40',
    border: 'border-l-4 border-l-indigo-500 hover:border-l-indigo-600',
    bgHover: 'hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/30',
  },
  slate: {
    icon: 'bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-md shadow-slate-600/20 ring-1 ring-slate-400/40',
    border: 'border-l-4 border-l-slate-400 hover:border-l-slate-500',
    bgHover: 'hover:bg-gradient-to-br hover:from-white hover:to-slate-50/30',
  },
}

export function StatCard({ label, value, icon: Icon, tone = 'brand', hint, to }) {
  const t = TONES[tone] || TONES.brand
  const body = (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1.5 text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">{value ?? '—'}</p>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </div>
      {Icon && (
        <div className={`grid size-11 shrink-0 place-items-center rounded-xl ${t.icon}`}>
          <Icon className="size-5" aria-hidden />
        </div>
      )}
    </div>
  )
  const base = `relative block rounded-2xl bg-white p-5 border border-slate-200/80 shadow-xs transition-all duration-300 ${t.border} ${t.bgHover}`
  return to ? (
    <Link to={to} className={`${base} hover:-translate-y-1 hover:shadow-lg group`}>{body}</Link>
  ) : (
    <div className={base}>{body}</div>
  )
}

export function PageHeader({ title, description, actions, back }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back}
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function DetailList({ items }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.filter(Boolean).map(({ label, value }) => (
        <div key={label}>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
          <dd className="mt-0.5 text-sm text-slate-800">{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}
