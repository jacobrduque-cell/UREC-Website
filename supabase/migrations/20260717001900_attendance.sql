-- ============================================================
-- Attendance tracking
-- ============================================================
--
-- UREC takes attendance at every GM/workshop, and analyst-program
-- advancement depends on it — a real weekly workflow with no support
-- until now. Attendance hangs off calendar_events (the meetings we
-- already model): one record per (event, member).

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null check (status in ('present', 'absent', 'excused', 'late')),
  recorded_by uuid references public.users(id) on delete set null,
  recorded_at timestamptz not null default now(),
  unique (event_id, user_id)
);
create index attendance_records_event_id_idx on public.attendance_records(event_id);
create index attendance_records_user_id_idx on public.attendance_records(user_id);

-- A member can see their own attendance; exec sees and records everyone's.
alter table public.attendance_records enable row level security;
create policy "attendance_select_own_or_exec" on public.attendance_records
  for select to authenticated using (user_id = auth.uid() or public.is_exec());
create policy "attendance_write_exec" on public.attendance_records
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

grant select, insert, update, delete on public.attendance_records to authenticated;
