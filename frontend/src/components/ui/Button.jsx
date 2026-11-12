import { Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

const VARIANTS = {
  primary: 'bg-gradient-to-r from-emerald-600 via-brand-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-md shadow-emerald-700/25 hover:shadow-lg hover:shadow-emerald-700/35 active:scale-[0.98]',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-brand-700 hover:border-brand-300 shadow-xs active:scale-[0.98]',
  gold: 'bg-gradient-to-r from-amber-400 via-gold-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-semibold shadow-md shadow-amber-500/30 hover:shadow-lg hover:shadow-amber-500/40 active:scale-[0.98]',
  danger: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-md shadow-rose-600/25 active:scale-[0.98]',
  ghost: 'text-slate-600 hover:bg-brand-50/70 hover:text-brand-700',
  outlineLight: 'text-white border border-white/40 hover:bg-white/15 hover:border-white shadow-xs backdrop-blur-xs active:scale-[0.98]',
}
const SIZES = {
  sm: 'h-8 px-3 text-xs tracking-wide',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base font-semibold',
}

export default function Button({
  variant = 'primary', size = 'md', loading = false, icon: Icon, to, className = '', children, disabled, ...props
}) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${VARIANTS[variant]} ${SIZES[size]} ${className}`
  const content = (
    <>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : Icon && <Icon className="size-4" aria-hidden />}
      {children}
    </>
  )
  if (to) return <Link to={to} className={cls} {...props}>{content}</Link>
  return (
    <button className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {content}
    </button>
  )
}
