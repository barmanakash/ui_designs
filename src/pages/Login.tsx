import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { Seo } from '@/components/layout/Seo'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

export default function Login() {
  const { user, demo, signInWithGoogle } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const signIn = async () => {
    setBusy(true)
    setError('')
    try {
      await signInWithGoogle()
    } catch (cause) {
      setError((cause as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container-page grid min-h-[55vh] place-items-center py-10">
      <Seo title="Log in" noindex />
      <section className="surface w-full max-w-md p-6 text-center">
        <h1 className="text-3xl">Welcome to Frameflow</h1>
        <p className="mt-2 text-muted">Sign in to save references and manage your account.</p>
        {user ? (
          <p className="mt-6 text-sm">You’re signed in as {user.email}. <Link to="/account" className="text-accent underline">Go to account</Link></p>
        ) : demo ? (
          <p className="mt-6 text-sm text-muted">Demo mode is active, so you can explore without signing in. <Link to="/account" className="text-accent underline">Open account</Link></p>
        ) : (
          <Button className="mt-6 w-full" onClick={signIn} disabled={busy}><LogIn size={16} />{busy ? 'Connecting…' : 'Continue with Google'}</Button>
        )}
        {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
      </section>
    </div>
  )
}
