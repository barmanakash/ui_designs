import { useCallback, useState } from 'react'
import { cn } from '@/lib/utils'
import type { Design } from '@/types'

type Img = Pick<Design, 'image_url' | 'title' | 'dominant_colors' | 'platform' | 'flow_type'>

/**
 * Real (uploaded) image. The parent supplies the aspect ratio, so there is no layout shift.
 * While it loads we show a soft tint made from the design's own colors and fade the image in
 * (a blur-up style placeholder without needing extra data). Fade is skipped for reduced motion.
 */
function RemoteImage({ design, className, eager }: { design: Img; className?: string; eager?: boolean }) {
  const [loaded, setLoaded] = useState(false)
  const accent = design.dominant_colors[0] ?? '#4f46e5'
  const bg = design.dominant_colors[1] ?? '#ffffff'
  // Cached images can finish before React attaches onLoad, so also check `complete` on mount.
  const ref = useCallback((el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth > 0) setLoaded(true)
  }, [])
  return (
    <div className="h-full w-full" style={{ background: `color-mix(in srgb, ${accent} 18%, ${bg})` }}>
      <img
        ref={ref}
        src={design.image_url}
        alt={`${design.title}: ${design.flow_type} screen`}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={cn('h-full w-full object-cover transition-opacity duration-300 motion-reduce:transition-none', loaded ? 'opacity-100' : 'opacity-0', className)}
      />
    </div>
  )
}

/**
 * Renders a design preview. Real images are lazy-loaded <img>. Seed placeholders
 * (image_url under /seed/) are drawn as a synthetic wireframe from the design's colors
 * and clearly labelled "Placeholder".
 */
export function DesignImage({ design, className, eager }: { design: Img; className?: string; eager?: boolean }) {
  const accent = design.dominant_colors[0] ?? '#4f46e5'
  const bg = design.dominant_colors[1] ?? '#ffffff'
  const dark = bg.toLowerCase() === '#0b0b0f'
  const isPlaceholder = design.image_url.startsWith('/seed/')

  if (!isPlaceholder) return <RemoteImage design={design} className={className} eager={eager} />

  const ink = dark ? '#2a2a33' : '#e4e4ea'
  const mobile = design.platform === 'mobile'
  return (
    <div
      role="img"
      aria-label={`Placeholder preview of ${design.title}`}
      className={cn('relative grid h-full w-full place-items-center overflow-hidden', className)}
      style={{ background: `color-mix(in srgb, ${accent} 14%, ${dark ? '#0b0b0f' : '#ffffff'})` }}
    >
      <div
        className={cn('flex flex-col gap-2 rounded-2xl p-3 shadow-sm', mobile ? 'h-[82%] w-[38%] min-w-[96px]' : 'h-[74%] w-[72%]')}
        style={{ background: bg, border: `1px solid ${ink}` }}
      >
        <div className="h-2 w-1/2 rounded-full" style={{ background: accent }} />
        <div className="h-2 w-3/4 rounded-full" style={{ background: ink }} />
        <div className="flex-1 rounded-lg" style={{ background: ink }} />
        <div className="h-5 rounded-full" style={{ background: accent }} />
      </div>
      <span className="absolute bottom-2 left-2 rounded-full bg-card px-2 py-0.5 text-[10px] font-medium text-muted">Placeholder</span>
    </div>
  )
}
