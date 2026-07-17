-- ============================================================
-- Pending enrollments — pre-load a roster before members log in
-- ============================================================
--
-- Chicken-and-egg problem: a public.users row only exists after a
-- person's first Google sign-in (created by handle_new_auth_user). But
-- exec wants to build a 115-person course roster BEFORE inviting anyone
-- to log in. Enrollments can't reference a user that doesn't exist yet.
--
-- Fix: park invitations keyed by email in pending_enrollments. When that
-- person signs in for the first time, the signup trigger converts every
-- pending row for their email into a real enrollment and clears them.
-- Already-signed-in members are enrolled immediately by the server
-- action instead (no pending row needed).

create table public.pending_enrollments (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  course_id uuid not null references public.courses(id) on delete cascade,
  section_id uuid references public.course_sections(id) on delete set null,
  role_id uuid not null references public.roles(id) on delete restrict,
  created_at timestamptz not null default now(),
  -- One pending invite per email per course; re-inviting updates the row.
  unique (email, course_id)
);
create index pending_enrollments_email_idx on public.pending_enrollments(lower(email));
create index pending_enrollments_course_id_idx on public.pending_enrollments(course_id);

-- Exec-only, same as enrollments. The signup trigger reads/writes this
-- table under security definer, so it isn't bound by these policies.
alter table public.pending_enrollments enable row level security;
create policy "pending_enrollments_select_exec" on public.pending_enrollments
  for select to authenticated using (public.is_exec());
create policy "pending_enrollments_write_exec" on public.pending_enrollments
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

grant select, insert, update, delete on public.pending_enrollments to authenticated;

-- ============================================================
-- Extend the signup trigger to redeem pending enrollments
-- ============================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  -- Redeem any parked invitations for this email address. Match is
  -- case-insensitive so an invite to Jane.Doe@berkeley.edu still lands
  -- for a login of jane.doe@berkeley.edu.
  insert into public.enrollments (user_id, course_id, section_id, role_id)
  select new.id, pe.course_id, pe.section_id, pe.role_id
  from public.pending_enrollments pe
  where lower(pe.email) = lower(new.email)
  on conflict (user_id, course_id) do nothing;

  delete from public.pending_enrollments
  where lower(email) = lower(new.email);

  return new;
end;
$$;
