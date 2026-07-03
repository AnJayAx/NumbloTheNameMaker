-- Profiles: one row per auth user holding a unique, human-chosen username.
-- citext gives us case-insensitive uniqueness ("Ada" == "ada").
create extension if not exists citext;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username citext not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]{3,30}$')
);

alter table public.profiles enable row level security;

-- Reuse the shared updated_at trigger function created in 0001.
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- Row level security: a user can only see and edit their own profile row.
drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- On sign-up, seed a profile from the username supplied in user metadata,
-- falling back to a generated handle and appending a suffix if it collides so
-- that account creation can never fail on a username race.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base citext;
  candidate citext;
  suffix int := 0;
begin
  base := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  if base is null or base !~ '^[A-Za-z0-9_]{3,30}$' then
    base := 'user' || left(replace(new.id::text, '-', ''), 8);
  end if;

  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := left(base::text, 26) || suffix::text;
  end loop;

  insert into public.profiles (id, username)
  values (new.id, candidate)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- Availability check callable before sign-up (anon) or while editing (auth).
-- Excludes the caller's own current row so re-saving your username reads as free.
create or replace function public.username_available(candidate text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select case
    when candidate !~ '^[A-Za-z0-9_]{3,30}$' then false
    else not exists (
      select 1
      from public.profiles
      where username = candidate::citext
        and id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    )
  end;
$$;

grant execute on function public.username_available(text) to anon, authenticated;
