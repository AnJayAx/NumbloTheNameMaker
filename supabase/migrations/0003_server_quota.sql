-- Server-side daily quota enforcement.
--
-- Free generations are capped per day per "subject". A subject is either a
-- signed-in user ("user:<uuid>") or an anonymous guest tracked by an httpOnly
-- cookie ("guest:<uuid>"). Only the service role (server) ever touches this
-- table, so RLS is enabled with no policies (all client access denied).

create table if not exists public.usage_daily (
  subject text not null,
  day date not null default (now() at time zone 'utc')::date,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (subject, day),
  constraint usage_daily_count_nonneg check (count >= 0)
);

alter table public.usage_daily enable row level security;

-- Source of truth for a user's plan. Nothing writes 'paid' yet (no billing);
-- a real subscription flow would set this. free -> 30/day, paid -> 100/day.
alter table public.profiles
  add column if not exists plan text not null default 'free'
  check (plan in ('free', 'paid'));

-- Atomically grant up to p_units generations without exceeding p_limit for the
-- current UTC day. Returns how many were granted plus the resulting usage.
create or replace function public.consume_quota(
  p_subject text,
  p_limit integer,
  p_units integer
)
returns table(granted integer, used integer, quota_limit integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'utc')::date;
  v_count integer;
  v_grant integer;
begin
  insert into public.usage_daily(subject, day, count)
  values (p_subject, v_day, 0)
  on conflict (subject, day) do nothing;

  select count into v_count
  from public.usage_daily
  where subject = p_subject and day = v_day
  for update;

  v_grant := greatest(0, least(coalesce(p_units, 0), p_limit - v_count));

  if v_grant > 0 then
    update public.usage_daily
    set count = count + v_grant, updated_at = now()
    where subject = p_subject and day = v_day
    returning count into v_count;
  end if;

  return query select v_grant, v_count, p_limit;
end;
$$;

-- Refund units back to a subject's current-day counter (used when generation
-- fails or produces fewer names than were reserved).
create or replace function public.release_quota(
  p_subject text,
  p_units integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'utc')::date;
begin
  update public.usage_daily
  set count = greatest(0, count - greatest(0, coalesce(p_units, 0))),
      updated_at = now()
  where subject = p_subject and day = v_day;
end;
$$;

-- Lock both functions to the service role only. The app calls them from the
-- server with the service-role key; untrusted callers must never pass their own
-- subject/limit.
revoke all on function public.consume_quota(text, integer, integer) from public, anon, authenticated;
revoke all on function public.release_quota(text, integer) from public, anon, authenticated;
grant execute on function public.consume_quota(text, integer, integer) to service_role;
grant execute on function public.release_quota(text, integer) to service_role;
