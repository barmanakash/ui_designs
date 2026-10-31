import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Dices, Search } from 'lucide-react'
import { Seo } from '@/components/layout/Seo'
import { Newsletter } from '@/components/layout/Newsletter'
import { UpgradeBanner } from '@/components/paywall/ProLock'
import { DesignGrid } from '@/components/design/DesignGrid'
import { DesignCard } from '@/components/design/DesignCard'
import { FlowChips } from '@/components/design/FilterBar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/badge'
import { fetchDesigns, fetchPopular, fetchRandomSlug } from '@/lib/api'
import { useToast } from '@/components/ui/toast'

export default function Home() {
  const nav = useNavigate()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [flow, setFlow] = useState<string | undefined>()

  const latest = useQuery({ queryKey: ['home-latest', flow], queryFn: () => fetchDesigns({ flow, sort: 'latest' }, 0) })
  const popular = useQuery({ queryKey: ['popular'], queryFn: fetchPopular })

  const surprise = async () => {
    const slug = await fetchRandomSlug().catch(() => null)
    if (slug) nav(`/design/${slug}`)
    else toast('No designs yet', 'error')
  }

  return (
    <>
      <Seo path="/" />
      <section className="container-page pb-6 pt-14 text-center sm:pt-20">
        <p className="text-sm font-medium text-accent">AI-agent interfaces · Fintech & UPI flows</p>
        <h1 className="mx-auto mt-3 max-w-3xl text-5xl leading-[1.05] sm:text-7xl">
          Design references you can <em className="text-accent">actually ship</em>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
          Every design comes with a teardown, copy-paste React code and a prompt that recreates it.
        </p>
        <form
          role="search"
          className="mx-auto mt-8 flex max-w-xl gap-2"
          onSubmit={(e) => { e.preventDefault(); nav(`/explore${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`) }}
        >
          <div className="relative flex-1">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search designs"
              placeholder="Search checkout, agent timeline, onboarding…"
              className="h-12 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-base placeholder:text-muted"
            />
          </div>
          <Button size="lg" type="submit">Search</Button>
          <Button size="lg" type="button" variant="outline" onClick={surprise}><Dices size={18} /><span className="hidden sm:inline">Surprise me</span></Button>
        </form>
      </section>

      <section className="container-page mt-10" aria-labelledby="latest">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="latest" className="text-3xl">Latest designs</h2>
          <Link to="/explore" className="inline-flex items-center gap-1 text-sm font-medium text-accent">View all <ArrowRight size={14} /></Link>
        </div>
        <div className="mt-4"><FlowChips value={flow} onChange={setFlow} /></div>
        <div className="mt-6">
          <DesignGrid
            items={latest.data?.items.slice(0, 8) ?? []}
            loading={latest.isLoading}
            error={latest.isError ? (latest.error as Error).message : null}
            onRetry={() => latest.refetch()}
          />
        </div>
      </section>

      <section className="container-page mt-16" aria-labelledby="popular">
        <h2 id="popular" className="text-3xl">Popular this week</h2>
        <div className="-mx-4 mt-4 flex gap-5 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
          {popular.isLoading
            ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-64 w-72 shrink-0" />)
            : popular.data?.map((d) => <div key={d.id} className="w-72 shrink-0"><DesignCard design={d} /></div>)}
        </div>
      </section>

      <UpgradeBanner />
      <Newsletter />
    </>
  )
}
