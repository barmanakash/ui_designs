import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Link2, Plus, Trash2 } from 'lucide-react'
import { Seo } from '@/components/layout/Seo'
import { BoardItems } from '@/components/moodboard/BoardItems'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { FREE_BOARD_LIMIT } from '@/lib/constants'
import { createBoard, deleteBoard, getBoard, listBoards, setBoardPublic } from '@/lib/moodboards'
import { SITE_URL } from '@/lib/supabase'
import { copyText } from '@/lib/utils'
import type { Moodboard } from '@/types'

export default function Moodboards() {
  const { user, isPro } = useAuth()
  const uid = user?.id ?? 'demo'
  const [name, setName] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const toast = useToast()
  const qc = useQueryClient()
  const boards = useQuery({ queryKey: ['boards', uid], queryFn: () => listBoards(uid) })
  const selected = useQuery({ queryKey: ['board', selectedId], queryFn: () => getBoard(selectedId!), enabled: !!selectedId })
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['boards'] })
    void qc.invalidateQueries({ queryKey: ['board'] })
  }
  const create = useMutation({
    mutationFn: () => createBoard(uid, name.trim(), isPro),
    onSuccess: (board) => { setName(''); setSelectedId(board.id); refresh() },
    onError: (error: Error) => toast(error.message, 'error'),
  })
  const remove = useMutation({
    mutationFn: deleteBoard,
    onSuccess: (_, id) => { if (selectedId === id) setSelectedId(null); refresh() },
    onError: (error: Error) => toast(error.message, 'error'),
  })
  const togglePublic = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) => setBoardPublic(id, value),
    onSuccess: refresh,
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const shareUrl = (board: Moodboard) => `${SITE_URL}/moodboards/${board.share_slug}`
  const copyShare = async (board: Moodboard) => {
    toast((await copyText(shareUrl(board))) ? 'Share link copied' : 'Copy failed. Select the link manually.')
  }

  const boardCount = boards.data?.length ?? 0
  const atLimit = !isPro && boardCount >= FREE_BOARD_LIMIT

  return (
    <div className="container-page py-10">
      <Seo title="Moodboards" description="Collect and share your favorite interface references." path="/moodboards" noindex />
      <h1 className="text-5xl">Moodboards</h1>
      <p className="mt-2 text-muted">Collect references into boards you can revisit and share.</p>
      <form className="mt-6 flex max-w-lg gap-2" onSubmit={(event) => { event.preventDefault(); if (name.trim() && !atLimit) create.mutate() }}>
        <Input value={name} onChange={(event) => setName(event.target.value)} aria-label="New moodboard name" placeholder="Name your new board" maxLength={60} required disabled={atLimit} />
        <Button type="submit" disabled={!name.trim() || create.isPending || atLimit}><Plus size={16} /> Create</Button>
      </form>
      {!isPro && boards.data && (
        <p className="mt-2 text-sm text-muted">
          {boardCount} of {FREE_BOARD_LIMIT} free boards used.{' '}
          {atLimit && <><Link to="/pricing" className="font-medium text-accent underline">Upgrade to Pro</Link> for unlimited boards.</>}
        </p>
      )}
      {boards.isError && <p role="alert" className="mt-4 text-sm text-danger">{(boards.error as Error).message}</p>}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {boards.data?.map((board) => (
          <article key={board.id} className={`surface flex flex-wrap items-center justify-between gap-3 p-4 ${selectedId === board.id ? 'border-accent' : ''}`}>
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelectedId(board.id)} aria-pressed={selectedId === board.id}>
              <h2 className="truncate font-semibold">{board.name}</h2>
              <p className="mt-1 text-sm text-muted">{board.item_count ?? 0} designs</p>
            </button>
            <label className="flex items-center gap-1 text-xs text-muted">
              <input type="checkbox" checked={board.is_public} onChange={(event) => togglePublic.mutate({ id: board.id, value: event.target.checked })} />
              Public
            </label>
            {board.is_public && (
              <>
                <Button variant="ghost" size="icon" aria-label={`Copy share link for ${board.name}`} onClick={() => copyShare(board)}><Link2 size={16} /></Button>
                <Link to={`/moodboards/${board.share_slug}`} aria-label={`Open ${board.name} public page`}><ExternalLink size={16} /></Link>
              </>
            )}
            <Button variant="ghost" size="icon" aria-label={`Delete ${board.name}`} onClick={() => { if (window.confirm(`Delete "${board.name}"?`)) remove.mutate(board.id) }} disabled={remove.isPending}><Trash2 size={16} /></Button>
          </article>
        ))}
      </div>
      {boards.isLoading && <p className="mt-6 text-sm text-muted">Loading boards…</p>}
      {boards.data?.length === 0 && <p className="mt-6 text-sm text-muted">No boards yet. Save a design or create your first board above.</p>}
      {selectedId && (
        <section className="mt-10" aria-live="polite">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-3xl">{selected.data?.board.name ?? 'Selected board'}</h2>
            <Button variant="outline" onClick={() => setSelectedId(null)}>Close</Button>
          </div>
          {selected.isError
            ? <p role="alert" className="text-sm text-danger">{(selected.error as Error).message}</p>
            : <BoardItems boardId={selectedId} designs={selected.data?.designs ?? []} loading={selected.isLoading} onChange={refresh} />}
        </section>
      )}
    </div>
  )
}
