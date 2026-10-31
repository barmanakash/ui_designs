import { useQuery } from '@tanstack/react-query'
import { ExternalLink, MapPin } from 'lucide-react'
import { Seo } from '@/components/layout/Seo'
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fetchJobs } from '@/lib/api'
import { label } from '@/lib/constants'

export default function Jobs() {
  const jobs = useQuery({ queryKey: ['jobs'], queryFn: fetchJobs })
  return (
    <div className="container-page py-10">
      <Seo title="Jobs" description="Explore opportunities in AI, fintech and product design." path="/jobs" />
      <h1 className="text-5xl">Jobs</h1>
      <p className="mt-2 text-muted">Opportunities in AI, fintech and product design.</p>
      <div className="mt-8 space-y-4">
        {jobs.isLoading && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28" />)}
        {jobs.isError && <ErrorState message={(jobs.error as Error).message} onRetry={() => jobs.refetch()} />}
        {jobs.data?.length === 0 && <EmptyState title="No open roles right now" body="Check back soon for new opportunities." />}
        {jobs.data?.map((job) => (
          <article key={job.id} className="surface flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold">{job.title}</h2>
              <p className="mt-1 text-muted">{job.company}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
                <span className="inline-flex items-center gap-1"><MapPin size={14} />{job.location}</span>
                <Badge>{label(job.type)}</Badge>
              </div>
            </div>
            <Button asChild variant="outline">
              <a href={job.apply_url} target="_blank" rel="noopener noreferrer">
                Apply <ExternalLink size={14} />
              </a>
            </Button>
          </article>
        ))}
      </div>
    </div>
  )
}
