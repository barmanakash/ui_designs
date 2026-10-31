import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { Seo } from '@/components/layout/Seo'
import { DesignGrid, SkeletonGrid } from '@/components/design/DesignGrid'
import { FilterBar } from '@/components/design/FilterBar'
import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/useDebounce'
import { useInView } from '@/hooks/useInView'
import { fetchDesigns, type DesignQuery } from '@/lib/api'

const KEYS = ['flow', 'industry', 'platform', 'tag', 'color', 'sort'] as const

export default function Explore() {
  const [params, setParams] = useSearchParams()
  const [text, setText] = useState(params.get('q') ?? '')
  const search = useDebounce(text, 350)

  // URL is the source of truth for filters, so views are shareable.
  const query = useMemo<DesignQuery>(() => {
    const q: DesignQuery = { search: params.get('q') ?? undefined }
    KEYS.forEach((k) => { const v = params.get(k); if (v) (q as Record<string, string>)[k] = v })
    return q
  }, [params])

  useEffect(() => {
    if ((params.get('q') ?? '') === search) return
    const next = new URLSearchParams(params)
    search ? next.set('q', search) : next.delete('q')
    setParams(next, { replace: true })
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (p: Partial<DesignQuery>) => {
    const next = new URLSearchParams(params)
    Object.entries(p).forEach(([k, v]) => (v ? next.set(k, String(v)) : next.delete(k)))
    setParams(next, { replace: true })
  }
  const clear = () => { setText(''); setParams({}, { replace: true }) }

  const q = useInfiniteQuery({
    queryKey: ['designs', query],
    queryFn: ({ pageParam }) => fetchDesigns(query, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextPage,
  })
  const items = q.data?.pages.flatMap((p) => p.items) ?? []
  const sentinel = useInView<HTMLDivElement>(() => q.fetchNextPage(), !!q.hasNextPage && !q.isFetchingNextPage)

  return (
    <div className="container-page py-10">
      <Seo title="Explore designs" description="Browse AI-agent and fintech/UPI interfaces by flow type, industry, platform, style and color." path="/explore" />
      <h1 className="text-5xl">Explore</h1>
      <p className="mt-2 text-muted">{q.isLoading ? 'Loading…' : `${items.length}${q.hasNextPage ? '+' : ''} designs`}</p>

      <div className="relative mt-6 max-w-xl">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          type="search"
          aria-label="Search designs"
          placeholder="Search by title, tag or flow"
          className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm placeholder:text-muted"
        />
      </div>

      <div className="mt-6"><FilterBar value={query} onChange={patch} onClear={clear} /></div>

      <div className="mt-8">
        <DesignGrid
          items={items}
          loading={q.isLoading}
          error={q.isError ? (q.error as Error).message : null}
          onRetry={() => q.refetch()}
          emptyAction={<Button variant="outline" onClick={clear}>Clear filters</Button>}
        />
        {q.isFetchingNextPage && <div className="mt-5"><SkeletonGrid count={4} /></div>}
        <div ref={sentinel} aria-hidden className="h-10" />
        {q.hasNextPage && !q.isFetchingNextPage && (
          <div className="mt-2 text-center"><Button variant="outline" onClick={() => q.fetchNextPage()}>Load more</Button></div>
        )}
      </div>
    </div>
  )
}
