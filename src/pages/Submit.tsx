import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Seo } from '@/components/layout/Seo'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/useAuth'
import { createSubmission } from '@/lib/api'
import { validateImageFile } from '@/lib/image'

export default function Submit() {
  const { user, demo } = useAuth()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [link, setLink] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [ownsRights, setOwnsRights] = useState(false)
  const submission = useMutation({
    mutationFn: () => createSubmission(user?.id ?? 'demo', { title: title.trim(), link: link.trim(), notes: notes.trim(), file, ownsRights }),
    onSuccess: () => {
      setTitle('')
      setLink('')
      setNotes('')
      setFile(null)
      setOwnsRights(false)
      toast('Thanks! Your design has been submitted for review.')
    },
  })

  const pickFile = (picked: File | null) => {
    const problem = picked ? validateImageFile(picked) : null
    setFileError(problem ?? '')
    setFile(problem ? null : picked)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user || !ownsRights) return
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
            <Field label="Screenshot (optional)" hint="PNG, JPG or WebP, up to 5 MB. We resize and convert it to WebP.">
              <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => pickFile(event.target.files?.[0] ?? null)} />
            </Field>
            {fileError && <p role="alert" className="text-sm text-danger">{fileError}</p>}

            <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
              <input
                type="checkbox"
                checked={ownsRights}
                onChange={(event) => setOwnsRights(event.target.checked)}
                required
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <span>
                I created this design, or I have permission from its creator to share it. I agree to the{' '}
                <Link to="/terms" className="text-accent underline">Terms</Link> and understand it will be shown with credit and a link to the source.
              </span>
            </label>

            <Button type="submit" disabled={submission.isPending || demo || !ownsRights}>{submission.isPending ? 'Submitting…' : 'Submit for review'}</Button>
            {submission.isError && <p role="alert" className="text-sm text-danger">{(submission.error as Error).message}</p>}
          </form>
        )}
      </div>
    </div>
  )
}
