-- ============================================================
-- Richer member profiles
-- ============================================================
--
-- The Directory has been a bare email list. For a 115-member club it
-- should be a real directory — major, grad year, pronouns, a short bio,
-- LinkedIn. All optional; members edit their own row (users_update_self
-- already permits that), and everyone can read it (the roster is already
-- visible to every member).

alter table public.users add column if not exists major text;
alter table public.users add column if not exists grad_year integer;
alter table public.users add column if not exists pronouns text;
alter table public.users add column if not exists bio text;
alter table public.users add column if not exists linkedin_url text;
