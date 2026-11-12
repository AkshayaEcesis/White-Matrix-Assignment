import { Landmark, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Logo({ light = false, compact = false }) {
  return (
    <Link to="/" className="group flex items-center gap-3 transition-transform hover:scale-[1.02]" aria-label="CM Kerala Grievance Portal home">
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl transition-all duration-300 ${
        light
          ? 'bg-gradient-to-br from-white/20 to-white/5 ring-1 ring-white/30 shadow-md backdrop-blur-md group-hover:ring-white/50'
          : 'bg-gradient-to-br from-emerald-600 via-brand-700 to-brand-900 ring-1 ring-brand-500/30 shadow-md shadow-brand-900/25 group-hover:shadow-brand-800/35'
      }`}>
        <Landmark className={`size-5 transition-transform duration-300 group-hover:scale-110 ${light ? 'text-amber-300' : 'text-gold-400'}`} aria-hidden />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="flex items-center gap-1.5">
            <span className={`block text-base font-bold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>CM Kerala</span>
            <span className="inline-block size-1.5 rounded-full bg-gold-400" />
          </span>
          <span className={`block text-xs font-medium ${light ? 'text-emerald-100/90' : 'text-emerald-800/80'}`}>Public Grievance Portal</span>
        </span>
      )}
    </Link>
  )
}

/** Mandatory disclaimer: this is a recruitment prototype, not an official service. */
export function PrototypeBanner() {
  return (
    <div className="relative overflow-hidden border-b border-amber-300/50 bg-gradient-to-r from-amber-500/15 via-gold-400/25 to-amber-500/15 px-4 py-1.5 text-center text-xs font-medium text-amber-950 backdrop-blur-xs">
      <div className="inline-flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/30 px-2 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-400/50">
          <TriangleAlert className="size-3 text-amber-800" aria-hidden /> Assessment Prototype
        </span>
        <span>Built for WhiteMatrix machine test · Fictional demo data · Not an official Gov of Kerala service.</span>
      </div>
    </div>
  )
}
