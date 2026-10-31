// "Popular this week" scoring. The production ranking runs in SQL (popular_designs() in
// supabase/functions.sql) over the events of the last 7 days; keep these weights in sync with it.
// This copy is used in demo mode and is unit-tested.

export const POPULARITY_WEIGHTS = { view: 1, save: 5, copy: 3 } as const

export interface ActivityCounts {
  views?: number
  saves?: number
  copies?: number
}

export function popularityScore({ views = 0, saves = 0, copies = 0 }: ActivityCounts): number {
  return views * POPULARITY_WEIGHTS.view + saves * POPULARITY_WEIGHTS.save + copies * POPULARITY_WEIGHTS.copy
}
