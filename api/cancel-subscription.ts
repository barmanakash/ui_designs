import { cancelledEmail, sendEmail } from './_lib/email.js'
import { siteUrl } from './_lib/env.js'
import { getProfile, requireUser } from './_lib/auth.js'
import { HttpError, route, send } from './_lib/http.js'
import { rateLimit } from './_lib/rateLimit.js'
import { cancelSubscription } from './_lib/razorpay.js'
import { admin } from './_lib/supabase.js'

/**
 * POST /api/cancel-subscription   (Authorization: Bearer <token>)
 * Stops renewal. For an active subscription the user keeps Pro until the period they already
 * paid for ends; the webhook confirms the cancellation and the plan then lapses on its own.
 */
export default route(['POST'], async (req, res) => {
  const user = await requireUser(req)
  await rateLimit(req, 'cancel-sub', 5, 60, user.id)

  const { data: sub, error } = await admin()
    .from('subscriptions')
    .select('provider_sub_id,status,current_period_end')
    .eq('user_id', user.id)
    .in('status', ['active', 'authenticated', 'pending'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!sub) throw new HttpError(404, 'You have no active subscription to cancel.', 'no_subscription')

  // Razorpay only allows "cancel at cycle end" for subscriptions that are already active.
  await cancelSubscription(sub.provider_sub_id, sub.status === 'active')

  await admin()
    .from('subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('provider_sub_id', sub.provider_sub_id)

  const profile = await getProfile(user.id)
  const accessUntil = profile?.plan_expires_at ?? sub.current_period_end ?? null
  if (user.email) {
    const label = accessUntil
      ? new Date(accessUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : null
    await sendEmail(cancelledEmail(user.email, label, siteUrl()))
  }

  send(res, 200, { ok: true, accessUntil })
})
