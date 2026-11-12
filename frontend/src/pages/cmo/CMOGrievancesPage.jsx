import { cmoApi } from '../../api/endpoints'
import GrievanceFilters from '../../components/grievance/GrievanceFilters'
import GrievanceTable from '../../components/grievance/GrievanceTable'
import { Card, PageHeader } from '../../components/ui/Card'
import { AsyncBoundary, EmptyState } from '../../components/ui/Feedback'
import Pagination from '../../components/ui/Pagination'
import { useApi } from '../../hooks/useApi'
import { useListParams } from '../../hooks/useListParams'

const KEYS = ['search', 'status', 'district', 'category', 'priority', 'department', 'overdue', 'is_escalated', 'unassigned', 'ordering']

export default function CMOGrievancesPage() {
  const { params, setParam, reset } = useListParams(KEYS)
  const { data, loading, error, reload } = useApi(() => cmoApi.list(params), [JSON.stringify(params)])

  return (
    <>
      <PageHeader title="All grievances" description="Search, filter and open any grievance to review, assign or escalate it."
        actions={
          <select aria-label="Sort grievances" value={params.ordering || ''} onChange={(e) => setParam('ordering', e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm">
            <option value="">Newest first</option>
            <option value="created_at">Oldest first</option>
            <option value="-priority_rank">Highest priority first</option>
            <option value="due_at">Nearest target date first</option>
            <option value="-updated_at">Recently updated</option>
          </select>
        } />
      <Card bodyClassName="">
        <GrievanceFilters params={params} setParam={setParam} reset={reset}
          fields={['status', 'district', 'category', 'priority', 'department', 'overdue', 'is_escalated']} />
        {params.unassigned && (
          <p className="border-b border-slate-100 bg-sky-50 px-4 py-2 text-sm text-sky-800">Showing grievances not yet assigned to a department.</p>
        )}
        <AsyncBoundary loading={loading} error={error} onRetry={reload} isEmpty={!data?.results.length}
          empty={<EmptyState title="No grievances match these filters" />}>
          <GrievanceTable rows={data?.results || []} linkTo={(g) => `/cmo/grievances/${g.reference_number}`}
            columns={['district', 'category', 'priority', 'department', 'due', 'created']} />
          <Pagination page={params.page} count={data?.count} onChange={(p) => setParam('page', p)} />
        </AsyncBoundary>
      </Card>
    </>
  )
}
