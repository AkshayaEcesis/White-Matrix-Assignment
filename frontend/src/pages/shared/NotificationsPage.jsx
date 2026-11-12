import { Bell, CheckCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { notificationApi } from '../../api/endpoints'
import Button from '../../components/ui/Button'
import { Card, PageHeader } from '../../components/ui/Card'
import { AsyncBoundary, EmptyState } from '../../components/ui/Feedback'
import Pagination from '../../components/ui/Pagination'
import { useAuth } from '../../context/AuthContext'
import { useAction } from '../../hooks/useAction'
import { useApi } from '../../hooks/useApi'
import { useListParams } from '../../hooks/useListParams'
import { formatDateTime, grievancePath, timeAgo } from '../../utils/format'

const KEYS = ['is_read']

export default function NotificationsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { params, setParam } = useListParams(KEYS)
  const { data, loading, error, reload, setData } = useApi(() => notificationApi.list(params), [JSON.stringify(params)])
  const { run, pending } = useAction()

  const open = async (n) => {
    if (!n.is_read) {
      notificationApi.markRead(n.id).catch(() => {})
      setData((d) => ({ ...d, results: d.results.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)) }))
    }
    if (n.reference_number) navigate(grievancePath(user.role, n.reference_number))
  }

  return (
    <>
      <PageHeader title="Notifications" description="Updates about grievances you are involved with."
        actions={
          <>
            <select aria-label="Filter notifications" value={params.is_read || ''} onChange={(e) => setParam('is_read', e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm">
              <option value="">All</option>
              <option value="false">Unread</option>
              <option value="true">Read</option>
            </select>
            <Button variant="secondary" icon={CheckCheck} loading={pending}
              onClick={() => run(() => notificationApi.markAllRead(), { success: 'All notifications marked as read.', onSuccess: reload })}>
              Mark all read
            </Button>
          </>
        } />
      <Card bodyClassName="">
        <AsyncBoundary loading={loading} error={error} onRetry={reload} isEmpty={!data?.results.length}
          empty={<EmptyState icon={Bell} title="No notifications" message="You will be notified when there is an update on a grievance." />}>
          <ul className="divide-y divide-slate-100">
            {data?.results.map((n) => (
              <li key={n.id}>
                <button onClick={() => open(n)} className={`flex w-full gap-3 px-5 py-4 text-left hover:bg-slate-50 ${n.is_read ? '' : 'bg-brand-50/50'}`}>
                  <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-brand-600'}`} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${n.is_read ? 'text-slate-700' : 'font-semibold text-slate-900'}`}>
                      {n.title}{!n.is_read && <span className="sr-only"> (unread)</span>}
                    </span>
                    <span className="mt-0.5 block text-sm text-slate-600">{n.message}</span>
                    <span className="mt-1 block text-xs text-slate-400" title={formatDateTime(n.created_at)}>{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Pagination page={params.page} count={data?.count} onChange={(p) => setParam('page', p)} />
        </AsyncBoundary>
      </Card>
    </>
  )
}
