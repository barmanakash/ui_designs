import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { requireEnv } from './env.js'

let client: SupabaseClient | null = null

/**
 * Service-role client. BYPASSES Row Level Security, so only use it on the server, and
 * only after you have verified the caller yourself (see auth.ts).
 */
export function admin(): SupabaseClient {
  if (!client) {
    const e = requireEnv('SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY')
    client = createClient(e.SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return client
}
