import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui/badge'

const Loading = () => (
  <div className="grid min-h-[40vh] place-items-center"><Spinner className="h-6 w-6" /></div>
)

/** Requires a signed-in user. In demo mode (no Supabase) it lets people through so the UI can be explored. */
export function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading, demo } = useAuth()
  const loc = useLocation()
  if (loading) return <Loading />
  if (!user && !demo) {
    try { sessionStorage.setItem('ff_return', loc.pathname + loc.search) } catch { /* ignore */ }
    return <Navigate to="/login" replace />
  }
  return children
}

/** Admin only. UI guard; the real enforcement is RLS (is_admin()) on the database. */
export function RequireAdmin({ children }: { children: JSX.Element }) {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}
