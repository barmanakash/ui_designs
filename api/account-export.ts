import { requireUser } from './_lib/auth.js'
import { HttpError, route } from './_lib/http.js'
import { rateLimit } from './_lib/rateLimit.js'
import { admin } from './_lib/supabase.js'

/**
 * GET /api/account-export   (Authorization: Bearer <token>)
 * Downloads everything we store about the caller as JSON (data portability).
 * Provider ids are included; payment card details never touch our servers (Razorpay holds them).
 */
export default route(['GET'], async (req, res) => {
  const user = await requireUser(req)
  await rateLimit(req, 'account-export', 5, 3600, user.id)
  const db = admin()

  const [profile, boards, submissions, subscriptions] = await Promise.all([
    db.from('profiles').select('id,email,name,avatar_url,role,plan,plan_expires_at,created_at').eq('id', user.id).maybeSingle(),
    db.from('moodboards').select('id,name,is_public,share_slug,created_at,moodboard_items(design_id,position)').eq('user_id', user.id),
    db.from('submissions').select('id,title,link,image_url,notes,owns_rights,status,created_at').eq('user_id', user.id),
    db.from('subscriptions').select('provider,provider_sub_id,plan,status,current_period_end,cancelled_at,created_at').eq('user_id', user.id),
  ])
  for (const r of [profile, boards, submissions, subscriptions]) if (r.error) throw r.error
  if (!profile.data) throw new HttpError(404, 'No account data found.', 'not_found')

  const payload = {
    exported_at: new Date().toISOString(),
    profile: profile.data,
    moodboards: boards.data ?? [],
    submissions: submissions.data ?? [],
    subscriptions: subscriptions.data ?? [],
  }

  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="frameflow-data-export.json"')
  res.status(200).send(JSON.stringify(payload, null, 2))
})
