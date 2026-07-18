-- ============================================================
-- Stop exposing the quiz answer key to students
-- ============================================================
--
-- 20260717001500 let enrolled students SELECT quiz_answers for a
-- published quiz so the taking UI could render options. But RLS is
-- row-level, not column-level, so that also exposed quiz_answers.is_correct:
-- a student could call
--   GET /rest/v1/quiz_answers?select=question_id,answer_text,is_correct
-- with their own JWT and read the answer key, then score 100% on any
-- MC/TF quiz. Auto-grading can't detect it because the chosen answers
-- really are correct.
--
-- Fix: takers no longer read the base table at all. They read a view
-- that projects only the non-answer columns (no is_correct); base-table
-- SELECT goes back to exec-only. Grading still runs under the admin
-- client, which bypasses RLS and reads the full rows server-side.

-- 1. Base table: revert student read to exec-only.
drop policy if exists "quiz_answers_select_published_or_exec" on public.quiz_answers;
drop policy if exists "quiz_answers_select_exec" on public.quiz_answers;
create policy "quiz_answers_select_exec" on public.quiz_answers
  for select to authenticated using (public.is_exec());

-- 2. Safe projection for takers — no is_correct. The view runs with its
-- owner's privileges (security_invoker off), so it can read quiz_answers
-- past the exec-only policy, but it only ever selects id/answer_text/
-- position and only for quizzes the CALLER may take (auth.uid() is still
-- the caller inside the view's WHERE): a published quiz they're enrolled
-- in, or any quiz for exec.
drop view if exists public.quiz_answer_options;
create view public.quiz_answer_options
with (security_invoker = false) as
  select qa.id, qa.question_id, qa.answer_text, qa.position
  from public.quiz_answers qa
  join public.quiz_questions qq on qq.id = qa.question_id
  join public.quizzes q on q.id = qq.quiz_id
  where (q.published and public.is_enrolled(q.course_id)) or public.is_exec();

grant select on public.quiz_answer_options to authenticated;
