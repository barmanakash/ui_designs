// Chooses how "Find References" ranks designs. Free by default.
//
//   AI_PROVIDER=local      built-in keyword matcher: no key, no cost, always available
//   AI_PROVIDER=gemini     Google Gemini (free tier available), needs GEMINI_API_KEY
//   AI_PROVIDER=anthropic  Claude, needs ANTHROPIC_API_KEY (paid)
//
// If AI_PROVIDER is unset it is picked automatically: Anthropic key → Gemini key → local.
// If an AI provider errors, times out or returns garbage, we quietly fall back to the local matcher
// so the user still gets results (and the free search is not wasted).
import { rankLocally } from '../../src/lib/localMatch.js'
import { askClaude, askGemini, buildPrompt, parseRanking, type DesignMeta, type Ranked } from './claude.js'
import { env } from './env.js'

export type Provider = 'local' | 'gemini' | 'anthropic'

export function pickProvider(): Provider {
  const explicit = env('AI_PROVIDER')?.toLowerCase()
  if (explicit === 'local' || explicit === 'gemini' || explicit === 'anthropic') return explicit
  if (env('ANTHROPIC_API_KEY')) return 'anthropic'
  if (env('GEMINI_API_KEY')) return 'gemini'
  return 'local'
}

export async function rankDesigns(description: string, designs: DesignMeta[]): Promise<{ ranked: Ranked[]; provider: Provider }> {
  const provider = pickProvider()
  if (provider !== 'local') {
    try {
      const { system, user } = buildPrompt(description, designs)
      const raw = provider === 'gemini' ? await askGemini(system, user) : await askClaude(system, user)
      // parseRanking drops any id that is not in the real catalog, so the model can't invent designs.
      return { ranked: parseRanking(raw, new Set(designs.map((d) => d.id))), provider }
    } catch (e) {
      console.error(`[find-references] ${provider} failed, using local matcher:`, e instanceof Error ? e.message : e)
    }
  }
  return { ranked: rankLocally(description, designs), provider: 'local' }
}
