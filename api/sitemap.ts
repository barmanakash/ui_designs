import { ConfigError, siteUrl } from './_lib/env.js'
import { route } from './_lib/http.js'
import { admin } from './_lib/supabase.js'

const STATIC_PATHS = ['/', '/explore', '/find', '/pricing', '/jobs', '/privacy', '/terms', '/refunds', '/licence', '/copyright-takedown', '/contact']

const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

/** GET /sitemap.xml (rewritten to /api/sitemap): static pages plus every published design. */
export default route(['GET'], async (req, res) => {
  const base = siteUrl(req.headers.host)
  const urls: { loc: string; lastmod?: string }[] = STATIC_PATHS.map((p) => ({ loc: base + p }))

  try {
    const { data, error } = await admin()
      .from('designs_public')
      .select('slug,created_at')
      .order('created_at', { ascending: false })
      .limit(5000)
    if (error) throw error
    for (const d of data ?? []) {
      urls.push({ loc: `${base}/design/${d.slug}`, lastmod: new Date(d.created_at as string).toISOString().slice(0, 10) })
    }
  } catch (e) {
    // Not configured yet (local/demo): serve the static pages only. Real errors are logged.
    if (!(e instanceof ConfigError)) console.error('Sitemap query failed:', e)
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${xmlEscape(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n') +
    `\n</urlset>\n`

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.status(200).send(body)
})
