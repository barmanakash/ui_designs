import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { subscribeNewsletter } from '@/lib/api'

export function Newsletter() {
  const [email, setEmail] = useState('')
  const m = useMutation({ mutationFn: () => subscribeNewsletter(email.trim()) })
  return (
    <section className="container-page mt-20" aria-labelledby="nl">
      <div className="surface p-8 text-center">
        <h2 id="nl" className="text-3xl">One great interface, every week</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">A short email with the best new AI-agent and fintech designs. No spam.</p>
        {m.isSuccess ? (
          <p role="status" className="mt-5 font-medium text-success">You are in. Thank you!</p>
        ) : (
          <form
            className="mx-auto mt-5 flex max-w-md flex-col gap-2 sm:flex-row"
            onSubmit={(e) => { e.preventDefault(); if (email) m.mutate() }}
          >
            <Input type="email" required placeholder="you@company.com" aria-label="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" disabled={m.isPending}>{m.isPending ? 'Joining…' : 'Subscribe'}</Button>
          </form>
        )}
        {m.isError && <p role="alert" className="mt-2 text-sm text-danger">{(m.error as Error).message}</p>}
      </div>
    </section>
  )
}
