-- ════════════════════════════════════════════════════════════════════════════
-- Frameflow database schema
-- Run order in the Supabase SQL editor:  schema.sql → functions.sql → policies.sql
-- All three files are idempotent (safe to re-run).
-- ════════════════════════════════════════════════════════════════════════════

-- ── Profiles (one row per auth user; created by a trigger in functions.sql) ──
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  name            text,
  avatar_url      text,
  role            text not null default 'user' check (role in ('user', 'admin')),
  plan            text not null default 'free' check (plan in ('free', 'pro')),
  plan_expires_at timestamptz,
  created_at      timestamptz not null default now()
);

-- ── Designs ─────────────────────────────────────────────────────────────────
-- code_snippet, prompt_text and the full teardown_md are PAID content. They are
-- never exposed by the public view below; only /api/design-pro-content returns
-- them after verifying an active Pro plan with the service role.
create table if not exists public.designs (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  title            text not null,
  description      text not null default '',
  image_url        text not null,
  video_url        text,
  source_url       text,
  author_name      text,
  author_url       text,
  flow_type        text not null,
  industry         text not null,
  platform         text not null check (platform in ('web', 'mobile')),
  tags             text[] not null default '{}',
  dominant_colors  text[] not null default '{}',
  teardown_md      text not null default '',
  teardown_preview text generated always as (left(teardown_md, 280)) stored,
  code_snippet     text not null default '',
  prompt_text      text not null default '',
  is_pro_content   boolean not null default true,
  is_featured      boolean not null default false,
  -- Where the design came from. Required by the copyright policy.
  rights_status    text not null default 'original_recreation'
                   check (rights_status in ('owner_submitted', 'permission_granted', 'original_recreation')),
  status           text not null default 'draft' check (status in ('draft', 'published')),
  views            integer not null default 0,
  saves            integer not null default 0,
  search_vector    tsvector,   -- maintained by a trigger (functions.sql)
  created_at       timestamptz not null default now()
);

create index if not exists designs_status_created_idx on public.designs (status, created_at desc);
create index if not exists designs_views_idx          on public.designs (views desc);
create index if not exists designs_flow_idx           on public.designs (flow_type);
create index if not exists designs_industry_idx       on public.designs (industry);
create index if not exists designs_tags_gin           on public.designs using gin (tags);
create index if not exists designs_colors_gin         on public.designs using gin (dominant_colors);
create index if not exists designs_search_gin         on public.designs using gin (search_vector);

-- ── Paywall-safe public view ────────────────────────────────────────────────
-- Runs with the view OWNER's rights (security_invoker = off) so anonymous users
-- can read these columns even though `designs` itself has no public RLS policy.
-- It deliberately omits teardown_md, code_snippet and prompt_text.
-- (The Supabase linter warns about security-definer views; this one is intentional.)
create or replace view public.designs_public
with (security_invoker = off) as
select
  id, slug, title, description, image_url, video_url, source_url,
  author_name, author_url, flow_type, industry, platform, tags, dominant_colors,
  teardown_preview, is_pro_content, is_featured, views, saves, created_at,
  search_vector
from public.designs
where status = 'published';

-- ── Moodboards ──────────────────────────────────────────────────────────────
create table if not exists public.moodboards (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  is_public  boolean not null default false,
  share_slug text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  created_at timestamptz not null default now()
);
create index if not exists moodboards_user_idx on public.moodboards (user_id);

create table if not exists public.moodboard_items (
  id           uuid primary key default gen_random_uuid(),
  moodboard_id uuid not null references public.moodboards(id) on delete cascade,
  design_id    uuid not null references public.designs(id) on delete cascade,
  position     integer not null default 0,
  created_at   timestamptz not null default now(),
  unique (moodboard_id, design_id)
);
create index if not exists moodboard_items_board_idx on public.moodboard_items (moodboard_id, position);

-- ── Community submissions ───────────────────────────────────────────────────
create table if not exists public.submissions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 120),
  link       text not null check (link ~* '^https?://'),
  image_url  text,
  notes      text check (notes is null or char_length(notes) <= 2000),
  -- The submitter must confirm they own the work or have permission (enforced by RLS).
  owns_rights boolean not null default false,
  status     text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
create index if not exists submissions_status_idx on public.submissions (status, created_at desc);

-- ── Copyright / content reports (written by /api/report with the service role) ──
create table if not exists public.reports (
  id             uuid primary key default gen_random_uuid(),
  design_id      uuid not null references public.designs(id) on delete cascade,
  reporter_email text,
  reason         text not null check (reason in ('copyright', 'inaccurate', 'offensive', 'other')),
  details        text not null default '' check (char_length(details) <= 2000),
  status         text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at     timestamptz not null default now()
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);

-- ── Jobs ────────────────────────────────────────────────────────────────────
create table if not exists public.jobs (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  company    text not null,
  location   text not null default 'Remote',
  type       text not null default 'Full-time',
  apply_url  text not null check (apply_url ~* '^https?://'),
  status     text not null default 'draft' check (status in ('open', 'closed', 'draft')),
  created_at timestamptz not null default now()
);
create index if not exists jobs_status_idx on public.jobs (status, created_at desc);

-- ── Subscriptions (written only by the Razorpay webhook / API with the service role) ──
-- user_id is SET NULL on account deletion so financial records survive without personal data.
create table if not exists public.subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users(id) on delete set null,
  provider           text not null default 'razorpay',
  provider_sub_id    text not null unique,
  plan               text check (plan in ('monthly', 'yearly')),
  status             text not null,
  current_period_end timestamptz,
  cancelled_at       timestamptz,
  created_at         timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on public.subscriptions (user_id, created_at desc);

-- ── Newsletter (double opt-in; written only by /api/newsletter) ─────────────
create table if not exists public.newsletter (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  confirmed    boolean not null default false,
  token        text not null default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  created_at   timestamptz not null default now(),
  confirmed_at timestamptz
);
create unique index if not exists newsletter_email_idx on public.newsletter (lower(email));
create unique index if not exists newsletter_token_idx on public.newsletter (token);

-- ── Events (powers "Popular this week") ─────────────────────────────────────
create table if not exists public.events (
  id         bigint generated always as identity primary key,
  design_id  uuid references public.designs(id) on delete cascade,
  type       text not null check (type in ('view', 'save', 'copy_prompt', 'copy_code', 'upgrade_click')),
  user_id    uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists events_design_time_idx on public.events (design_id, created_at desc);
create index if not exists events_time_idx        on public.events (created_at desc);

-- ── Server-only bookkeeping tables ──────────────────────────────────────────
-- Free "Find References" usage. `actor` is "u:<user id>" or "ip:<salted hash>"; never a raw IP.
create table if not exists public.find_usage (
  actor text not null,
  day   date not null,
  count integer not null default 0,
  primary key (actor, day)
);

-- Fixed-window rate limiter used by the /api routes.
create table if not exists public.rate_limits (
  key          text not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (key, window_start)
);

-- Razorpay webhook idempotency (event id → processed once).
create table if not exists public.webhook_events (
  id          text primary key,
  event       text not null,
  received_at timestamptz not null default now()
);

-- ── Additive columns (safe to re-run; added after the first release) ─────────
-- Set once the welcome email has been sent, so it is never sent twice.
alter table public.profiles add column if not exists welcomed_at timestamptz;
-- Optional GSTIN a customer entered at checkout; printed on their receipt email.
alter table public.subscriptions add column if not exists gstin text;
-- When a submission was reviewed (set by /api/submission-review).
alter table public.submissions add column if not exists reviewed_at timestamptz;
