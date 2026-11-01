import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Fakes ───────────────────────────────────────────────────────────────────
// The route is exercised for real; only the database and the login lookup are replaced.
const SECRET = {
  teardown_md: 'FULL-TEARDOWN-SECRET',
  code_snippet: 'CODE-SNIPPET-SECRET',
  prompt_text: 'PROMPT-TEXT-SECRET',
}
let design: Record<string, unknown> | null = null
let user: { id: string; email: string | null } | null = null
let profile: { id: string; email: string; name: string | null; role: string; plan: string; plan_expires_at: string | null } | null = null

vi.mock('../../api/_lib/supabase', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: design, error: null }),
  }
  return { admin: () => ({ from: () => chain }) }
})
vi.mock('../../api/_lib/auth', () => ({
  getUser: async () => user,
  getProfile: async () => profile,
}))

import handler from '../../api/design-pro-content'

/** Minimal stand-ins for Vercel's request/response objects. */
function call(slug = 'agent-run-timeline') {
  const req = { method: 'GET', query: { slug }, headers: {} } as never
  const out = { status: 0, body: undefined as unknown }
  const res = {
    setHeader: () => undefined,
    status(code: number) { out.status = code; return this },
    json(body: unknown) { out.body = body; return this },
  } as never
  return handler(req, res).then(() => out)
}

const proDesign = { id: 'd1', is_pro_content: true, ...SECRET }
const freeDesign = { id: 'd2', is_pro_content: false, ...SECRET }
const future = new Date(Date.now() + 86_400_000).toISOString()
const past = new Date(Date.now() - 86_400_000).toISOString()
const asProfile = (plan: string, expires: string | null) => ({ id: 'u1', email: 'a@b.c', name: null, role: 'user', plan, plan_expires_at: expires })

beforeEach(() => {
  design = proDesign
  user = null
  profile = null
})

describe('/api/design-pro-content paywall (network-level)', () => {
  it('logged-out visitors get 401 and NO gated content in the response body', async () => {
    const res = await call()
    expect(res.status).toBe(401)
    const raw = JSON.stringify(res.body)
    for (const secret of Object.values(SECRET)) expect(raw).not.toContain(secret)
  })

  it('free users get 403 and NO gated content in the response body', async () => {
    user = { id: 'u1', email: 'a@b.c' }
    profile = asProfile('free', null)
    const res = await call()
    expect(res.status).toBe(403)
    const raw = JSON.stringify(res.body)
    for (const secret of Object.values(SECRET)) expect(raw).not.toContain(secret)
  })

  it('users whose Pro plan has expired are treated as free', async () => {
    user = { id: 'u1', email: 'a@b.c' }
    profile = asProfile('pro', past)
    const res = await call()
    expect(res.status).toBe(403)
    expect(JSON.stringify(res.body)).not.toContain(SECRET.code_snippet)
  })

  it('active Pro users receive the teardown, code and prompt', async () => {
    user = { id: 'u1', email: 'a@b.c' }
    profile = asProfile('pro', future)
    const res = await call()
    expect(res.status).toBe(200)
    expect(res.body).toEqual(SECRET)
  })

  it('designs marked free are open to everyone, even logged out', async () => {
    design = freeDesign
    const res = await call()
    expect(res.status).toBe(200)
    expect(res.body).toEqual(SECRET)
  })

  it('rejects malformed slugs before touching the database', async () => {
    const res = await call('../etc/passwd')
    expect(res.status).toBe(400)
  })
})
