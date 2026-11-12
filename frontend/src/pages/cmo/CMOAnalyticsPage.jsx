import { Link } from 'react-router-dom'
import { cmoApi } from '../../api/endpoints'
import { SimpleBarChart, StackedBreakdownChart } from '../../components/charts/Charts'
import { Card, PageHeader } from '../../components/ui/Card'
import { AsyncBoundary } from '../../components/ui/Feedback'
import { useApi } from '../../hooks/useApi'

function BreakdownTable({ rows, nameLabel, linkParam }) {
  const rate = (r) => (r.total ? `${Math.round((r.resolved * 100) / r.total)}%` : '—')
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {[nameLabel, 'Total', 'Pending', 'Resolved', 'Overdue', 'Resolution rate'].map((h, i) => (
              <th key={h} scope="col" className={`px-4 py-2.5 font-medium text-slate-600 ${i ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.key} className="hover:bg-slate-50">
              <th scope="row" className="px-4 py-2.5 text-left font-medium text-slate-800">
                <Link to={`/cmo/grievances?${linkParam}=${r.key}`} className="hover:text-brand-700 hover:underline">{r.label}</Link>
              </th>
              <td className="px-4 py-2.5 text-right tabular-nums">{r.total}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{r.pending}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{r.resolved}</td>
              <td className={`px-4 py-2.5 text-right tabular-nums ${r.overdue ? 'font-semibold text-red-700' : ''}`}>{r.overdue}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{rate(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function CMOAnalyticsPage() {
  const { data, loading, error, reload } = useApi(() => cmoApi.dashboard(), [])
  const departments = data?.by_department.map((d) => ({ ...d, key: d.id, label: d.name })) || []
  const districts = data?.by_district.map((d) => ({ ...d, key: d.district })) || []

  return (
    <>
      <PageHeader title="Analytics" description="District-wise and department-wise performance, computed live from stored grievances." />
      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        {data && (
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-2">
              <Card title="Department-wise" subtitle="Pending vs resolved">
                <StackedBreakdownChart data={departments.filter((d) => d.total > 0).map((d) => ({ ...d, label: d.name.replace(' Department', '') }))} />
              </Card>
              <Card title="District-wise" subtitle="Pending vs resolved">
                <StackedBreakdownChart data={districts} />
              </Card>
            </div>
            <Card title="Department performance" bodyClassName=""><BreakdownTable rows={departments} nameLabel="Department" linkParam="department" /></Card>
            <Card title="District performance" bodyClassName=""><BreakdownTable rows={districts} nameLabel="District" linkParam="district" /></Card>
            <div className="grid gap-6 xl:grid-cols-2">
              <Card title="Open grievances by priority"><SimpleBarChart data={data.by_priority} name="Open grievances" /></Card>
              <Card title="Grievances by category">
                <SimpleBarChart data={data.by_category.map((c) => ({ ...c, label: c.label.split(' ')[0] }))} height={260} />
              </Card>
            </div>
          </div>
        )}
      </AsyncBoundary>
    </>
  )
}
