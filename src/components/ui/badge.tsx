import { cn } from '@/lib/utils'

export function Badge({ className, ...p }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-muted', className)}
      {...p}
    />
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton rounded-xl', className)} />
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-block h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent', className)}
    />
  )
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="surface mx-auto max-w-md p-8 text-center">
      <h3 className="text-2xl">{title}</h3>
      {body && <p className="mt-2 text-sm text-muted">{body}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="surface mx-auto max-w-md p-8 text-center">
      <h3 className="text-2xl">Something went wrong</h3>
      <p className="mt-2 text-sm text-muted">{message || 'Please try again in a moment.'}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-5 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-accent-soft">
          Try again
        </button>
      )}
    </div>
  )
}
