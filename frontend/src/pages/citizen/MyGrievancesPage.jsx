import { FilePlus2 } from 'lucide-react'
import { citizenApi } from '../../api/endpoints'
import GrievanceFilters from '../../components/grievance/GrievanceFilters'
import GrievanceTable from '../../components/grievance/GrievanceTable'
import Button from '../../components/ui/Button'
import { Card, PageHeader } from '../../components/ui/Card'
import { AsyncBoundary, EmptyState } from '../../components/ui/Feedback'
import Pagination from '../../components/ui/Pagination'
import { useApi } from '../../hooks/useApi'
import { useListParams } from '../../hooks/useListParams'

const KEYS = ['search', 'status', 'category']

export default function MyGrievancesPage() {
  const { params, setParam, reset } = useListParams(KEYS)
  const { data, loading, error, reload } = useApi(() => citizenApi.list(params), [JSON.stringify(params)])

  return (
    <>
      <PageHeader title="My grievances" description="All grievances you have submitted, with their current status."
        actions={<Button to="/citizen/grievances/new" icon={FilePlus2}>Submit grievance</Button>} />
      <Card bodyClassName="">
        <GrievanceFilters params={params} setParam={setParam} reset={reset} fields={['status', 'category']} />
        <AsyncBoundary loading={loading} error={error} onRetry={reload} isEmpty={!data?.results.length}
          empty={<EmptyState title="No grievances found" message="Try changing the filters, or submit a new grievance." />}>
          <GrievanceTable rows={data?.results || []} linkTo={(g) => `/citizen/grievances/${g.reference_number}`}
            columns={['category', 'district', 'department', 'created', 'updated']} />
          <Pagination page={params.page} count={data?.count} onChange={(p) => setParam('page', p)} />
        </AsyncBoundary>
      </Card>
    </>
  )
}
