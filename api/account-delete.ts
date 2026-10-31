import { z } from 'zod'
import { requireUser } from './_lib/auth.js'
import { HttpError, route, send } from './_lib/http.js'
import { rateLimit } from './_lib/rateLimit.js'
import { cancelSubscription } from './_lib/razorpay.js'
import { admin } from './_lib/supabase.js'

const Body = z.object({ confirm: z.literal('DELETE') })

/**
 * POST /api/account-delete   { confirm: "DELETE" }   (Authorization: Bearer <token>)
 * Permanently deletes the account: stops billing, removes uploaded files, then deletes the auth user.
 * Foreign keys cascade to the profile, moodboards and submissions. Subscription rows are kept
 * (user_id becomes NULL) so payment records survive without personal data.
 */
export default route(['POST'], async (req, res) => {
  const user = await requireUser(req)
  await rateLimit(req, 'account-delete', 3, 3600, user.id)

  if (!Body.safeParse(req.body).success) {
    throw new HttpError(400, 'Type DELETE to confirm account deletion.', 'bad_request')
  }
  const db = admin()

  // 1. Stop billing first. Best effort: a provider hiccup must not leave the user unable to delete.
  const { data: subs } = await db
    .from('subscriptions')
    .select('provider_sub_id,status')
    .eq('user_id', user.id)
    .in('status', ['active', 'authenticated', 'pending'])
  for (const s of subs ?? []) {
    try {
      await cancelSubscription(s.provider_sub_id as string, false)
    } catch (e) {
      console.error('[account-delete] could not cancel subscription', s.provider_sub_id, e)
    }
  }

  // 2. Remove the user's uploaded screenshots (best effort).
  try {
    const { data: files } = await db.storage.from('submissions').list(user.id, { limit: 1000 })
    if (files?.length) await db.storage.from('submissions').remove(files.map((f) => `${user.id}/${f.name}`))
  } catch (e) {
    console.error('[account-delete] storage cleanup failed', e)
  }

  // 3. Delete the auth user. This is the step that must succeed.
  const { error } = await db.auth.admin.deleteUser(user.id)
  if (error) throw error

  send(res, 200, { ok: true })
})
