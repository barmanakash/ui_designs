import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { hasSupabase, supabase } from '@/lib/supabase'
import { readLocal, writeLocal } from '@/lib/utils'
import type { Profile } from '@/types'

interface AuthCtx {
  user: User | null
  session: Session | null
  profile: Profile | null
  token: string | null
  loading: boolean
  isPro: boolean
  isAdmin: boolean
  /** Demo mode = Supabase keys missing. Pro can be toggled locally to explore. */
  demo: boolean
  toggleDemoPro: () => void
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

const proActive = (p: Profile | null) =>
  !!p && p.plan === 'pro' && (!p.plan_expires_at || new Date(p.plan_expires_at).getTime() > Date.now())

/**
 * Asks the server to send the welcome email. The server sends it only once per user, so this is
 * safe to call on every sign-in; the sessionStorage flag just avoids repeat calls in one tab.
 */
function sendWelcomeOnce(userId: string, token: string) {
  const key = `ff_welcome_${userId}`
  try {
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  } catch {
    /* storage blocked: the server still guards against duplicates */
  }
  void fetch('/api/welcome', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(hasSupabase)
  const [demoPro, setDemoPro] = useState(() => readLocal('ff_demo_pro', false))

  const loadProfile = useCallback(async (uid: string | undefined) => {
    if (!supabase || !uid) return setProfile(null)
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    setProfile((data as Profile) ?? null)
  }, [])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      loadProfile(data.session?.user.id).finally(() => setLoading(false))
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      // Defer: calling Supabase inside this callback can deadlock.
      setTimeout(() => loadProfile(s?.user.id), 0)
      if (event === 'SIGNED_IN' && s) sendWelcomeOnce(s.user.id, s.access_token)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const value = useMemo<AuthCtx>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      token: session?.access_token ?? null,
      loading,
      isPro: hasSupabase ? proActive(profile) : demoPro,
      isAdmin: profile?.role === 'admin',
      demo: !hasSupabase,
      toggleDemoPro: () => setDemoPro((v) => { writeLocal('ff_demo_pro', !v); return !v }),
      signInWithGoogle: async () => {
        if (!supabase) return
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/login` } })
        if (error) throw error
      },
      signOut: async () => { await supabase?.auth.signOut(); setProfile(null) },
      refreshProfile: () => loadProfile(session?.user.id),
    }),
    [session, profile, loading, demoPro, loadProfile],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth must be used inside <AuthProvider>')
  return c
}
