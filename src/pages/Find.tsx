import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Search, Sparkles } from 'lucide-react'
import { Seo } from '@/components/layout/Seo'
import { DesignCard } from '@/components/design/DesignCard'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { findReferences } from '@/lib/api'

export default function Find() {
  const [brief, setBrief] = useState('')
  const { token, isPro } = useAuth()
  const search = useMutation({ mutationFn: () => findReferences(brief.trim(), token, isPro) })

  return (
    <div className="container-page py-10">
      <Seo title="Find references" description="Describe the interface you need and discover relevant design references." path="/find" />
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-medium text-accent">AI-powered discovery</p>
        <h1 className="mt-2 text-5xl">Find references</h1>
        <p className="mt-3 text-muted">Describe the experience you want to design. We’ll find relevant references and explain why they fit.</p>
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (brief.trim()) search.mutate()
          }}
        >
          <Textarea
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            aria-label="Describe the design references you need"
            placeholder="For example: a mobile UPI checkout that feels trustworthy and makes payment confirmation clear…"
            maxLength={1000}
            required
            rows={5}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">{isPro ? 'Unlimited searches with Pro.' : 'Free searches are limited each day.'}</p>
            <Button type="submit" disabled={!brief.trim() || search.isPending}>
              <Search size={16} /> {search.isPending ? 'Finding references…' : 'Find references'}
            </Button>
          </div>
        </form>

        {search.isError && (
          <div role="alert" className="mt-5 rounded-xl border border-danger p-4 text-sm text-danger">
            {(search.error as Error).message}
            {(search.error as { code?: string }).code === 'limit_reached' && (
              <> <Link to="/pricing" className="font-medium underline">Explore Pro</Link> for unlimited searches.</>
            )}
          </div>
        )}

        {search.data && (
          <section className="mt-10" aria-live="polite">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-3xl">Recommended references</h2>
                <p className="mt-1 text-sm text-muted">Matched to your brief</p>
              </div>
              {search.data.remaining !== null && <p className="text-sm text-muted">{search.data.remaining} free searches remaining today</p>}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {search.data.results.map(({ design, reason }) => (
                <article key={design.id} className="space-y-2">
                  <DesignCard design={design} />
                  <p className="flex items-start gap-2 text-sm text-muted"><Sparkles size={15} className="mt-0.5 shrink-0 text-accent" />{reason}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
