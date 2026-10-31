// Server-side environment access. Missing keys raise a ConfigError, which the HTTP
// wrapper turns into a clean 503 ("not configured") instead of crashing.

export function env(name: string): string | undefined {
  const v = process.env[name]
  return v && v.trim() ? v.trim() : undefined
}

export class ConfigError extends Error {
  constructor(public missing: string[]) {
    super(`Server is not configured: missing ${missing.join(', ')}`)
    this.name = 'ConfigError'
  }
}

/** Returns the named variables or throws ConfigError listing every one that is missing. */
export function requireEnv<K extends string>(...names: K[]): Record<K, string> {
  const missing = names.filter((n) => !env(n))
  if (missing.length) throw new ConfigError(missing)
  return Object.fromEntries(names.map((n) => [n, env(n)!])) as Record<K, string>
}

/** Public site URL without a trailing slash. */
export function siteUrl(fallbackHost?: string): string {
  const configured = env('SITE_URL')
  if (configured) return configured.replace(/\/$/, '')
  if (fallbackHost) return `https://${fallbackHost}`
  return 'http://localhost:5173'
}
