import { z } from 'zod'
import { escapeHtml } from './_lib/email.js'
import { siteUrl } from './_lib/env.js'
import { HttpError, queryParam, route } from './_lib/http.js'
import { admin } from './_lib/supabase.js'

const Query = z.object({ slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/) })

const SITE_NAME = 'Frameflow'

/**
 * GET /api/design-og?slug=…
 * Link-preview HTML for social crawlers (WhatsApp, X, LinkedIn, Slack, Facebook, Google…).
 * Those crawlers do not run JavaScript, so the per-design title, description and image that the
 * React app sets in the browser would be invisible to them. vercel.json rewrites /design/:slug
 * to this route ONLY for known crawler user-agents; real visitors still get the normal app.
 *
 * It reads `designs_public`, so no Pro content (code, prompt, full teardown) can ever appear here.
 */
export default route(['GET'], async (req, res) => {
  const parsed = Query.safeParse({ slug: queryParam(req, 'slug') })
  if (!parsed.success) throw new HttpError(400, 'Invalid design slug.', 'bad_request')

  const { data: design, error } = await admin()
    .from('designs_public')
    .select('slug,title,description,image_url,author_name,tags')
    .eq('slug', parsed.data.slug)
    .maybeSingle()
  if (error) throw error
  if (!design) throw new HttpError(404, 'Design not found.', 'not_found')

  const site = siteUrl(req.headers.host)
  const url = `${site}/design/${design.slug}`
  const title = `${design.title} · ${SITE_NAME}`
  const description = String(design.description ?? '').slice(0, 200)
  const image = String(design.image_url).startsWith('http') ? String(design.image_url) : site + design.image_url

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: design.title,
    description,
    image,
    url,
    author: design.author_name ?? undefined,
    keywords: Array.isArray(design.tags) ? design.tags.join(', ') : undefined,
  }
  // "<" is escaped so the JSON can never close the script tag early.
  const jsonLdSafe = JSON.stringify(jsonLd).replace(/</g, '\\u003c')

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(url)}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(url)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
<script type="application/ld+json">${jsonLdSafe}</script>
</head>
<body>
<h1>${escapeHtml(design.title)}</h1>
<p>${escapeHtml(description)}</p>
<p><a href="${escapeHtml(url)}">View on ${SITE_NAME}</a></p>
</body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  // Cache at the CDN so a burst of crawler hits doesn't hit the database every time.
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.status(200).send(html)
})
