import { useState } from 'react'
import { LayoutDashboard, Menu, X } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROLE_HOME } from '../../utils/format'
import Button from '../ui/Button'
import { Logo, PrototypeBanner } from './Brand'

const LINKS = [
  ['/', 'Home'],
  ['/about', 'About Us'],
  ['/how-it-works', 'How It Works'],
  ['/departments', 'Departments'],
  ['/track', 'Track Grievance'],
  ['/faq', 'FAQ'],
  ['/contact', 'Contact'],
]

function Navbar() {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const linkCls = ({ isActive }) =>
    `rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-brand-50 text-brand-700 font-semibold ring-1 ring-brand-200/70 shadow-xs'
        : 'text-slate-600 hover:bg-slate-100/80 hover:text-brand-700'
    }`

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-xs">
      <PrototypeBanner />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1.5 lg:flex">
          {LINKS.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'} className={linkCls}>{label}</NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <Button to={ROLE_HOME[user.role]} icon={LayoutDashboard} size="sm">My Dashboard</Button>
          ) : (
            <>
              <Button to="/login" variant="ghost" size="sm">Log in</Button>
              <Button to="/register" variant="gold" size="sm">Register</Button>
            </>
          )}
        </div>
        <button className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(!open)}
          aria-expanded={open} aria-controls="mobile-nav" aria-label="Toggle menu">
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-slate-200/80 bg-white px-4 py-3 shadow-lg lg:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === '/'} className={linkCls} onClick={() => setOpen(false)}>{label}</NavLink>
            ))}
          </div>
          <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
            {user ? (
              <Button to={ROLE_HOME[user.role]} size="sm" className="flex-1" onClick={() => setOpen(false)}>My Dashboard</Button>
            ) : (
              <>
                <Button to="/login" variant="secondary" size="sm" className="flex-1" onClick={() => setOpen(false)}>Log in</Button>
                <Button to="/register" variant="gold" size="sm" className="flex-1" onClick={() => setOpen(false)}>Register</Button>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}

const CURRENT_YEAR = new Date().getFullYear()

function Footer() {
  return (
    <footer className="relative mt-20 overflow-hidden bg-gradient-to-br from-slate-950 via-brand-950 to-brand-900 text-slate-200">
      <div className="h-1 bg-gradient-to-r from-emerald-500 via-gold-400 to-teal-400" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
        <div className="sm:col-span-2 space-y-4">
          <Logo light />
          <p className="max-w-md text-sm text-slate-300 leading-relaxed">
            A digital channel for citizens to raise grievances directly with the Chief Minister&apos;s Office, track progress
            transparently and receive timely, verified resolutions.
          </p>
          <div className="rounded-xl bg-white/5 p-3.5 ring-1 ring-white/10 max-w-md">
            <p className="text-xs text-emerald-200/90 leading-relaxed">
              Recruitment prototype built for the WhiteMatrix Software Solutions machine test. Not affiliated with or
              endorsed by the Government of Kerala. All data and records are fictional.
            </p>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-300">Citizens</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><NavLink to="/citizen/grievances/new" className="text-slate-300 transition-colors hover:text-white hover:underline">Submit a grievance</NavLink></li>
            <li><NavLink to="/track" className="text-slate-300 transition-colors hover:text-white hover:underline">Track a grievance</NavLink></li>
            <li><NavLink to="/how-it-works" className="text-slate-300 transition-colors hover:text-white hover:underline">How it works</NavLink></li>
            <li><NavLink to="/faq" className="text-slate-300 transition-colors hover:text-white hover:underline">FAQ</NavLink></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-300">Portal</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><NavLink to="/about" className="text-slate-300 transition-colors hover:text-white hover:underline">About us</NavLink></li>
            <li><NavLink to="/departments" className="text-slate-300 transition-colors hover:text-white hover:underline">Departments</NavLink></li>
            <li><NavLink to="/contact" className="text-slate-300 transition-colors hover:text-white hover:underline">Contact us</NavLink></li>
            <li><NavLink to="/login" className="text-slate-300 transition-colors hover:text-white hover:underline">Staff login</NavLink></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-slate-400">
        © {CURRENT_YEAR} CM Kerala Grievance Portal — Recruitment prototype for demonstration only.
      </div>
    </footer>
  )
}

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
