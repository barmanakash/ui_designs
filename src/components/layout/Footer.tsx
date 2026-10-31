import { Link } from 'react-router-dom'
import { SITE_NAME } from '@/lib/constants'

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <p className="font-display text-2xl">{SITE_NAME}</p>
          <p className="mt-2 max-w-xs text-sm text-muted">The best AI-agent and fintech/UPI interfaces, with code, prompts and teardowns.</p>
        </div>
        <nav aria-label="Browse" className="space-y-2 text-sm">
          <p className="font-medium">Browse</p>
          <Link className="block text-muted hover:text-fg" to="/explore">Explore</Link>
          <Link className="block text-muted hover:text-fg" to="/find">Find References</Link>
          <Link className="block text-muted hover:text-fg" to="/moodboards">Moodboards</Link>
        </nav>
        <nav aria-label="Community" className="space-y-2 text-sm">
          <p className="font-medium">Community</p>
          <Link className="block text-muted hover:text-fg" to="/submit">Submit your work</Link>
          <Link className="block text-muted hover:text-fg" to="/jobs">Jobs</Link>
          <Link className="block text-muted hover:text-fg" to="/pricing">Pricing</Link>
        </nav>
        <nav aria-label="Legal" className="space-y-2 text-sm">
          <p className="font-medium">Legal</p>
          <Link className="block text-muted hover:text-fg" to="/privacy">Privacy Policy</Link>
          <Link className="block text-muted hover:text-fg" to="/terms">Terms of Service</Link>
          <Link className="block text-muted hover:text-fg" to="/refunds">Refund Policy</Link>
          <Link className="block text-muted hover:text-fg" to="/licence">Content Licence</Link>
          <Link className="block text-muted hover:text-fg" to="/copyright-takedown">Copyright Takedown</Link>
          <Link className="block text-muted hover:text-fg" to="/contact">Contact</Link>
        </nav>
        <p className="text-sm text-muted">
          Designs remain the property of their creators and link back to the source. Placeholder content is marked as such.
        </p>
      </div>
      <p className="container-page pb-8 text-xs text-muted">© {new Date().getFullYear()} {SITE_NAME}</p>
    </footer>
  )
}
