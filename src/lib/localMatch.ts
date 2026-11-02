// Free, offline "Find References" ranking. No API key, no network, no cost.
//
// It scores every design against the user's brief using the design's tags, flow type, industry,
// title, platform and description, plus a small synonym map for this niche (so "UPI" also finds
// payment and checkout screens). It is used when no AI key is configured, and as a safety net if
// an AI provider fails or runs out of quota.
//
// Dependency-free on purpose so the server and the unit tests can both import it.

export interface MatchDesign {
  id: string
  title: string
  description: string
  flow_type: string
  industry: string
  platform: string
  tags: string[]
}

export interface MatchResult {
  design_id: string
  reason: string
}

const STOP = new Set(
  ('a an and are as at be but by for from has have i in into is it its me my of on or our so that the their ' +
    'this to us we want with you your need needs looking build building design designing make making app screen page ' +
    'product users user like get can will would should how what which who').split(' '),
)

/** Words that mean (nearly) the same thing in this niche. One-directional lookups are enough. */
const SYNONYMS: Record<string, string[]> = {
  upi: ['payment', 'transfer', 'qr', 'scan'],
  pay: ['payment', 'checkout'],
  payment: ['checkout', 'pay', 'upi', 'transfer'],
  checkout: ['payment', 'cart', 'pay'],
  bank: ['fintech', 'account'],
  banking: ['bank', 'fintech'],
  money: ['fintech', 'payment', 'wallet'],
  wallet: ['payment', 'fintech'],
  send: ['transfer', 'payment'],
  transfer: ['payment', 'send'],
  transaction: ['history', 'payment', 'activity'],
  history: ['transaction', 'activity'],
  invest: ['investing', 'stocks', 'fintech'],
  investing: ['invest', 'stocks', 'fintech'],
  loan: ['lending', 'credit'],
  credit: ['lending', 'card'],
  card: ['credit', 'payment'],
  chatbot: ['agent', 'chat', 'assistant'],
  assistant: ['agent', 'chat'],
  copilot: ['agent', 'assistant'],
  ai: ['agent', 'assistant'],
  agent: ['assistant', 'chat'],
  chat: ['conversation', 'agent', 'assistant'],
  conversation: ['chat', 'agent'],
  signup: ['onboarding', 'register'],
  register: ['onboarding', 'signup'],
  login: ['onboarding', 'auth'],
  welcome: ['onboarding'],
  dashboard: ['analytics', 'overview'],
  analytics: ['dashboard', 'chart'],
  settings: ['preferences', 'account'],
  empty: ['state'],
  mobile: ['ios', 'android'],
  ios: ['mobile'],
  android: ['mobile'],
  web: ['website', 'desktop'],
  website: ['web', 'desktop'],
}

/** Field weights: a tag hit says more about a design than a passing word in its description. */
const FIELDS = [
  { key: 'tags', label: 'tags', weight: 5 },
  { key: 'flow_type', label: 'flow type', weight: 4 },
  { key: 'industry', label: 'industry', weight: 3 },
  { key: 'title', label: 'title', weight: 3 },
  { key: 'platform', label: 'platform', weight: 2 },
  { key: 'description', label: 'description', weight: 1 },
] as const

/** Lowercases a word and lightly de-pluralises it, so "payments" and "payment" compare equal. */
const stem = (w: string): string => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)

// Stem both the keys and the values once, so "settings" / "analytics" / "preferences" still match.
const SYN = new Map(Object.entries(SYNONYMS).map(([key, values]): [string, string[]] => [stem(key), values.map(stem)]))

/** Lowercases, splits on anything that isn't a letter or number, and lightly de-pluralises. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2 && !STOP.has(w))
    .map(stem)
}

const fieldTokens = (d: MatchDesign, key: (typeof FIELDS)[number]['key']): Set<string> =>
  new Set(tokenize(key === 'tags' ? d.tags.join(' ') : String(d[key] ?? '')))

const quote = (words: string[]) => words.map((w) => `\u201c${w}\u201d`).join(', ')

/**
 * Ranks `designs` against `brief`. `designs` should already be in popularity order: that order
 * breaks ties, and it is the fallback when nothing matches.
 */
export function rankLocally(brief: string, designs: MatchDesign[], limit = 10): MatchResult[] {
  const terms = [...new Set(tokenize(brief))]

  const scored = designs.map((design, index) => {
    const tokens = FIELDS.map((f) => ({ ...f, set: fieldTokens(design, f.key) }))
    let score = 0
    const hitTerms = new Set<string>()
    const hitFields = new Set<string>()

    for (const term of terms) {
      const synonyms = SYN.get(term) ?? []
      for (const field of tokens) {
        if (field.set.has(term)) {
          score += field.weight // exact word from the brief
          hitTerms.add(term)
          hitFields.add(field.label)
        } else if (synonyms.some((s) => field.set.has(s))) {
          score += field.weight * 0.5 // related word
          hitTerms.add(term)
          hitFields.add(field.label)
        }
      }
    }
    return { design, index, score, hitTerms: [...hitTerms], hitFields: [...hitFields] }
  })

  const matches = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)

  if (matches.length) {
    return matches.map((m) => ({
      design_id: m.design.id,
      reason: `Matches your brief on ${quote(m.hitTerms.slice(0, 3))} (${m.hitFields.slice(0, 3).join(', ')}).`.slice(0, 200),
    }))
  }

  // Nothing overlapped: show the most popular references rather than an empty page.
  return designs.slice(0, Math.min(limit, 5)).map((d) => ({
    design_id: d.id,
    reason: 'A popular reference in this library. Try adding the screen type or industry for closer matches.',
  }))
}
