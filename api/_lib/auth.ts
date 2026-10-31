import type { VercelRequest } from '@vercel/node'
import { header, HttpError } from './http.js'
import { admin } from './supabase.js'

export interface AuthedUser {
  id: string
  email: string | null
}

export interface ProfileRow {
  id: string
  email: string
  name: string | null
  role: string
  plan: string
  plan_expires_at: string | null
}

/** Extracts the bearer token from the Authorization header. */
export function bearer(req: VercelRequest): string | null {
  const h = header(req, 'authorization')
  const m = h?.match(/^Bearer\s+(.+)$/i)
  return m ? m[1].trim() : null
}

/** Verifies the Supabase JWT with Supabase itself. Returns null for anonymous/invalid tokens. */
export async function getUser(req: VercelRequest): Promise<AuthedUser | null> {
  const token = bearer(req)
  if (!token) return null
  const { data, error } = await admin().auth.getUser(token)
  if (error || !data.user) return null
  return { id: data.user.id, email: data.user.email ?? null }
}

export async function requireUser(req: VercelRequest): Promise<AuthedUser> {
  const user = await getUser(req)
  if (!user) throw new HttpError(401, 'Please log in to continue.', 'login_required')
  return user
}

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await admin()
    .from('profiles')
    .select('id,email,name,role,plan,plan_expires_at')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return (data as ProfileRow | null) ?? null
}
