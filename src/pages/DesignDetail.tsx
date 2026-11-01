import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import { Check, Clipboard, ExternalLink } from 'lucide-react'
import { Seo } from '@/components/layout/Seo'
import { DesignImage } from '@/components/design/DesignImage'
import { SaveButton } from '@/components/design/SaveButton'
import { DesignCard } from '@/components/design/DesignCard'
import { ProLock } from '@/components/paywall/ProLock'
import { ReportButton } from '@/components/design/ReportButton'
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/useAuth'
import { bumpStat, fetchDesignBySlug, fetchProContent, fetchSimilar, logEvent } from '@/lib/api'
import { events } from '@/lib/analytics'
import { label } from '@/lib/constants'
import { copyText } from '@/lib/utils'

function CopyBlock({ text, onCopy, kind }: { text: string; onCopy: () => void; kind: string }) {
  const [done, setDone] = useState(false)
  const toast = useToast()
  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-sm font-medium">{kind}</span>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            if (await copyText(text)) { setDone(true); onCopy(); setTimeout(() => setDone(false), 1800) }
            else toast('Copy failed. Select the text manually.', 'error')
          }}
        >
          {done ? <Check size={14} /> : <Clipboard size={14} />} {done ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed">{text}</pre>
    </div>
  )
}

export default function DesignDetail() {
  const { slug = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const { isPro, token } = useAuth()

  const d = useQuery({ queryKey: ['design', slug], queryFn: () => fetchDesignBySlug(slug) })
  const design = d.data
  const canSee = !!design && (!design.is_pro_content || isPro)

  // Gated content: only requested when the user is allowed; the server re-checks regardless.
  const pro = useQuery({
    queryKey: ['pro-content', slug, isPro],
    queryFn: () => fetchProContent(slug, token, isPro),
    enabled: canSee,
  })
  const similar = useQuery({ queryKey: ['similar', slug], queryFn: () => fetchSimilar(design!), enabled: !!design })

  useEffect(() => {
    if (!design) return
    bumpStat(design.id, 'views')
    events.viewDesign(design.slug)
  }, [design?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (d.isLoading) {
    return (
      <div className="container-page grid gap-8 py-10 lg:grid-cols-5">
        <Skeleton className="aspect-[4/3] lg:col-span-3" />
        <div className="space-y-4 lg:col-span-2"><Skeleton className="h-10 w-3/4" /><Skeleton className="h-24" /></div>
      </div>
    )
  }
  if (d.isError) return <div className="container-page py-16"><ErrorState message={(d.error as Error).message} onRetry={() => d.refetch()} /></div>
  if (!design) {
    return (
      <div className="container-page py-16">
        <Seo title="Design not found" noindex />
        <EmptyState title="Design not found" body="It may have been unpublished or moved." action={<Button asChild><Link to="/explore">Back to Explore</Link></Button>} />
      </div>
    )
  }

  const tab = ['why', 'code', 'prompt', 'similar'].includes(params.get('tab') ?? '') ? params.get('tab')! : 'why'
  const lockedMsg = pro.isError && (pro.error as { status?: number }).status === 403

  return (
    <div className="container-page py-10">
      <Seo
        title={design.title}
        description={design.description}
        path={`/design/${design.slug}`}
        image={design.image_url}
        jsonLd={{ '@context': 'https://schema.org', '@type': 'CreativeWork', name: design.title, description: design.description, author: design.author_name ?? undefined, keywords: design.tags.join(', ') }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link to="/explore" className="hover:text-fg">Explore</Link> / <span>{label(design.flow_type)}</span>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="surface overflow-hidden">
            {design.video_url ? (
              <video src={design.video_url} controls muted loop playsInline className="w-full" aria-label={`${design.title} walkthrough`} />
            ) : (
              <div className="aspect-[4/3]"><DesignImage design={design} eager /></div>
            )}
          </div>
        </div>

        <aside className="space-y-5 lg:col-span-2">
          <h1 className="text-4xl sm:text-5xl">{design.title}</h1>
          <p className="text-muted">{design.description}</p>
          <div className="flex flex-wrap gap-2">
            <Badge>{label(design.flow_type)}</Badge>
            <Badge>{label(design.industry)}</Badge>
            <Badge>{label(design.platform)}</Badge>
            {design.tags.map((t) => <Link key={t} to={`/explore?tag=${t}`}><Badge className="hover:bg-accent-soft">#{t}</Badge></Link>)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SaveButton design={design} label className="h-10" />
            {design.source_url && (
              <Button asChild variant="outline">
                <a href={design.source_url} target="_blank" rel="noopener noreferrer nofollow">View original <ExternalLink size={14} /></a>
              </Button>
            )}
          </div>
          <p className="text-sm text-muted">
            Credit:{' '}
            {design.author_url ? <a className="font-medium text-fg underline" href={design.author_url} target="_blank" rel="noopener noreferrer nofollow">{design.author_name ?? 'Author'}</a> : design.author_name ?? 'Unknown'}
          </p>
          <div className="flex gap-2" aria-label="Colors">
            {design.dominant_colors.map((c) => <span key={c} title={c} className="h-6 w-6 rounded-full border border-border" style={{ background: c }} />)}
          </div>
          <ReportButton designId={design.id} />
        </aside>
      </div>

      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })} className="mt-10">
        <TabsList>
          <TabsTrigger value="why">Why it works</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
          <TabsTrigger value="prompt">Prompt</TabsTrigger>
          <TabsTrigger value="similar">Similar designs</TabsTrigger>
        </TabsList>

        <TabsContent value="why">
          {canSee && pro.data ? (
            <article className="prose-teardown max-w-3xl"><ReactMarkdown>{pro.data.teardown_md}</ReactMarkdown></article>
          ) : (
            <div className="max-w-3xl space-y-4">
              <article className="prose-teardown"><ReactMarkdown>{design.teardown_preview + '…'}</ReactMarkdown></article>
              {canSee && pro.isLoading ? <Skeleton className="h-32" /> : <ProLock what="full teardown" source="detail_teardown" />}
            </div>
          )}
        </TabsContent>

        <TabsContent value="code" className="max-w-3xl">
          {canSee && pro.data ? (
            <CopyBlock kind="React + Tailwind" text={pro.data.code_snippet} onCopy={() => { events.copyCode(design.slug); logEvent(design.id, 'copy_code') }} />
          ) : canSee && pro.isLoading ? <Skeleton className="h-64" /> : canSee && pro.isError && !lockedMsg ? (
            <ErrorState message={(pro.error as Error).message} onRetry={() => pro.refetch()} />
          ) : <ProLock what="code" source="detail_code" />}
        </TabsContent>

        <TabsContent value="prompt" className="max-w-3xl">
          {canSee && pro.data ? (
            <CopyBlock kind="Prompt for Claude, Cursor or v0" text={pro.data.prompt_text} onCopy={() => { events.copyPrompt(design.slug); logEvent(design.id, 'copy_prompt') }} />
          ) : canSee && pro.isLoading ? <Skeleton className="h-64" /> : canSee && pro.isError && !lockedMsg ? (
            <ErrorState message={(pro.error as Error).message} onRetry={() => pro.refetch()} />
          ) : <ProLock what="prompt" source="detail_prompt" />}
        </TabsContent>

        <TabsContent value="similar">
          {similar.isLoading ? <Skeleton className="h-48" /> : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {similar.data?.map((s) => <DesignCard key={s.id} design={s} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
