import { z } from 'zod'
import { reportNotificationEmail, sendEmail } from './_lib/email.js'
import { env, siteUrl } from './_lib/env.js'
import { HttpError, route, send } from './_lib/http.js'
import { rateLimit } from './_lib/rateLimit.js'
import { admin } from './_lib/supabase.js'

const Body = z.object({
  design_id: z.string().uuid(),
  reason: z.enum(['copyright', 'inaccurate', 'offensive', 'other']),
  details: z.string().trim().max(2000).default(''),
  email: z.union([z.string().trim().email().max(200), z.literal('')]).optional(),
  website: z.string().max(200).optional(), // honeypot: real users never see or fill this field
})

/**
 * POST /api/report: "Report / request removal" on a design page.
 * Stores the report for the admin queue and emails the site owner (48-hour takedown commitment).
 */
export default route(['POST'], async (req, res) => {
  await rateLimit(req, 'report', 5, 3600)

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) throw new HttpError(400, 'Please check the form and try again.', 'bad_request')
  const b = parsed.data

  // Bots fill every field. Pretend it worked so they don't adapt, but store nothing.
  if (b.website) return send(res, 200, { ok: true })

  const { data: design, error: designError } = await admin()
    .from('designs')
    .select('id,slug,title')
    .eq('id', b.design_id)
    .maybeSingle()
  if (designError) throw designError
  if (!design) throw new HttpError(404, 'That design no longer exists.', 'not_found')

  const { error } = await admin().from('reports').insert({
    design_id: design.id,
    reporter_email: b.email || null,
    reason: b.reason,
    details: b.details,
  })
  if (error) throw error

  const owner = env('ADMIN_EMAIL')
  if (owner) {
    await sendEmail(
      reportNotificationEmail(owner, {
        designTitle: design.title as string,
        designUrl: `${siteUrl()}/design/${design.slug}`,
        reason: b.reason,
        details: b.details,
        reporterEmail: b.email || null,
      }),
    )
  }

  send(res, 200, { ok: true })
})
