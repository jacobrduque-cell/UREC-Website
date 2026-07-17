-- UREC Platform — let enrolled students see & take published quizzes
--
-- The original quiz RLS was exec-only for SELECT ("no UI reads these
-- yet"). Phase 9 ships quiz-taking, so enrolled members now need to
-- read a published quiz, its questions, and its answer options.
--
-- Note on answer correctness: quiz_answers.is_correct is technically
-- readable by a student for a published quiz (row-level security can't
-- hide a single column). Grading is still done server-side against the
-- authoritative rows, and for a small honor-system club tool this is an
-- accepted simplification — a future hardening would move option text
-- behind a column-filtered view or RPC. Auto-grading itself never
-- trusts client input for correctness.

drop policy if exists "quizzes_select_exec" on public.quizzes;
create policy "quizzes_select_published_enrolled_or_exec" on public.quizzes
  for select to authenticated using (
    (published and public.is_enrolled(course_id)) or public.is_exec()
  );

drop policy if exists "quiz_questions_select_exec" on public.quiz_questions;
create policy "quiz_questions_select_published_or_exec" on public.quiz_questions
  for select to authenticated using (
    exists (
      select 1 from public.quizzes q
      where q.id = quiz_id and (
        (q.published and public.is_enrolled(q.course_id)) or public.is_exec()
      )
    )
  );

drop policy if exists "quiz_answers_select_exec" on public.quiz_answers;
create policy "quiz_answers_select_published_or_exec" on public.quiz_answers
  for select to authenticated using (
    exists (
      select 1 from public.quiz_questions qq
      join public.quizzes q on q.id = qq.quiz_id
      where qq.id = question_id and (
        (q.published and public.is_enrolled(q.course_id)) or public.is_exec()
      )
    )
  );
