import { describe, expect, it } from 'vitest'
import { rankLocally, tokenize, type MatchDesign } from '../../src/lib/localMatch'

const d = (id: string, over: Partial<MatchDesign>): MatchDesign => ({
  id,
  title: 'Untitled',
  description: '',
  flow_type: 'dashboard',
  industry: 'saas',
  platform: 'web',
  tags: [],
  ...over,
})

// Listed in "popularity order", like the real catalog.
const catalog: MatchDesign[] = [
  d('agent-chat', { title: 'Agent chat thread', flow_type: 'chat', industry: 'ai', tags: ['agent', 'assistant', 'conversation'] }),
  d('upi-pay', { title: 'UPI payment confirmation', flow_type: 'checkout', industry: 'fintech', platform: 'mobile', tags: ['upi', 'payment', 'success'] }),
  d('onboard', { title: 'Welcome flow', flow_type: 'onboarding', industry: 'fintech', platform: 'mobile', tags: ['signup', 'kyc'] }),
  d('settings', { title: 'Account settings', flow_type: 'settings', industry: 'saas', tags: ['preferences'] }),
]

describe('tokenize', () => {
  it('lowercases, drops filler words and de-pluralises', () => {
    expect(tokenize('I want a Checkout screen for payments')).toEqual(['checkout', 'payment'])
  })
})

describe('rankLocally', () => {
  it('puts the best match first', () => {
    const out = rankLocally('a checkout flow for a UPI payment app', catalog)
    expect(out[0].design_id).toBe('upi-pay')
  })

  it('uses synonyms: "chatbot" finds agent and assistant screens', () => {
    const out = rankLocally('designing a chatbot for support', catalog)
    expect(out[0].design_id).toBe('agent-chat')
  })

  it('gives a plain-language reason mentioning what matched', () => {
    const [first] = rankLocally('onboarding for a fintech app', catalog)
    expect(first.reason).toMatch(/onboarding/)
    expect(first.reason.length).toBeLessThanOrEqual(200)
  })

  it('returns only designs that overlap the brief when there are matches', () => {
    const ids = rankLocally('account settings page', catalog).map((r) => r.design_id)
    expect(ids).toContain('settings')
    expect(ids).not.toContain('agent-chat')
  })

  it('falls back to the most popular designs when nothing matches', () => {
    const out = rankLocally('zzzz qqqq xxxx', catalog)
    expect(out.length).toBeGreaterThan(0)
    expect(out[0].design_id).toBe('agent-chat') // first in popularity order
  })

  it('never returns duplicates, unknown ids, or more than the limit', () => {
    const many = Array.from({ length: 30 }, (_, i) => d(`x${i}`, { tags: ['payment'] }))
    const out = rankLocally('payment', many, 10)
    expect(out).toHaveLength(10)
    expect(new Set(out.map((r) => r.design_id)).size).toBe(10)
    const valid = new Set(many.map((m) => m.id))
    expect(out.every((r) => valid.has(r.design_id))).toBe(true)
  })

  it('keeps popularity order for equal scores', () => {
    const tied = [d('first', { tags: ['payment'] }), d('second', { tags: ['payment'] })]
    expect(rankLocally('payment', tied).map((r) => r.design_id)).toEqual(['first', 'second'])
  })
})
