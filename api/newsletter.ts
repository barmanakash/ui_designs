import { z } from 'zod'
import { newsletterConfirmEmail, sendEmail } from './_lib/email.js'
import { env, siteUrl } from './_lib/env.js'
import { HttpError, queryParam, route, send } from './_lib/http.js'
import { rateLimit } from './_lib/rateLimit.js'
import { admin } from './_lib/supabase.js'

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  website: z.string().max(200).optional(), // honeypot
})

const TOKEN = /^[a-f0-9]{64}$/

/**
 * Newsletter with double opt-in.
 *   POST /api/newsletter  { email }          → stores the address as unconfirmed and emails a confirm link
 *   GET  /api/newsletter?confirm=<token>      → confirms, then redirects to the site
 *   GET  /api/newsletter?unsubscribe=<token>  → removes the address (use this link in every newsletter email)
 *
 * The POST always answers the same way, whether or not the address was already known, so it can't
 * be used to discover who is subscribed.
 */
export default route(['GET', 'POST'], async (req, res) => {
  const site = siteUrl(req.headers.host)

  if (req.method === 'GET') {
    const confirm = queryParam(req, 'confirm')
    const unsubscribe = queryParam(req, 'unsubscribe')
    let outcome = 'invalid'

    if (confirm && TOKEN.test(confirm)) {
      const { data, error } = await admin()
        .from('newsletter')
        .update({ confirmed: true, confirmed_at: new Date().toISOString() })
        .eq('token', confirm)
        .select('id')
      if (error) throw error
      if (data?.length) outcome = 'confirmed'
    } else if (unsubscribe && TOKEN.test(unsubscribe)) {
      const { data, error } = await admin().from('newsletter').delete().eq('token', unsubscribe).select('id')
      if (error) throw error
      if (data?.length) outcome = 'unsubscribed'
    }

    res.setHeader('Cache-Control', 'no-store')
    return res.redirect(302, `${site}/?newsletter=${outcome}`)
  }

  await rateLimit(req, 'newsletter', 5, 3600)
  const parsed = Body.safeParse(req.body)
  if (!parsed.success) throw new HttpError(400, 'Please enter a valid email address.', 'bad_request')
  const { email, website } = parsed.data
  if (website) return send(res, 200, { ok: true, pending: true }) // honeypot tripped

  // Without an email provider nobody could ever click the confirm link, so (dev convenience)
  // subscribe immediately instead of leaving the address stuck as "unconfirmed".
  const canEmail = Boolean(env('RESEND_API_KEY') && env('EMAIL_FROM'))

  const found = await admin().from('newsletter').select('id,confirmed,token').eq('email', email).maybeSingle()
  if (found.error) throw found.error
  let row = found.data

  if (!row) {
    const inserted = await admin()
      .from('newsletter')
      .insert({ email, confirmed: !canEmail, confirmed_at: canEmail ? null : new Date().toISOString() })
      .select('id,confirmed,token')
      .single()
    if (inserted.error && inserted.error.code !== '23505') throw inserted.error // 23505 = lost a race; fine
    row = inserted.data
  }

  if (row && !row.confirmed && canEmail) {
    await sendEmail(newsletterConfirmEmail(email, `${site}/api/newsletter?confirm=${row.token}`))
  }

  send(res, 200, { ok: true, pending: canEmail })
})
