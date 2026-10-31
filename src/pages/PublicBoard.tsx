import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Seo } from '@/components/layout/Seo'
import { DesignGrid } from '@/components/design/DesignGrid'
import { EmptyState } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getPublicBoard } from '@/lib/moodboards'

export default function PublicBoard() {
  const { shareSlug = '' } = useParams()
  const board = useQuery({ queryKey: ['public-board', shareSlug], queryFn: () => getPublicBoard(shareSlug) })

  return (
    <div className="container-page py-10">
      <Seo title={board.data?.board.name ?? 'Shared moodboard'} path={`/board/${shareSlug}`} />
      {board.isLoading ? <p className="text-muted">Loading moodboard…</p> : board.isError ? (
        <EmptyState title="Could not load this moodboard" body={(board.error as Error).message} />
      ) : !board.data ? (
        <EmptyState title="Moodboard not found" body="This board may be private or its link may have expired." action={<Button asChild><Link to="/explore">Explore designs</Link></Button>} />
      ) : (
        <>
          <p className="text-sm font-medium text-accent">Shared moodboard</p>
          <h1 className="mt-2 text-5xl">{board.data.board.name}</h1>
          <p className="mt-2 text-muted">{board.data.designs.length} saved designs</p>
          <div className="mt-8"><DesignGrid items={board.data.designs} emptyTitle="This board is empty" /></div>
        </>
      )}
    </div>
  )
}
