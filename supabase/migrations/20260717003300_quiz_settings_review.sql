-- ============================================================
-- Quiz settings + post-submit review (explanations, correct answers)
-- ============================================================
--
-- Adds:
--   * quizzes.shuffle_questions   — randomize question order for takers
--   * quizzes.show_correct_after  — after submitting, a member sees which
--                                   questions they missed + the right
--                                   answers + explanations
--   * quiz_questions.explanation  — exec's "why" shown in that review
--
-- Correct answers and explanations are the answer key, so they can't be
-- exposed on the student-readable path (RLS can't hide a column). Instead
-- a SECURITY DEFINER function serves the review data ONLY to a member who
-- has already submitted a quiz whose show_correct_after is on (or to
-- exec) — so nothing leaks before submission.

alter table public.quizzes
  add column if not exists shuffle_questions boolean not null default false;
alter table public.quizzes
  add column if not exists show_correct_after boolean not null default false;
alter table public.quiz_questions
  add column if not exists explanation text;

create or replace function public.quiz_review(target_quiz_id uuid)
returns table (question_id uuid, correct_display text, explanation text)
language sql
stable
security definer
set search_path = public
as $$
  select
    qq.id,
    case qq.question_type
      when 'numeric' then (
        select qa.answer_text || coalesce(' (±' || qa.tolerance || ')', '')
        from public.quiz_answers qa where qa.question_id = qq.id
        order by qa.position limit 1
      )
      when 'short_answer' then null
      when 'essay' then null
      else (
        select string_agg(qa.answer_text, ', ' order by qa.position)
        from public.quiz_answers qa
        where qa.question_id = qq.id and qa.is_correct
      )
    end as correct_display,
    qq.explanation
  from public.quiz_questions qq
  join public.quizzes q on q.id = qq.quiz_id
  where qq.quiz_id = target_quiz_id
    and (
      public.is_exec()
      or (
        q.show_correct_after
        and exists (
          select 1 from public.quiz_submissions qs
          where qs.quiz_id = target_quiz_id
            and qs.user_id = auth.uid()
            and qs.submitted_at is not null
        )
      )
    );
$$;
grant execute on function public.quiz_review(uuid) to authenticated;
