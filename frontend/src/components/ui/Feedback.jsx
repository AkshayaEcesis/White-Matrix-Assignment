import { AlertTriangle, Inbox, Info, Loader2, RefreshCw, XCircle } from 'lucide-react'
import Button from './Button'

export function Spinner({ label = 'Loading…', className = '' }) {
  return (
    <div role="status" className={`flex items-center justify-center gap-2 py-10 text-sm text-slate-500 ${className}`}>
      <Loader2 className="size-5 animate-spin text-brand-600" aria-hidden />
      <span>{label}</span>
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Spinner />
    </div>
  )
}

export function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', message, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3.5 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200/60 shadow-xs border border-slate-200/80">
        <Icon className="size-6 text-slate-400" aria-hidden />
      </div>
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
      {message && <p className="mt-1.5 max-w-md text-xs sm:text-sm text-slate-500 leading-relaxed">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3.5 grid size-14 place-items-center rounded-2xl bg-rose-50 border border-rose-200 shadow-xs">
        <XCircle className="size-7 text-rose-500" aria-hidden />
      </div>
      <h3 className="text-base font-bold text-slate-900">Could not load data</h3>
      <p className="mt-1.5 max-w-md text-xs sm:text-sm text-slate-500 leading-relaxed">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry} className="mt-5">
          Try again
        </Button>
      )}
    </div>
  )
}

const ALERT = {
  info: { icon: Info, cls: 'bg-sky-50/90 text-sky-950 border-sky-300 shadow-xs' },
  warning: { icon: AlertTriangle, cls: 'bg-amber-50/90 text-amber-950 border-amber-300 shadow-xs' },
  error: { icon: XCircle, cls: 'bg-rose-50/90 text-rose-950 border-rose-300 shadow-xs' },
  success: { icon: Info, cls: 'bg-emerald-50/90 text-emerald-950 border-emerald-300 shadow-xs' },
}

export function Alert({ type = 'info', title, children, className = '' }) {
  const { icon: Icon, cls } = ALERT[type]
  return (
    <div role={type === 'error' ? 'alert' : undefined} className={`flex gap-3 rounded-xl p-3.5 text-xs sm:text-sm border ${cls} ${className}`}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>
        {title && <p className="font-bold">{title}</p>}
        <div className={title ? 'mt-1 leading-relaxed' : 'leading-relaxed'}>{children}</div>
      </div>
    </div>
  )
}

/** Renders loading / error / empty / content consistently for any async data. */
export function AsyncBoundary({ loading, error, onRetry, isEmpty, empty, children }) {
  if (loading) return <Spinner />
  if (error) return <ErrorState message={error} onRetry={onRetry} />
  if (isEmpty) return empty ?? <EmptyState />
  return children
}
