-- ============================================================
-- Quiz grade integrity — stop students writing their own score
-- ============================================================
--
-- Bug: quiz_submissions.score is the graded result, but the write
-- policy was "for all ... using (user_id = auth.uid())" — a student
-- could hit the PostgREST API directly and
--   update quiz_submissions set score = 999 where user_id = <self>
-- setting any quiz score they wanted. RLS can't restrict WHICH columns
-- a row-owner updates, so owning the row meant owning the score.
--
-- Fix: students no longer write quiz_submissions or quiz_responses at
-- all. The submitQuiz server action does every write through the
-- service-role admin client (which computes score server-side from the
-- authoritative answer keys), so these tables only need:
--   - SELECT for the owning student (to see their result) + exec
--   - WRITE for exec (the admin client bypasses RLS entirely)
-- The action still gates the student's right to submit by reading the
-- quiz through their own RLS-scoped client first (published + enrolled).

-- quiz_submissions: keep own+exec SELECT, drop student write.
drop policy if exists "quiz_submissions_write_own_or_exec" on public.quiz_submissions;
create policy "quiz_submissions_write_exec" on public.quiz_submissions
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

-- quiz_responses: keep own+exec SELECT (unchanged), drop student write.
drop policy if exists "quiz_responses_write_own_or_exec" on public.quiz_responses;
create policy "quiz_responses_write_exec" on public.quiz_responses
  for all to authenticated using (public.is_exec()) with check (public.is_exec());
