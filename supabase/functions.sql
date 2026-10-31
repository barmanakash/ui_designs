-- ════════════════════════════════════════════════════════════════════════════
-- Frameflow functions & triggers. Run AFTER schema.sql, BEFORE policies.sql.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Role / plan helpers (used by RLS policies) ──────────────────────────────
-- SECURITY DEFINER so policies can read `profiles` without recursion.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_pro()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and plan = 'pro'
      and (plan_expires_at is null or plan_expires_at > now())
  );
$$;

-- ── Create a profile whenever someone signs up ──────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users who signed up before the trigger existed.
insert into public.profiles (id, email, name, avatar_url)
select u.id, coalesce(u.email, ''),
       coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
       u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do nothing;

-- ── Full-text search vector ─────────────────────────────────────────────────
-- Weighted: title (A) > tags/flow/industry (B) > description (C) > teardown preview (D).
create or replace function public.designs_set_search_vector()
returns trigger language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', array_to_string(new.tags, ' ') || ' ' || coalesce(new.flow_type, '') || ' ' || coalesce(new.industry, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'C') ||
    setweight(to_tsvector('english', left(coalesce(new.teardown_md, ''), 280)), 'D');
  return new;
end;
$$;

drop trigger if exists designs_search_vector_trg on public.designs;
create trigger designs_search_vector_trg
  before insert or update of title, description, tags, flow_type, industry, teardown_md
  on public.designs
  for each row execute function public.designs_set_search_vector();

-- Backfill existing rows (no-op on a fresh database).
update public.designs set title = title where search_vector is null;

-- ── Counters + events (called from the browser; validated here) ─────────────
create or replace function public.bump_design_stat(p_design uuid, p_stat text, p_delta integer default 1)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_stat not in ('views', 'saves') then raise exception 'invalid stat'; end if;
  if p_delta not in (-1, 1) then raise exception 'invalid delta'; end if;
  if not exists (select 1 from public.designs where id = p_design and status = 'published') then return; end if;

  if p_stat = 'views' then
    if p_delta <> 1 then return; end if;   -- views only ever go up
    update public.designs set views = views + 1 where id = p_design;
    insert into public.events (design_id, type, user_id) values (p_design, 'view', auth.uid());
  else
    update public.designs set saves = greatest(saves + p_delta, 0) where id = p_design;
    if p_delta = 1 then
      insert into public.events (design_id, type, user_id) values (p_design, 'save', auth.uid());
    end if;
  end if;
end;
$$;

create or replace function public.track_event(p_design uuid, p_type text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_type not in ('copy_prompt', 'copy_code', 'upgrade_click') then raise exception 'invalid event'; end if;
  if p_design is not null and not exists (select 1 from public.designs where id = p_design and status = 'published') then
    return;
  end if;
  insert into public.events (design_id, type, user_id) values (p_design, p_type, auth.uid());
end;
$$;

-- ── Popular this week ───────────────────────────────────────────────────────
-- score = views×1 + saves×5 + copy actions×3, over the last 7 days.
-- (Mirrored by src/lib/popularity.ts, which is unit-tested; keep the weights in sync.)
create or replace function public.popular_designs(p_limit integer default 6)
returns setof public.designs_public
language sql stable security definer set search_path = public as $$
  select d.*
  from public.designs_public d
  left join (
    select design_id,
           sum(case type
                 when 'view' then 1
                 when 'save' then 5
                 when 'copy_prompt' then 3
                 when 'copy_code' then 3
                 else 0
               end) as score
    from public.events
    where created_at > now() - interval '7 days' and design_id is not null
    group by design_id
  ) s on s.design_id = d.id
  order by coalesce(s.score, 0) desc, d.views desc, d.created_at desc
  limit least(greatest(p_limit, 1), 24);
$$;

-- ── Free "Find References" quota (server-only) ──────────────────────────────
-- Atomically takes one search. Returns the new count, or -1 when the daily limit is reached.
-- The day rolls over at midnight India time.
create or replace function public.find_usage_take(p_actor text, p_limit integer)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_day   date := (now() at time zone 'Asia/Kolkata')::date;
  v_count integer;
begin
  insert into public.find_usage as f (actor, day, count)
  values (p_actor, v_day, 1)
  on conflict (actor, day) do update set count = f.count + 1
    where f.count < p_limit
  returning f.count into v_count;

  return coalesce(v_count, -1);
end;
$$;

-- Gives a search back (used when the AI call fails, so users aren't charged for errors).
create or replace function public.find_usage_refund(p_actor text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.find_usage
     set count = greatest(count - 1, 0)
   where actor = p_actor and day = (now() at time zone 'Asia/Kolkata')::date;
end;
$$;

-- ── Fixed-window rate limiter (server-only) ─────────────────────────────────
-- Returns true while the caller is within p_max hits per p_window seconds.
create or replace function public.rate_limit_hit(p_key text, p_window integer, p_max integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window) * p_window);
  v_count  integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning r.count into v_count;

  -- Opportunistic cleanup (about 1% of calls) keeps the table small.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_count <= p_max;
end;
$$;

-- ── Function permissions ────────────────────────────────────────────────────
-- Supabase grants EXECUTE to everyone by default, so lock down explicitly.
revoke all on function public.find_usage_take(text, integer)      from public, anon, authenticated;
revoke all on function public.find_usage_refund(text)              from public, anon, authenticated;
revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.find_usage_take(text, integer)      to service_role;
grant execute on function public.find_usage_refund(text)              to service_role;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;

revoke all on function public.bump_design_stat(uuid, text, integer) from public;
revoke all on function public.track_event(uuid, text)               from public;
revoke all on function public.popular_designs(integer)              from public;
grant execute on function public.bump_design_stat(uuid, text, integer) to anon, authenticated;
grant execute on function public.track_event(uuid, text)               to anon, authenticated;
grant execute on function public.popular_designs(integer)              to anon, authenticated;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_pro()   to anon, authenticated;
