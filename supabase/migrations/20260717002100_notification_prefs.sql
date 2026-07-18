-- ============================================================
-- Notification preferences
-- ============================================================
--
-- Every notification currently emails on top of the in-app row. At 115
-- members that's a fast track to people muting the club. This lets each
-- member choose, per notification type, whether they get email, in-app
-- only, or nothing. No row = the default (email), so existing behavior is
-- unchanged until someone opts down.

create table public.notification_prefs (
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in (
    'new_announcement', 'new_assignment', 'assignment_graded', 'assignment_due_soon'
  )),
  channel text not null check (channel in ('email', 'in_app', 'off')),
  updated_at timestamptz not null default now(),
  primary key (user_id, type)
);

-- A member manages only their own preferences.
alter table public.notification_prefs enable row level security;
create policy "notification_prefs_select_own" on public.notification_prefs
  for select to authenticated using (user_id = auth.uid());
create policy "notification_prefs_write_own" on public.notification_prefs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.notification_prefs to authenticated;
