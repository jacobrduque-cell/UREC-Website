-- ============================================================
-- Inbox unread tracking — per-participant read state
-- ============================================================
--
-- Phase 9's Inbox has no notion of "read" yet: every thread looks the
-- same whether or not you've opened it. This adds a single timestamp on
-- each participant row recording when that participant last read the
-- conversation. A conversation is "unread" for a viewer when the latest
-- message is from someone else and was created after (or with no)
-- last_read_at for the viewer's participant row.
--
-- Deploys and migrations ship separately, so the app code reads this
-- column defensively and treats a missing column as "everything read".

alter table public.conversation_participants
  add column if not exists last_read_at timestamptz;

comment on column public.conversation_participants.last_read_at is
  'When this participant last read the conversation; null means never read. Used to compute the unread state in the Inbox list.';

-- conversation_participants shipped with SELECT + INSERT policies only
-- (see 20260717000100_rls_policies.sql / 20260717003000_conversations_recursion_fix.sql),
-- so marking a thread read needs an UPDATE policy. A participant may
-- update only their own row.
create policy "conversation_participants_update_own" on public.conversation_participants
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
