create table if not exists public.user_name_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  history jsonb not null default '[]'::jsonb,
  saved jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_name_data_history_is_array check (jsonb_typeof(history) = 'array'),
  constraint user_name_data_saved_is_array check (jsonb_typeof(saved) = 'array')
);

alter table public.user_name_data enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_name_data_updated_at on public.user_name_data;
create trigger set_user_name_data_updated_at
before update on public.user_name_data
for each row
execute function public.set_updated_at();

drop policy if exists "Users can read their own name data" on public.user_name_data;
create policy "Users can read their own name data"
on public.user_name_data
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own name data" on public.user_name_data;
create policy "Users can insert their own name data"
on public.user_name_data
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own name data" on public.user_name_data;
create policy "Users can update their own name data"
on public.user_name_data
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
