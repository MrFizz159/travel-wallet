-- ============================================================
-- Travel Wallet — Managed Service Cases
-- ============================================================

-- Expand sub_tasks status to allow case_in_progress
alter table sub_tasks drop constraint if exists valid_status;
alter table sub_tasks add constraint valid_status
  check (status in ('pending', 'complete', 'case_in_progress'));

-- Add managed service fields to sub_tasks
alter table sub_tasks
  add column if not exists service_mode text check (service_mode in ('managed')),
  add column if not exists case_id uuid;

-- Add has_active_case flag to requirements (suppresses at_risk escalation)
alter table requirements
  add column if not exists has_active_case boolean not null default false;

-- Cases table
-- PoC: local record with stubbed case manager data
-- Production: synced from Centuro platform via webhook
create table if not exists cases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  trip_id uuid references trips(id) on delete cascade not null,
  requirement_id uuid references requirements(id) on delete cascade not null,
  sub_task_id uuid references sub_tasks(id) on delete cascade not null,
  case_reference text not null,
  visa_type text not null,
  destination_country text not null,
  status text not null default 'Case Initiated',
  progress integer not null default 5,
  initiated_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table cases enable row level security;

create policy "Users manage own cases" on cases
  for all using (auth.uid() = user_id);

create index if not exists cases_user_id_idx on cases(user_id);
create index if not exists cases_sub_task_id_idx on cases(sub_task_id);
create index if not exists cases_trip_id_idx on cases(trip_id);
