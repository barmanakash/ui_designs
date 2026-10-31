import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Sparkles } from 'lucide-react'
import { Seo } from '@/components/layout/Seo'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/useAuth'
import { payments } from '@/lib/payments'
import { PRICE_MONTHLY, PRICE_YEARLY } from '@/lib/supabase'
import type { BillingPeriod } from '@/types'

const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)

export default function Pricing() {
  const { user, profile, token, isPro, demo, refreshProfile } = useAuth()
  const [period, setPeriod] = useState<BillingPeriod>('monthly')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const checkout = async () => {
    if (!user || !token) return
    setBusy(true)
    try {
      const outcome = await payments.checkout(period, token, { email: user.email ?? '', name: profile?.name ?? null })
      if (outcome === 'success') {
        await refreshProfile()
        toast('Payment received. Your Pro plan will activate shortly.')
      }
    } catch (error) {
      toast((error as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container-page py-10">
      <Seo title="Pricing" description="Upgrade to Frameflow Pro for complete design references, code and unlimited moodboards." path="/pricing" />
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-medium text-accent">Frameflow Pro</p>
        <h1 className="mt-2 text-5xl">Go from reference to ready-to-ship</h1>
        <p className="mt-3 text-muted">Unlock the details behind great interface design.</p>
        <div className="mt-6 inline-flex rounded-xl border border-border p-1" role="group" aria-label="Billing period">
          {(['monthly', 'yearly'] as const).map((value) => (
            <button key={value} type="button" onClick={() => setPeriod(value)} aria-pressed={period === value} className={`rounded-lg px-4 py-2 text-sm ${period === value ? 'bg-accent text-accent-fg' : 'text-muted'}`}>
              {value === 'monthly' ? 'Monthly' : 'Yearly'}
            </button>
          ))}
        </div>
        <section className="surface mx-auto mt-6 max-w-lg p-6 text-left">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl">Pro</h2>
              <p className="mt-1 text-sm text-muted">For teams and makers who want to ship faster.</p>
            </div>
            <Sparkles className="text-accent" />
          </div>
          <p className="mt-5 text-4xl font-semibold">{money(period === 'monthly' ? PRICE_MONTHLY : PRICE_YEARLY)}<span className="text-base font-normal text-muted"> / {period === 'monthly' ? 'month' : 'year'}</span></p>
          <ul className="mt-5 space-y-3 text-sm">
            {['Full design teardowns, code and prompts', 'Unlimited Find References searches', 'Unlimited moodboards'].map((item) => <li key={item} className="flex gap-2"><Check size={16} className="shrink-0 text-accent" />{item}</li>)}
          </ul>
          <div className="mt-6">
            {isPro ? <p className="rounded-lg bg-accent-soft p-3 text-sm font-medium text-accent">You already have Pro.</p>
              : demo ? <p className="text-sm text-muted">Demo mode is active. <Link to="/account" className="font-medium text-accent underline">Manage demo access</Link>.</p>
                : user ? <Button className="w-full" onClick={checkout} disabled={busy}>{busy ? 'Opening checkout…' : 'Continue to checkout'}</Button>
                  : <Button asChild className="w-full"><Link to="/login">Log in to upgrade</Link></Button>}
          </div>
        </section>
      </div>
    </div>
  )
}
