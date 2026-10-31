import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Seo } from '@/components/layout/Seo'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

export default function Account() {
  const { user, profile, isPro, demo, toggleDemoPro, signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

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
          <p className="mt-1 font-medium">{isPro ? 'Pro' : 'Free'}</p>
        </div>
        {demo && (
          <div className="rounded-xl bg-accent-soft p-4">
            <p className="text-sm">Demo mode is on. Toggle Pro locally to preview the full experience.</p>
            <Button className="mt-3" variant="outline" onClick={toggleDemoPro}>{isPro ? 'Switch to Free demo' : 'Enable Pro demo'}</Button>
          </div>
        )}
        {!isPro && <Button asChild variant="outline"><Link to="/pricing">Explore Pro</Link></Button>}
        {user && <Button variant="danger" onClick={logout} disabled={busy}>{busy ? 'Signing out…' : 'Sign out'}</Button>}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </section>
    </div>
  )
}
