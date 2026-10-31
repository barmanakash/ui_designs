import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Seo } from '@/components/layout/Seo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/useAuth'
import { authedJson } from '@/lib/api'
import { hasSupabase, sb } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

interface SubRow {
  plan: 'monthly' | 'yearly' | null
  status: string
  current_period_end: string | null
  cancelled_at: string | null
}

export default function Account() {
  const { user, profile, token, isPro, demo, toggleDemoPro, signOut, refreshProfile } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()

  // Latest subscription (own rows only, enforced by RLS).
  const sub = useQuery({
    queryKey: ['my-subscription', user?.id],
    enabled: hasSupabase && !!user,
    queryFn: async () => {
      const { data, error: e } = await sb()
        .from('subscriptions')
        .select('plan,status,current_period_end,cancelled_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (e) throw e
      return data as SubRow | null
    },
  })

  const cancel = useMutation({
    mutationFn: () => authedJson<{ accessUntil: string | null }>('/api/cancel-subscription', token!, { method: 'POST' }),
    onSuccess: async (r) => {
      toast(r.accessUntil ? `Cancelled. You keep Pro until ${formatDate(r.accessUntil)}.` : 'Subscription cancelled.')
      await qc.invalidateQueries({ queryKey: ['my-subscription'] })
      await refreshProfile()
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const remove = useMutation({
    mutationFn: () => authedJson('/api/account-delete', token!, { method: 'POST', body: { confirm: 'DELETE' } }),
    onSuccess: async () => {
      toast('Your account has been deleted.')
      await signOut()
      navigate('/', { replace: true })
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const logout = async () => {
    setBusy(true)
    setError('')
    try {
      await signOut()
      navigate('/', { replace: true })
    } catch (cause) {
      setError((cause as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const exportData = async () => {
    if (!token) return
    setBusy(true)
    try {
      const res = await fetch('/api/account-export', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Export failed')
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a')
      a.href = url
      a.download = 'frameflow-data-export.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const s = sub.data
  const cancellable = !!s && ['active', 'authenticated', 'pending'].includes(s.status)
  const accessUntil = profile?.plan_expires_at ?? s?.current_period_end ?? null

  return (
    <div className="container-page py-10">
      <Seo title="Account" noindex />
      <h1 className="text-5xl">Account</h1>
      <section className="surface mt-6 max-w-2xl space-y-4 p-6">
        <div>
          <p className="text-sm text-muted">Signed in as</p>
          <p className="mt-1 font-medium">{profile?.name || user?.email || 'Demo user'}</p>
          {profile?.name && <p className="text-sm text-muted">{user?.email}</p>}
        </div>
        <div>
          <p className="text-sm text-muted">Plan</p>
          <p className="mt-1 font-medium">{isPro ? 'Pro' : 'Free'}{s?.plan ? ` (${s.plan})` : ''}</p>
          {isPro && s && (
            <p className="mt-1 text-sm text-muted">
              {s.status === 'cancelled'
                ? `Cancelled. Pro access ends ${accessUntil ? formatDate(accessUntil) : 'at the end of your billing period'}.`
                : s.current_period_end ? `Renews on ${formatDate(s.current_period_end)}.` : 'Active.'}
            </p>
          )}
        </div>
        {demo && (
          <div className="rounded-xl bg-accent-soft p-4">
            <p className="text-sm">Demo mode is on. Toggle Pro locally to preview the full experience.</p>
            <Button className="mt-3" variant="outline" onClick={toggleDemoPro}>{isPro ? 'Switch to Free demo' : 'Enable Pro demo'}</Button>
          </div>
        )}
        {!isPro && <Button asChild variant="outline"><Link to="/pricing">Explore Pro</Link></Button>}
        {cancellable && (
          <Button variant="outline" disabled={cancel.isPending} onClick={() => { if (window.confirm('Cancel your Pro subscription? You keep access until the end of the period you paid for.')) cancel.mutate() }}>
            {cancel.isPending ? 'Cancelling…' : 'Cancel subscription'}
          </Button>
        )}
        {user && <Button variant="outline" onClick={logout} disabled={busy}>{busy ? 'Please wait…' : 'Sign out'}</Button>}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </section>

      {user && hasSupabase && (
        <section className="surface mt-6 max-w-2xl space-y-4 p-6" aria-labelledby="privacy-h">
          <h2 id="privacy-h" className="text-2xl">Your data</h2>
          <p className="text-sm text-muted">Download a copy of everything we store about you, or permanently delete your account. See our <Link to="/privacy" className="text-accent underline">Privacy Policy</Link>.</p>
          <Button variant="outline" onClick={exportData} disabled={busy}>Export my data</Button>
          {!showDelete ? (
            <div><Button variant="danger" onClick={() => setShowDelete(true)}>Delete account…</Button></div>
          ) : (
            <div className="space-y-3 rounded-xl border border-danger p-4">
              <p className="text-sm">This permanently deletes your account, moodboards and submissions and cancels any subscription. It cannot be undone. Type <strong>DELETE</strong> to confirm.</p>
              <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} aria-label="Type DELETE to confirm" placeholder="DELETE" />
              <div className="flex gap-2">
                <Button variant="danger" disabled={confirmText !== 'DELETE' || remove.isPending} onClick={() => remove.mutate()}>{remove.isPending ? 'Deleting…' : 'Permanently delete'}</Button>
                <Button variant="ghost" onClick={() => { setShowDelete(false); setConfirmText('') }}>Cancel</Button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
