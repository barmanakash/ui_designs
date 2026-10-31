import { env } from './_lib/env.js'
import { route, send } from './_lib/http.js'
import { admin } from './_lib/supabase.js'

/** GET /api/health: uptime check. Reports which integrations are configured (never their values). */
export default route(['GET'], async (_req, res) => {
  const configured = {
    supabase: Boolean(env('SUPABASE_URL') && env('SUPABASE_SERVICE_ROLE_KEY')),
    anthropic: Boolean(env('ANTHROPIC_API_KEY')),
    razorpay: Boolean(env('RAZORPAY_KEY_ID') && env('RAZORPAY_KEY_SECRET') && env('RAZORPAY_WEBHOOK_SECRET')),
    email: Boolean(env('RESEND_API_KEY') && env('EMAIL_FROM')),
  }

  let database: 'ok' | 'error' | 'not_configured' = 'not_configured'
  if (configured.supabase) {
    try {
      const { error } = await admin().from('designs').select('id', { head: true, count: 'exact' }).limit(1)
      database = error ? 'error' : 'ok'
    } catch {
      database = 'error'
    }
  }

  send(res, database === 'error' ? 503 : 200, {
    ok: database !== 'error',
    time: new Date().toISOString(),
    database,
    configured,
  })
})
