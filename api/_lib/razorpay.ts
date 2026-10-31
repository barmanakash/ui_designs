// Minimal Razorpay REST client (no SDK) + webhook signature verification.
import { createHmac, timingSafeEqual } from 'node:crypto'
import { requireEnv } from './env.js'
import { HttpError } from './http.js'

const BASE = 'https://api.razorpay.com/v1'

export interface RzSubscription {
  id: string
  status: string
  plan_id: string
  current_start?: number | null
  current_end?: number | null
  notes?: Record<string, string> | []
}

function authHeader(): string {
  const e = requireEnv('RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET')
  return 'Basic ' + Buffer.from(`${e.RAZORPAY_KEY_ID}:${e.RAZORPAY_KEY_SECRET}`).toString('base64')
}

async function rz<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(BASE + path, {
    method: init?.method ?? 'GET',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  })
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    // Log the provider's message server-side; show the user a generic one.
    console.error('[razorpay]', res.status, JSON.stringify(json).slice(0, 500))
    throw new HttpError(502, 'The payment provider returned an error. Please try again.', 'payment_provider_error')
  }
  return json as T
}

export const createSubscription = (planId: string, totalCount: number, notes: Record<string, string>) =>
  rz<RzSubscription>('/subscriptions', {
    method: 'POST',
    body: { plan_id: planId, total_count: totalCount, customer_notify: 1, notes },
  })

/** atCycleEnd = true keeps access until the paid period ends (only valid for ACTIVE subscriptions). */
export const cancelSubscription = (subscriptionId: string, atCycleEnd: boolean) =>
  rz<RzSubscription>(`/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    method: 'POST',
    body: { cancel_at_cycle_end: atCycleEnd ? 1 : 0 },
  })

/**
 * Verifies the X-Razorpay-Signature header: HMAC-SHA256 of the RAW request body using the
 * webhook secret. Uses a constant-time comparison to avoid timing attacks.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | undefined, secret: string): boolean {
  if (!signature || !secret) return false
  const expected = Buffer.from(createHmac('sha256', secret).update(rawBody).digest('hex'))
  const given = Buffer.from(signature)
  return expected.length === given.length && timingSafeEqual(expected, given)
}
