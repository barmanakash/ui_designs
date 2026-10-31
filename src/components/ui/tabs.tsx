import * as RT from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

export const Tabs = RT.Root

export function TabsList({ className, ...p }: RT.TabsListProps) {
  return <RT.List className={cn('inline-flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1', className)} {...p} />
}

export function TabsTrigger({ className, ...p }: RT.TabsTriggerProps) {
  return (
    <RT.Trigger
      className={cn('rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-fg data-[state=active]:bg-accent data-[state=active]:text-accent-fg', className)}
      {...p}
    />
  )
}

export function TabsContent({ className, ...p }: RT.TabsContentProps) {
  return <RT.Content className={cn('mt-4 focus-visible:outline-none', className)} {...p} />
}
