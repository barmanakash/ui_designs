// Moodboards: Supabase when configured, localStorage otherwise (demo mode).
import { fetchDesignsByIds, ApiError } from './api'
import { FREE_BOARD_LIMIT } from './constants'
import { SAMPLE_BOARDS, SEED_DESIGNS } from './seed'
import { hasSupabase, sb } from './supabase'
import { readLocal, uid, writeLocal } from './utils'
import type { Design, Moodboard } from '@/types'

interface Item { board_id: string; design_id: string; position: number }
interface DemoState { boards: Moodboard[]; items: Item[] }
const KEY = 'ff_boards'

function demo(): DemoState {
  const existing = readLocal<DemoState | null>(KEY, null)
  if (existing) return existing
  const boards: Moodboard[] = []
  const items: Item[] = []
  SAMPLE_BOARDS.forEach((b, i) => {
    const id = `demo-board-${i + 1}`
    boards.push({ id, user_id: 'demo', name: b.name, is_public: false, share_slug: `demo${i + 1}`, created_at: new Date().toISOString() })
    b.slugs.forEach((slug, p) => {
      const d = SEED_DESIGNS.find((x) => x.slug === slug)
      if (d) items.push({ board_id: id, design_id: d.id, position: p })
    })
  })
  const s = { boards, items }
  writeLocal(KEY, s)
  return s
}
const save = (s: DemoState) => writeLocal(KEY, s)

export async function listBoards(userId: string): Promise<Moodboard[]> {
  if (!hasSupabase) {
    const s = demo()
    return s.boards.map((b) => ({ ...b, item_count: s.items.filter((i) => i.board_id === b.id).length }))
  }
  const { data, error } = await sb()
    .from('moodboards')
    .select('*, moodboard_items(count)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new ApiError(500, error.message)
  return (data ?? []).map((b: any) => ({ ...b, item_count: b.moodboard_items?.[0]?.count ?? 0 })) as Moodboard[]
}

export async function createBoard(userId: string, name: string, isPro: boolean): Promise<Moodboard> {
  if (!hasSupabase) {
    const s = demo()
    if (!isPro && s.boards.length >= FREE_BOARD_LIMIT) throw new ApiError(403, `Free plan includes ${FREE_BOARD_LIMIT} boards. Upgrade for unlimited.`, 'board_limit')
    const b: Moodboard = { id: uid(), user_id: 'demo', name, is_public: false, share_slug: uid().slice(0, 12), created_at: new Date().toISOString() }
    save({ ...s, boards: [b, ...s.boards] })
    return b
  }
  const { data, error } = await sb().from('moodboards').insert({ user_id: userId, name }).select('*').single()
  if (error) {
    // RLS rejects inserts over the free limit (code 42501).
    if (error.code === '42501') throw new ApiError(403, `Free plan includes ${FREE_BOARD_LIMIT} boards. Upgrade for unlimited.`, 'board_limit')
    throw new ApiError(400, error.message)
  }
  return data as Moodboard
}

export async function deleteBoard(id: string) {
  if (!hasSupabase) {
    const s = demo()
    return save({ boards: s.boards.filter((b) => b.id !== id), items: s.items.filter((i) => i.board_id !== id) })
  }
  const { error } = await sb().from('moodboards').delete().eq('id', id)
  if (error) throw new ApiError(400, error.message)
}

export async function setBoardPublic(id: string, isPublic: boolean) {
  if (!hasSupabase) {
    const s = demo()
    return save({ ...s, boards: s.boards.map((b) => (b.id === id ? { ...b, is_public: isPublic } : b)) })
  }
  const { error } = await sb().from('moodboards').update({ is_public: isPublic }).eq('id', id)
  if (error) throw new ApiError(400, error.message)
}

async function loadBoardDesigns(board: Moodboard): Promise<{ board: Moodboard; designs: Design[] }> {
  let ids: string[]
  if (!hasSupabase) {
    ids = demo().items.filter((i) => i.board_id === board.id).sort((a, b) => a.position - b.position).map((i) => i.design_id)
  } else {
    const { data } = await sb().from('moodboard_items').select('design_id,position').eq('moodboard_id', board.id).order('position')
    ids = (data ?? []).map((r: any) => r.design_id)
  }
  return { board, designs: await fetchDesignsByIds(ids) }
}

export async function getBoard(id: string) {
  if (!hasSupabase) {
    const b = demo().boards.find((x) => x.id === id)
    return b ? loadBoardDesigns(b) : null
  }
  const { data } = await sb().from('moodboards').select('*').eq('id', id).maybeSingle()
  return data ? loadBoardDesigns(data as Moodboard) : null
}

export async function getPublicBoard(shareSlug: string) {
  if (!hasSupabase) {
    const b = demo().boards.find((x) => x.share_slug === shareSlug && x.is_public)
    return b ? loadBoardDesigns(b) : null
  }
  const { data } = await sb().from('moodboards').select('*').eq('share_slug', shareSlug).eq('is_public', true).maybeSingle()
  return data ? loadBoardDesigns(data as Moodboard) : null
}

export async function addToBoard(boardId: string, designId: string) {
  if (!hasSupabase) {
    const s = demo()
    if (s.items.some((i) => i.board_id === boardId && i.design_id === designId)) return
    const pos = Math.max(-1, ...s.items.filter((i) => i.board_id === boardId).map((i) => i.position)) + 1
    return save({ ...s, items: [...s.items, { board_id: boardId, design_id: designId, position: pos }] })
  }
  const { data } = await sb().from('moodboard_items').select('position').eq('moodboard_id', boardId).order('position', { ascending: false }).limit(1)
  const pos = (data?.[0]?.position ?? -1) + 1
  const { error } = await sb().from('moodboard_items').insert({ moodboard_id: boardId, design_id: designId, position: pos })
  if (error && error.code !== '23505') throw new ApiError(400, error.message)
}

export async function removeFromBoard(boardId: string, designId: string) {
  if (!hasSupabase) {
    const s = demo()
    return save({ ...s, items: s.items.filter((i) => !(i.board_id === boardId && i.design_id === designId)) })
  }
  const { error } = await sb().from('moodboard_items').delete().eq('moodboard_id', boardId).eq('design_id', designId)
  if (error) throw new ApiError(400, error.message)
}

/** Moves a design one slot up (-1) or down (+1) by swapping positions with its neighbour. */
export async function moveInBoard(boardId: string, designId: string, dir: -1 | 1) {
  if (!hasSupabase) {
    const s = demo()
    const list = s.items.filter((i) => i.board_id === boardId).sort((a, b) => a.position - b.position)
    const idx = list.findIndex((i) => i.design_id === designId)
    const other = list[idx + dir]
    if (idx < 0 || !other) return
    const a = list[idx].position
    list[idx].position = other.position
    other.position = a
    return save(s)
  }
  const { data } = await sb().from('moodboard_items').select('id,design_id,position').eq('moodboard_id', boardId).order('position')
  const list = (data ?? []) as { id: string; design_id: string; position: number }[]
  const idx = list.findIndex((i) => i.design_id === designId)
  const other = list[idx + dir]
  if (idx < 0 || !other) return
  await sb().from('moodboard_items').update({ position: other.position }).eq('id', list[idx].id)
  await sb().from('moodboard_items').update({ position: list[idx].position }).eq('id', other.id)
}

/** design_id → ids of the boards that contain it (for the Save menu). */
export async function savedMap(userId: string): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {}
  if (!hasSupabase) {
    demo().items.forEach((i) => (out[i.design_id] ||= []).push(i.board_id))
    return out
  }
  const { data } = await sb().from('moodboard_items').select('design_id,moodboard_id, moodboards!inner(user_id)').eq('moodboards.user_id', userId)
  ;(data ?? []).forEach((r: any) => (out[r.design_id] ||= []).push(r.moodboard_id))
  return out
}
