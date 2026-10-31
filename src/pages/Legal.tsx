import { Link, useLocation } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { Seo } from '@/components/layout/Seo'
import { EmptyState } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LEGAL_DOCS, type LegalSlug } from '@/lib/legal'

/** One component serves /privacy, /terms, /refunds, /licence, /copyright-takedown and /contact. */
export default function Legal() {
  const { pathname } = useLocation()
  const doc = LEGAL_DOCS[pathname.replace(/^\/+|\/+$/g, '') as LegalSlug]

  if (!doc) {
    return (
      <div className="container-page py-16">
        <EmptyState title="Page not found" action={<Button asChild><Link to="/">Go home</Link></Button>} />
      </div>
    )
  }

  return (
    <div className="container-page py-10">
      <Seo title={doc.title} description={doc.description} path={pathname} />
      <div className="max-w-3xl">
        <h1 className="text-5xl">{doc.title}</h1>
        <p role="note" className="mt-4 rounded-xl border border-border bg-accent-soft p-3 text-sm">
          <strong>DRAFT:</strong> review with a lawyer before launch. Replace every [PLACEHOLDER] with your real details.
        </p>
        <article className="prose-teardown mt-6">
          <ReactMarkdown
            components={{
              // Internal links use the router (no full page reload); external ones open safely.
              a: ({ href = '', children }) =>
                href.startsWith('/') ? (
                  <Link to={href} className="text-accent underline">{children}</Link>
                ) : (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline">{children}</a>
                ),
            }}
          >
            {doc.body}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  )
}
