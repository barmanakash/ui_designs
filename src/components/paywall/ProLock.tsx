import { Link } from 'react-router-dom'
import { Lock, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { events } from '@/lib/analytics'

/** Dummy text shown blurred behind the lock. It is NOT the real content, which free users never receive. */
const FAKE = `export default function Example() {
  const [state, setState] = useState(null)
  useEffect(() => { /* ... */ }, [])
  return (
    <div className="mx-auto max-w-md rounded-3xl p-6">
      <h2 className="text-xl font-semibold">Locked</h2>
      <p className="text-sm text-neutral-500">Unlock with Pro</p>
      <button className="mt-4 w-full rounded-2xl py-3">Continue</button>
    </div>
  )
}`

export function ProLock({ what, source }: { what: string; source: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
      <pre aria-hidden className="pointer-events-none select-none p-4 font-mono text-xs blur-sm" style={{ minHeight: 220 }}>{FAKE}</pre>
      <div className="absolute inset-0 grid place-items-center bg-card p-6 text-center" style={{ background: 'color-mix(in srgb, var(--card) 70%, transparent)' }}>
        <div className="max-w-xs">
          <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-accent"><Lock size={18} /></span>
          <p className="mt-3 font-display text-2xl">Unlock the {what}</p>
          <p className="mt-1 text-sm text-muted">Copy-paste code, ready-made prompts and full teardowns for every design.</p>
          <Button asChild className="mt-4">
            <Link to="/pricing" onClick={() => events.upgradeClick(source)}><Sparkles size={14} /> Unlock with Pro</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export function UpgradeBanner() {
  return (
    <section className="container-page mt-20" aria-labelledby="pro-banner">
      <div className="surface flex flex-col items-start justify-between gap-6 bg-accent-soft p-8 sm:flex-row sm:items-center">
        <div>
          <h2 id="pro-banner" className="text-3xl sm:text-4xl">Stop screenshotting. Start shipping.</h2>
          <p className="mt-2 max-w-xl text-muted">Pro gives you the code, the prompt and the full teardown behind every design, plus unlimited Find References and moodboards.</p>
        </div>
        <Button asChild size="lg">
          <Link to="/pricing" onClick={() => events.upgradeClick('home_banner')}>See Pro</Link>
        </Button>
      </div>
    </section>
  )
}
