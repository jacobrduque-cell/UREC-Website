-- UREC Platform — course publish/draft lifecycle
--
-- Every other content table (assignments, files, wiki_pages) already
-- gates student visibility on a `published` flag; the course itself
-- never got one, which was inconsistent with our own schema, not just
-- with Canvas (which starts every course in a "created"/"claimed"
-- workflow_state hidden from students until a teacher publishes it).

alter table public.courses add column if not exists published boolean not null default false;

-- The course already live in production has real enrolled members
-- actively using it — treat it as already-published so this migration
-- doesn't lock anyone out.
update public.courses set published = true;

drop policy if exists "courses_select_enrolled_or_exec" on public.courses;
create policy "courses_select_published_enrolled_or_exec" on public.courses
  for select to authenticated using (
    (published and public.is_enrolled(id)) or public.is_exec()
  );
