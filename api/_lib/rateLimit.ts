import { createHash } from 'node:crypto'
import type { VercelRequest } from '@vercel/node'
import { env } from './env.js'
import { HttpError } from './http.js'
import { admin } from './supabase.js'

/** Best-effort client IP (Vercel puts the real client first in x-forwarded-for). */
export function clientIp(req: VercelRequest): string {
  const xf = req.headers['x-forwarded-for']
  const first = (Array.isArray(xf) ? xf[0] : xf)?.split(',')[0]?.trim()
  return first || req.socket?.remoteAddress || 'unknown'
}

/** One-way salted hash so raw IPs and ids never sit in our tables. */
export function hashActor(value: string): string {
  const salt = env('RATE_LIMIT_SALT') ?? env('SUPABASE_SERVICE_ROLE_KEY') ?? 'frameflow'
  return createHash('sha256').update(`${salt}:${value}`).digest('hex').slice(0, 32)
}

/**
 * Fixed-window rate limit backed by Postgres (works across serverless instances).
 * Throws 429 when exceeded. If the limiter itself fails we fail OPEN, because a database
 * hiccup should not take the whole site down. Pass `identity` to limit per user instead of per IP.
 */
export async function rateLimit(
  req: VercelRequest,
  bucket: string,
  max: number,
  windowSeconds: number,
  identity?: string,
): Promise<void> {
  const key = `${bucket}:${hashActor(identity ?? clientIp(req))}`
  const { data, error } = await admin().rpc('rate_limit_hit', { p_key: key, p_window: windowSeconds, p_max: max })
  if (error) {
    console.error('Rate limiter error (failing open):', error.message)
    return
  }
  if (data === false) {
    throw new HttpError(429, 'Too many requests. Please wait a moment and try again.', 'rate_limited')
  }
}
