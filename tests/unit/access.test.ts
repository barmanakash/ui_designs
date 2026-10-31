import { describe, expect, it } from 'vitest'
import { decideProContentAccess, isProActive, remainingFreeSearches } from '../../api/_lib/access'

const NOW = Date.parse('2026-11-01T00:00:00Z')
const DAY = 86_400_000
const iso = (offsetMs: number) => new Date(NOW + offsetMs).toISOString()

const freeUser = { plan: 'free', plan_expires_at: null }
const proForever = { plan: 'pro', plan_expires_at: null }
const proActive = { plan: 'pro', plan_expires_at: iso(+10 * DAY) }
const proExpired = { plan: 'pro', plan_expires_at: iso(-1 * DAY) }

describe('isProActive', () => {
  it('is false with no profile', () => {
    expect(isProActive(null, NOW)).toBe(false)
    expect(isProActive(undefined, NOW)).toBe(false)
  })
  it('is false on the free plan, even with a future expiry', () => {
    expect(isProActive(freeUser, NOW)).toBe(false)
    expect(isProActive({ plan: 'free', plan_expires_at: iso(+DAY) }, NOW)).toBe(false)
  })
  it('is true for Pro with no end date', () => {
    expect(isProActive(proForever, NOW)).toBe(true)
  })
  it('is true for Pro until the expiry passes', () => {
    expect(isProActive(proActive, NOW)).toBe(true)
  })
  it('is false once the plan has expired (graceful downgrade)', () => {
    expect(isProActive(proExpired, NOW)).toBe(false)
  })
  it('is false for an unparseable expiry rather than granting access', () => {
    expect(isProActive({ plan: 'pro', plan_expires_at: 'not-a-date' }, NOW)).toBe(false)
  })
})

describe('decideProContentAccess (the paywall)', () => {
  const proDesign = { is_pro_content: true }
  const freeDesign = { is_pro_content: false }
  const user = { id: 'u1' }

  it('lets anyone, even logged out, read free designs', () => {
    expect(decideProContentAccess(freeDesign, null, null, NOW)).toEqual({ ok: true })
    expect(decideProContentAccess(freeDesign, user, freeUser, NOW)).toEqual({ ok: true })
  })

  it('asks logged-out visitors to log in for Pro designs', () => {
    expect(decideProContentAccess(proDesign, null, null, NOW)).toMatchObject({ ok: false, status: 401, code: 'login_required' })
  })

  it('blocks free users from Pro designs', () => {
    expect(decideProContentAccess(proDesign, user, freeUser, NOW)).toMatchObject({ ok: false, status: 403, code: 'pro_required' })
  })

  it('blocks a logged-in user who has no profile row', () => {
    expect(decideProContentAccess(proDesign, user, null, NOW)).toMatchObject({ ok: false, status: 403, code: 'pro_required' })
  })

  it('blocks users whose Pro plan has expired', () => {
    expect(decideProContentAccess(proDesign, user, proExpired, NOW)).toMatchObject({ ok: false, status: 403, code: 'pro_required' })
  })

  it('allows active Pro users', () => {
    expect(decideProContentAccess(proDesign, user, proActive, NOW)).toEqual({ ok: true })
    expect(decideProContentAccess(proDesign, user, proForever, NOW)).toEqual({ ok: true })
  })
})

describe('remainingFreeSearches', () => {
  it('counts down and never goes negative', () => {
    expect(remainingFreeSearches(3, 0)).toBe(3)
    expect(remainingFreeSearches(3, 2)).toBe(1)
    expect(remainingFreeSearches(3, 3)).toBe(0)
    expect(remainingFreeSearches(3, 9)).toBe(0)
  })
})
