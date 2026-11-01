import { describe, expect, it } from 'vitest'
import { isValidGstin, normalizeGstin } from '../../src/lib/gstin'

describe('GSTIN validation', () => {
  it('accepts an empty value because GSTIN is optional', () => {
    expect(isValidGstin('')).toBe(true)
    expect(isValidGstin('   ')).toBe(true)
  })

  it('accepts a well-formed GSTIN, ignoring case and spaces', () => {
    expect(isValidGstin('27AAPFU0939F1ZV')).toBe(true)
    expect(isValidGstin('  27aapfu0939f1zv ')).toBe(true)
  })

  it('rejects malformed values', () => {
    expect(isValidGstin('27AAPFU0939F1Z')).toBe(false) // too short
    expect(isValidGstin('AAAAAAAAAAAAAAA')).toBe(false) // no state code
    expect(isValidGstin('27AAPFU0939F1XV')).toBe(false) // 14th character must be Z
    expect(isValidGstin('27AAPFU0939F1ZV1')).toBe(false) // too long
  })

  it('normalizes to trimmed uppercase', () => {
    expect(normalizeGstin(' 27aapfu0939f1zv ')).toBe('27AAPFU0939F1ZV')
  })
})
