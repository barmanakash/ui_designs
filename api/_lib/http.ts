import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ConfigError } from './env.js'

/** Throw from anywhere in a route to return a specific status + machine-readable code. */
export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message)
    this.name = 'HttpError'
  }
}

/** JSON response. API responses are never cached (they can contain per-user data). */
export function send(res: VercelResponse, status: number, body: unknown) {
  res.setHeader('Cache-Control', 'no-store')
  res.status(status).json(body)
}

export function header(req: VercelRequest, name: string): string | undefined {
  const v = req.headers[name.toLowerCase()]
  return Array.isArray(v) ? v[0] : v
}

/** First value of a query-string parameter. */
export function queryParam(req: VercelRequest, name: string): string | undefined {
  const v = req.query[name]
  return Array.isArray(v) ? v[0] : v
}

/**
 * Wraps a route: enforces allowed methods and converts every failure into a safe JSON
 * error. Internal details are logged server-side and never sent to the client.
 */
export function route(
  methods: string[],
  fn: (req: VercelRequest, res: VercelResponse) => Promise<void>,
) {
  return async function handler(req: VercelRequest, res: VercelResponse) {
    try {
      if (!methods.includes(req.method ?? '')) {
        res.setHeader('Allow', methods.join(', '))
        return send(res, 405, { error: 'Method not allowed' })
      }
      await fn(req, res)
    } catch (e) {
      if (e instanceof HttpError) return send(res, e.status, { error: e.message, code: e.code })
      if (e instanceof ConfigError) {
        console.error(e.message)
        return send(res, 503, { error: 'This feature is not configured yet.', code: 'not_configured' })
      }
      console.error('Unhandled API error:', e)
      return send(res, 500, { error: 'Something went wrong. Please try again.' })
    }
  }
}
