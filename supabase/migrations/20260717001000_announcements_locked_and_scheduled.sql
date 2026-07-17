-- UREC Platform — announcement reply-locking + scheduled posting
--
-- Two related Canvas-parity gaps fixed together since both touch the
-- same table/RLS: (1) there was no way to disable replies on an
-- announcement (Canvas's `locked` column), and (2) saving an
-- announcement always published + notified immediately — there was no
-- draft/scheduled state (Canvas's `delayed_post_at`). published_at was
-- already nullable in the original schema but nothing enforced it as
-- a real gate, and nothing let it be set in the future.

alter table public.announcements add column if not exists locked boolean not null default false;

drop policy if exists "announcements_select_enrolled_or_exec" on public.announcements;
create policy "announcements_select_visible_enrolled_or_exec" on public.announcements
  for select to authenticated using (
    public.is_exec()
    or (
      public.is_enrolled(course_id)
      and published_at is not null
      and published_at <= now()
    )
  );

-- Replies: blocked once locked, for everyone except exec (matching
-- Canvas: instructors can always still post/moderate a locked topic).
drop policy if exists "announcement_replies_insert_enrolled" on public.announcement_replies;
create policy "announcement_replies_insert_enrolled_unlocked" on public.announcement_replies
  for insert to authenticated with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.announcements a
      where a.id = announcement_id
        and (public.is_enrolled(a.course_id) or public.is_exec())
        and (not a.locked or public.is_exec())
    )
  );
