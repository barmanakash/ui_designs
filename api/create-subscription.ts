import { z } from 'zod'
import { GSTIN_PATTERN } from '../src/lib/gstin.js'
import { isProActive } from './_lib/access.js'
import { getProfile, requireUser } from './_lib/auth.js'
import { requireEnv } from './_lib/env.js'
import { HttpError, route, send } from './_lib/http.js'
import { rateLimit } from './_lib/rateLimit.js'
import { createSubscription } from './_lib/razorpay.js'
import { admin } from './_lib/supabase.js'

const Body = z.object({
  plan: z.enum(['monthly', 'yearly']),
  provider: z.literal('razorpay').default('razorpay'),
  // Optional GSTIN for the receipt. Empty string = none.
  gstin: z.union([z.literal(''), z.string().trim().toUpperCase().regex(GSTIN_PATTERN)]).optional(),
})

// Razorpay requires a billing-cycle count. 10 years of either plan; users can cancel anytime.
const TOTAL_COUNT = { monthly: 120, yearly: 10 } as const

/**
 * POST /api/create-subscription   { plan: 'monthly' | 'yearly' }   (Authorization: Bearer <token>)
 * → { keyId, subscriptionId }  for Razorpay Checkout. Pro is NOT granted here; the webhook does that
 *   after Razorpay confirms payment, so a tampered browser callback can never unlock anything.
 */
export default route(['POST'], async (req, res) => {
  const user = await requireUser(req)
  await rateLimit(req, 'create-sub', 6, 60, user.id)

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) throw new HttpError(400, 'Choose a monthly or yearly plan, and check the GSTIN format if you entered one.', 'bad_request')

  const profile = await getProfile(user.id)
  if (isProActive(profile)) throw new HttpError(409, 'You already have an active Pro plan.', 'already_pro')

  const e = requireEnv('RAZORPAY_KEY_ID', 'RAZORPAY_PLAN_MONTHLY', 'RAZORPAY_PLAN_YEARLY')
  const { plan, gstin } = parsed.data
  const planId = plan === 'monthly' ? e.RAZORPAY_PLAN_MONTHLY : e.RAZORPAY_PLAN_YEARLY

  // notes.user_id is how the webhook knows whom to upgrade. The GSTIN rides along for the receipt.
  const sub = await createSubscription(planId, TOTAL_COUNT[plan], { user_id: user.id, plan, ...(gstin ? { gstin } : {}) })

  const { error } = await admin().from('subscriptions').insert({
    user_id: user.id,
    provider: 'razorpay',
    provider_sub_id: sub.id,
    plan,
    status: sub.status,
    gstin: gstin || null,
  })
  if (error) throw error

  send(res, 200, { keyId: e.RAZORPAY_KEY_ID, subscriptionId: sub.id })
})
