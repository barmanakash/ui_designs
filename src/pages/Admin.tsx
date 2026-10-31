import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { Seo } from '@/components/layout/Seo'
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { sb } from '@/lib/supabase'
import type { Submission } from '@/types'

export default function Admin() {
  const toast = useToast()
  const qc = useQueryClient()
  const submissions = useQuery({
    queryKey: ['admin-submissions'],
    queryFn: async () => {
      const { data, error } = await sb().from('submissions').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Submission[]
    },
  })
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Submission['status'] }) => {
      const { error } = await sb().from('submissions').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-submissions'] }),
    onError: (error: Error) => toast(error.message, 'error'),
  })

  return (
    <div className="container-page py-10">
      <Seo title="Admin" noindex />
      <h1 className="text-5xl">Admin</h1>
      <p className="mt-2 text-muted">Review community design submissions.</p>
      <section className="mt-8 space-y-4" aria-labelledby="submissions-heading">
        <h2 id="submissions-heading" className="text-2xl">Submissions</h2>
        {submissions.isLoading && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28" />)}
        {submissions.isError && <ErrorState message={(submissions.error as Error).message} onRetry={() => submissions.refetch()} />}
        {submissions.data?.length === 0 && <EmptyState title="No submissions yet" body="New community submissions will appear here." />}
        {submissions.data?.map((submission) => (
          <article key={submission.id} className="surface flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold">{submission.title}</h3>
                <Badge>{submission.status}</Badge>
              </div>
              <a className="mt-1 inline-flex items-center gap-1 break-all text-sm text-accent underline" href={submission.link} target="_blank" rel="noopener noreferrer">
                {submission.link}<ExternalLink size={13} />
              </a>
              {submission.notes && <p className="mt-2 text-sm text-muted">{submission.notes}</p>}
              {submission.image_url && <a className="mt-2 block text-sm text-accent underline" href={submission.image_url} target="_blank" rel="noopener noreferrer">View screenshot</a>}
            </div>
            {submission.status === 'pending' && (
              <div className="flex shrink-0 gap-2">
                <Button size="sm" onClick={() => updateStatus.mutate({ id: submission.id, status: 'approved' })} disabled={updateStatus.isPending}>Approve</Button>
                <Button size="sm" variant="danger" onClick={() => updateStatus.mutate({ id: submission.id, status: 'rejected' })} disabled={updateStatus.isPending}>Reject</Button>
              </div>
            )}
          </article>
        ))}
      </section>
    </div>
  )
}
