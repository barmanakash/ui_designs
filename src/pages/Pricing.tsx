import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Minus, Sparkles } from 'lucide-react'
import { Seo } from '@/components/layout/Seo'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { Field, Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { FREE_BOARD_LIMIT, FREE_FIND_PER_DAY, PRICING } from '@/lib/constants'
import { isValidGstin, normalizeGstin } from '@/lib/gstin'
import { payments, PAYMENTS_ENABLED } from '@/lib/payments'
import type { BillingPeriod } from '@/types'

const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)

// 12 monthly payments vs one yearly payment, as a whole-number percentage.
const YEARLY_SAVING = Math.round((1 - PRICING.yearly.inr / (PRICING.monthly.inr * 12)) * 100)

/** Feature comparison rows. `true` = included, `false` = not included, string = a limit. */
const COMPARISON: { feature: string; free: boolean | string; pro: boolean | string }[] = [
  { feature: 'Browse and search every design', free: true, pro: true },
  { feature: 'Why it works (preview)', free: true, pro: true },
  { feature: 'Full teardown', free: false, pro: true },
  { feature: 'React + Tailwind code', free: false, pro: true },
  { feature: 'Ready-made prompts (Claude, Cursor, v0)', free: false, pro: true },
  { feature: 'Find References', free: `${FREE_FIND_PER_DAY} per day`, pro: 'Unlimited' },
  { feature: 'Moodboards', free: `${FREE_BOARD_LIMIT} boards`, pro: 'Unlimited' },
  { feature: 'Save designs', free: true, pro: true },
]

const FAQ: { q: string; a: string }[] = [
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your account page and you keep Pro until the end of the period you already paid for. No further charges after that.' },
  { q: 'What is your refund policy?', a: `If Pro is not for you, ask within ${PRICING.refundDays} days of your payment and we will refund it. See the refund policy for details.` },
  { q: 'Is there a free trial?', a: 'Not right now. The free plan lets you browse everything, so you can see the quality before you upgrade.' },
  { q: 'Do prices include tax?', a: 'Yes, prices are inclusive of tax. GST is included where applicable. You can add a GSTIN at checkout if you need one on your receipt.' },
  { q: 'Which payment methods work?', a: 'UPI, cards (including international cards), netbanking and wallets, processed securely by Razorpay.' },
  { q: 'What do I get as a Pro member?', a: 'Full teardowns, copy-paste React + Tailwind code, recreate-it prompts, unlimited Find References and unlimited moodboards.' },
]

function Cell({ value }: { value: boolean | string }) {
  if (typeof value === 'string') return <span className="text-sm">{value}</span>
  return value
    ? <><Check size={16} className="inline text-accent" aria-hidden="true" /><span className="sr-only">Included</span></>
    : <><Minus size={16} className="inline text-muted" aria-hidden="true" /><span className="sr-only">Not included</span></>
}

export default function Pricing() {
  const { user, profile, token, isPro, demo, refreshProfile } = useAuth()
  const [period, setPeriod] = useState<BillingPeriod>('monthly')
  const [busy, setBusy] = useState(false)
  const [gstin, setGstin] = useState('')
  const gstinInvalid = !isValidGstin(gstin)
  const toast = useToast()

  const inr = period === 'monthly' ? PRICING.monthly.inr : PRICING.yearly.inr
  const usd = period === 'monthly' ? PRICING.monthly.usd : PRICING.yearly.usd

  const checkout = async () => {
    if (!user || !token || gstinInvalid) return
    setBusy(true)
    try {
      const outcome = await payments.checkout(period, token, { email: user.email ?? '', name: profile?.name ?? null, gstin: normalizeGstin(gstin) })
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
              {value === 'monthly' ? 'Monthly' : `Yearly (save ${YEARLY_SAVING}%)`}
            </button>
          ))}
        </div>
        <section className="surface mx-auto mt-6 max-w-lg p-6 text-left" aria-label="Pro plan">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl">Pro</h2>
              <p className="mt-1 text-sm text-muted">For teams and makers who want to ship faster.</p>
            </div>
            <Sparkles className="text-accent" aria-hidden="true" />
          </div>
          <p className="mt-5 text-4xl font-semibold">{money(inr)}<span className="text-base font-normal text-muted"> / {period === 'monthly' ? 'month' : 'year'}</span></p>
          <p className="mt-1 text-sm text-muted">International cards: ${usd} / {period === 'monthly' ? 'month' : 'year'}. GST included where applicable.</p>
          <ul className="mt-5 space-y-3 text-sm">
            {['Full design teardowns, code and prompts', 'Unlimited Find References searches', 'Unlimited moodboards'].map((item) => <li key={item} className="flex gap-2"><Check size={16} className="shrink-0 text-accent" aria-hidden="true" />{item}</li>)}
          </ul>
          <div className="mt-6">
            {user && !isPro && !demo && PAYMENTS_ENABLED && (
              <div className="mb-4">
                <Field label="GSTIN (optional)" hint="Add it if you need it on your receipt. Leave blank otherwise.">
                  <Input
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    maxLength={15}
                    placeholder="22AAAAA0000A1Z5"
                    autoComplete="off"
                    aria-invalid={gstinInvalid}
                  />
                </Field>
                {gstinInvalid && <p role="alert" className="mt-1 text-sm text-danger">That doesn’t look like a valid 15-character GSTIN.</p>}
              </div>
            )}
            {isPro ? <p className="rounded-lg bg-accent-soft p-3 text-sm font-medium text-accent">You already have Pro.</p>
              : !PAYMENTS_ENABLED && !demo ? (
                <div className="rounded-lg bg-accent-soft p-4 text-sm">
                  <p className="font-medium text-accent">Pro isn’t open for purchase yet.</p>
                  <p className="mt-1 text-muted">Everything on the free plan works today. Join the newsletter on the <Link to="/" className="font-medium text-accent underline">home page</Link> to hear when Pro launches.</p>
                </div>
              )
              : demo ? <p className="text-sm text-muted">Demo mode is active. <Link to="/account" className="font-medium text-accent underline">Manage demo access</Link>.</p>
                : user ? <Button className="w-full" onClick={checkout} disabled={busy || gstinInvalid}>{busy ? 'Opening checkout…' : 'Continue to checkout'}</Button>
                  : <Button asChild className="w-full"><Link to="/login">Log in to upgrade</Link></Button>}
          </div>
          <p className="mt-4 text-center text-xs text-muted">
            Cancel anytime. {PRICING.refundDays}-day money-back guarantee, see the <Link to="/refunds" className="underline">refund policy</Link>.
          </p>
        </section>
      </div>

      <section className="mx-auto mt-14 max-w-3xl" aria-labelledby="compare-heading">
        <h2 id="compare-heading" className="text-3xl">Free vs Pro</h2>
        <div className="surface mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <caption className="sr-only">Comparison of the Free and Pro plans</caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="p-4 font-medium">Feature</th>
                <th scope="col" className="p-4 font-medium">Free</th>
                <th scope="col" className="p-4 font-medium text-accent">Pro</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.feature} className="border-b border-border last:border-0">
                  <th scope="row" className="p-4 font-normal">{row.feature}</th>
                  <td className="p-4"><Cell value={row.free} /></td>
                  <td className="p-4"><Cell value={row.pro} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-3xl" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-3xl">Questions</h2>
        <div className="mt-4 space-y-3">
          {FAQ.map((item) => (
            <details key={item.q} className="surface group p-4">
              <summary className="cursor-pointer text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{item.q}</summary>
              <p className="mt-2 text-sm text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
