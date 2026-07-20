-- ============================================================
-- Quiz Integrity Mode (soft proctoring)
-- ============================================================
--
-- A web app can't be a true lockdown browser (the browser sandbox has no
-- OS-level control), so this is deterrence + detection, not prevention:
--   * proctored quizzes run the take-quiz UI in fullscreen, block
--     copy/paste/right-click/text-select, and shuffle answer options;
--   * every time the taker leaves the quiz tab or exits fullscreen the
--     client counts it and submits the tally, which exec see on the
--     Submissions page.
--
-- focus_loss_count is CLIENT-reported (a determined student could edit
-- the DOM to zero it), so treat it as a signal to look closer, not proof.

alter table public.quizzes
  add column if not exists proctored boolean not null default false;

comment on column public.quizzes.proctored is
  'Integrity mode: the take-quiz UI runs fullscreen, records tab-switch / fullscreen-exit events, blocks copy/paste, and shuffles answer options.';

alter table public.quiz_submissions
  add column if not exists focus_loss_count integer not null default 0;

comment on column public.quiz_submissions.focus_loss_count is
  'Client-reported count of times the taker left the quiz tab or fullscreen during a proctored attempt. A soft integrity signal, not tamper-proof.';
