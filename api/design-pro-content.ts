import { z } from 'zod'
import { decideProContentAccess } from './_lib/access.js'
import { getProfile, getUser } from './_lib/auth.js'
import { HttpError, queryParam, route, send } from './_lib/http.js'
import { admin } from './_lib/supabase.js'

const Query = z.object({ slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/) })

/**
 * GET /api/design-pro-content?slug=…
 * THE paywall. Returns the gated fields (full teardown, code, prompt) only when:
 *   • the design is free (is_pro_content = false), or
 *   • the caller presents a valid Supabase token for a user with an ACTIVE Pro plan.
 * The browser can never read these columns any other way (see policies.sql).
 */
export default route(['GET'], async (req, res) => {
  const parsed = Query.safeParse({ slug: queryParam(req, 'slug') })
  if (!parsed.success) throw new HttpError(400, 'Invalid design slug.', 'bad_request')

  const { data: design, error } = await admin()
    .from('designs')
    .select('id,is_pro_content,teardown_md,code_snippet,prompt_text')
    .eq('slug', parsed.data.slug)
    .eq('status', 'published')
    .maybeSingle()
  if (error) throw error
  if (!design) throw new HttpError(404, 'Design not found.', 'not_found')

  // Only look up the caller when the content is actually gated.
  const user = design.is_pro_content ? await getUser(req) : null
  const profile = user ? await getProfile(user.id) : null

  const decision = decideProContentAccess(design, user, profile)
  if (!decision.ok) throw new HttpError(decision.status, decision.error, decision.code)

  send(res, 200, {
    teardown_md: design.teardown_md,
    code_snippet: design.code_snippet,
    prompt_text: design.prompt_text,
  })
})
