import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { DesignCard } from '@/components/design/DesignCard'
import { gridCls } from '@/components/design/DesignGrid'
import { EmptyState, Skeleton } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { moveInBoard, removeFromBoard } from '@/lib/moodboards'
import type { Design } from '@/types'

interface Props {
  boardId: string
  designs: Design[]
  loading?: boolean
  /** Called after any change so the parent can refetch the board. */
  onChange: () => void
}

/** The designs inside one of the user's moodboards, with reorder and remove controls. */
export function BoardItems({ boardId, designs, loading, onChange }: Props) {
  const toast = useToast()
  const move = useMutation({
    mutationFn: ({ id, dir }: { id: string; dir: -1 | 1 }) => moveInBoard(boardId, id, dir),
    onSuccess: onChange,
    onError: (error: Error) => toast(error.message, 'error'),
  })
  const remove = useMutation({
    mutationFn: (id: string) => removeFromBoard(boardId, id),
    onSuccess: () => { onChange(); toast('Removed from board') },
    onError: (error: Error) => toast(error.message, 'error'),
  })
  const busy = move.isPending || remove.isPending

  if (loading) {
    return <div className={gridCls} role="status" aria-label="Loading board">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="aspect-[4/3]" />)}</div>
  }
  if (!designs.length) {
    return <EmptyState title="No designs saved yet" body="Use the Save button on any design to add it to this moodboard." />
  }

  return (
    <ul className={gridCls} role="list">
      {designs.map((design, index) => (
        <li key={design.id} className="space-y-2">
          <DesignCard design={design} />
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                aria-label={`Move ${design.title} earlier`}
                disabled={busy || index === 0}
                onClick={() => move.mutate({ id: design.id, dir: -1 })}
              >
                <ArrowLeft size={14} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                aria-label={`Move ${design.title} later`}
                disabled={busy || index === designs.length - 1}
                onClick={() => move.mutate({ id: design.id, dir: 1 })}
              >
                <ArrowRight size={14} />
              </Button>
            </div>
            <Button variant="ghost" size="sm" aria-label={`Remove ${design.title} from board`} disabled={busy} onClick={() => remove.mutate(design.id)}>
              <X size={14} /> Remove
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
