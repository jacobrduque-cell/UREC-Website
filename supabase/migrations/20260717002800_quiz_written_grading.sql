-- ============================================================
-- Let exec award points for written quiz responses
-- ============================================================
--
-- submitQuiz auto-grades multiple_choice/true_false and leaves
-- short_answer/essay with is_correct = null and no points. There was no
-- way for exec to award those points, yet the student result view
-- promised "reviewed by exec" and counted the written points in the
-- denominator — so any quiz with a written question capped every student
-- below full score forever. This adds the column exec grades into; a new
-- server action recomputes quiz_submissions.score from the auto-graded
-- points plus these awards.
alter table public.quiz_responses
  add column if not exists points_awarded numeric;
