import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { PRICING } from './constants'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** True when Supabase keys are present. If false the app runs in DEMO MODE with mock data. */
export const hasSupabase = Boolean(url && anon)

export const supabase: SupabaseClient | null = hasSupabase
  ? createClient(url!, anon!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null

/** Use where Supabase is guaranteed (after a hasSupabase check). */
export function sb(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export const SITE_URL = ((import.meta.env.VITE_SITE_URL as string | undefined) || window.location.origin).replace(/\/$/, '')
// Prices live in src/lib/constants.ts (PRICING). Re-exported here so existing imports keep working.
export const PRICE_MONTHLY = PRICING.monthly.inr
export const PRICE_YEARLY = PRICING.yearly.inr
