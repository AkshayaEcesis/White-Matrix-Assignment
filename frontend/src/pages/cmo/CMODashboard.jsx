import {
  AlertOctagon, CheckCircle2, ClipboardCheck, ClipboardList, Hourglass, Inbox, Siren, Timer,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { cmoApi } from '../../api/endpoints'
import { SimpleBarChart, StackedBreakdownChart, TrendChart } from '../../components/charts/Charts'
import { Card, PageHeader, StatCard } from '../../components/ui/Card'
import { AsyncBoundary, EmptyState } from '../../components/ui/Feedback'
import { useApi } from '../../hooks/useApi'

export default function CMODashboard() {
  const { data, loading, error, reload } = useApi(() => cmoApi.dashboard(), [])
  const t = data?.totals

  return (
    <>
      <PageHeader title="CMO Dashboard" description="Statewide overview of grievances, department performance and pending actions." />
      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total grievances" value={t.total} icon={ClipboardList} to="/cmo/grievances" />
              <StatCard label="Pending" value={t.pending} icon={Hourglass} tone="amber" hint={`${t.submitted} new · ${t.under_review} under review · ${t.in_progress} in progress`}
                to="/cmo/grievances?status=SUBMITTED" />
              <StatCard label="Resolved" value={t.resolved} icon={CheckCircle2} tone="brand"
                hint={t.avg_resolution_days != null ? `Avg. ${t.avg_resolution_days} days to resolve` : undefined} to="/cmo/grievances?status=RESOLVED" />
              <StatCard label="Overdue" value={t.overdue} icon={AlertOctagon} tone="red" hint="Past the target date" to="/cmo/grievances?overdue=true" />
              <StatCard label="Reports awaiting review" value={t.pending_reports} icon={ClipboardCheck} tone="violet" to="/cmo/reports" />
              <StatCard label="Unassigned" value={t.unassigned} icon={Inbox} tone="sky" hint="Not yet forwarded to a department" to="/cmo/grievances?unassigned=true" />
              <StatCard label="Escalated" value={t.escalated} icon={Siren} tone="red" to="/cmo/grievances?is_escalated=true" />
              <StatCard label="Reopened" value={t.reopened} icon={Timer} tone="slate" to="/cmo/grievances?status=REOPENED" />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <Card title="Monthly trend" subtitle="Grievances submitted vs resolved (last 6 months)">
                {data.monthly_trend.length ? <TrendChart data={data.monthly_trend} /> : <EmptyState title="No data yet" />}
              </Card>
              <Card title="Grievances by status">
                <SimpleBarChart data={data.by_status} />
              </Card>
              <Card title="Department-wise" subtitle="Pending and resolved grievances per department"
                actions={<Link to="/cmo/analytics" className="text-sm font-medium text-brand-700 hover:underline">Table view</Link>}>
                <StackedBreakdownChart data={data.by_department.filter((d) => d.total > 0).map((d) => ({ ...d, label: d.name.replace(' Department', '') }))} />
              </Card>
              <Card title="District-wise" subtitle="Pending and resolved grievances per district"
                actions={<Link to="/cmo/analytics" className="text-sm font-medium text-brand-700 hover:underline">Table view</Link>}>
                <StackedBreakdownChart data={data.by_district} />
              </Card>
            </div>
          </>
        )}
      </AsyncBoundary>
    </>
  )
}
