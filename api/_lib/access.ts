// Pure access-control logic (no I/O) so the paywall rules can be unit-tested.

export interface ProfileLike {
  plan: string
  plan_expires_at: string | null
}

/** Pro is active when plan = 'pro' and it has not expired. A null expiry means no end date. */
export function isProActive(profile: ProfileLike | null | undefined, now: number = Date.now()): boolean {
  if (!profile || profile.plan !== 'pro') return false
  if (!profile.plan_expires_at) return true
  const expires = new Date(profile.plan_expires_at).getTime()
  return Number.isFinite(expires) && expires > now
}

export type AccessDecision =
  | { ok: true }
  | { ok: false; status: 401 | 403; code: 'login_required' | 'pro_required'; error: string }

/**
 * Decides whether a caller may receive a design's gated fields (full teardown, code, prompt).
 *  • Free designs (is_pro_content = false): everyone, even logged out.
 *  • Pro designs: must be logged in AND have an active Pro plan.
 */
export function decideProContentAccess(
  design: { is_pro_content: boolean },
  user: { id: string } | null,
  profile: ProfileLike | null,
  now: number = Date.now(),
): AccessDecision {
  if (!design.is_pro_content) return { ok: true }
  if (!user) return { ok: false, status: 401, code: 'login_required', error: 'Please log in to continue.' }
  if (!isProActive(profile, now)) return { ok: false, status: 403, code: 'pro_required', error: 'This content is part of Frameflow Pro.' }
  return { ok: true }
}

/** Free searches left today (never negative). */
export function remainingFreeSearches(limit: number, used: number): number {
  return Math.max(0, limit - used)
}
