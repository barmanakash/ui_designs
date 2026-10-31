import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { sb } from '@/lib/supabase'
import type { Job } from '@/types'

const EMPTY = { title: '', company: '', location: 'Remote', type: 'Full-time', apply_url: '', status: 'open' as Job['status'] }

export function JobsPanel() {
  const toast = useToast()
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY)
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-jobs'] })
  const fail = (e: Error) => toast(e.message, 'error')

  const jobs = useQuery({
    queryKey: ['admin-jobs'],
    queryFn: async () => {
      const { data, error } = await sb().from('jobs').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Job[]
    },
  })

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await sb().from('jobs').insert({ ...form, title: form.title.trim(), company: form.company.trim(), apply_url: form.apply_url.trim() })
      if (error) throw error
    },
    onSuccess: () => { setForm(EMPTY); toast('Job saved'); void refresh() },
    onError: fail,
  })
  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Job['status'] }) => {
      const { error } = await sb().from('jobs').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: refresh,
    onError: fail,
  })
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from('jobs').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: refresh,
    onError: fail,
  })

  const submit = (e: FormEvent) => { e.preventDefault(); create.mutate() }
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <section className="space-y-6" aria-labelledby="jobs-h">
      <h2 id="jobs-h" className="text-2xl">Jobs</h2>

      <form onSubmit={submit} className="surface grid gap-3 p-5 sm:grid-cols-2">
        <Field label="Title"><Input value={form.title} onChange={set('title')} required maxLength={120} /></Field>
        <Field label="Company"><Input value={form.company} onChange={set('company')} required maxLength={120} /></Field>
        <Field label="Location"><Input value={form.location} onChange={set('location')} required maxLength={120} /></Field>
        <Field label="Type">
          <Select value={form.type} onChange={set('type')}>
            {['Full-time', 'Part-time', 'Contract', 'Internship'].map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Apply URL"><Input type="url" value={form.apply_url} onChange={set('apply_url')} placeholder="https://" required /></Field>
        <Field label="Status">
          <Select value={form.status} onChange={set('status')}>
            <option value="open">Open (visible)</option>
            <option value="draft">Draft (hidden)</option>
          </Select>
        </Field>
        <div className="sm:col-span-2"><Button type="submit" disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Add job'}</Button></div>
      </form>

      {jobs.isLoading && <Skeleton className="h-20" />}
      {jobs.isError && <ErrorState message={(jobs.error as Error).message} onRetry={() => jobs.refetch()} />}
      {jobs.data?.length === 0 && <EmptyState title="No jobs yet" />}
      {jobs.data?.map((j) => (
        <article key={j.id} className="surface flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="font-medium">{j.title} <span className="text-muted">· {j.company}</span></p>
            <p className="text-sm text-muted">{j.location} · {j.type}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge>{j.status}</Badge>
            <Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: j.id, status: j.status === 'open' ? 'closed' : 'open' })}>
              {j.status === 'open' ? 'Close' : 'Reopen'}
            </Button>
            <Button size="sm" variant="danger" disabled={remove.isPending} onClick={() => { if (window.confirm(`Delete "${j.title}"?`)) remove.mutate(j.id) }}>Delete</Button>
          </div>
        </article>
      ))}
    </section>
  )
}
