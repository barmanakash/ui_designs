import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clipboard, Lock } from 'lucide-react'
import { DesignImage } from './DesignImage'
import { SaveButton } from './SaveButton'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/useAuth'
import { fetchProContent } from '@/lib/api'
import { events } from '@/lib/analytics'
import { label } from '@/lib/constants'
import { copyText } from '@/lib/utils'
import type { Design } from '@/types'

export function DesignCard({ design, priority }: { design: Design; priority?: boolean }) {
  const { isPro, token } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const locked = design.is_pro_content && !isPro

  const copyPrompt = async () => {
    if (locked) return nav(`/design/${design.slug}?tab=prompt`)
    try {
      const c = await fetchProContent(design.slug, token, isPro)
      toast((await copyText(c.prompt_text)) ? 'Prompt copied' : 'Copy failed. Select the text manually.')
      events.copyPrompt(design.slug)
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  return (
    <motion.article whileHover={{ y: -3 }} transition={{ duration: 0.15 }} className="group relative">
      <div className="surface overflow-hidden transition-colors group-hover:border-accent">
        <Link to={`/design/${design.slug}`} className="block" aria-label={`${design.title}, ${label(design.flow_type)}`}>
          <div className="aspect-[4/3] overflow-hidden bg-bg">
            <DesignImage design={design} eager={priority} />
          </div>
          <div className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-sans text-base font-semibold leading-snug tracking-normal">{design.title}</h3>
              {locked && <Lock size={14} aria-label="Pro content" className="mt-1 shrink-0 text-muted" />}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge>{label(design.flow_type)}</Badge>
              <Badge>{label(design.platform)}</Badge>
            </div>
          </div>
        </Link>
      </div>
      <div className="absolute right-3 top-3 flex gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        <button
          type="button"
          onClick={copyPrompt}
          aria-label={locked ? 'Prompt is a Pro feature' : 'Copy prompt'}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 text-sm font-medium hover:bg-accent-soft"
        >
          {locked ? <Lock size={14} /> : <Clipboard size={14} />}
          <span className="hidden lg:inline">Prompt</span>
        </button>
        <SaveButton design={design} />
      </div>
    </motion.article>
  )
}
