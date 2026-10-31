// Draft legal copy. ⚠ NOT LEGAL ADVICE. Have a lawyer review every page before taking real payments.
// Placeholders in [BRACKETS] must be replaced with your real business details.
import { SITE_NAME } from './constants'

export interface LegalDoc {
  title: string
  description: string
  body: string
}

export const LEGAL_SLUGS = ['privacy', 'terms', 'refunds', 'licence', 'copyright-takedown', 'contact'] as const
export type LegalSlug = (typeof LEGAL_SLUGS)[number]

export const SUPPORT_EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) || 'support@your-domain.com'
const UPDATED = 'Last updated: [DATE]'

export const LEGAL_DOCS: Record<LegalSlug, LegalDoc> = {
  privacy: {
    title: 'Privacy Policy',
    description: `How ${SITE_NAME} collects, uses and protects your personal data.`,
    body: `${UPDATED}

## Who we are
${SITE_NAME} is operated by [LEGAL BUSINESS NAME], [REGISTERED ADDRESS], India ("we", "us"). Contact: ${SUPPORT_EMAIL}.

## What we collect
- **Account data:** your name, email address and profile picture, received from Google when you sign in.
- **Usage data:** designs you view or save, moodboards you create, and "Find References" briefs you submit.
- **Submissions:** titles, links, notes and images you upload.
- **Payment data:** handled by Razorpay. We never see or store your card or UPI details. We keep a subscription record (plan, status, renewal date).
- **Analytics (only with your consent):** page views and button clicks, through the analytics tool we use.
- **Technical data:** a salted, one-way hash of your IP address for rate limiting and fair-use limits. We do not store your raw IP address in our database.

## Why we use it
To run your account and subscription, deliver the service, prevent abuse, answer support requests, send transactional emails (receipts, cancellations) and, with your consent, a weekly newsletter and analytics.

## Who processes it for us
Supabase (database and authentication), Vercel (hosting), Razorpay (payments), Resend (email), Anthropic (processes the text of your "Find References" brief to generate recommendations; do not enter confidential information), and the analytics provider we use if you consent.

## Cookies and local storage
We use local storage for your theme, login session and consent choice. Analytics scripts load only after you accept.

## Your rights
Under India's Digital Personal Data Protection Act, 2023 you may access, correct and erase your personal data and withdraw consent. On your **Account** page you can export your data and delete your account. You can also email ${SUPPORT_EMAIL}.

## Retention
We keep account data until you delete your account. Payment and subscription records are retained without personal identifiers as required for accounting and tax.

## Children
${SITE_NAME} is not intended for children under 18.

## Changes
We will post updates on this page and change the date above.`,
  },

  terms: {
    title: 'Terms of Service',
    description: `The rules for using ${SITE_NAME}.`,
    body: `${UPDATED}

## Agreement
By using ${SITE_NAME} you agree to these terms. If you do not agree, please do not use the service.

## The service
${SITE_NAME} is a curated gallery of interface designs with teardowns, code snippets and prompts. A free plan and a paid **Pro** plan are offered.

## Accounts
You are responsible for your account and for keeping your login secure. You must be 18 or older.

## Pro subscriptions
Pro is billed monthly or yearly through Razorpay and renews automatically until cancelled. You can cancel anytime from your Account page; you keep Pro until the end of the period you paid for. Prices include GST where applicable. See our [Refund Policy](/refunds).

## Acceptable use
- Do not copy, scrape, resell or redistribute the gallery, code snippets, prompts or teardowns beyond what the [Licence](/licence) allows.
- Do not attempt to bypass the paywall, rate limits or security measures.
- Do not submit work you do not own or have permission to share.
- Do not use the service unlawfully or to harm others.

## Submissions
When you submit a design you confirm that you created it or have permission to share it, and you grant us a non-exclusive licence to display it on ${SITE_NAME} with credit and a link back. You can ask us to remove it at any time.

## Third-party designs and credit
Designs shown remain the property of their creators and always link to the source. Report a problem through our [Copyright Takedown](/copyright-takedown) process.

## AI features
"Find References" uses an AI model to recommend designs. Results may be imperfect; please verify before relying on them.

## Disclaimer and liability
The service is provided "as is". To the maximum extent permitted by law, we are not liable for indirect or consequential losses, and our total liability is limited to the amount you paid us in the 12 months before the claim.

## Termination
We may suspend accounts that breach these terms. You may delete your account at any time.

## Governing law
These terms are governed by the laws of India. Courts at [CITY], India have jurisdiction.

## Contact
${SUPPORT_EMAIL}`,
  },

  refunds: {
    title: 'Refund & Cancellation Policy',
    description: `Refunds and cancellation for ${SITE_NAME} Pro.`,
    body: `${UPDATED}

## Cancel anytime
You can cancel your subscription at any time from your **Account** page. Cancelling stops future renewals. You keep Pro access until the end of the billing period you have already paid for.

## 7-day money-back guarantee
If ${SITE_NAME} Pro is not right for you, email ${SUPPORT_EMAIL} within **7 days of your first payment** and we will refund it in full. This applies to your first payment on each plan only, not to renewals.

## Renewals
We email a receipt for every payment. If you forgot to cancel and were charged for a renewal, contact us within 7 days of that charge and we will review it in good faith.

## How refunds are paid
Approved refunds are returned to the original payment method through Razorpay. Banks typically take **5 to 7 business days** to show the credit.

## Failed or duplicate payments
If you were charged but Pro was not activated, or you were charged twice, email ${SUPPORT_EMAIL} with your payment reference and we will fix or refund it.

## Contact
${SUPPORT_EMAIL}`,
  },

  licence: {
    title: 'Content Licence',
    description: `What you can do with ${SITE_NAME} content.`,
    body: `${UPDATED}

## Gallery designs
Designs in the gallery belong to their creators and are shown for inspiration and reference with credit and a link to the source. You do not receive any right to reproduce a third-party design.

## Code snippets and prompts (original to ${SITE_NAME})
Code and prompts are original recreations written for ${SITE_NAME}. With an active Pro plan you receive a **personal, non-exclusive, non-transferable licence** to use, modify and ship them in your own projects, including commercial ones.

You may not:
- resell, sublicense or redistribute the snippets or prompts as a collection, template pack or competing gallery;
- publish our teardowns or full content elsewhere;
- share your account to give others access.

## Our brand and site
The ${SITE_NAME} name, logo and site design may not be used without permission.

## Questions
${SUPPORT_EMAIL}`,
  },

  'copyright-takedown': {
    title: 'Copyright Takedown Policy',
    description: `Report content on ${SITE_NAME} and request removal.`,
    body: `${UPDATED}

We respect creators. ${SITE_NAME} shows a thumbnail, a clear credit and a link to the original for every design. Code snippets and prompts are original recreations, not copies of the source.

## How to request removal
Use the **Report / request removal** button on any design page, or email ${SUPPORT_EMAIL} with:
- the URL of the design on ${SITE_NAME};
- proof that you own the work, or are authorised to act for the owner;
- your name and contact details.

## Our commitment
We aim to review every report within **48 hours** and will remove content that infringes copyright or where the owner asks us to take it down. We may contact you for more information.

## Counter-notice
If content was removed in error, tell us at ${SUPPORT_EMAIL} and we will review it promptly.

## Repeat infringers
Accounts that repeatedly submit infringing work will be removed.`,
  },

  contact: {
    title: 'Contact Us',
    description: `Get in touch with the ${SITE_NAME} team.`,
    body: `We usually reply within one business day.

## Support, billing and refunds
${SUPPORT_EMAIL}

## Copyright and takedown requests
See the [Copyright Takedown Policy](/copyright-takedown) or use the Report button on any design.

## Business details
- **Business name:** [LEGAL BUSINESS NAME]
- **Registered address:** [ADDRESS, CITY, STATE, PIN], India
- **Phone:** [PHONE NUMBER]
- **GSTIN (if applicable):** [GSTIN]`,
  },
}
