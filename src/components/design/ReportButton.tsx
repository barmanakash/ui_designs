import { useState, type FormEvent } from 'react'
import { Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { submitReport, type ReportReason } from '@/lib/api'

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'copyright', label: 'Copyright / request removal' },
  { value: 'inaccurate', label: 'Incorrect credit or information' },
  { value: 'offensive', label: 'Offensive or inappropriate' },
  { value: 'other', label: 'Something else' },
]

/** "Report / request removal": the form behind the 48-hour takedown commitment. */
export function ReportButton({ designId }: { designId: string }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState<ReportReason>('copyright')
  const [details, setDetails] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('') // honeypot

  const send = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await submitReport({ designId, reason, details: details.trim(), email: email.trim(), honeypot: website })
      toast('Thanks. We review reports within 48 hours.')
      setOpen(false)
      setDetails('')
    } catch (error) {
      toast((error as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm text-muted underline hover:text-fg">
        <Flag size={14} /> Report / request removal
      </button>
    )
  }

  return (
    <form onSubmit={send} className="surface space-y-3 p-4" aria-label="Report this design">
      <Field label="Reason">
        <Select value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
          {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </Select>
      </Field>
      <Field label="Details" hint="If you own this work, include proof or a link.">
        <Textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} rows={3} />
      </Field>
      <Field label="Your email (optional)" hint="So we can follow up.">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} />
      </Field>
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
        <label>Leave this field empty<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>{busy ? 'Sending…' : 'Send report'}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  )
}
