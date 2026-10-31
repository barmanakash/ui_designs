import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { FLOW_TYPES, INDUSTRIES, PLATFORMS, label, slugify } from '@/lib/constants'
import { processImage, validateImageFile } from '@/lib/image'
import { sb } from '@/lib/supabase'
import { uid } from '@/lib/utils'
import type { AdminDesign, Platform, RightsStatus } from '@/types'

interface Row {
  id: string
  slug: string
  title: string
  status: 'draft' | 'published'
  is_featured: boolean
  is_pro_content: boolean
  views: number
}

interface FormState {
  title: string
  description: string
  flow_type: string
  industry: string
  platform: Platform
  tags: string
  source_url: string
  author_name: string
  author_url: string
  rights_status: RightsStatus
  teardown_md: string
  code_snippet: string
  prompt_text: string
  is_pro_content: boolean
  is_featured: boolean
  publish: boolean
}

const blank = (): FormState => ({
  title: '', description: '', flow_type: FLOW_TYPES[0], industry: INDUSTRIES[0], platform: 'web', tags: '',
  source_url: '', author_name: '', author_url: '', rights_status: 'permission_granted',
  teardown_md: '', code_snippet: '', prompt_text: '', is_pro_content: true, is_featured: false, publish: false,
})

const fromDesign = (d: AdminDesign): FormState => ({
  title: d.title, description: d.description, flow_type: d.flow_type, industry: d.industry, platform: d.platform,
  tags: d.tags.join(', '), source_url: d.source_url ?? '', author_name: d.author_name ?? '', author_url: d.author_url ?? '',
  rights_status: d.rights_status ?? 'permission_granted', teardown_md: d.teardown_md, code_snippet: d.code_snippet,
  prompt_text: d.prompt_text, is_pro_content: d.is_pro_content, is_featured: d.is_featured, publish: d.status === 'published',
})

function DesignForm({ initial, onDone }: { initial: AdminDesign | null; onDone: () => void }) {
  const toast = useToast()
  const [f, setF] = useState<FormState>(initial ? fromDesign(initial) : blank())
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((prev) => ({ ...prev, [k]: v }))

  const save = useMutation({
    mutationFn: async () => {
      if (f.publish && (!f.source_url.trim() || !f.author_name.trim())) {
        throw new Error('Published designs need an author credit and a source URL.')
      }
      let image_url = initial?.image_url ?? ''
      let dominant_colors = initial?.dominant_colors ?? []
      if (file) {
        const processed = await processImage(file) // resize, convert to WebP, extract colors
        const path = `${uid()}.webp`
        const up = await sb().storage.from('designs').upload(path, processed.blob, { contentType: 'image/webp' })
        if (up.error) throw new Error(up.error.message)
        image_url = sb().storage.from('designs').getPublicUrl(path).data.publicUrl
        dominant_colors = processed.colors
      }
      if (!image_url) throw new Error('Please upload an image.')

      const row = {
        title: f.title.trim(),
        description: f.description.trim(),
        image_url,
        source_url: f.source_url.trim() || null,
        author_name: f.author_name.trim() || null,
        author_url: f.author_url.trim() || null,
        flow_type: f.flow_type,
        industry: f.industry,
        platform: f.platform,
        tags: f.tags.split(',').map((t) => slugify(t)).filter(Boolean),
        dominant_colors,
        teardown_md: f.teardown_md,
        code_snippet: f.code_snippet,
        prompt_text: f.prompt_text,
        is_pro_content: f.is_pro_content,
        is_featured: f.is_featured,
        rights_status: f.rights_status,
        status: f.publish ? 'published' : 'draft',
      }
      const { error } = initial
        ? await sb().from('designs').update(row).eq('id', initial.id)
        : await sb().from('designs').insert({ ...row, slug: slugify(f.title) })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { toast(initial ? 'Design updated' : 'Design created'); onDone() },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate() }

  return (
    <form onSubmit={submit} className="surface space-y-4 p-5">
      <h3 className="text-xl">{initial ? `Edit: ${initial.title}` : 'New design'}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title"><Input value={f.title} onChange={(e) => set('title', e.target.value)} required maxLength={120} /></Field>
        <Field label="Tags" hint="Comma separated, e.g. minimal, trust"><Input value={f.tags} onChange={(e) => set('tags', e.target.value)} /></Field>
        <Field label="Flow type"><Select value={f.flow_type} onChange={(e) => set('flow_type', e.target.value)}>{FLOW_TYPES.map((v) => <option key={v} value={v}>{label(v)}</option>)}</Select></Field>
        <Field label="Industry"><Select value={f.industry} onChange={(e) => set('industry', e.target.value)}>{INDUSTRIES.map((v) => <option key={v} value={v}>{label(v)}</option>)}</Select></Field>
        <Field label="Platform"><Select value={f.platform} onChange={(e) => set('platform', e.target.value as Platform)}>{PLATFORMS.map((v) => <option key={v} value={v}>{label(v)}</option>)}</Select></Field>
        <Field label="Rights status" hint="Where did this design come from?">
          <Select value={f.rights_status} onChange={(e) => set('rights_status', e.target.value as RightsStatus)}>
            <option value="owner_submitted">Owner submitted it</option>
            <option value="permission_granted">Permission granted by creator</option>
            <option value="original_recreation">My own original recreation</option>
          </Select>
        </Field>
        <Field label="Author name"><Input value={f.author_name} onChange={(e) => set('author_name', e.target.value)} /></Field>
        <Field label="Author link"><Input type="url" value={f.author_url} onChange={(e) => set('author_url', e.target.value)} placeholder="https://" /></Field>
        <div className="sm:col-span-2"><Field label="Source URL (original design)"><Input type="url" value={f.source_url} onChange={(e) => set('source_url', e.target.value)} placeholder="https://" /></Field></div>
      </div>
      <Field label="Description"><Textarea value={f.description} onChange={(e) => set('description', e.target.value)} rows={2} required /></Field>
      <Field label={initial ? 'Replace image (optional)' : 'Image'} hint="PNG, JPG or WebP up to 5 MB. Converted to WebP automatically.">
        <Input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            const picked = e.target.files?.[0] ?? null
            const problem = picked ? validateImageFile(picked) : null
            setFileError(problem ?? '')
            setFile(problem ? null : picked)
          }}
        />
      </Field>
      {fileError && <p role="alert" className="text-sm text-danger">{fileError}</p>}
      <Field label="Teardown (Markdown)" hint="Free users see only the first 280 characters."><Textarea value={f.teardown_md} onChange={(e) => set('teardown_md', e.target.value)} rows={6} className="font-mono text-xs" /></Field>
      <Field label="React + Tailwind code (original recreation)"><Textarea value={f.code_snippet} onChange={(e) => set('code_snippet', e.target.value)} rows={8} className="font-mono text-xs" /></Field>
      <Field label="Prompt"><Textarea value={f.prompt_text} onChange={(e) => set('prompt_text', e.target.value)} rows={5} className="font-mono text-xs" /></Field>
      <div className="flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.is_pro_content} onChange={(e) => set('is_pro_content', e.target.checked)} /> Pro-only content</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.is_featured} onChange={(e) => set('is_featured', e.target.checked)} /> Featured</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.publish} onChange={(e) => set('publish', e.target.checked)} /> Published</label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : initial ? 'Save changes' : 'Create design'}</Button>
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  )
}

export function DesignsPanel() {
  const toast = useToast()
  const qc = useQueryClient()
  const [editing, setEditing] = useState<AdminDesign | 'new' | null>(null)
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-designs'] })
  const fail = (e: Error) => toast(e.message, 'error')

  const list = useQuery({
    queryKey: ['admin-designs'],
    queryFn: async () => {
      const { data, error } = await sb().from('designs').select('id,slug,title,status,is_featured,is_pro_content,views').order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Row[]
    },
  })

  const patch = useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: Partial<Pick<Row, 'status' | 'is_featured'>> }) => {
      const { error } = await sb().from('designs').update(changes).eq('id', id)
      if (error) throw error
    },
    onSuccess: refresh,
    onError: fail,
  })
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from('designs').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: refresh,
    onError: fail,
  })

  const openEdit = async (id: string) => {
    const { data, error } = await sb().from('designs').select('*').eq('id', id).single()
    if (error) return toast(error.message, 'error')
    setEditing(data as AdminDesign)
  }

  return (
    <section className="space-y-5" aria-labelledby="designs-h">
      <div className="flex items-center justify-between gap-3">
        <h2 id="designs-h" className="text-2xl">Designs</h2>
        {!editing && <Button onClick={() => setEditing('new')}>New design</Button>}
      </div>

      {editing && (
        <DesignForm
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? null : editing}
          onDone={() => { setEditing(null); void refresh() }}
        />
      )}

      {list.isLoading && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-16" />)}
      {list.isError && <ErrorState message={(list.error as Error).message} onRetry={() => list.refetch()} />}
      {list.data?.length === 0 && <EmptyState title="No designs yet" body="Create one, or run npm run seed for sample content." />}
      {list.data?.map((d) => (
        <article key={d.id} className="surface flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="font-medium">{d.title}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge>{d.status}</Badge>
              {d.is_featured && <Badge>featured</Badge>}
              <Badge>{d.is_pro_content ? 'pro' : 'free'}</Badge>
              <Badge>{d.views} views</Badge>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => openEdit(d.id)}>Edit</Button>
            <Button size="sm" variant="outline" disabled={patch.isPending} onClick={() => patch.mutate({ id: d.id, changes: { status: d.status === 'published' ? 'draft' : 'published' } })}>
              {d.status === 'published' ? 'Unpublish' : 'Publish'}
            </Button>
            <Button size="sm" variant="outline" disabled={patch.isPending} onClick={() => patch.mutate({ id: d.id, changes: { is_featured: !d.is_featured } })}>
              {d.is_featured ? 'Unfeature' : 'Feature'}
            </Button>
            <Button size="sm" variant="danger" disabled={remove.isPending} onClick={() => { if (window.confirm(`Delete "${d.title}" permanently?`)) remove.mutate(d.id) }}>Delete</Button>
          </div>
        </article>
      ))}
    </section>
  )
}
