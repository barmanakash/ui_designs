import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, Moon, Sparkles, Sun, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { SITE_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { events } from '@/lib/analytics'

const links = [
  { to: '/explore', label: 'Explore' },
  { to: '/find', label: 'Find References' },
  { to: '/moodboards', label: 'Moodboards' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/pricing', label: 'Pricing' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  const { theme, toggle } = useTheme()
  const { user, profile, isPro, isAdmin, demo } = useAuth()
  const nav = useNavigate()
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cn('rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent-soft', isActive ? 'text-accent' : 'text-fg')

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="container-page flex h-16 items-center gap-4">
        <Link to="/" className="flex items-center gap-2 font-display text-2xl" aria-label={`${SITE_NAME} home`}>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-fg">F</span>
          {SITE_NAME}
        </Link>
        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkCls}>{l.label}</NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {demo && <span className="hidden rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent sm:inline">Demo mode</span>}
          <Button variant="ghost" size="icon" onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
          {!isPro && (
            <Button size="sm" className="hidden sm:inline-flex" onClick={() => { events.upgradeClick('navbar'); nav('/pricing') }}>
              <Sparkles size={14} /> Go Pro
            </Button>
          )}
          {isAdmin && <Link to="/admin" className="hidden text-sm font-medium text-accent md:inline">Admin</Link>}
          {user || demo ? (
            <Link to="/account" className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-border bg-card text-sm font-semibold" aria-label="Account">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : (profile?.name || user?.email || 'U')[0].toUpperCase()}
            </Link>
          ) : (
            <Button variant="outline" size="sm" onClick={() => nav('/login')}>Log in</Button>
          )}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-nav" aria-label="Toggle menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="container-page flex flex-col gap-1 pb-4 md:hidden">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkCls} onClick={() => setOpen(false)}>{l.label}</NavLink>
          ))}
          {isAdmin && <NavLink to="/admin" className={linkCls} onClick={() => setOpen(false)}>Admin</NavLink>}
        </nav>
      )}
    </header>
  )
}
