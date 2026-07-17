-- UREC Platform — initial schema
--
-- Canvas-modeled schema (D1 in UREC_Platform_Decision_Log.md): copies
-- Canvas's structural DNA (terms/courses/enrollments/roles split into
-- account-scope vs course-scope, same as real Canvas) while only the
-- Phase 1-3 feature areas have application UI. Everything else in the
-- Part 2 feature matrix is scaffolded now per that decision, so later
-- phases are additive (no migrations that reshape existing tables).
--
-- Part 3 exclusions are deliberately absent: no SIS sync, no
-- multi-institution, no outcomes/standards, no Catalog/Studio/ePortfolio,
-- no Blueprint courses, no Turnitin, no non-Google OAuth, no mobile-only
-- endpoints, no Speedgrader clone.

-- ============================================================
-- Part 1 — Foundational strategy (D3): terms, courses, roles
-- ============================================================

create table public.terms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_on date not null,
  ends_on date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.terms is 'Semesters. Archiving = setting is_current false, never deleting.';

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references public.terms(id) on delete restrict,
  name text not null,
  code text,
  created_at timestamptz not null default now()
);
create index courses_term_id_idx on public.courses(term_id);

-- Scaffold only (decision log #9) — ready if UREC grows to 100+ and
-- needs a cohort split. No UI reads this yet.
create table public.course_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index course_sections_course_id_idx on public.course_sections(course_id);

-- Canvas splits "account roles" (site-wide, e.g. root admin) from
-- "course roles" (enrollment-scoped, e.g. Teacher/Student). D3's role
-- list (Analyst, VP, Co-President, Admin) needs both: Admin/Co-President
-- act platform-wide, Analyst is scoped to a course enrollment.
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  scope text not null check (scope in ('account', 'course')),
  description text,
  created_at timestamptz not null default now()
);

-- Profile table keyed 1:1 with auth.users, populated by the trigger
-- below on signup. Nothing in this schema references auth.users
-- directly other than this table, so RLS policies stay in the public
-- schema throughout.
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.account_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (user_id, role_id)
);
create index account_roles_user_id_idx on public.account_roles(user_id);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  section_id uuid references public.course_sections(id) on delete set null,
  role_id uuid not null references public.roles(id) on delete restrict,
  enrolled_at timestamptz not null default now(),
  unique (user_id, course_id)
);
create index enrollments_course_id_idx on public.enrollments(course_id);
create index enrollments_user_id_idx on public.enrollments(user_id);

-- ============================================================
-- Groups & Group Assignments — scaffold now, build UI when a case
-- comp needs it (decision log #7). UREC does both individual and
-- group work, so the schema supports both from day one.
-- ============================================================

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index groups_course_id_idx on public.groups(course_id);

create table public.group_memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);
create index group_memberships_user_id_idx on public.group_memberships(user_id);

-- ============================================================
-- Announcements + replies — build day one (decision log #2).
-- Standalone discussion boards are scaffolded but not built yet.
-- ============================================================

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete restrict,
  title text not null,
  body text not null,
  pinned boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create index announcements_course_id_idx on public.announcements(course_id);

create table public.announcement_replies (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now()
);
create index announcement_replies_announcement_id_idx on public.announcement_replies(announcement_id);

-- Discussions: scaffold now, standalone boards build later.
create table public.discussion_topics (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete restrict,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index discussion_topics_course_id_idx on public.discussion_topics(course_id);

create table public.discussion_replies (
  id uuid primary key default gen_random_uuid(),
  discussion_topic_id uuid not null references public.discussion_topics(id) on delete cascade,
  parent_reply_id uuid references public.discussion_replies(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now()
);
create index discussion_replies_topic_id_idx on public.discussion_replies(discussion_topic_id);

-- ============================================================
-- Assignments, rubrics, submissions, grades — build day one
-- (decision log #6, #12; Phase 3 milestone: "HW1 flow works
-- end-to-end for real"). Assignment groups are NOT scaffold-only —
-- required for total grade calculation per decision log #12.
-- ============================================================

create table public.assignment_groups (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  name text not null,
  weight_pct numeric(5, 2) not null default 0 check (weight_pct >= 0 and weight_pct <= 100),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index assignment_groups_course_id_idx on public.assignment_groups(course_id);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  assignment_group_id uuid references public.assignment_groups(id) on delete set null,
  title text not null,
  description text,
  points_possible numeric(6, 2) not null default 0,
  due_at timestamptz,
  submission_type text not null check (submission_type in ('file', 'text', 'url', 'none')),
  accepted_file_types text[],
  allow_group_submission boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create index assignments_course_id_idx on public.assignments(course_id);
create index assignments_assignment_group_id_idx on public.assignments(assignment_group_id);

-- Basic rubrics now (decision log #6); reusable templates + multi-level
-- ratings ("advanced rubrics") explicitly deferred per the change log
-- entry dated 2026-07-07. `rubrics` is reusable across assignments via
-- the join table, matching Canvas's actual pattern.
create table public.rubrics (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);
create index rubrics_course_id_idx on public.rubrics(course_id);

create table public.rubric_criteria (
  id uuid primary key default gen_random_uuid(),
  rubric_id uuid not null references public.rubrics(id) on delete cascade,
  description text not null,
  points numeric(6, 2) not null default 0,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index rubric_criteria_rubric_id_idx on public.rubric_criteria(rubric_id);

create table public.assignment_rubrics (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  rubric_id uuid not null references public.rubrics(id) on delete cascade,
  unique (assignment_id, rubric_id)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  attempt_number integer not null default 1,
  body_text text,
  url text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint submissions_owner_check check (
    (user_id is not null and group_id is null) or
    (user_id is null and group_id is not null)
  )
);
create index submissions_assignment_id_idx on public.submissions(assignment_id);
create index submissions_user_id_idx on public.submissions(user_id);
create index submissions_group_id_idx on public.submissions(group_id);

-- file_id's foreign key is added after public.files is created below —
-- that table doesn't exist yet at this point in the script.
create table public.submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  file_id uuid not null
);
create index submission_files_submission_id_idx on public.submission_files(submission_id);

create table public.submission_comments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now()
);
create index submission_comments_submission_id_idx on public.submission_comments(submission_id);

-- Deliberately separate from `submissions`: a submission existing does
-- not mean it's graded (see the workspace prototype fix removing fake
-- auto-grading — this schema makes that distinction real).
create table public.grades (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id) on delete cascade,
  points_earned numeric(6, 2) not null,
  rubric_assessment jsonb,
  graded_by uuid not null references public.users(id) on delete restrict,
  graded_at timestamptz not null default now()
);

-- ============================================================
-- Files — build in Phase 4, simplified from Canvas: nested folders
-- yes, publishing yes, versioning no, per-file permissions no
-- (decision log #14).
-- ============================================================

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  parent_folder_id uuid references public.folders(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index folders_course_id_idx on public.folders(course_id);
create index folders_parent_folder_id_idx on public.folders(parent_folder_id);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  uploaded_by uuid not null references public.users(id) on delete restrict,
  storage_path text not null,
  filename text not null,
  size_bytes bigint not null default 0,
  mime_type text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create index files_course_id_idx on public.files(course_id);
create index files_folder_id_idx on public.files(folder_id);

alter table public.submission_files
  add constraint submission_files_file_id_fkey
  foreign key (file_id) references public.files(id) on delete restrict;

-- ============================================================
-- Calendar — basic calendar Phase 4, iCal export Phase 5+
-- (decision log #11).
-- ============================================================

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index calendar_events_course_id_idx on public.calendar_events(course_id);
create index calendar_events_starts_at_idx on public.calendar_events(starts_at);

-- ============================================================
-- Quizzes — scaffold now, build UI later (decision log #1).
-- ============================================================

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete set null,
  title text not null,
  description text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create index quizzes_course_id_idx on public.quizzes(course_id);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_text text not null,
  question_type text not null check (question_type in ('multiple_choice', 'true_false', 'short_answer', 'essay')),
  points numeric(6, 2) not null default 0,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index quiz_questions_quiz_id_idx on public.quiz_questions(quiz_id);

create table public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  answer_text text not null,
  is_correct boolean not null default false,
  position integer not null default 0
);
create index quiz_answers_question_id_idx on public.quiz_answers(question_id);

create table public.quiz_submissions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric(6, 2),
  unique (quiz_id, user_id)
);
create index quiz_submissions_quiz_id_idx on public.quiz_submissions(quiz_id);
create index quiz_submissions_user_id_idx on public.quiz_submissions(user_id);

create table public.quiz_responses (
  id uuid primary key default gen_random_uuid(),
  quiz_submission_id uuid not null references public.quiz_submissions(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  response_text text,
  is_correct boolean,
  unique (quiz_submission_id, question_id)
);
create index quiz_responses_submission_id_idx on public.quiz_responses(quiz_submission_id);

-- ============================================================
-- Conversations / Inbox — scaffold only (decision log #3). Slack
-- and email cover this need today; tables exist if that changes.
-- ============================================================

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  unique (conversation_id, user_id)
);
create index conversation_participants_user_id_idx on public.conversation_participants(user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now()
);
create index messages_conversation_id_idx on public.messages(conversation_id);

-- ============================================================
-- Notifications — include and prioritize, Phase 3-4 (decision log
-- #4). Four triggers named in the log: new announcement, new
-- assignment, assignment graded, assignment due tomorrow.
-- ============================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in (
    'new_announcement', 'new_assignment', 'assignment_graded', 'assignment_due_soon'
  )),
  title text not null,
  body text,
  related_entity_type text,
  related_entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_id_idx on public.notifications(user_id);
create index notifications_user_id_read_at_idx on public.notifications(user_id, read_at);

-- ============================================================
-- Analytics & Audit Log — track from day one, dashboard UI later
-- (decision log #5). Impossible to backfill lost tracking data, so
-- this ships before anything reads it.
-- ============================================================

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_user_id_idx on public.audit_log(user_id);
create index audit_log_entity_idx on public.audit_log(entity_type, entity_id);

create table public.page_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null,
  path text not null,
  created_at timestamptz not null default now()
);
create index page_views_user_id_idx on public.page_views(user_id);
create index page_views_created_at_idx on public.page_views(created_at);

-- ============================================================
-- Wiki pages — scaffold now, simple markdown editor Phase 4-5
-- (decision log #8). Enables in-platform module content instead
-- of PDFs.
-- ============================================================

create table public.wiki_pages (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  slug text not null,
  body_markdown text not null default '',
  published boolean not null default false,
  created_by uuid not null references public.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (course_id, slug)
);
create index wiki_pages_course_id_idx on public.wiki_pages(course_id);

-- ============================================================
-- Access tokens / API — scaffold only (decision log #15). Year 2+
-- if UREC wants a mobile app or deal library integration.
-- ============================================================

create table public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  token_hash text not null,
  scopes text[] not null default '{}',
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index api_tokens_user_id_idx on public.api_tokens(user_id);

-- ============================================================
-- auth.users -> public.users sync trigger
-- ============================================================

create function public.handle_new_auth_user()
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
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
