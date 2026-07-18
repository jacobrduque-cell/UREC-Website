-- ============================================================
-- Inbox / Conversations — subject line + message notifications
-- ============================================================
--
-- The conversations/conversation_participants/messages tables and their
-- participant-scoped RLS shipped in the initial schema but no UI ever
-- used them. Phase 9's Inbox turns them on. Two small additions:
--   * a subject line on a conversation (Canvas Inbox threads have one),
--   * 'new_message' as an allowed notification type so a new message can
--     notify the other participants like every other event does.

alter table public.conversations
  add column if not exists subject text;

-- Who opened the thread. Needed so the creator can read the conversation
-- back (e.g. the INSERT ... RETURNING id that the compose action does)
-- in the instant before they've been added as a participant.
alter table public.conversations
  add column if not exists created_by uuid references public.users(id) on delete set null;

alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check check (type in (
    'new_announcement', 'new_assignment', 'assignment_graded',
    'assignment_due_soon', 'new_message'
  ));
