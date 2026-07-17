-- UREC Platform — Phase 1 seed data
--
-- Populates exactly what the decision log's Phase 1 checklist calls
-- for: "Terms + Courses tables populated with Fall 2026 and UREC
-- Analyst Program." Also seeds the four roles from D3 (Analyst, VP,
-- Co-President, Admin) — nothing can be assigned a role before the
-- roles themselves exist. Written to be safe to run more than once.

insert into public.roles (name, scope, description)
values
  ('Admin', 'account', 'Full platform administration.'),
  ('Co-President', 'account', 'Club leadership, exec-wide permissions.'),
  ('VP', 'account', 'Vice President, exec-wide permissions.'),
  ('Analyst', 'course', 'Member enrolled in the Analyst Program.')
on conflict (name) do nothing;

insert into public.terms (name, starts_on, ends_on, is_current)
select 'Fall 2026', date '2026-08-24', date '2026-12-12', true
where not exists (select 1 from public.terms where name = 'Fall 2026');

insert into public.courses (term_id, name, code)
select t.id, 'UREC Analyst Program', 'UREC-ANALYST'
from public.terms t
where t.name = 'Fall 2026'
  and not exists (
    select 1 from public.courses c
    where c.name = 'UREC Analyst Program' and c.term_id = t.id
  );
