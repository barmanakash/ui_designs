import { describe, expect, it } from 'vitest'
import { POPULARITY_WEIGHTS, popularityScore } from '../../src/lib/popularity'

describe('popularityScore', () => {
  it('uses the documented weights: view 1, save 5, copy 3', () => {
    expect(POPULARITY_WEIGHTS).toEqual({ view: 1, save: 5, copy: 3 })
  })

  it('is zero with no activity', () => {
    expect(popularityScore({})).toBe(0)
  })

  it('weights each signal correctly', () => {
    expect(popularityScore({ views: 10 })).toBe(10)
    expect(popularityScore({ saves: 2 })).toBe(10)
    expect(popularityScore({ copies: 4 })).toBe(12)
  })

  it('combines signals', () => {
    expect(popularityScore({ views: 100, saves: 10, copies: 5 })).toBe(100 + 50 + 15)
  })

  it('ranks a design people save and copy above one that is merely viewed', () => {
    const viewedOnly = popularityScore({ views: 50 })
    const loved = popularityScore({ views: 20, saves: 5, copies: 5 })
    expect(loved).toBeGreaterThan(viewedOnly)
  })
})
