import { z } from 'zod'
import { FREE_FIND_PER_DAY } from '../src/lib/constants.js'
import { isProActive } from './_lib/access.js'
import { getProfile, getUser } from './_lib/auth.js'
import { askClaude, buildPrompt, DescriptionSchema, parseRanking, type DesignMeta } from './_lib/claude.js'
import { HttpError, route, send } from './_lib/http.js'
import { clientIp, hashActor, rateLimit } from './_lib/rateLimit.js'
import { admin } from './_lib/supabase.js'

// Same columns the frontend reads from `designs_public` (never the gated fields).
const COLS =
  'id,slug,title,description,image_url,video_url,source_url,author_name,author_url,flow_type,industry,platform,tags,dominant_colors,teardown_preview,is_pro_content,is_featured,views,saves,created_at'

const Body = z.object({ description: DescriptionSchema })

/**
 * POST /api/find-references   { description }
 * → { results: [{ design, reason }], remaining: number | null }   (null = unlimited / Pro)
 */
export default route(['POST'], async (req, res) => {
  await rateLimit(req, 'find-ip', 10, 60) // burst guard per IP, on top of the daily quota

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Describe your product in 10 to 1000 characters.', 'bad_request')
  }

  const user = await getUser(req)
  const profile = user ? await getProfile(user.id) : null
  const pro = isProActive(profile)

  // Free quota: per user when logged in, per salted IP hash when logged out. Taken atomically in SQL.
  const actor = user ? `u:${user.id}` : `ip:${hashActor(clientIp(req))}`
  let remaining: number | null = null
  let charged = false
  if (!pro) {
    const { data, error } = await admin().rpc('find_usage_take', { p_actor: actor, p_limit: FREE_FIND_PER_DAY })
    if (error) throw error
    if (data === -1) {
      throw new HttpError(429, 'You have used all your free searches for today. Upgrade to Pro for unlimited searches.', 'limit_reached')
    }
    charged = true
    remaining = Math.max(0, FREE_FIND_PER_DAY - (data as number))
  }

  try {
    const { data: catalog, error } = await admin()
      .from('designs_public')
      .select('id,title,description,flow_type,industry,platform,tags')
      .order('views', { ascending: false })
      .limit(300)
    if (error) throw error
    const designs = (catalog ?? []) as DesignMeta[]
    if (!designs.length) throw new HttpError(404, 'There are no designs to search yet.', 'empty_catalog')

    const { system, user: prompt } = buildPrompt(parsed.data.description, designs)
    const raw = await askClaude(system, prompt)
    const ranked = parseRanking(raw, new Set(designs.map((d) => d.id)))

    const { data: rows, error: fetchError } = await admin()
      .from('designs_public')
      .select(COLS)
      .in('id', ranked.map((r) => r.design_id))
    if (fetchError) throw fetchError
    const byId = new Map((rows ?? []).map((r) => [r.id as string, r]))

    const results = ranked
      .map((r) => ({ design: byId.get(r.design_id), reason: r.reason }))
      .filter((r): r is { design: NonNullable<typeof r.design>; reason: string } => Boolean(r.design))

    send(res, 200, { results, remaining })
  } catch (e) {
    // Don't charge a free search for a failure on our side.
    if (charged) await admin().rpc('find_usage_refund', { p_actor: actor })
    if (e instanceof HttpError) throw e
    if (e instanceof Error && e.message === 'invalid_ranking') {
      throw new HttpError(502, 'We could not rank references this time. Please try again. This search was not counted.', 'ai_unavailable')
    }
    if (e instanceof Error && e.name === 'AbortError') {
      throw new HttpError(504, 'The AI service took too long. Please try again. This search was not counted.', 'ai_timeout')
    }
    throw e
  }
})
