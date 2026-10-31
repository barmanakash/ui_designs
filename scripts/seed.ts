// Seeds Supabase with the 24 placeholder designs, 3 jobs and (optionally) 3 sample moodboards.
//   npm run seed
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env. Safe to re-run (upserts by slug).
// ⚠ Content is PLACEHOLDER art/credit. Replace it with real, properly credited work via /admin.
import { createClient } from '@supabase/supabase-js'
import { SAMPLE_BOARDS, SAMPLE_JOBS, SEED_ADMIN_DESIGNS } from '../src/lib/seed'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env and fill them in.')
  process.exit(1)
}
const db = createClient(url, key, { auth: { persistSession: false } })

async function seedDesigns(): Promise<Map<string, string>> {
  // Drop the demo ids ("seed-1"): the database generates real UUIDs.
  const rows = SEED_ADMIN_DESIGNS.map(({ id: _id, ...d }) => ({
    ...d,
    status: 'published' as const,
    rights_status: 'original_recreation' as const,
  }))
  const { error } = await db.from('designs').upsert(rows, { onConflict: 'slug' })
  if (error) throw new Error(`designs: ${error.message}`)

  const { data, error: readError } = await db.from('designs').select('id,slug')
  if (readError) throw new Error(`designs read: ${readError.message}`)
  console.log(`✓ ${rows.length} designs upserted`)
  return new Map((data ?? []).map((d) => [d.slug as string, d.id as string]))
}

async function seedJobs() {
  let added = 0
  for (const job of SAMPLE_JOBS) {
    const { data } = await db.from('jobs').select('id').eq('title', job.title).eq('company', job.company).maybeSingle()
    if (data) continue
    const { error } = await db.from('jobs').insert(job)
    if (error) throw new Error(`jobs: ${error.message}`)
    added++
  }
  console.log(`✓ ${added} jobs added (${SAMPLE_JOBS.length - added} already existed)`)
}

async function seedBoards(slugToId: Map<string, string>) {
  const owner = process.env.SEED_OWNER_ID
  if (!owner) {
    console.log('– Skipped sample moodboards (set SEED_OWNER_ID to a real auth.users id to create them)')
    return
  }
  let added = 0
  for (const board of SAMPLE_BOARDS) {
    const existing = await db.from('moodboards').select('id').eq('user_id', owner).eq('name', board.name).maybeSingle()
    if (existing.data) continue
    const created = await db.from('moodboards').insert({ user_id: owner, name: board.name }).select('id').single()
    if (created.error) throw new Error(`moodboards: ${created.error.message}`)
    const items = board.slugs
      .map((slug, position) => ({ moodboard_id: created.data.id, design_id: slugToId.get(slug), position }))
      .filter((i): i is { moodboard_id: string; design_id: string; position: number } => Boolean(i.design_id))
    const { error } = await db.from('moodboard_items').insert(items)
    if (error) throw new Error(`moodboard_items: ${error.message}`)
    added++
  }
  console.log(`✓ ${added} sample moodboards added`)
}

try {
  const map = await seedDesigns()
  await seedJobs()
  await seedBoards(map)
  console.log('Done.')
} catch (e) {
  console.error('Seed failed:', (e as Error).message)
  process.exit(1)
}
