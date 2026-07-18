-- ============================================================
-- Harden submissions against direct-API tampering
-- ============================================================
--
-- The submissions UPDATE policy (submissions_update_own_or_exec) lets a
-- row owner PATCH their own submission. RLS cannot restrict WHICH
-- columns an owner writes, and every availability-window / Late-flag /
-- attempt-integrity rule lived only in the submitAssignment server
-- action. A student hitting PostgREST directly with their JWT could
-- therefore bypass all of it:
--   * edit body_text/url after lock_at (the "closed" window is UI-only),
--   * backdate submitted_at to erase the Late flag (it's derived from
--     due_at vs submitted_at),
--   * re-target assignment_id onto an assignment in a course they were
--     never enrolled in, injecting a submission a foreign grader sees.
--
-- This BEFORE UPDATE trigger enforces those invariants in the database
-- for ordinary members, so the guarantees hold no matter how the row is
-- written. Exec and the service-role admin client (auth.uid() is null)
-- are exempt; the normal resubmission path in submitAssignment already
-- satisfies every rule, so it is unaffected.

create or replace function public.guard_submission_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  a_unlock timestamptz;
  a_lock timestamptz;
begin
  -- Service-role admin writes (no JWT subject) and exec may do anything.
  if auth.uid() is null or public.is_exec() then
    return new;
  end if;

  -- Immutable identity: a resubmission edits content, never which
  -- assignment the submission is for or who owns it.
  if new.assignment_id is distinct from old.assignment_id then
    raise exception 'Cannot move a submission to a different assignment.';
  end if;
  if new.user_id is distinct from old.user_id
     or new.group_id is distinct from old.group_id then
    raise exception 'Cannot change a submission''s owner.';
  end if;

  -- The submission time is server-authoritative — no backdating to dodge
  -- the Late flag. Every owner update re-stamps it to now().
  new.submitted_at := now();

  -- Enforce the availability window exactly like submitAssignment does.
  select unlock_at, lock_at into a_unlock, a_lock
  from public.assignments where id = new.assignment_id;
  if a_unlock is not null and now() < a_unlock then
    raise exception 'This assignment is not open for submissions yet.';
  end if;
  if a_lock is not null and now() > a_lock then
    raise exception 'Submissions for this assignment are closed.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_submission_update on public.submissions;
create trigger trg_guard_submission_update
  before update on public.submissions
  for each row execute function public.guard_submission_update();
