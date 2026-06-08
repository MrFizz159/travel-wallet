-- ============================================================
-- Travel Wallet — Multi-leg trip model
-- Elevates Trip to a container; moves destination data to trip_legs.
-- Adds transit stops with lightweight AI-powered visa checks.
-- ============================================================

-- 1. Create trip_legs
create table trip_legs (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references trips(id) on delete cascade not null,
  destination_country text not null,
  destination_country_code text not null,
  start_date date not null,
  end_date date not null,
  duration_days int not null default 1,
  purpose text not null default 'business',
  passport_id uuid references passports(id) on delete set null,
  assessment_result text,
  compliance_status text,
  sort_order int not null default 0,
  created_at timestamptz default now(),
  constraint valid_leg_purpose check (purpose in ('business','tourism','education','relocation','other')),
  constraint valid_leg_dates check (end_date >= start_date),
  constraint valid_leg_assessment check (assessment_result is null or assessment_result in ('action_required','no_action_required','review_required')),
  constraint valid_leg_compliance check (compliance_status is null or compliance_status in ('compliant','incomplete','at_risk','not_started'))
);

alter table trip_legs enable row level security;
create policy "Users manage own trip_legs" on trip_legs
  for all using (
    trip_id in (select id from trips where user_id = auth.uid())
  );
create index trip_legs_trip_id_idx on trip_legs(trip_id);
create index trip_legs_trip_sort_idx on trip_legs(trip_id, sort_order);

-- 2. Create trip_transits
create table trip_transits (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references trips(id) on delete cascade not null,
  transit_country text not null,
  transit_country_code text not null,
  transit_date date,
  sort_order int not null,
  visa_required boolean,
  transit_note text,
  checked_at timestamptz,
  user_confirmed boolean not null default false,
  created_at timestamptz default now()
);

alter table trip_transits enable row level security;
create policy "Users manage own trip_transits" on trip_transits
  for all using (
    trip_id in (select id from trips where user_id = auth.uid())
  );
create index trip_transits_trip_id_idx on trip_transits(trip_id);
create index trip_transits_trip_sort_idx on trip_transits(trip_id, sort_order);

-- 3. Add leg_id to requirements (nullable; null = trip-level e.g. manager_approval)
alter table requirements
  add column if not exists leg_id uuid references trip_legs(id) on delete cascade;
create index requirements_leg_id_idx on requirements(leg_id);

-- 4. Data migration: create one leg per existing trip
insert into trip_legs (
  trip_id, destination_country, destination_country_code,
  start_date, end_date, duration_days,
  purpose, passport_id, assessment_result, compliance_status,
  sort_order
)
select
  id,
  destination_country,
  destination_country_code,
  start_date,
  end_date,
  (end_date - start_date + 1)::int,
  purpose,
  passport_id,
  assessment_result,
  compliance_status,
  0
from trips;

-- 5. Link existing leg requirements to their new leg row (all except manager_approval)
update requirements r
set leg_id = tl.id
from trip_legs tl
where tl.trip_id = r.trip_id
  and r.type != 'manager_approval';

-- 6. Drop destination columns from trips (data is now in trip_legs)
--    Drop constraints that reference these columns first.
alter table trips drop constraint if exists valid_purpose;
alter table trips drop constraint if exists valid_dates;

alter table trips
  drop column if exists destination_country,
  drop column if exists destination_country_code,
  drop column if exists start_date,
  drop column if exists end_date,
  drop column if exists duration_days,
  drop column if exists purpose,
  drop column if exists passport_id,
  drop column if exists assessment_result;

-- origin_country / origin_country_code (added in 005 for travel history) stay on trips
-- for now — they are only used for logged history entries and don't affect compliance.
