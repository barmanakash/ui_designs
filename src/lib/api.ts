// Data access. Every function works against Supabase when configured and falls
// back to in-memory seed data otherwise (demo mode), so the UI never hard-fails.
import { FREE_FIND_PER_DAY } from './constants'
import { SAMPLE_JOBS, SEED_DESIGNS, SEED_PRO } from './seed'
import { hasSupabase, sb } from './supabase'
import { readLocal, writeLocal, uid } from './utils'
import type { Design, FindResult, Job, ProContent } from '@/types'

export const PAGE_SIZE = 12

/** Columns exposed by the paywall-safe `designs_public` view. */
const COLS =
  'id,slug,title,description,image_url,video_url,source_url,author_name,author_url,flow_type,industry,platform,tags,dominant_colors,teardown_preview,is_pro_content,is_featured,views,saves,created_at'

export interface DesignQuery {
  search?: string
  flow?: string
  industry?: string
  platform?: string
  tag?: string
  color?: string
  sort?: 'latest' | 'popular'
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message)
  }
}

const clean = (s: string) => s.replace(/[%,()*\\]/g, ' ').trim()

export async function fetchDesigns(q: DesignQuery, page: number): Promise<{ items: Design[]; nextPage: number | null }> {
  if (!hasSupabase) {
    const term = (q.search ?? '').toLowerCase().trim()
    let list = SEED_DESIGNS.filter(
      (d) =>
        (!q.flow || d.flow_type === q.flow) &&
        (!q.industry || d.industry === q.industry) &&
        (!q.platform || d.platform === q.platform) &&
        (!q.tag || d.tags.includes(q.tag)) &&
        (!q.color || d.dominant_colors.includes(q.color)) &&
        (!term || [d.title, d.description, ...d.tags, d.flow_type, d.industry].join(' ').toLowerCase().includes(term)),
    )
    list = [...list].sort((a, b) =>
      q.sort === 'popular' ? b.views - a.views : +new Date(b.created_at) - +new Date(a.created_at),
    )
    const items = list.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    return { items, nextPage: (page + 1) * PAGE_SIZE < list.length ? page + 1 : null }
  }
  let query = sb().from('designs_public').select(COLS)
  if (q.flow) query = query.eq('flow_type', q.flow)
  if (q.industry) query = query.eq('industry', q.industry)
  if (q.platform) query = query.eq('platform', q.platform)
  if (q.tag) query = query.contains('tags', [q.tag])
  if (q.color) query = query.contains('dominant_colors', [q.color])
  const term = q.search ? clean(q.search) : ''
  if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`)
  query = q.sort === 'popular' ? query.order('views', { ascending: false }) : query.order('created_at', { ascending: false })
  const from = page * PAGE_SIZE
  const { data, error } = await query.range(from, from + PAGE_SIZE - 1)
  if (error) throw new ApiError(500, error.message)
  const items = (data ?? []) as Design[]
  return { items, nextPage: items.length === PAGE_SIZE ? page + 1 : null }
}

export async function fetchDesignBySlug(slug: string): Promise<Design | null> {
  if (!hasSupabase) return SEED_DESIGNS.find((d) => d.slug === slug) ?? null
  const { data, error } = await sb().from('designs_public').select(COLS).eq('slug', slug).maybeSingle()
  if (error) throw new ApiError(500, error.message)
  return (data as Design) ?? null
}

export async function fetchDesignsByIds(ids: string[]): Promise<Design[]> {
  if (!ids.length) return []
  const rows = !hasSupabase
    ? SEED_DESIGNS.filter((d) => ids.includes(d.id))
    : (((await sb().from('designs_public').select(COLS).in('id', ids)).data ?? []) as Design[])
  return ids.map((id) => rows.find((r) => r.id === id)).filter((d): d is Design => Boolean(d))
}

export async function fetchSimilar(d: Design): Promise<Design[]> {
  const pool = !hasSupabase
    ? SEED_DESIGNS
    : (((await sb().from('designs_public').select(COLS).or(`flow_type.eq.${d.flow_type},industry.eq.${d.industry}`).limit(40)).data ?? []) as Design[])
  const score = (x: Design) =>
    (x.flow_type === d.flow_type ? 2 : 0) + (x.industry === d.industry ? 2 : 0) + x.tags.filter((t) => d.tags.includes(t)).length
  return pool.filter((x) => x.id !== d.id).sort((a, b) => score(b) - score(a)).slice(0, 6)
}

export async function fetchPopular(): Promise<Design[]> {
  return (await fetchDesigns({ sort: 'popular' }, 0)).items.slice(0, 6)
}

export async function fetchRandomSlug(): Promise<string | null> {
  const rows = !hasSupabase
    ? SEED_DESIGNS
    : (((await sb().from('designs_public').select('slug').limit(200)).data ?? []) as { slug: string }[])
  return rows.length ? rows[Math.floor(Math.random() * rows.length)].slug : null
}

/** Fire-and-forget counter bump (views/saves) via a SECURITY DEFINER RPC. */
export function bumpStat(designId: string, stat: 'views' | 'saves', delta = 1) {
  if (!hasSupabase) return
  void sb().rpc('bump_design_stat', { p_design: designId, p_stat: stat, p_delta: delta })
}

/** Gated content. The server verifies Pro status; free users get a 403. */
export async function fetchProContent(slug: string, token: string | null, demoPro: boolean): Promise<ProContent> {
  if (!hasSupabase) {
    const d = SEED_DESIGNS.find((x) => x.slug === slug)
    if (d && (demoPro || !d.is_pro_content)) return SEED_PRO[slug]
    throw new ApiError(403, 'Pro required', 'pro_required')
  }
  const res = await fetch(`/api/design-pro-content?slug=${encodeURIComponent(slug)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, body.error ?? 'Request failed', body.code)
  return body as ProContent
}

/* ── Find References ─────────────────────────────────────── */
export interface FindResponse {
  results: FindResult[]
  /** null = unlimited (Pro) */
  remaining: number | null
}

export async function findReferences(description: string, token: string | null, demoPro: boolean): Promise<FindResponse> {
  if (!hasSupabase) return demoFind(description, demoPro)
  const res = await fetch('/api/find-references', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ description }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, body.error ?? 'Search failed', body.code)
  return body as FindResponse
}

/** Keyword-ranking stand-in used only in demo mode (no Claude call). */
function demoFind(description: string, demoPro: boolean): FindResponse {
  const day = new Date().toISOString().slice(0, 10)
  const usage = readLocal<{ day: string; n: number }>('ff_find_usage', { day, n: 0 })
  const n = usage.day === day ? usage.n : 0
  if (!demoPro && n >= FREE_FIND_PER_DAY) throw new ApiError(429, 'Daily free limit reached', 'limit_reached')
  const words = description.toLowerCase().split(/\W+/).filter((w) => w.length > 2)
  const ranked = SEED_DESIGNS.map((d) => {
    const hay = [d.title, d.description, d.flow_type, d.industry, ...d.tags].join(' ').toLowerCase()
    const hits = words.filter((w) => hay.includes(w))
    return { d, hits, score: hits.length }
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
  if (!demoPro) writeLocal('ff_find_usage', { day, n: n + 1 })
  return {
    results: ranked.map(({ d, hits }) => ({
      design: d,
      reason: hits.length ? `Matches your brief on: ${[...new Set(hits)].slice(0, 4).join(', ')}.` : `A strong ${d.flow_type} reference in ${d.industry}.`,
    })),
    remaining: demoPro ? null : FREE_FIND_PER_DAY - (n + 1),
  }
}

/* ── Newsletter, jobs, submissions ───────────────────────── */
export async function subscribeNewsletter(email: string) {
  if (!hasSupabase) {
    writeLocal('ff_newsletter', [...readLocal<string[]>('ff_newsletter', []), email])
    return
  }
  const { error } = await sb().from('newsletter').insert({ email })
  if (error && error.code !== '23505') throw new ApiError(400, error.message) // 23505 = already subscribed
}

export async function fetchJobs(): Promise<Job[]> {
  if (!hasSupabase) return SAMPLE_JOBS.map((j, i) => ({ ...j, id: `job-${i}`, created_at: new Date(Date.UTC(2026, 9, 28 - i)).toISOString() }))
  const { data, error } = await sb().from('jobs').select('*').eq('status', 'open').order('created_at', { ascending: false })
  if (error) throw new ApiError(500, error.message)
  return (data ?? []) as Job[]
}

export async function createSubmission(
  userId: string,
  f: { title: string; link: string; notes: string; file: File | null },
) {
  if (!hasSupabase) throw new ApiError(400, 'Submissions need Supabase to be configured.')
  let image_url: string | null = null
  if (f.file) {
    const ext = (f.file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
    const path = `${userId}/${uid()}.${ext}`
    const up = await sb().storage.from('submissions').upload(path, f.file, { contentType: f.file.type })
    if (up.error) throw new ApiError(400, up.error.message)
    image_url = sb().storage.from('submissions').getPublicUrl(path).data.publicUrl
  }
  const { error } = await sb().from('submissions').insert({ user_id: userId, title: f.title, link: f.link, notes: f.notes || null, image_url })
  if (error) throw new ApiError(400, error.message)
}
