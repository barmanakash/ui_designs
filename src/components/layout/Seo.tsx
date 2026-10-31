import { Helmet } from 'react-helmet-async'
import { SITE_NAME } from '@/lib/constants'
import { SITE_URL } from '@/lib/supabase'

interface Props {
  title?: string
  description?: string
  path?: string
  image?: string
  noindex?: boolean
  jsonLd?: object
}

const DEFAULT_DESC =
  'A curated gallery of AI-agent and fintech/UPI interfaces, with copy-paste React code, ready-made prompts and design teardowns.'

/** Per-page title, meta description, canonical, Open Graph and Twitter tags. */
export function Seo({ title, description = DEFAULT_DESC, path, image = '/seed/placeholder.svg', noindex, jsonLd }: Props) {
  const full = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME}: UI inspiration for AI agents and fintech`
  const url = path ? SITE_URL + path : undefined
  const img = image.startsWith('http') ? image : SITE_URL + image
  return (
    <Helmet>
      <title>{full}</title>
      <meta name="description" content={description.slice(0, 160)} />
      {noindex && <meta name="robots" content="noindex" />}
      {url && <link rel="canonical" href={url} />}
      <meta property="og:title" content={full} />
      <meta property="og:description" content={description.slice(0, 200)} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={img} />
      {url && <meta property="og:url" content={url} />}
      <meta name="twitter:card" content="summary_large_image" />
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  )
}
