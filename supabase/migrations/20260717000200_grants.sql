-- UREC Platform — API role grants
--
-- "Automatically expose new tables" was deliberately turned off during
-- Phase 0 Supabase setup, so nothing here is auto-granted to the API
-- roles the way it would be with that setting on. RLS policies alone
-- do nothing without this: GRANT is the outer gate (can this role
-- touch the table at all), RLS is the inner gate (which rows). Both
-- layers are required.
--
-- `anon` gets nothing — every route in this app requires a signed-in
-- @berkeley.edu session (see proxy.ts), so there is no unauthenticated
-- read path to support.

grant usage on schema public to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Ensure tables/sequences added by *future* migrations inherit the
-- same grants automatically, so this doesn't need repeating.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;

grant execute on function public.is_exec() to authenticated;
grant execute on function public.is_enrolled(uuid) to authenticated;
