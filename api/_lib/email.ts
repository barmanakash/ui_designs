// Transactional email via Resend's HTTP API (no SDK needed).
// If RESEND_API_KEY / EMAIL_FROM are not set, sending is skipped and logged, never fatal.
import { env } from './env.js'

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

interface Mail {
  to: string
  subject: string
  html: string
  text: string
}

/** Returns true when the provider accepted the message. */
export async function sendEmail(mail: Mail): Promise<boolean> {
  const key = env('RESEND_API_KEY')
  const from = env('EMAIL_FROM')
  if (!key || !from) {
    console.warn(`[email] skipped (RESEND_API_KEY / EMAIL_FROM not set): "${mail.subject}"`)
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text }),
    })
    if (!res.ok) {
      console.error('[email] provider rejected message:', res.status, (await res.text().catch(() => '')).slice(0, 300))
      return false
    }
    return true
  } catch (e) {
    console.error('[email] send failed:', e)
    return false
  }
}

const BRAND = 'Frameflow'

function layout(heading: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f7f7f8;font-family:Inter,Arial,sans-serif;color:#111">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
  <p style="font-size:20px;font-weight:600;margin:0 0 24px">${BRAND}</p>
  <div style="background:#fff;border:1px solid #e5e5e7;border-radius:14px;padding:24px">
    <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(heading)}</h1>
    ${bodyHtml}
  </div>
  <p style="font-size:12px;color:#777;margin-top:16px">You are receiving this because of activity on your ${BRAND} account.</p>
</div></body></html>`
}

const p = (s: string) => `<p style="font-size:15px;line-height:1.55;margin:0 0 12px">${s}</p>`
const button = (href: string, label: string) =>
  `<p style="margin:20px 0 4px"><a href="${escapeHtml(href)}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-size:14px;font-weight:500">${escapeHtml(label)}</a></p>`

export function receiptEmail(to: string, o: { amount: number; currency: string; plan: string; renewsOn: string | null; siteUrl: string; gstin?: string | null }): Mail {
  const amount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: o.currency }).format(o.amount)
  const lines = [
    p(`Thanks for subscribing to ${BRAND} Pro. We received your payment of <strong>${escapeHtml(amount)}</strong> (${escapeHtml(o.plan)} plan).`),
    o.renewsOn ? p(`Your plan is active until <strong>${escapeHtml(o.renewsOn)}</strong> and renews automatically. Cancel anytime from your account page.`) : '',
    o.gstin ? p(`GSTIN on this receipt: <strong>${escapeHtml(o.gstin)}</strong>`) : '',
    button(`${o.siteUrl}/account`, 'Manage subscription'),
    p('Prices include GST where applicable. Keep this email as your receipt.'),
  ].join('')
  return {
    to,
    subject: `Your ${BRAND} Pro receipt`,
    html: layout('Payment received', lines),
    text: `Thanks for subscribing to ${BRAND} Pro. We received ${amount} (${o.plan} plan).${o.renewsOn ? ` Active until ${o.renewsOn}.` : ''}${o.gstin ? ` GSTIN: ${o.gstin}.` : ''} Manage: ${o.siteUrl}/account`,
  }
}

export function paymentFailedEmail(to: string, siteUrl: string): Mail {
  return {
    to,
    subject: `Your ${BRAND} payment didn’t go through`,
    html: layout('Payment failed', p('We couldn’t process your latest payment. No action is needed if you already retried successfully. Otherwise, please check your payment method and try again.') + button(`${siteUrl}/pricing`, 'Update payment')),
    text: `We couldn't process your latest ${BRAND} payment. Please try again: ${siteUrl}/pricing`,
  }
}

export function cancelledEmail(to: string, accessUntil: string | null, siteUrl: string): Mail {
  const body = accessUntil
    ? p(`Your ${BRAND} Pro subscription has been cancelled and will not renew. You keep Pro access until <strong>${escapeHtml(accessUntil)}</strong>.`)
    : p(`Your ${BRAND} Pro subscription has been cancelled and will not renew.`)
  return {
    to,
    subject: `Your ${BRAND} Pro subscription is cancelled`,
    html: layout('Subscription cancelled', body + button(`${siteUrl}/pricing`, 'Resubscribe')),
    text: `Your ${BRAND} Pro subscription is cancelled.${accessUntil ? ` Access until ${accessUntil}.` : ''}`,
  }
}

export function newsletterConfirmEmail(to: string, confirmUrl: string): Mail {
  return {
    to,
    subject: `Confirm your ${BRAND} subscription`,
    html: layout('One quick step', p('Confirm your email to get one great interface in your inbox every week.') + button(confirmUrl, 'Confirm subscription') + p('If you didn’t sign up, just ignore this email.')),
    text: `Confirm your ${BRAND} subscription: ${confirmUrl}`,
  }
}

export function reportNotificationEmail(to: string, o: { designTitle: string; designUrl: string; reason: string; details: string; reporterEmail: string | null }): Mail {
  const body = [
    p(`<strong>${escapeHtml(o.designTitle)}</strong> was reported.`),
    p(`Reason: ${escapeHtml(o.reason)}`),
    o.details ? p(`Details: ${escapeHtml(o.details)}`) : '',
    p(`Reporter: ${escapeHtml(o.reporterEmail ?? 'not provided')}`),
    button(o.designUrl, 'View design'),
    p('Our policy commits to reviewing copyright reports within 48 hours.'),
  ].join('')
  return {
    to,
    subject: `[${BRAND}] Report: ${o.designTitle}`,
    html: layout('New content report', body),
    text: `${o.designTitle} was reported (${o.reason}). ${o.details} Reporter: ${o.reporterEmail ?? 'n/a'} ${o.designUrl}`,
  }
}

export function welcomeEmail(to: string, name: string | null, siteUrl: string): Mail {
  // layout() escapes the heading itself, so the name is passed through raw here.
  const hello = name ? `Welcome, ${name.split(' ')[0]}` : 'Welcome'
  const body = [
    p(`Glad you’re here. ${BRAND} is a curated gallery of AI-agent and fintech/UPI interfaces, each with a teardown, React code and a prompt that recreates it.`),
    p('A good first step: browse the gallery, save a few designs to a moodboard, or describe your product on Find References and let us suggest the best matches.'),
    button(`${siteUrl}/explore`, 'Start exploring'),
  ].join('')
  return {
    to,
    subject: `Welcome to ${BRAND}`,
    html: layout(hello, body),
    text: `Welcome to ${BRAND}. Start exploring: ${siteUrl}/explore`,
  }
}

export function submissionReviewedEmail(
  to: string,
  o: { title: string; approved: boolean; siteUrl: string },
): Mail {
  const body = o.approved
    ? [
        p(`Good news: your submission <strong>${escapeHtml(o.title)}</strong> was approved. We’ll finish the write-up and publish it with full credit and a link back to your original.`),
        p('Thanks for sharing your work with the community.'),
        button(`${o.siteUrl}/explore`, 'Browse the gallery'),
      ]
    : [
        p(`Thanks for submitting <strong>${escapeHtml(o.title)}</strong>. We’re not able to feature it right now.`),
        p('This is usually about fit with our focus (AI-agent and fintech/UPI interfaces) or a rights question. You’re welcome to submit other work anytime.'),
        button(`${o.siteUrl}/submit`, 'Submit another design'),
      ]
  return {
    to,
    subject: o.approved ? `Your ${BRAND} submission was approved` : `About your ${BRAND} submission`,
    html: layout(o.approved ? 'Submission approved' : 'Submission update', body.join('')),
    text: o.approved
      ? `Your submission "${o.title}" was approved. We'll publish it with full credit. ${o.siteUrl}/explore`
      : `Thanks for submitting "${o.title}". We're not able to feature it right now. You can submit other work anytime: ${o.siteUrl}/submit`,
  }
}

/**
 * Optional: mirrors confirmed newsletter subscribers into a Resend Audience so you can send
 * broadcasts from the Resend dashboard. Active only when RESEND_API_KEY and RESEND_AUDIENCE_ID are
 * set. Best-effort: a failure here never blocks confirming or unsubscribing.
 */
export async function syncNewsletterAudience(email: string, subscribed: boolean): Promise<void> {
  const key = env('RESEND_API_KEY')
  const audience = env('RESEND_AUDIENCE_ID')
  if (!key || !audience) return
  const base = `https://api.resend.com/audiences/${encodeURIComponent(audience)}/contacts`
  const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
  try {
    const res = subscribed
      ? await fetch(base, { method: 'POST', headers, body: JSON.stringify({ email, unsubscribed: false }) })
      : await fetch(`${base}/${encodeURIComponent(email)}`, { method: 'DELETE', headers })
    if (!res.ok) console.error('[email] audience sync rejected:', res.status)
  } catch (e) {
    console.error('[email] audience sync failed:', e)
  }
}
