import { z } from 'zod'
import { getProfile, requireUser } from './_lib/auth.js'
import { sendEmail, submissionReviewedEmail } from './_lib/email.js'
import { siteUrl } from './_lib/env.js'
import { HttpError, route, send } from './_lib/http.js'
import { rateLimit } from './_lib/rateLimit.js'
import { admin } from './_lib/supabase.js'

const Body = z.object({
  id: z.string().uuid(),
  status: z.enum(['approved', 'rejected']),
})

/**
 * POST /api/submission-review   { id, status: 'approved' | 'rejected' }   (admin only)
 * Moves a PENDING submission to approved/rejected and emails the submitter. Only pending rows are
 * changed, so a double click or a retry can never send the same email twice.
 */
export default route(['POST'], async (req, res) => {
  const user = await requireUser(req)
  const profile = await getProfile(user.id)
  // Role is checked on the server from the database, never trusted from the client.
  if (profile?.role !== 'admin') throw new HttpError(403, 'Admins only.', 'forbidden')
  await rateLimit(req, 'submission-review', 60, 60, user.id)

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) throw new HttpError(400, 'Invalid request.', 'bad_request')
  const { id, status } = parsed.data

  const { data: updated, error } = await admin()
    .from('submissions')
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
    .select('user_id,title')
    .maybeSingle()
  if (error) throw error
  if (!updated) throw new HttpError(409, 'That submission was already reviewed.', 'already_reviewed')

  // Email the submitter. A mail failure must not undo the review, so it is best-effort.
  const { data: owner } = await admin().from('profiles').select('email').eq('id', updated.user_id).maybeSingle()
  const to = owner?.email as string | undefined
  if (to) {
    await sendEmail(submissionReviewedEmail(to, { title: updated.title as string, approved: status === 'approved', siteUrl: siteUrl() }))
  }

  send(res, 200, { ok: true, status })
})
