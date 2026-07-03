-- Rename the plan tiers: free -> friend, paid -> sugar, and add the new tea tier.
-- profiles.plan is the server source of truth for a logged-in user's tier.

alter table public.profiles drop constraint if exists profiles_plan_check;

update public.profiles set plan = 'friend' where plan = 'free';
update public.profiles set plan = 'sugar' where plan = 'paid';

alter table public.profiles alter column plan set default 'friend';

alter table public.profiles
  add constraint profiles_plan_check check (plan in ('friend', 'tea', 'sugar'));
