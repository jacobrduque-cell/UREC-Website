-- UREC Platform — real Canvas-style Modules
--
-- Our original "Modules" was just a flat list of wiki_pages. Real
-- Canvas Modules are collapsible containers (usually one per week/unit)
-- that SEQUENCE mixed items — assignments, pages, quizzes, files, and
-- external links — each with its own position. This adds the two
-- container tables Canvas calls context_modules and
-- context_module_items. Existing wiki_pages become one possible item
-- TYPE ('page') referenced by module_items, not the Modules feature
-- itself.

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create index modules_course_id_idx on public.modules(course_id);

create table public.module_items (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  position integer not null default 0,
  -- What this row points at. Exactly one of the *_id columns is set,
  -- matching item_type; 'header' and 'url' carry no reference.
  item_type text not null check (item_type in ('assignment', 'page', 'quiz', 'file', 'url', 'header')),
  title text not null,
  assignment_id uuid references public.assignments(id) on delete cascade,
  page_id uuid references public.wiki_pages(id) on delete cascade,
  quiz_id uuid references public.quizzes(id) on delete cascade,
  file_id uuid references public.files(id) on delete cascade,
  url text,
  created_at timestamptz not null default now()
);
create index module_items_module_id_idx on public.module_items(module_id);

-- RLS: same published-or-exec model as assignments/files/wiki_pages.
alter table public.modules enable row level security;
create policy "modules_select_published_enrolled_or_exec" on public.modules
  for select to authenticated using (
    (published and public.is_enrolled(course_id)) or public.is_exec()
  );
create policy "modules_write_exec" on public.modules
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

alter table public.module_items enable row level security;
create policy "module_items_select_visible_or_exec" on public.module_items
  for select to authenticated using (
    exists (
      select 1 from public.modules m
      where m.id = module_id and (
        (m.published and public.is_enrolled(m.course_id)) or public.is_exec()
      )
    )
  );
create policy "module_items_write_exec" on public.module_items
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

grant select, insert, update, delete on public.modules to authenticated;
grant select, insert, update, delete on public.module_items to authenticated;
