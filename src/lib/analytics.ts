// Env-controlled analytics, gated by the visitor's consent.
// VITE_ANALYTICS_PROVIDER = none | plausible | posthog.
// NOTHING loads or is sent until the visitor clicks "Accept" on the consent banner.
// PostHog uses its plain HTTP capture endpoint (no SDK) to keep the bundle small.
import { readLocal, uid, writeLocal } from './utils'

type Props = Record<string, string | number | boolean | null>
export type Consent = 'granted' | 'denied' | null

const provider = (import.meta.env.VITE_ANALYTICS_PROVIDER as string | undefined) ?? 'none'
const phKey = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const phHost = ((import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com').replace(/\/$/, '')
const CONSENT_KEY = 'ff_consent'

/** False when analytics is off, so the consent banner is never shown for nothing. */
export const analyticsEnabled = provider === 'plausible' || (provider === 'posthog' && Boolean(phKey))

export const getConsent = (): Consent => readLocal<Consent>(CONSENT_KEY, null)

export function setConsent(value: 'granted' | 'denied') {
  writeLocal(CONSENT_KEY, value)
  if (value === 'granted') initAnalytics()
}

const allowed = () => analyticsEnabled && getConsent() === 'granted'

export function initAnalytics() {
  if (!allowed()) return
  if (provider === 'plausible') {
    const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined
    if (!domain || document.querySelector('script[data-plausible]')) return
    const s = document.createElement('script')
    s.defer = true
    s.src = 'https://plausible.io/js/script.manual.js'
    s.dataset.domain = domain
    s.dataset.plausible = '1'
    document.head.appendChild(s)
    ;(window as any).plausible =
      (window as any).plausible || ((...a: unknown[]) => (((window as any).plausible.q ||= []).push(a)))
  }
}

function distinctId() {
  let id = readLocal<string | null>('ff_distinct', null)
  if (!id) {
    id = uid()
    writeLocal('ff_distinct', id)
  }
  return id
}

/** Track a custom event. Safe to call anywhere; silently no-ops if analytics is off or not consented. */
export function track(event: string, props: Props = {}) {
  if (!allowed()) return
  try {
    if (provider === 'plausible') {
      ;(window as any).plausible?.(event, { props })
    } else if (provider === 'posthog' && phKey) {
      void fetch(`${phHost}/capture/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: phKey, event, distinct_id: distinctId(), properties: props }),
        keepalive: true,
      })
    }
  } catch {
    /* never let analytics break the app */
  }
}

/** Plausible manual mode needs an explicit pageview on SPA route changes. */
export function trackPageview(path: string) {
  if (!allowed()) return
  if (provider === 'plausible') (window as any).plausible?.('pageview')
  else if (provider === 'posthog') track('$pageview', { $current_url: location.origin + path })
}

export const events = {
  viewDesign: (slug: string) => track('view_design', { slug }),
  saveDesign: (slug: string) => track('save_design', { slug }),
  copyPrompt: (slug: string) => track('copy_prompt', { slug }),
  copyCode: (slug: string) => track('copy_code', { slug }),
  upgradeClick: (source: string) => track('upgrade_click', { source }),
}
