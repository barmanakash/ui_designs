import { requireUser } from './_lib/auth.js'
import { sendEmail, welcomeEmail } from './_lib/email.js'
import { siteUrl } from './_lib/env.js'
import { route, send } from './_lib/http.js'
import { rateLimit } from './_lib/rateLimit.js'
import { admin } from './_lib/supabase.js'

/**
 * POST /api/welcome   (Authorization: Bearer <token>)
 * Called by the app after sign-in. Sends the welcome email exactly once per user: the UPDATE only
 * matches while profiles.welcomed_at is still null, so concurrent or repeated calls are harmless.
 */
export default route(['POST'], async (req, res) => {
  const user = await requireUser(req)
  await rateLimit(req, 'welcome', 10, 3600, user.id)

  const { data: claimed, error } = await admin()
    .from('profiles')
    .update({ welcomed_at: new Date().toISOString() })
    .eq('id', user.id)
    .is('welcomed_at', null)
    .select('email,name')
    .maybeSingle()
  if (error) throw error

  if (claimed?.email) {
    const sent = await sendEmail(welcomeEmail(claimed.email as string, (claimed.name as string | null) ?? null, siteUrl()))
    // If the provider rejected it, release the claim so a later sign-in can try again.
    if (!sent) await admin().from('profiles').update({ welcomed_at: null }).eq('id', user.id)
    return send(res, 200, { ok: true, sent })
  }
  send(res, 200, { ok: true, sent: false })
})
