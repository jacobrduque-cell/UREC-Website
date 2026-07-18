-- =====================================================================
-- Test fixtures — a small, deterministic club to assert RLS against
-- =====================================================================
--
-- Inserted as the superuser BEFORE any `set role authenticated`, so RLS
-- is bypassed here (superusers always bypass RLS) — this is the trusted
-- setup step, equivalent to what the signup trigger / service-role
-- admin client does on the real project. Every id is a fixed UUID so the
-- assertions in rls.test.sh can reference rows by hand.
--
-- Cast of characters
--   exec      role Admin (account-wide)     -> is_exec() = true
--   analystA  Analyst enrolled in Course A  -> normal member of A
--   analystB  Analyst enrolled in Course B  -> normal member of B (isolation)
--   graderA   Grader enrolled in Course A   -> can grade A, no exec power
--   outsider  no roles, no enrollments      -> should see almost nothing

-- --- people (insert into auth.users fires handle_new_auth_user, which
-- --- creates the matching public.users row and redeems pending invites) ---
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'exec@berkeley.edu',     '{"full_name":"Exec Boss"}'),
  ('00000000-0000-0000-0000-0000000000a1', 'analysta@berkeley.edu', '{"full_name":"Ana Lyst A"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'analystb@berkeley.edu', '{"full_name":"Ana Lyst B"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'gradera@berkeley.edu',  '{"full_name":"Grade R"}'),
  ('00000000-0000-0000-0000-0000000000f1', 'outsider@berkeley.edu', '{"full_name":"Out Sider"}');

-- --- exec gets an account-wide Admin role ---
insert into public.account_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000e1', id from public.roles where name = 'Admin';

-- --- a second course (Course B) under the seeded Fall 2026 term ---
insert into public.courses (id, term_id, name, code, published)
select '00000000-0000-0000-0000-0000000c0002', t.id, 'Course B', 'CRSB', true
from public.terms t where t.name = 'Fall 2026';

-- Course A = the seeded "UREC Analyst Program". Pin its id for reference
-- via a temp mapping is overkill; instead assertions read it by name.

-- --- enrollments ---
insert into public.enrollments (user_id, course_id, role_id)
select '00000000-0000-0000-0000-0000000000a1', c.id, r.id
from public.courses c, public.roles r
where c.name = 'UREC Analyst Program' and r.name = 'Analyst';

insert into public.enrollments (user_id, course_id, role_id)
select '00000000-0000-0000-0000-0000000000b1', c.id, r.id
from public.courses c, public.roles r
where c.name = 'Course B' and r.name = 'Analyst';

insert into public.enrollments (user_id, course_id, role_id)
select '00000000-0000-0000-0000-0000000000c1', c.id, r.id
from public.courses c, public.roles r
where c.name = 'UREC Analyst Program' and r.name = 'Grader';

-- --- assignments in Course A: one published, one draft ---
insert into public.assignments (id, course_id, title, points_possible, submission_type, published)
select '00000000-0000-0000-0000-00000a551001', c.id, 'HW1 (published)', 100, 'file', true
from public.courses c where c.name = 'UREC Analyst Program';

insert into public.assignments (id, course_id, title, points_possible, submission_type, published)
select '00000000-0000-0000-0000-00000a551002', c.id, 'HW2 (draft)', 100, 'file', false
from public.courses c where c.name = 'UREC Analyst Program';

-- --- analystA has a submission on HW1, graded by graderA ---
insert into public.submissions (id, assignment_id, user_id, body_text)
values ('00000000-0000-0000-0000-00005ub00001',
        '00000000-0000-0000-0000-00000a551001',
        '00000000-0000-0000-0000-0000000000a1', 'my answer');

insert into public.grades (submission_id, points_earned, graded_by)
values ('00000000-0000-0000-0000-00005ub00001', 90,
        '00000000-0000-0000-0000-0000000000c1');

-- --- a published quiz in Course A with a question + answer key ---
insert into public.quizzes (id, course_id, title, published)
select '00000000-0000-0000-0000-0000q00z0001', c.id, 'Quiz 1 (published)', true
from public.courses c where c.name = 'UREC Analyst Program';

insert into public.quizzes (id, course_id, title, published)
select '00000000-0000-0000-0000-0000q00z0002', c.id, 'Quiz 2 (draft)', false
from public.courses c where c.name = 'UREC Analyst Program';

insert into public.quiz_questions (id, quiz_id, question_text, question_type, points)
values ('00000000-0000-0000-0000-0000q00q0001', '00000000-0000-0000-0000-0000q00z0001',
        'What is a cap rate?', 'multiple_choice', 10),
       ('00000000-0000-0000-0000-0000q00q0002', '00000000-0000-0000-0000-0000q00z0002',
        'Draft question', 'multiple_choice', 10);

insert into public.quiz_answers (question_id, answer_text, is_correct) values
  ('00000000-0000-0000-0000-0000q00q0001', 'NOI / value', true),
  ('00000000-0000-0000-0000-0000q00q0001', 'value / NOI', false),
  ('00000000-0000-0000-0000-0000q00q0002', 'secret draft answer', true);

-- --- course files: one published, one unpublished, each with a storage
-- --- object at the file's storage_path ---
insert into public.files (id, course_id, uploaded_by, storage_path, filename, published)
select '00000000-0000-0000-0000-00000f11e001', c.id,
       '00000000-0000-0000-0000-0000000000e1',
       c.id || '/root/syllabus.pdf', 'syllabus.pdf', true
from public.courses c where c.name = 'UREC Analyst Program';

insert into public.files (id, course_id, uploaded_by, storage_path, filename, published)
select '00000000-0000-0000-0000-00000f11e002', c.id,
       '00000000-0000-0000-0000-0000000000e1',
       c.id || '/root/draft-notes.pdf', 'draft-notes.pdf', false
from public.courses c where c.name = 'UREC Analyst Program';

insert into storage.objects (bucket_id, name)
select 'course-files', storage_path from public.files
where id in ('00000000-0000-0000-0000-00000f11e001','00000000-0000-0000-0000-00000f11e002');

-- --- a pending invite for a not-yet-signed-in email (trigger test) ---
insert into public.pending_enrollments (email, course_id, role_id)
select 'newbie@berkeley.edu', c.id, r.id
from public.courses c, public.roles r
where c.name = 'UREC Analyst Program' and r.name = 'Analyst';
