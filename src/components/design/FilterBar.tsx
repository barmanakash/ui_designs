import { X } from 'lucide-react'
import { Select } from '@/components/ui/input'
import { COLOR_FAMILIES, FLOW_TYPES, INDUSTRIES, PLATFORMS, STYLE_TAGS, label } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { DesignQuery } from '@/lib/api'

interface Props {
  value: DesignQuery
  onChange: (patch: Partial<DesignQuery>) => void
  onClear: () => void
}

/** Quick flow-type chips (used on Home and above the Explore filters). */
export function FlowChips({ value, onChange }: { value?: string; onChange: (flow: string | undefined) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by flow type">
      <Chip active={!value} onClick={() => onChange(undefined)}>All</Chip>
      {FLOW_TYPES.map((f) => (
        <Chip key={f} active={value === f} onClick={() => onChange(value === f ? undefined : f)}>{label(f)}</Chip>
      ))}
    </div>
  )
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn('rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors', active ? 'border-accent bg-accent text-accent-fg' : 'border-border bg-card text-fg hover:bg-accent-soft')}
    >
      {children}
    </button>
  )
}

export function FilterBar({ value, onChange, onClear }: Props) {
  const active = Boolean(value.flow || value.industry || value.platform || value.tag || value.color || value.search)
  return (
    <div className="space-y-4">
      <FlowChips value={value.flow} onChange={(flow) => onChange({ flow })} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Select aria-label="Industry" value={value.industry ?? ''} onChange={(e) => onChange({ industry: e.target.value || undefined })}>
          <option value="">All industries</option>
          {INDUSTRIES.map((i) => <option key={i} value={i}>{label(i)}</option>)}
        </Select>
        <Select aria-label="Platform" value={value.platform ?? ''} onChange={(e) => onChange({ platform: e.target.value || undefined })}>
          <option value="">Web and mobile</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{label(p)}</option>)}
        </Select>
        <Select aria-label="Style" value={value.tag ?? ''} onChange={(e) => onChange({ tag: e.target.value || undefined })}>
          <option value="">Any style</option>
          {STYLE_TAGS.map((t) => <option key={t} value={t}>{label(t)}</option>)}
        </Select>
        <Select aria-label="Sort" value={value.sort ?? 'latest'} onChange={(e) => onChange({ sort: e.target.value as 'latest' | 'popular' })}>
          <option value="latest">Latest</option>
          <option value="popular">Popular</option>
        </Select>
        <div className="flex items-center gap-2" role="group" aria-label="Filter by color">
          {COLOR_FAMILIES.map((c) => (
            <button
              key={c.hex}
              type="button"
              title={c.name}
              aria-label={c.name}
              aria-pressed={value.color === c.hex}
              onClick={() => onChange({ color: value.color === c.hex ? undefined : c.hex })}
              className={cn('h-6 w-6 rounded-full border-2', value.color === c.hex ? 'border-fg' : 'border-transparent')}
              style={{ background: c.hex }}
            />
          ))}
        </div>
      </div>
      {active && (
        <button type="button" onClick={onClear} className="inline-flex items-center gap-1 text-sm font-medium text-accent">
          <X size={14} /> Clear filters
        </button>
      )}
    </div>
  )
}
