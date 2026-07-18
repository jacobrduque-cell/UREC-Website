-- ============================================================
-- Fix infinite recursion in conversation/message RLS
-- ============================================================
--
-- conversation_participants_select_participant checked membership with a
-- subquery ON conversation_participants — so evaluating the policy read
-- the same table, which re-applied the policy, and Postgres aborts with
-- "infinite recursion detected in policy for relation
-- conversation_participants". Every SELECT on conversations, participants,
-- or messages (each routes through that table) therefore errored. The
-- tables shipped unused, so the Phase 9 Inbox is the first thing to hit
-- it — the whole feature would 500 without this.
--
-- Fix: check membership through a SECURITY DEFINER helper that reads the
-- table with RLS bypassed, breaking the loop (the same pattern is_exec /
-- is_enrolled already use).

create or replace function public.is_conversation_participant(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = target_conversation_id and user_id = auth.uid()
  );
$$;
grant execute on function public.is_conversation_participant(uuid) to authenticated;

create or replace function public.conversation_has_participants(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = target_conversation_id
  );
$$;
grant execute on function public.conversation_has_participants(uuid) to authenticated;

drop policy if exists "conversations_select_participant" on public.conversations;
create policy "conversations_select_participant" on public.conversations
  for select to authenticated using (
    public.is_conversation_participant(id) or created_by = auth.uid()
  );

-- Tighten insert so the creator is recorded as themselves (this also
-- makes the INSERT ... RETURNING visible to them via the SELECT policy
-- above before any participant rows exist).
drop policy if exists "conversations_insert_authenticated" on public.conversations;
create policy "conversations_insert_authenticated" on public.conversations
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists "conversation_participants_select_participant" on public.conversation_participants;
create policy "conversation_participants_select_participant" on public.conversation_participants
  for select to authenticated using (public.is_conversation_participant(conversation_id));

-- Adding the first participant to a brand-new conversation is allowed
-- (nobody's in it yet); after that you must already be a participant.
drop policy if exists "conversation_participants_insert_participant" on public.conversation_participants;
create policy "conversation_participants_insert_participant" on public.conversation_participants
  for insert to authenticated with check (
    public.is_conversation_participant(conversation_id)
    or not public.conversation_has_participants(conversation_id)
  );

drop policy if exists "messages_select_participant" on public.messages;
create policy "messages_select_participant" on public.messages
  for select to authenticated using (public.is_conversation_participant(conversation_id));

drop policy if exists "messages_insert_participant" on public.messages;
create policy "messages_insert_participant" on public.messages
  for insert to authenticated with check (
    author_id = auth.uid() and public.is_conversation_participant(conversation_id)
  );
