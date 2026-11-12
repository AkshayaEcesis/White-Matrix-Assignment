import { AlertOctagon, ArrowDown, ArrowRight, ArrowUp, CheckCircle2, CircleDot, Clock, RotateCcw, Search, Siren } from 'lucide-react'

export function Badge({ children, className = '', icon: Icon }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium border ${className}`}>
      {Icon && <Icon className="size-3.5 shrink-0" aria-hidden />}
      <span>{children}</span>
    </span>
  )
}

// Status is always shown as icon + text, never colour alone.
const STATUS = {
  SUBMITTED: { label: 'Submitted', icon: CircleDot, cls: 'bg-slate-100 text-slate-700 border-slate-300/80' },
  UNDER_REVIEW: { label: 'Under Review', icon: Search, cls: 'bg-gradient-to-r from-amber-50 to-amber-100/70 text-amber-900 border-amber-300/90 shadow-xs shadow-amber-500/10 font-semibold' },
  IN_PROGRESS: { label: 'In Progress', icon: Clock, cls: 'bg-gradient-to-r from-sky-50 to-blue-50 text-sky-900 border-sky-300/90 shadow-xs shadow-sky-500/10 font-semibold' },
  RESOLVED: { label: 'Resolved', icon: CheckCircle2, cls: 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-900 border-emerald-300/90 shadow-xs shadow-emerald-500/10 font-semibold' },
  REOPENED: { label: 'Reopened', icon: RotateCcw, cls: 'bg-gradient-to-r from-rose-50 to-purple-50 text-rose-900 border-rose-300/90 shadow-xs shadow-rose-500/10 font-semibold' },
}

export function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.SUBMITTED
  return <Badge icon={s.icon} className={s.cls}>{s.label}</Badge>
}

const PRIORITY = {
  HIGH: { label: 'High Priority', icon: ArrowUp, cls: 'bg-rose-50 text-rose-700 border-rose-200 font-bold' },
  MEDIUM: { label: 'Medium', icon: ArrowRight, cls: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold' },
  LOW: { label: 'Low', icon: ArrowDown, cls: 'bg-slate-100 text-slate-600 border-slate-200 font-medium' },
}

export function PriorityBadge({ priority }) {
  const p = PRIORITY[priority] || PRIORITY.MEDIUM
  return <Badge icon={p.icon} className={p.cls}>{p.label}</Badge>
}

export function OverdueBadge() {
  return <Badge icon={AlertOctagon} className="bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-500 shadow-xs shadow-red-600/30 font-semibold">Overdue</Badge>
}

export function EscalatedBadge() {
  return <Badge icon={Siren} className="bg-gradient-to-r from-orange-500 to-amber-600 text-white border-orange-400 shadow-xs shadow-orange-500/30 font-semibold">Escalated</Badge>
}
