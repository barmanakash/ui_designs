import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { sb } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import type { Report } from '@/types'

/** Copyright/content reports. Our policy promises a review within 48 hours, so open ones sort first. */
export function ReportsPanel() {
  const toast = useToast()
  const qc = useQueryClient()

  const reports = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const { data, error } = await sb().from('reports').select('*, designs(title,slug)').order('created_at', { ascending: false })
      if (error) throw error
      const rows = (data ?? []) as unknown as Report[]
      return [...rows].sort((a, b) => Number(b.status === 'open') - Number(a.status === 'open'))
    },
  })

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Report['status'] }) => {
      const { error } = await sb().from('reports').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reports'] }),
    onError: (e: Error) => toast(e.message, 'error'),
  })

  return (
    <section className="space-y-4" aria-labelledby="reports-h">
      <h2 id="reports-h" className="text-2xl">Reports</h2>
      {reports.isLoading && Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-24" />)}
      {reports.isError && <ErrorState message={(reports.error as Error).message} onRetry={() => reports.refetch()} />}
      {reports.data?.length === 0 && <EmptyState title="No reports" body="Copyright and content reports will appear here." />}
      {reports.data?.map((r) => (
        <article key={r.id} className="surface flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-start">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold">{r.designs?.title ?? 'Deleted design'}</h3>
              <Badge>{r.reason}</Badge>
              <Badge>{r.status}</Badge>
            </div>
            <p className="text-xs text-muted">{formatDate(r.created_at)}{r.reporter_email ? ` · ${r.reporter_email}` : ''}</p>
            {r.details && <p className="whitespace-pre-wrap text-sm text-muted">{r.details}</p>}
            {r.designs && <Link className="text-sm text-accent underline" to={`/design/${r.designs.slug}`}>View design</Link>}
          </div>
          {r.status === 'open' && (
            <div className="flex shrink-0 gap-2">
              <Button size="sm" onClick={() => setStatus.mutate({ id: r.id, status: 'resolved' })} disabled={setStatus.isPending}>Resolve</Button>
              <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: r.id, status: 'dismissed' })} disabled={setStatus.isPending}>Dismiss</Button>
            </div>
          )}
        </article>
      ))}
    </section>
  )
}
