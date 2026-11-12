import { Check, Mail } from 'lucide-react'
import { cmoApi } from '../../api/endpoints'
import { Badge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Card, PageHeader } from '../../components/ui/Card'
import { AsyncBoundary, EmptyState } from '../../components/ui/Feedback'
import Pagination from '../../components/ui/Pagination'
import { useAction } from '../../hooks/useAction'
import { useApi } from '../../hooks/useApi'
import { useListParams } from '../../hooks/useListParams'
import { formatDateTime } from '../../utils/format'

const KEYS = ['is_reviewed', 'search']

export default function CMOEnquiriesPage() {
  const { params, setParam } = useListParams(KEYS)
  const { data, loading, error, reload, setData } = useApi(() => cmoApi.enquiries(params), [JSON.stringify(params)])
  const { run } = useAction()

  const markReviewed = (id) =>
    run(() => cmoApi.markEnquiryReviewed(id), {
      success: 'Marked as reviewed.',
      onSuccess: (updated) => setData((d) => ({ ...d, results: d.results.map((e) => (e.id === id ? updated : e)) })),
    })

  return (
    <>
      <PageHeader title="Contact enquiries" description="Messages submitted through the public Contact Us form."
        actions={
          <select aria-label="Filter enquiries" value={params.is_reviewed || ''} onChange={(e) => setParam('is_reviewed', e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm">
            <option value="">All enquiries</option>
            <option value="false">New</option>
            <option value="true">Reviewed</option>
          </select>
        } />
      <Card bodyClassName="">
        <AsyncBoundary loading={loading} error={error} onRetry={reload} isEmpty={!data?.results.length}
          empty={<EmptyState icon={Mail} title="No enquiries" />}>
          <ul className="divide-y divide-slate-100">
            {data?.results.map((e) => (
              <li key={e.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{e.subject}</p>
                    {e.is_reviewed
                      ? <Badge className="bg-slate-50 text-slate-600 ring-slate-200">Reviewed</Badge>
                      : <Badge className="bg-sky-50 text-sky-700 ring-sky-200">New</Badge>}
                  </div>
                  <p className="text-xs text-slate-500">{e.name} · {e.email} · {formatDateTime(e.created_at)}</p>
                  <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{e.message}</p>
                </div>
                {!e.is_reviewed && <Button size="sm" variant="secondary" icon={Check} onClick={() => markReviewed(e.id)}>Mark reviewed</Button>}
              </li>
            ))}
          </ul>
          <Pagination page={params.page} count={data?.count} onChange={(p) => setParam('page', p)} />
        </AsyncBoundary>
      </Card>
    </>
  )
}
