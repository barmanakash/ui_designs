// Payments adapter. Razorpay is implemented; Stripe is a stub behind the same
// interface (set VITE_PAYMENT_PROVIDER=stripe and implement api/create-subscription for it).
import type { BillingPeriod } from '@/types'
import { ApiError } from './api'

export interface CheckoutUser { email: string; name: string | null; /** Optional GSTIN to print on the receipt. */ gstin?: string }
export type CheckoutOutcome = 'success' | 'dismissed'

export interface PaymentsAdapter {
  id: 'razorpay' | 'stripe'
  checkout(plan: BillingPeriod, token: string, user: CheckoutUser): Promise<CheckoutOutcome>
}

declare global {
  interface Window { Razorpay?: new (opts: Record<string, unknown>) => { open(): void; on(ev: string, cb: (r: unknown) => void): void } }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve()
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Could not load the payment script. Check your connection.'))
    document.body.appendChild(s)
  })
}

const razorpay: PaymentsAdapter = {
  id: 'razorpay',
  async checkout(plan, token, user) {
    const res = await fetch('/api/create-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ plan, provider: 'razorpay', gstin: user.gstin || undefined }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new ApiError(res.status, body.error ?? 'Could not start checkout')
    await loadScript('https://checkout.razorpay.com/v1/checkout.js')
    if (!window.Razorpay) throw new Error('Razorpay failed to load')
    return new Promise<CheckoutOutcome>((resolve) => {
      const rzp = new window.Razorpay!({
        key: body.keyId,
        subscription_id: body.subscriptionId,
        name: 'Frameflow Pro',
        description: plan === 'yearly' ? 'Yearly plan' : 'Monthly plan',
        prefill: { name: user.name ?? '', email: user.email },
        theme: { color: '#4f46e5' },
        handler: () => resolve('success'), // plan is activated by the webhook, not this callback
        modal: { ondismiss: () => resolve('dismissed') },
      })
      rzp.open()
    })
  },
}

const stripe: PaymentsAdapter = {
  id: 'stripe',
  async checkout() {
    throw new Error('Stripe adapter is not implemented yet. See README → Payments.')
  },
}

export const payments: PaymentsAdapter = import.meta.env.VITE_PAYMENT_PROVIDER === 'stripe' ? stripe : razorpay
