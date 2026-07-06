-- Rename the internal plan codes to match the display names, so the stored
-- value is self-explanatory: tea -> standard, sugar -> advanced. (free/friend
-- are unchanged.) Keep this in lockstep with lib/limits.ts (PlanTier) and the
-- Stripe checkout/webhook, which now send/read 'standard' | 'advanced'.

-- 1. Drop the old constraint so existing rows can be migrated.
alter table public.profiles drop constraint if exists profiles_plan_check;

-- 2. Migrate existing rows to the new codes.
update public.profiles set plan = 'standard' where plan = 'tea';
update public.profiles set plan = 'advanced' where plan = 'sugar';

-- 3. Re-add the constraint with the new allowed values.
alter table public.profiles
  add constraint profiles_plan_check check (plan in ('friend', 'standard', 'advanced'));
