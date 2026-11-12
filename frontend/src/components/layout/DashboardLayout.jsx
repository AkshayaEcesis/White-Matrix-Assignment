import { useEffect, useState } from 'react'
import {
  Bell, BarChart3, ClipboardCheck, FilePlus2, FileSearch, FolderKanban, Home, LayoutDashboard,
  ListChecks, LogOut, Mail, Menu, X,
} from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { notificationApi } from '../../api/endpoints'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { ConfirmDialog } from '../ui/Modal'
import { Logo, PrototypeBanner } from './Brand'

/** Sidebar navigation per role - one layout, configured by data (no duplicated UI). */
const NAV = {
  CITIZEN: [
    { to: '/citizen', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/citizen/grievances/new', label: 'Submit Grievance', icon: FilePlus2 },
    { to: '/citizen/grievances', label: 'My Grievances', icon: ListChecks, end: true },
    { to: '/citizen/notifications', label: 'Notifications', icon: Bell },
    { to: '/track', label: 'Track by Reference', icon: FileSearch },
  ],
  CMO_ADMIN: [
    { to: '/cmo', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/cmo/grievances', label: 'All Grievances', icon: FolderKanban },
    { to: '/cmo/reports', label: 'Action Reports', icon: ClipboardCheck },
    { to: '/cmo/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/cmo/enquiries', label: 'Contact Enquiries', icon: Mail },
    { to: '/cmo/notifications', label: 'Notifications', icon: Bell },
  ],
  OFFICER: [
    { to: '/officer', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/officer/grievances', label: 'Assigned Grievances', icon: FolderKanban },
    { to: '/officer/notifications', label: 'Notifications', icon: Bell },
  ],
}
const NOTIF_PATH = { CITIZEN: '/citizen/notifications', CMO_ADMIN: '/cmo/notifications', OFFICER: '/officer/notifications' }

function useUnreadCount() {
  const [count, setCount] = useState(0)
  const location = useLocation()
  useEffect(() => {
    let active = true
    const load = () => notificationApi.unreadCount().then((d) => active && setCount(d.count)).catch(() => {})
    load()
    const timer = setInterval(load, 60000)
    return () => { active = false; clearInterval(timer) }
  }, [location.pathname])
  return count
}

const ROLE_BADGE = {
  CITIZEN: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
  CMO_ADMIN: 'bg-amber-50 text-amber-900 border border-amber-300/80 font-semibold',
  OFFICER: 'bg-sky-50 text-sky-900 border border-sky-200/80',
}

function Sidebar({ items, onNavigate }) {
  const linkCls = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow-md shadow-brand-950/40 ring-1 ring-white/10'
        : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
    }`
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-brand-950 via-brand-900 to-slate-950 border-r border-brand-800/40 text-white shadow-xl">
      <div className="px-5 py-5 border-b border-white/10"><Logo light /></div>
      <nav aria-label="Dashboard" className="flex-1 space-y-1.5 px-3 py-4">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={linkCls} onClick={onNavigate}>
            <Icon className="size-5 shrink-0" aria-hidden /> <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10">
        <Link to="/" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-emerald-200/90 hover:bg-white/10 hover:text-white transition-colors">
          <Home className="size-5" aria-hidden /> Public website
        </Link>
      </div>
    </div>
  )
}

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const unread = useUnreadCount()
  const items = NAV[user.role] || []

  const doLogout = async () => {
    await logout()
    setConfirmLogout(false)
    toast.success('You have been logged out securely.')
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PrototypeBanner />
      <div className="flex flex-1">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-0 h-screen"><Sidebar items={items} /></div>
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
            <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
            <div className="relative h-full w-72">
              <Sidebar items={items} onNavigate={() => setMobileOpen(false)} />
              <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-5 rounded p-1 text-white" aria-label="Close menu">
                <X className="size-5" />
              </button>
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md sm:px-6 shadow-2xs">
            <div className="flex items-center gap-3">
              <button className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
                <Menu className="size-5" />
              </button>
              <div className="hidden sm:flex sm:items-center sm:gap-2.5">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_BADGE[user.role] || 'bg-slate-100 text-slate-700'}`}>
                  {user.role_label}
                </span>
                {user.department && <span className="text-xs font-medium text-slate-500">· {user.department.name}</span>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link to={NOTIF_PATH[user.role]} className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
                <Bell className="size-5" />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-gradient-to-r from-red-600 to-rose-600 px-1 text-[10px] font-bold text-white shadow-xs">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </Link>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-900">{user.full_name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
              <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-sm font-bold text-white shadow-sm ring-2 ring-emerald-100" aria-hidden>
                {user.full_name?.[0]?.toUpperCase()}
              </span>
              <button onClick={() => setConfirmLogout(true)} className="rounded-xl p-2 text-slate-500 hover:bg-red-50 hover:text-red-700 transition-colors" aria-label="Log out">
                <LogOut className="size-5" />
              </button>
            </div>
          </header>
          <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
      <ConfirmDialog open={confirmLogout} onClose={() => setConfirmLogout(false)} onConfirm={doLogout}
        title="Log out?" message="You will need to sign in again to access your dashboard." confirmLabel="Log out" variant="danger" />
    </div>
  )
}
