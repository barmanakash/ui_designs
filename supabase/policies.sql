-- ════════════════════════════════════════════════════════════════════════════
-- Frameflow Row Level Security + storage. Run LAST (after schema.sql, functions.sql).
--
-- Principles
--   • Paid content (code, prompt, full teardown) lives only in `designs`, which
--     anonymous and normal users CANNOT read. They read `designs_public` instead.
--   • Anything money- or abuse-related (subscriptions, find_usage, rate_limits,
--     webhook_events, newsletter, reports) is written ONLY by the service role
--     (our /api routes). No client policy exists for those writes.
--   • The service role bypasses RLS, so it never needs policies.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles        enable row level security;
alter table public.designs         enable row level security;
alter table public.moodboards      enable row level security;
alter table public.moodboard_items enable row level security;
alter table public.submissions     enable row level security;
alter table public.reports         enable row level security;
alter table public.jobs            enable row level security;
alter table public.subscriptions   enable row level security;
alter table public.newsletter      enable row level security;
alter table public.events          enable row level security;
alter table public.find_usage      enable row level security;
alter table public.rate_limits     enable row level security;
alter table public.webhook_events  enable row level security;

-- ── Table privileges (defence in depth on top of RLS) ───────────────────────
revoke all on public.profiles, public.designs, public.moodboards, public.moodboard_items,
              public.submissions, public.reports, public.jobs, public.subscriptions,
              public.newsletter, public.events, public.find_usage, public.rate_limits,
              public.webhook_events
  from anon, authenticated;

-- The view is the ONLY thing the public can read about designs.
revoke all on public.designs_public from anon, authenticated;
grant select on public.designs_public to anon, authenticated;

grant select on public.profiles to authenticated;
-- Users may edit ONLY their display fields. role/plan/plan_expires_at can never be
-- changed from the browser; only the service role (webhook) or an admin via SQL can.
grant update (name, avatar_url) on public.profiles to authenticated;

grant select, insert, update, delete on public.designs to authenticated;          -- admin-only via policy
grant select on public.moodboards, public.moodboard_items to anon;               -- public boards only (policy)
grant select, insert, update, delete on public.moodboards, public.moodboard_items to authenticated;
grant select, insert on public.submissions to authenticated;
grant update, delete on public.submissions to authenticated;                      -- admin-only via policy
grant select on public.jobs to anon, authenticated;
grant insert, update, delete on public.jobs to authenticated;                     -- admin-only via policy
grant select, update on public.reports to authenticated;                          -- admin-only via policy
grant select on public.subscriptions to authenticated;                            -- own rows only via policy
grant select on public.events to authenticated;                                   -- admin-only via policy

-- ── profiles ────────────────────────────────────────────────────────────────
drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: update own display fields" on public.profiles;
create policy "profiles: update own display fields" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ── designs (admin only; everyone else uses designs_public) ─────────────────
drop policy if exists "designs: admin all" on public.designs;
create policy "designs: admin all" on public.designs
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── moodboards ──────────────────────────────────────────────────────────────
drop policy if exists "moodboards: read own or public" on public.moodboards;
create policy "moodboards: read own or public" on public.moodboards
  for select to anon, authenticated
  using (is_public or user_id = auth.uid());

-- Free users: max 2 boards. A violating insert fails with Postgres error 42501,
-- which src/lib/moodboards.ts turns into the "Upgrade for unlimited" message.
drop policy if exists "moodboards: insert own within plan limit" on public.moodboards;
create policy "moodboards: insert own within plan limit" on public.moodboards
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      public.is_pro()
      or (select count(*) from public.moodboards m where m.user_id = auth.uid()) < 2
    )
  );

drop policy if exists "moodboards: update own" on public.moodboards;
create policy "moodboards: update own" on public.moodboards
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "moodboards: delete own" on public.moodboards;
create policy "moodboards: delete own" on public.moodboards
  for delete to authenticated
  using (user_id = auth.uid());

-- ── moodboard_items ─────────────────────────────────────────────────────────
drop policy if exists "board items: read if board readable" on public.moodboard_items;
create policy "board items: read if board readable" on public.moodboard_items
  for select to anon, authenticated
  using (exists (
    select 1 from public.moodboards b
    where b.id = moodboard_id and (b.is_public or b.user_id = auth.uid())
  ));

drop policy if exists "board items: write if board owned" on public.moodboard_items;
create policy "board items: write if board owned" on public.moodboard_items
  for all to authenticated
  using (exists (select 1 from public.moodboards b where b.id = moodboard_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.moodboards b where b.id = moodboard_id and b.user_id = auth.uid()));

-- ── submissions ─────────────────────────────────────────────────────────────
-- owns_rights = true is enforced here, not just in the form.
drop policy if exists "submissions: insert own with rights confirmed" on public.submissions;
create policy "submissions: insert own with rights confirmed" on public.submissions
  for insert to authenticated
  with check (user_id = auth.uid() and owns_rights = true and status = 'pending');

drop policy if exists "submissions: read own or admin" on public.submissions;
create policy "submissions: read own or admin" on public.submissions
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "submissions: admin update" on public.submissions;
create policy "submissions: admin update" on public.submissions
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "submissions: admin delete" on public.submissions;
create policy "submissions: admin delete" on public.submissions
  for delete to authenticated
  using (public.is_admin());

-- ── jobs ────────────────────────────────────────────────────────────────────
drop policy if exists "jobs: public read open" on public.jobs;
create policy "jobs: public read open" on public.jobs
  for select to anon, authenticated
  using (status = 'open' or public.is_admin());

drop policy if exists "jobs: admin write" on public.jobs;
create policy "jobs: admin write" on public.jobs
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ── reports (inserted by /api/report with the service role) ─────────────────
drop policy if exists "reports: admin read" on public.reports;
create policy "reports: admin read" on public.reports
  for select to authenticated using (public.is_admin());

drop policy if exists "reports: admin update" on public.reports;
create policy "reports: admin update" on public.reports
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ── subscriptions (written by the webhook; users can only read their own) ───
drop policy if exists "subscriptions: read own" on public.subscriptions;
create policy "subscriptions: read own" on public.subscriptions
  for select to authenticated using (user_id = auth.uid());

-- ── events ──────────────────────────────────────────────────────────────────
drop policy if exists "events: admin read" on public.events;
create policy "events: admin read" on public.events
  for select to authenticated using (public.is_admin());

-- newsletter, find_usage, rate_limits, webhook_events: RLS on, NO policies =
-- invisible to every client. Only the service role (our /api routes) touches them.

-- ════════════════════════════════════════════════════════════════════════════
-- Storage buckets
--   submissions : users upload screenshots into their own folder (<user id>/…)
--   designs     : admins upload published design images
-- Both are public-read (images are shown on the site) with a 5 MB / image-only limit
-- enforced by Supabase itself, regardless of what the browser claims.
-- ════════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('submissions', 'submissions', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('designs',     'designs',     true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "submissions: upload to own folder" on storage.objects;
create policy "submissions: upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "submissions: delete own files" on storage.objects;
create policy "submissions: delete own files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'submissions' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

drop policy if exists "designs bucket: admin write" on storage.objects;
create policy "designs bucket: admin write" on storage.objects
  for all to authenticated
  using (bucket_id = 'designs' and public.is_admin())
  with check (bucket_id = 'designs' and public.is_admin());

-- ════════════════════════════════════════════════════════════════════════════
-- Make yourself an admin (replace the email, run once after your first login):
--   update public.profiles set role = 'admin' where email = 'you@example.com';
-- ════════════════════════════════════════════════════════════════════════════
