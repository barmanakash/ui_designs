import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { subscribeNewsletter } from '@/lib/api'

export function Newsletter() {
  const [email, setEmail] = useState('')
  // Honeypot: invisible to people, tempting to bots. The server ignores submissions that fill it.
  const [website, setWebsite] = useState('')
  const m = useMutation({ mutationFn: () => subscribeNewsletter(email.trim(), website) })
  return (
    <section className="container-page mt-20" aria-labelledby="nl">
      <div className="surface p-8 text-center">
        <h2 id="nl" className="text-3xl">One great interface, every week</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">A short email with the best new AI-agent and fintech designs. No spam.</p>
        {m.isSuccess ? (
          <p role="status" className="mt-5 font-medium text-success">
            {m.data.pending ? 'Almost there. Check your inbox to confirm your subscription.' : 'You are in. Thank you!'}
          </p>
        ) : (
          <form
            className="mx-auto mt-5 flex max-w-md flex-col gap-2 sm:flex-row"
            onSubmit={(e) => { e.preventDefault(); if (email) m.mutate() }}
          >
            <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
              <label>Leave this field empty<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
            </div>
            <Input type="email" required placeholder="you@company.com" aria-label="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" disabled={m.isPending}>{m.isPending ? 'Joining…' : 'Subscribe'}</Button>
          </form>
        )}
        {m.isError && <p role="alert" className="mt-2 text-sm text-danger">{(m.error as Error).message}</p>}
      </div>
    </section>
  )
}
