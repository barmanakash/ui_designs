// Server-side error tracking. Does nothing unless SENTRY_DSN is set, and loads the SDK lazily so
// routes that never fail pay no startup cost. No request bodies, headers or payment payloads are
// attached (sendDefaultPii is off), so secrets and card data can never end up in Sentry.
import { env } from './env.js'

type SentryModule = typeof import('@sentry/node')
let loading: Promise<SentryModule | null> | null = null

function load(): Promise<SentryModule | null> {
  const dsn = env('SENTRY_DSN')
  if (!dsn) return Promise.resolve(null)
  if (!loading) {
    loading = import('@sentry/node')
      .then((Sentry) => {
        Sentry.init({
          dsn,
          environment: env('VERCEL_ENV') ?? 'development',
          release: env('VERCEL_GIT_COMMIT_SHA'),
          sendDefaultPii: false,
          tracesSampleRate: 0,
        })
        return Sentry
      })
      .catch((e) => {
        console.error('[monitor] could not load Sentry:', e)
        return null
      })
  }
  return loading
}

/** Reports an unexpected error. Never throws, so it can't turn one failure into two. */
export async function captureServerError(error: unknown, route?: string): Promise<void> {
  try {
    const Sentry = await load()
    if (!Sentry) return
    Sentry.withScope((scope) => {
      if (route) scope.setTag('route', route)
      Sentry.captureException(error)
    })
    // Serverless functions freeze right after responding, so flush before returning.
    await Sentry.flush(2000)
  } catch {
    /* monitoring must never break a request */
  }
}
