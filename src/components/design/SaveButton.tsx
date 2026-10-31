import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookmark, Check, Plus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { addToBoard, createBoard, listBoards, removeFromBoard, savedMap } from '@/lib/moodboards'
import { bumpStat } from '@/lib/api'
import { events } from '@/lib/analytics'
import { cn } from '@/lib/utils'
import type { Design } from '@/types'

/** Bookmark button with a menu to add/remove a design from the user's moodboards. */
export function SaveButton({ design, className, label }: { design: Pick<Design, 'id' | 'slug'>; className?: string; label?: boolean }) {
  const { user, demo, isPro } = useAuth()
  const uid = user?.id ?? 'demo'
  const nav = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const enabled = open && (!!user || demo)

  const boards = useQuery({ queryKey: ['boards', uid], queryFn: () => listBoards(uid), enabled })
  const saved = useQuery({ queryKey: ['saved', uid], queryFn: () => savedMap(uid), enabled: !!user || demo })
  const inBoards = saved.data?.[design.id] ?? []

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const refresh = () => { qc.invalidateQueries({ queryKey: ['boards'] }); qc.invalidateQueries({ queryKey: ['saved'] }) }
  const toggle = useMutation({
    mutationFn: async (boardId: string) => {
      if (inBoards.includes(boardId)) { await removeFromBoard(boardId, design.id); bumpStat(design.id, 'saves', -1) }
      else { await addToBoard(boardId, design.id); bumpStat(design.id, 'saves'); events.saveDesign(design.slug) }
    },
    onSuccess: refresh,
    onError: (e: Error) => toast(e.message, 'error'),
  })
  const create = useMutation({
    mutationFn: async () => {
      const b = await createBoard(uid, newName.trim(), isPro)
      await addToBoard(b.id, design.id)
      bumpStat(design.id, 'saves')
      events.saveDesign(design.slug)
    },
    onSuccess: () => { setNewName(''); refresh(); toast('Saved to new board') },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const onClick = () => (user || demo ? setOpen((o) => !o) : nav('/login'))
  const isSaved = inBoards.length > 0

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={onClick}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={isSaved ? 'Saved to moodboard. Manage' : 'Save to moodboard'}
        className={cn('inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 text-sm font-medium hover:bg-accent-soft', className)}
      >
        <Bookmark size={16} className={isSaved ? 'fill-accent text-accent' : ''} />
        {label && <span>{isSaved ? 'Saved' : 'Save'}</span>}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-border bg-card p-2">
          <p className="px-2 py-1 text-xs font-medium text-muted">Save to board</p>
          {boards.isLoading && <p className="px-2 py-2 text-sm text-muted">Loading…</p>}
          {boards.data?.map((b) => (
            <button
              key={b.id}
              role="menuitemcheckbox"
              aria-checked={inBoards.includes(b.id)}
              onClick={() => toggle.mutate(b.id)}
              className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-accent-soft"
            >
              <span className="truncate">{b.name}</span>
              {inBoards.includes(b.id) && <Check size={16} className="text-accent" />}
            </button>
          ))}
          <form
            className="mt-1 flex gap-1 border-t border-border pt-2"
            onSubmit={(e) => { e.preventDefault(); if (newName.trim()) create.mutate() }}
          >
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New board name"
              aria-label="New board name"
              maxLength={60}
              className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-bg px-2 text-sm"
            />
            <button type="submit" aria-label="Create board" disabled={!newName.trim() || create.isPending} className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-fg disabled:opacity-50">
              <Plus size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
