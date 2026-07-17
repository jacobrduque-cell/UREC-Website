-- UREC Platform — Row Level Security
--
-- The Supabase project has "Automatically expose new tables" off and
-- "Enable automatic RLS" on (Phase 0 decision). This migration is the
-- explicit version of that safety net: every table gets RLS enabled
-- and a real policy set, not left to the project-level default alone.
--
-- Two helper functions carry the role logic so table policies stay
-- short. Both are `security definer` so their internal lookups run
-- with elevated privilege regardless of the calling user's own RLS
-- visibility — the standard Supabase pattern for helper functions used
-- inside policies (see is_exec/is_enrolled below).

create function public.is_exec()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.account_roles ar
    join public.roles r on r.id = ar.role_id
    where ar.user_id = auth.uid()
      and r.name in ('Admin', 'Co-President', 'VP')
  );
$$;

create function public.is_enrolled(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.enrollments e
    where e.user_id = auth.uid()
      and e.course_id = target_course_id
  );
$$;

-- ============================================================
-- terms, courses, course_sections, roles — reference data.
-- Any authenticated member can read; only exec can write.
-- ============================================================

alter table public.terms enable row level security;
create policy "terms_select_authenticated" on public.terms
  for select to authenticated using (true);
create policy "terms_write_exec" on public.terms
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

alter table public.courses enable row level security;
create policy "courses_select_enrolled_or_exec" on public.courses
  for select to authenticated using (public.is_enrolled(id) or public.is_exec());
create policy "courses_write_exec" on public.courses
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

alter table public.course_sections enable row level security;
create policy "course_sections_select_enrolled_or_exec" on public.course_sections
  for select to authenticated using (public.is_enrolled(course_id) or public.is_exec());
create policy "course_sections_write_exec" on public.course_sections
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

alter table public.roles enable row level security;
create policy "roles_select_authenticated" on public.roles
  for select to authenticated using (true);
create policy "roles_write_exec" on public.roles
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

-- ============================================================
-- users, account_roles, enrollments
-- ============================================================

alter table public.users enable row level security;
-- Directory/People page needs every member visible to every other
-- member — this is a small trusted club roster, not a public app.
create policy "users_select_authenticated" on public.users
  for select to authenticated using (true);
create policy "users_update_self" on public.users
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- No client-side insert policy: rows are created by the
-- handle_new_auth_user trigger, which runs security definer and so
-- bypasses RLS entirely.

alter table public.account_roles enable row level security;
create policy "account_roles_select_self_or_exec" on public.account_roles
  for select to authenticated using (user_id = auth.uid() or public.is_exec());
create policy "account_roles_write_exec" on public.account_roles
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

alter table public.enrollments enable row level security;
create policy "enrollments_select_self_or_exec" on public.enrollments
  for select to authenticated using (user_id = auth.uid() or public.is_exec());
create policy "enrollments_write_exec" on public.enrollments
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

-- ============================================================
-- groups, group_memberships
-- ============================================================

alter table public.groups enable row level security;
create policy "groups_select_enrolled_or_exec" on public.groups
  for select to authenticated using (public.is_enrolled(course_id) or public.is_exec());
create policy "groups_write_exec" on public.groups
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

alter table public.group_memberships enable row level security;
create policy "group_memberships_select_enrolled_or_exec" on public.group_memberships
  for select to authenticated using (
    exists (select 1 from public.groups g where g.id = group_id and public.is_enrolled(g.course_id))
    or public.is_exec()
  );
create policy "group_memberships_write_exec" on public.group_memberships
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

-- ============================================================
-- announcements + replies (build day one — only exec posts,
-- any enrolled member can reply)
-- ============================================================

alter table public.announcements enable row level security;
create policy "announcements_select_enrolled_or_exec" on public.announcements
  for select to authenticated using (public.is_enrolled(course_id) or public.is_exec());
create policy "announcements_write_exec" on public.announcements
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

alter table public.announcement_replies enable row level security;
create policy "announcement_replies_select_enrolled_or_exec" on public.announcement_replies
  for select to authenticated using (
    exists (
      select 1 from public.announcements a
      where a.id = announcement_id and (public.is_enrolled(a.course_id) or public.is_exec())
    )
  );
create policy "announcement_replies_insert_enrolled" on public.announcement_replies
  for insert to authenticated with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.announcements a
      where a.id = announcement_id and (public.is_enrolled(a.course_id) or public.is_exec())
    )
  );
create policy "announcement_replies_modify_own_or_exec" on public.announcement_replies
  for update to authenticated using (author_id = auth.uid() or public.is_exec())
  with check (author_id = auth.uid() or public.is_exec());
create policy "announcement_replies_delete_own_or_exec" on public.announcement_replies
  for delete to authenticated using (author_id = auth.uid() or public.is_exec());

-- ============================================================
-- discussion_topics + replies (scaffolded — any enrolled member
-- can start a topic and reply, matching real Canvas discussions)
-- ============================================================

alter table public.discussion_topics enable row level security;
create policy "discussion_topics_select_enrolled_or_exec" on public.discussion_topics
  for select to authenticated using (public.is_enrolled(course_id) or public.is_exec());
create policy "discussion_topics_insert_enrolled" on public.discussion_topics
  for insert to authenticated with check (
    author_id = auth.uid() and (public.is_enrolled(course_id) or public.is_exec())
  );
create policy "discussion_topics_modify_own_or_exec" on public.discussion_topics
  for update to authenticated using (author_id = auth.uid() or public.is_exec())
  with check (author_id = auth.uid() or public.is_exec());
create policy "discussion_topics_delete_own_or_exec" on public.discussion_topics
  for delete to authenticated using (author_id = auth.uid() or public.is_exec());

alter table public.discussion_replies enable row level security;
create policy "discussion_replies_select_enrolled_or_exec" on public.discussion_replies
  for select to authenticated using (
    exists (
      select 1 from public.discussion_topics t
      where t.id = discussion_topic_id and (public.is_enrolled(t.course_id) or public.is_exec())
    )
  );
create policy "discussion_replies_insert_enrolled" on public.discussion_replies
  for insert to authenticated with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.discussion_topics t
      where t.id = discussion_topic_id and (public.is_enrolled(t.course_id) or public.is_exec())
    )
  );
create policy "discussion_replies_modify_own_or_exec" on public.discussion_replies
  for update to authenticated using (author_id = auth.uid() or public.is_exec())
  with check (author_id = auth.uid() or public.is_exec());
create policy "discussion_replies_delete_own_or_exec" on public.discussion_replies
  for delete to authenticated using (author_id = auth.uid() or public.is_exec());

-- ============================================================
-- assignment_groups, assignments, rubrics — exec-authored;
-- non-exec members only ever see published assignments.
-- ============================================================

alter table public.assignment_groups enable row level security;
create policy "assignment_groups_select_enrolled_or_exec" on public.assignment_groups
  for select to authenticated using (public.is_enrolled(course_id) or public.is_exec());
create policy "assignment_groups_write_exec" on public.assignment_groups
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

alter table public.assignments enable row level security;
create policy "assignments_select_published_enrolled_or_exec" on public.assignments
  for select to authenticated using (
    (published and public.is_enrolled(course_id)) or public.is_exec()
  );
create policy "assignments_write_exec" on public.assignments
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

alter table public.rubrics enable row level security;
create policy "rubrics_select_enrolled_or_exec" on public.rubrics
  for select to authenticated using (public.is_enrolled(course_id) or public.is_exec());
create policy "rubrics_write_exec" on public.rubrics
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

alter table public.rubric_criteria enable row level security;
create policy "rubric_criteria_select_enrolled_or_exec" on public.rubric_criteria
  for select to authenticated using (
    exists (
      select 1 from public.rubrics r
      where r.id = rubric_id and (public.is_enrolled(r.course_id) or public.is_exec())
    )
  );
create policy "rubric_criteria_write_exec" on public.rubric_criteria
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

alter table public.assignment_rubrics enable row level security;
create policy "assignment_rubrics_select_enrolled_or_exec" on public.assignment_rubrics
  for select to authenticated using (
    exists (
      select 1 from public.assignments a
      where a.id = assignment_id and (a.published and public.is_enrolled(a.course_id) or public.is_exec())
    )
  );
create policy "assignment_rubrics_write_exec" on public.assignment_rubrics
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

-- ============================================================
-- submissions, submission_files, submission_comments, grades
-- ============================================================

alter table public.submissions enable row level security;
create policy "submissions_select_own_or_exec" on public.submissions
  for select to authenticated using (
    user_id = auth.uid()
    or (group_id is not null and exists (
      select 1 from public.group_memberships gm where gm.group_id = group_id and gm.user_id = auth.uid()
    ))
    or public.is_exec()
  );
create policy "submissions_insert_own" on public.submissions
  for insert to authenticated with check (
    (user_id = auth.uid()
      or (group_id is not null and exists (
        select 1 from public.group_memberships gm where gm.group_id = group_id and gm.user_id = auth.uid()
      )))
    and exists (
      select 1 from public.assignments a where a.id = assignment_id and public.is_enrolled(a.course_id)
    )
  );
create policy "submissions_update_own_or_exec" on public.submissions
  for update to authenticated using (
    user_id = auth.uid()
    or (group_id is not null and exists (
      select 1 from public.group_memberships gm where gm.group_id = group_id and gm.user_id = auth.uid()
    ))
    or public.is_exec()
  )
  with check (
    user_id = auth.uid()
    or (group_id is not null and exists (
      select 1 from public.group_memberships gm where gm.group_id = group_id and gm.user_id = auth.uid()
    ))
    or public.is_exec()
  );

alter table public.submission_files enable row level security;
create policy "submission_files_select_own_or_exec" on public.submission_files
  for select to authenticated using (
    exists (
      select 1 from public.submissions s
      where s.id = submission_id and (
        s.user_id = auth.uid()
        or (s.group_id is not null and exists (
          select 1 from public.group_memberships gm where gm.group_id = s.group_id and gm.user_id = auth.uid()
        ))
        or public.is_exec()
      )
    )
  );
create policy "submission_files_insert_own" on public.submission_files
  for insert to authenticated with check (
    exists (
      select 1 from public.submissions s
      where s.id = submission_id and (
        s.user_id = auth.uid()
        or (s.group_id is not null and exists (
          select 1 from public.group_memberships gm where gm.group_id = s.group_id and gm.user_id = auth.uid()
        ))
      )
    )
  );

alter table public.submission_comments enable row level security;
create policy "submission_comments_select_own_or_exec" on public.submission_comments
  for select to authenticated using (
    exists (
      select 1 from public.submissions s
      where s.id = submission_id and (
        s.user_id = auth.uid()
        or (s.group_id is not null and exists (
          select 1 from public.group_memberships gm where gm.group_id = s.group_id and gm.user_id = auth.uid()
        ))
        or public.is_exec()
      )
    )
  );
create policy "submission_comments_insert_own_or_exec" on public.submission_comments
  for insert to authenticated with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.submissions s
      where s.id = submission_id and (
        s.user_id = auth.uid()
        or (s.group_id is not null and exists (
          select 1 from public.group_memberships gm where gm.group_id = s.group_id and gm.user_id = auth.uid()
        ))
        or public.is_exec()
      )
    )
  );

alter table public.grades enable row level security;
create policy "grades_select_own_or_exec" on public.grades
  for select to authenticated using (
    exists (
      select 1 from public.submissions s
      where s.id = submission_id and (
        s.user_id = auth.uid()
        or (s.group_id is not null and exists (
          select 1 from public.group_memberships gm where gm.group_id = s.group_id and gm.user_id = auth.uid()
        ))
        or public.is_exec()
      )
    )
  );
create policy "grades_write_exec" on public.grades
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

-- ============================================================
-- folders, files (course file repository — exec publishes,
-- enrolled members read published files)
-- ============================================================

alter table public.folders enable row level security;
create policy "folders_select_enrolled_or_exec" on public.folders
  for select to authenticated using (public.is_enrolled(course_id) or public.is_exec());
create policy "folders_write_exec" on public.folders
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

alter table public.files enable row level security;
create policy "files_select_published_enrolled_or_exec" on public.files
  for select to authenticated using (
    (published and public.is_enrolled(course_id)) or public.is_exec()
  );
create policy "files_write_exec" on public.files
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

-- ============================================================
-- calendar_events — course events need enrollment, platform-wide
-- events (course_id null) are visible to every member.
-- ============================================================

alter table public.calendar_events enable row level security;
create policy "calendar_events_select_visible_or_exec" on public.calendar_events
  for select to authenticated using (
    course_id is null or public.is_enrolled(course_id) or public.is_exec()
  );
create policy "calendar_events_write_exec" on public.calendar_events
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

-- ============================================================
-- quizzes, quiz_questions, quiz_answers, quiz_submissions,
-- quiz_responses — scaffolded, no UI reads these yet, so kept
-- exec-only + own-submission until quiz-taking ships.
-- ============================================================

alter table public.quizzes enable row level security;
create policy "quizzes_select_exec" on public.quizzes
  for select to authenticated using (public.is_exec());
create policy "quizzes_write_exec" on public.quizzes
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

alter table public.quiz_questions enable row level security;
create policy "quiz_questions_select_exec" on public.quiz_questions
  for select to authenticated using (public.is_exec());
create policy "quiz_questions_write_exec" on public.quiz_questions
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

alter table public.quiz_answers enable row level security;
create policy "quiz_answers_select_exec" on public.quiz_answers
  for select to authenticated using (public.is_exec());
create policy "quiz_answers_write_exec" on public.quiz_answers
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

alter table public.quiz_submissions enable row level security;
create policy "quiz_submissions_select_own_or_exec" on public.quiz_submissions
  for select to authenticated using (user_id = auth.uid() or public.is_exec());
create policy "quiz_submissions_write_own_or_exec" on public.quiz_submissions
  for all to authenticated using (user_id = auth.uid() or public.is_exec())
  with check (user_id = auth.uid() or public.is_exec());

alter table public.quiz_responses enable row level security;
create policy "quiz_responses_select_own_or_exec" on public.quiz_responses
  for select to authenticated using (
    exists (
      select 1 from public.quiz_submissions qs
      where qs.id = quiz_submission_id and (qs.user_id = auth.uid() or public.is_exec())
    )
  );
create policy "quiz_responses_write_own_or_exec" on public.quiz_responses
  for all to authenticated using (
    exists (
      select 1 from public.quiz_submissions qs
      where qs.id = quiz_submission_id and (qs.user_id = auth.uid() or public.is_exec())
    )
  )
  with check (
    exists (
      select 1 from public.quiz_submissions qs
      where qs.id = quiz_submission_id and (qs.user_id = auth.uid() or public.is_exec())
    )
  );

-- ============================================================
-- conversations, conversation_participants, messages —
-- visible only to participants.
-- ============================================================

alter table public.conversations enable row level security;
create policy "conversations_select_participant" on public.conversations
  for select to authenticated using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = id and cp.user_id = auth.uid()
    )
  );
create policy "conversations_insert_authenticated" on public.conversations
  for insert to authenticated with check (true);

alter table public.conversation_participants enable row level security;
create policy "conversation_participants_select_participant" on public.conversation_participants
  for select to authenticated using (
    exists (
      select 1 from public.conversation_participants cp2
      where cp2.conversation_id = conversation_id and cp2.user_id = auth.uid()
    )
  );
create policy "conversation_participants_insert_participant" on public.conversation_participants
  for insert to authenticated with check (
    exists (
      select 1 from public.conversation_participants cp2
      where cp2.conversation_id = conversation_id and cp2.user_id = auth.uid()
    )
    or not exists (
      select 1 from public.conversation_participants cp3 where cp3.conversation_id = conversation_id
    )
  );

alter table public.messages enable row level security;
create policy "messages_select_participant" on public.messages
  for select to authenticated using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
  );
create policy "messages_insert_participant" on public.messages
  for insert to authenticated with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
  );

-- ============================================================
-- notifications — own only. Rows are written server-side via the
-- service-role admin client (lib/supabase/admin.ts), not by end
-- users, since a notification is created on someone else's behalf
-- (e.g. grader triggers a notification for the submitter).
-- ============================================================

alter table public.notifications enable row level security;
create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- audit_log, page_views — self-attributed inserts, exec-only reads.
-- ============================================================

alter table public.audit_log enable row level security;
create policy "audit_log_select_exec" on public.audit_log
  for select to authenticated using (public.is_exec());
create policy "audit_log_insert_self" on public.audit_log
  for insert to authenticated with check (user_id = auth.uid());

alter table public.page_views enable row level security;
create policy "page_views_select_exec" on public.page_views
  for select to authenticated using (public.is_exec());
create policy "page_views_insert_self" on public.page_views
  for insert to authenticated with check (user_id = auth.uid());

-- ============================================================
-- wiki_pages — exec-authored (e.g. Grant writing module content),
-- enrolled members read published pages.
-- ============================================================

alter table public.wiki_pages enable row level security;
create policy "wiki_pages_select_published_enrolled_or_exec" on public.wiki_pages
  for select to authenticated using (
    (published and public.is_enrolled(course_id)) or public.is_exec()
  );
create policy "wiki_pages_write_exec" on public.wiki_pages
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

-- ============================================================
-- api_tokens — a user manages only their own tokens.
-- ============================================================

alter table public.api_tokens enable row level security;
create policy "api_tokens_all_own" on public.api_tokens
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
