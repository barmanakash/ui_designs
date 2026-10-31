import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { Seo } from '@/components/layout/Seo'
import { DesignsPanel } from '@/components/admin/DesignsPanel'
import { JobsPanel } from '@/components/admin/JobsPanel'
import { ReportsPanel } from '@/components/admin/ReportsPanel'
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { sb } from '@/lib/supabase'
import type { Submission } from '@/types'

function SubmissionsPanel() {
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
    <section className="space-y-4" aria-labelledby="submissions-heading">
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
  )
}

const TABS = [
  { id: 'designs', label: 'Designs' },
  { id: 'submissions', label: 'Submissions' },
  { id: 'reports', label: 'Reports' },
  { id: 'jobs', label: 'Jobs' },
] as const
type TabId = (typeof TABS)[number]['id']

export default function Admin() {
  const [tab, setTab] = useState<TabId>('designs')

  return (
    <div className="container-page py-10">
      <Seo title="Admin" noindex />
      <h1 className="text-5xl">Admin</h1>
      <p className="mt-2 text-muted">Manage designs, review submissions and takedown reports, and post jobs.</p>

      <div role="tablist" aria-label="Admin sections" className="mt-6 inline-flex flex-wrap gap-1 rounded-xl border border-border p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm ${tab === t.id ? 'bg-accent text-accent-fg' : 'text-muted hover:text-fg'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8" role="tabpanel">
        {tab === 'designs' && <DesignsPanel />}
        {tab === 'submissions' && <SubmissionsPanel />}
        {tab === 'reports' && <ReportsPanel />}
        {tab === 'jobs' && <JobsPanel />}
      </div>
    </div>
  )
}
