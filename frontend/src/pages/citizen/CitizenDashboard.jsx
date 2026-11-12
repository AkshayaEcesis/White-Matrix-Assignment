import { AlertOctagon, Bell, CheckCircle2, ClipboardList, FilePlus2, Hourglass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { citizenApi, notificationApi } from '../../api/endpoints'
import GrievanceTable from '../../components/grievance/GrievanceTable'
import Button from '../../components/ui/Button'
import { Card, PageHeader, StatCard } from '../../components/ui/Card'
import { AsyncBoundary, EmptyState } from '../../components/ui/Feedback'
import { useAuth } from '../../context/AuthContext'
import { useApi } from '../../hooks/useApi'
import { timeAgo } from '../../utils/format'

export default function CitizenDashboard() {
  const { user } = useAuth()
  const stats = useApi(() => citizenApi.stats(), [])
  const notifications = useApi(() => notificationApi.list({ page_size: 5 }), [])
  const t = stats.data?.totals

  return (
    <>
      <PageHeader title={`Welcome, ${user.full_name.split(' ')[0]}`} description="Submit new grievances and follow the progress of your existing ones."
        actions={<Button to="/citizen/grievances/new" icon={FilePlus2}>Submit grievance</Button>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total grievances" value={t?.total} icon={ClipboardList} to="/citizen/grievances" />
        <StatCard label="Pending" value={t?.pending} icon={Hourglass} tone="amber" hint="Not yet resolved" to="/citizen/grievances" />
        <StatCard label="Resolved" value={t?.resolved} icon={CheckCircle2} tone="brand" to="/citizen/grievances?status=RESOLVED" />
        <StatCard label="Past target date" value={t?.overdue} icon={AlertOctagon} tone="red" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Recent grievances" className="xl:col-span-2" bodyClassName=""
          actions={<Link to="/citizen/grievances" className="text-sm font-medium text-brand-700 hover:underline">View all</Link>}>
          <AsyncBoundary loading={stats.loading} error={stats.error} onRetry={stats.reload} isEmpty={!stats.data?.recent.length}
            empty={<EmptyState title="No grievances yet" message="When you submit a grievance, it will appear here with its reference number and status."
              action={<Button to="/citizen/grievances/new" icon={FilePlus2} size="sm">Submit your first grievance</Button>} />}>
            <GrievanceTable rows={stats.data?.recent || []} linkTo={(g) => `/citizen/grievances/${g.reference_number}`} columns={['category', 'department', 'updated']} />
          </AsyncBoundary>
        </Card>
        <Card title="Latest updates" bodyClassName="p-0"
          actions={<Link to="/citizen/notifications" className="text-sm font-medium text-brand-700 hover:underline">All</Link>}>
          <AsyncBoundary loading={notifications.loading} error={notifications.error} onRetry={notifications.reload}
            isEmpty={!notifications.data?.results.length} empty={<EmptyState icon={Bell} title="No updates yet" />}>
            <ul className="divide-y divide-slate-100">
              {notifications.data?.results.map((n) => (
                <li key={n.id} className="px-5 py-3.5 transition-colors hover:bg-emerald-50/30">
                  <Link to={n.reference_number ? `/citizen/grievances/${n.reference_number}` : '/citizen/notifications'} className="block">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${n.is_read ? 'text-slate-700' : 'font-bold text-slate-900'}`}>{n.title}</p>
                      {!n.is_read && <span className="mt-1 size-2 rounded-full bg-emerald-500 shrink-0" />}
                    </div>
                    <p className="line-clamp-2 text-xs text-slate-500 mt-0.5">{n.message}</p>
                    <p className="mt-1.5 text-[11px] font-medium text-slate-400">{timeAgo(n.created_at)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </AsyncBoundary>
        </Card>
      </div>
    </>
  )
}
