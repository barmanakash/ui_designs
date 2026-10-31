import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifyWebhookSignature } from '../../api/_lib/razorpay'

const SECRET = 'whsec_test_secret'
const BODY = '{"event":"subscription.activated","payload":{"subscription":{"entity":{"id":"sub_123"}}}}'
const sign = (body: string, secret = SECRET) => createHmac('sha256', secret).update(body).digest('hex')

describe('verifyWebhookSignature', () => {
  it('accepts a correct signature', () => {
    expect(verifyWebhookSignature(BODY, sign(BODY), SECRET)).toBe(true)
  })

  it('rejects a tampered body (e.g. an attacker upgrading someone to Pro)', () => {
    const tampered = BODY.replace('sub_123', 'sub_999')
    expect(verifyWebhookSignature(tampered, sign(BODY), SECRET)).toBe(false)
  })

  it('rejects a signature made with the wrong secret', () => {
    expect(verifyWebhookSignature(BODY, sign(BODY, 'another_secret'), SECRET)).toBe(false)
  })

  it('rejects a missing or empty signature', () => {
    expect(verifyWebhookSignature(BODY, undefined, SECRET)).toBe(false)
    expect(verifyWebhookSignature(BODY, '', SECRET)).toBe(false)
  })

  it('rejects a signature of the wrong length without throwing', () => {
    expect(verifyWebhookSignature(BODY, 'abc123', SECRET)).toBe(false)
  })

  it('refuses everything when the secret is not configured', () => {
    expect(verifyWebhookSignature(BODY, sign(BODY, ''), '')).toBe(false)
  })

  it('is sensitive to whitespace, so the RAW body must be verified, not re-serialised JSON', () => {
    const pretty = JSON.stringify(JSON.parse(BODY), null, 2)
    expect(verifyWebhookSignature(pretty, sign(BODY), SECRET)).toBe(false)
  })
})
