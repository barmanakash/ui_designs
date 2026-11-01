export type Plan = 'free' | 'pro'
export type Role = 'user' | 'admin'
export type Platform = 'web' | 'mobile'
export type BillingPeriod = 'monthly' | 'yearly'

export interface Profile {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  role: Role
  plan: Plan
  plan_expires_at: string | null
}

/** Public, paywall-safe design fields (what the `designs_public` view returns). */
export interface Design {
  id: string
  slug: string
  title: string
  description: string
  image_url: string
  video_url: string | null
  source_url: string | null
  author_name: string | null
  author_url: string | null
  flow_type: string
  industry: string
  platform: Platform
  tags: string[]
  dominant_colors: string[]
  /** First ~280 chars of the teardown. The full text is Pro-only. */
  teardown_preview: string
  /** When false, code/prompt/teardown are free for everyone. */
  is_pro_content: boolean
  is_featured: boolean
  views: number
  saves: number
  created_at: string
}

/** Gated fields, only ever returned by /api/design-pro-content. */
export interface ProContent {
  teardown_md: string
  code_snippet: string
  prompt_text: string
}

/** Full row, only readable by admins (RLS). */
export interface AdminDesign extends ProContent {
  id: string
  slug: string
  title: string
  description: string
  image_url: string
  video_url: string | null
  source_url: string | null
  author_name: string | null
  author_url: string | null
  flow_type: string
  industry: string
  platform: Platform
  tags: string[]
  dominant_colors: string[]
  is_pro_content: boolean
  is_featured: boolean
  rights_status?: RightsStatus
  status: 'draft' | 'published'
  views: number
  saves: number
  created_at: string
}

export interface Moodboard {
  id: string
  user_id: string
  name: string
  is_public: boolean
  share_slug: string
  created_at: string
  item_count?: number
}

export interface Job {
  id: string
  title: string
  company: string
  location: string
  type: string
  apply_url: string
  status: 'open' | 'closed' | 'draft'
  created_at: string
}

export interface Submission {
  id: string
  user_id: string
  title: string
  link: string
  image_url: string | null
  notes: string | null
  /** Submitter confirmed they own the work or have permission (enforced by RLS). */
  owns_rights?: boolean
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export type RightsStatus = 'owner_submitted' | 'permission_granted' | 'original_recreation'

export interface Report {
  id: string
  design_id: string
  reporter_email: string | null
  reason: 'copyright' | 'inaccurate' | 'offensive' | 'other'
  details: string
  status: 'open' | 'resolved' | 'dismissed'
  created_at: string
  designs?: { title: string; slug: string } | null
}

export interface FindResult {
  design: Design
  reason: string
}
