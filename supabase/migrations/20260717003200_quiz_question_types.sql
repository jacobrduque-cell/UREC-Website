-- ============================================================
-- New quiz question types: numeric + multiple-answer
-- ============================================================
--
-- Adds two auto-gradable types beyond MC/TF/short/essay:
--   * numeric        — a number with a tolerance ("cap rate? 5.5 ±0.1")
--   * multiple_answer — select ALL that apply (all-or-nothing scoring)
--
-- The correct number for a numeric question is the answer key, so it must
-- NOT live on the student-readable quiz_questions table (same reason
-- is_correct is hidden). It's stored as a single exec-only quiz_answers
-- row: answer_text = the value, tolerance = the allowed +/- band. numeric
-- questions are then excluded from the takers' quiz_answer_options view
-- (they have no options to show), so the value never leaks.

alter table public.quiz_questions
  drop constraint if exists quiz_questions_question_type_check;
alter table public.quiz_questions
  add constraint quiz_questions_question_type_check check (question_type in (
    'multiple_choice', 'true_false', 'short_answer', 'essay',
    'numeric', 'multiple_answer'
  ));

alter table public.quiz_answers
  add column if not exists tolerance numeric;

-- Rebuild the takers' options view to exclude numeric answers (their
-- answer_text IS the secret value). MC/TF/multiple_answer options are
-- still exposed without is_correct, exactly as before.
drop view if exists public.quiz_answer_options;
create view public.quiz_answer_options
with (security_invoker = false) as
  select qa.id, qa.question_id, qa.answer_text, qa.position
  from public.quiz_answers qa
  join public.quiz_questions qq on qq.id = qa.question_id
  join public.quizzes q on q.id = qq.quiz_id
  where qq.question_type <> 'numeric'
    and ((q.published and public.is_enrolled(q.course_id)) or public.is_exec());

grant select on public.quiz_answer_options to authenticated;
