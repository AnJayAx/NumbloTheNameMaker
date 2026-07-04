-- Backfill profile rows for any auth users created before the handle_new_user()
-- trigger existed (early OAuth sign-ins, admin-API users). Without a profile
-- row, billing writes (checkout + webhook) silently no-op and the user's plan
-- can never change, and their username never loads. The app also self-heals a
-- missing row on the next authenticated request (see lib/supabase/admin.ts:
-- ensureProfile), but this fixes existing rows in one pass.

insert into public.profiles (id, username)
select
  u.id,
  'user' || left(replace(u.id::text, '-', ''), 12)
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
