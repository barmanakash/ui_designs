import { DesignCard } from './DesignCard'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/badge'
import type { Design } from '@/types'

export const gridCls = 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'

export function CardSkeleton() {
  return (
    <div className="surface overflow-hidden" aria-hidden>
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
      </div>
    </div>
  )
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className={gridCls} role="status" aria-label="Loading designs">
      {Array.from({ length: count }, (_, i) => <CardSkeleton key={i} />)}
    </div>
  )
}

interface Props {
  items: Design[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  emptyTitle?: string
  emptyBody?: string
  emptyAction?: React.ReactNode
}

/** Gallery grid with built-in loading, error and empty states. */
export function DesignGrid({ items, loading, error, onRetry, emptyTitle = 'No designs found', emptyBody = 'Try removing a filter or searching for something else.', emptyAction }: Props) {
  if (loading) return <SkeletonGrid />
  if (error) return <ErrorState message={error} onRetry={onRetry} />
  if (!items.length) return <EmptyState title={emptyTitle} body={emptyBody} action={emptyAction} />
  return (
    <div className={gridCls}>
      {items.map((d, i) => <DesignCard key={d.id} design={d} priority={i < 4} />)}
    </div>
  )
}
