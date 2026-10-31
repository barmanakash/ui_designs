// Shared constants. Kept dependency-free so scripts and the server can import it.

export const SITE_NAME = 'Frameflow'
export const FREE_FIND_PER_DAY = 3
export const FREE_BOARD_LIMIT = 2

export const FLOW_TYPES = [
  'onboarding',
  'checkout',
  'dashboard',
  'empty-state',
  'settings',
  'chat',
  'confirmation',
  'history',
  'agent-workflow',
  'error-state',
] as const

export const INDUSTRIES = ['ai-agents', 'upi-payments', 'banking', 'wallet', 'investing', 'lending'] as const
export const PLATFORMS = ['web', 'mobile'] as const

export const STYLE_TAGS = [
  'minimal', 'dark-ui', 'dense', 'friendly', 'trust', 'human-in-the-loop',
  'transparency', 'progress', 'security', 'celebration', 'toggles', 'charts',
] as const

/** First entry of a design's dominant_colors must be one of these canonical hexes. */
export const COLOR_FAMILIES = [
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Violet', hex: '#7c3aed' },
  { name: 'Sky', hex: '#0284c7' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Amber', hex: '#d97706' },
  { name: 'Rose', hex: '#e11d48' },
  { name: 'Slate', hex: '#334155' },
] as const

export const label = (s: string) =>
  s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
