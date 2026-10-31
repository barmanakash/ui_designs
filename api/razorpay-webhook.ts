import type { VercelRequest } from '@vercel/node'
import { cancelledEmail, paymentFailedEmail, receiptEmail, sendEmail } from './_lib/email.js'
import { env, requireEnv, siteUrl } from './_lib/env.js'
import { header, HttpError, route, send } from './_lib/http.js'
import { verifyWebhookSignature } from './_lib/razorpay.js'
import { admin } from './_lib/supabase.js'

// The signature is computed over the RAW body, so Vercel must not parse it first.
export const config = { api: { bodyParser: false } }

interface SubEntity {
  id: string
  status: string
  plan_id?: string
  current_end?: number | null
  notes?: Record<string, string> | []
}
interface PaymentEntity {
  amount?: number
  currency?: string
  email?: string
}
interface RzEvent {
  event: string
  payload?: { subscription?: { entity?: SubEntity }; payment?: { entity?: PaymentEntity } }
}

/** Extra time after a paid period ends, so a slightly late renewal webhook doesn't lock out a paying user. */
const GRACE_MS = 24 * 60 * 60 * 1000

async function readRawBody(req: VercelRequest): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer))
  return Buffer.concat(chunks).toString('utf8')
}

const noteOf = (sub: SubEntity, key: string): string | undefined => {
  const n = sub.notes
  return n && !Array.isArray(n) ? n[key] : undefined
}

function planOf(sub: SubEntity): 'monthly' | 'yearly' | null {
  const fromNote = noteOf(sub, 'plan')
  if (fromNote === 'monthly' || fromNote === 'yearly') return fromNote
  if (sub.plan_id && sub.plan_id === env('RAZORPAY_PLAN_YEARLY')) return 'yearly'
  if (sub.plan_id && sub.plan_id === env('RAZORPAY_PLAN_MONTHLY')) return 'monthly'
  return null
}

/** Who owns this subscription? First the note we attached at creation, then our own table. */
async function resolveUser(sub: SubEntity): Promise<string | null> {
  const fromNote = noteOf(sub, 'user_id')
  if (fromNote) return fromNote
  const { data } = await admin().from('subscriptions').select('user_id').eq('provider_sub_id', sub.id).maybeSingle()
  return (data?.user_id as string | null) ?? null
}

function periodEnd(sub: SubEntity, plan: 'monthly' | 'yearly' | null): Date {
  if (sub.current_end) return new Date(sub.current_end * 1000)
  const days = plan === 'yearly' ? 366 : 32 // fallback only; Razorpay normally sends current_end
  return new Date(Date.now() + days * 86_400_000)
}

const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

async function emailOf(userId: string): Promise<string | null> {
  const { data } = await admin().from('profiles').select('email').eq('id', userId).maybeSingle()
  return (data?.email as string | undefined) || null
}

/** subscription.activated / subscription.charged: grant (or extend) Pro until the paid period ends. */
async function activate(event: string, sub: SubEntity, payment?: PaymentEntity) {
  const userId = await resolveUser(sub)
  if (!userId) {
    console.error('[webhook] no user for subscription', sub.id)
    return
  }
  const plan = planOf(sub)
  const end = periodEnd(sub, plan)

  const { error: subError } = await admin().from('subscriptions').upsert(
    {
      provider_sub_id: sub.id,
      user_id: userId,
      provider: 'razorpay',
      plan,
      status: sub.status,
      current_period_end: end.toISOString(),
      cancelled_at: null,
    },
    { onConflict: 'provider_sub_id' },
  )
  if (subError) throw subError
  const { error } = await admin()
    .from('profiles')
    .update({ plan: 'pro', plan_expires_at: new Date(end.getTime() + GRACE_MS).toISOString() })
    .eq('id', userId)
  if (error) throw error

  if (event === 'subscription.charged' && payment?.amount) {
    const to = await emailOf(userId)
    if (to) {
      await sendEmail(
        receiptEmail(to, {
          amount: payment.amount / 100, // Razorpay amounts are in the smallest unit (paise)
          currency: payment.currency ?? 'INR',
          plan: plan ?? 'pro',
          renewsOn: fmtDate(end),
          siteUrl: siteUrl(),
        }),
      )
    }
  }
}

/** subscription.cancelled: stop renewing but keep Pro until the period already paid for ends. */
async function markCancelled(sub: SubEntity) {
  const end = sub.current_end ? new Date(sub.current_end * 1000) : null
  await admin()
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      ...(end ? { current_period_end: end.toISOString() } : {}),
    })
    .eq('provider_sub_id', sub.id)

  const userId = await resolveUser(sub)
  const to = userId ? await emailOf(userId) : null
  if (to) await sendEmail(cancelledEmail(to, end ? fmtDate(end) : null, siteUrl()))
}

/** subscription.completed / subscription.halted. A halted subscription (repeated payment failure) loses access now. */
async function endSubscription(event: string, sub: SubEntity) {
  await admin().from('subscriptions').update({ status: sub.status }).eq('provider_sub_id', sub.id)
  if (event === 'subscription.halted') {
    const userId = await resolveUser(sub)
    if (userId) await admin().from('profiles').update({ plan_expires_at: new Date().toISOString() }).eq('id', userId)
  }
}

async function processEvent(evt: RzEvent) {
  const sub = evt.payload?.subscription?.entity
  const payment = evt.payload?.payment?.entity
  switch (evt.event) {
    case 'subscription.activated':
    case 'subscription.charged':
      if (sub) await activate(evt.event, sub, payment)
      break
    case 'subscription.cancelled':
      if (sub) await markCancelled(sub)
      break
    case 'subscription.completed':
    case 'subscription.halted':
      if (sub) await endSubscription(evt.event, sub)
      break
    case 'payment.failed':
      if (payment?.email) await sendEmail(paymentFailedEmail(payment.email, siteUrl()))
      break
    default:
      break // other events are acknowledged and ignored
  }
}

/**
 * POST /api/razorpay-webhook
 * Verifies the signature, processes each event exactly once (idempotent on the event id),
 * and is the ONLY place that upgrades or downgrades a plan.
 */
export default route(['POST'], async (req, res) => {
  const { RAZORPAY_WEBHOOK_SECRET } = requireEnv('RAZORPAY_WEBHOOK_SECRET')

  const raw = await readRawBody(req)
  if (!verifyWebhookSignature(raw, header(req, 'x-razorpay-signature'), RAZORPAY_WEBHOOK_SECRET)) {
    throw new HttpError(400, 'Invalid signature.', 'bad_signature')
  }

  let evt: RzEvent
  try {
    evt = JSON.parse(raw) as RzEvent
  } catch {
    throw new HttpError(400, 'Invalid JSON.', 'bad_request')
  }

  // Idempotency: Razorpay retries deliveries, so record the event id before acting on it.
  const eventId = header(req, 'x-razorpay-event-id')
  if (eventId) {
    const { error } = await admin().from('webhook_events').insert({ id: eventId, event: evt.event })
    if (error) {
      if (error.code === '23505') return send(res, 200, { ok: true, duplicate: true }) // already handled
      throw error
    }
  }

  try {
    await processEvent(evt)
  } catch (e) {
    // Un-record the event so Razorpay's retry gets processed instead of being skipped as a duplicate.
    if (eventId) await admin().from('webhook_events').delete().eq('id', eventId)
    throw e
  }
  send(res, 200, { ok: true })
})
