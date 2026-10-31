import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Seo } from '@/components/layout/Seo'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/useAuth'
import { createSubmission } from '@/lib/api'

export default function Submit() {
  const { user, demo } = useAuth()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [link, setLink] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const submission = useMutation({
    mutationFn: () => createSubmission(user?.id ?? 'demo', { title: title.trim(), link: link.trim(), notes: notes.trim(), file }),
    onSuccess: () => {
      setTitle('')
      setLink('')
      setNotes('')
      setFile(null)
      toast('Thanks! Your design has been submitted for review.')
    },
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return
    submission.mutate()
  }

  return (
    <div className="container-page py-10">
      <Seo title="Submit a design" description="Share a design reference with the Frameflow community." path="/submit" />
      <div className="mx-auto max-w-2xl">
        <h1 className="text-5xl">Submit a design</h1>
        <p className="mt-2 text-muted">Share a reference with the community. Submissions are reviewed before publishing.</p>
        {demo && <p className="mt-5 rounded-xl border border-border p-4 text-sm text-muted">Submissions are available when the project is connected to Supabase.</p>}
        {submission.isSuccess ? (
          <div className="surface mt-6 p-5"><p className="font-medium">Submission received.</p><p className="mt-1 text-sm text-muted">Thank you for sharing your work.</p></div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <Field label="Design title"><Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required /></Field>
            <Field label="Source URL"><Input type="url" value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://" required /></Field>
            <Field label="Notes" hint="Add context that will help our reviewers.">
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} rows={4} />
            </Field>
            <Field label="Screenshot (optional)" hint="PNG, JPG, or WebP image.">
              <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </Field>
            <Button type="submit" disabled={submission.isPending || demo}>{submission.isPending ? 'Submitting…' : 'Submit for review'}</Button>
            {submission.isError && <p role="alert" className="text-sm text-danger">{(submission.error as Error).message}</p>}
          </form>
        )}
      </div>
    </div>
  )
}
