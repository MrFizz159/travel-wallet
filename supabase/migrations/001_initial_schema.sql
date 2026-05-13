-- ============================================================
-- Travel Wallet — Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Profiles (one per auth user, auto-created on signup)
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  date_of_birth date,
  nationality text,
  country_of_residence text,
  tax_residency text,
  address text,
  job_title text,
  employer text,
  work_address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users manage own profile" on profiles for all using (auth.uid() = id);

-- Auto-create profile row when a user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Passports
create table passports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  passport_number text not null,
  issuing_country text not null,
  nationality text not null,
  issue_date date not null,
  expiry_date date not null,
  is_primary boolean default false,
  document_url text,
  created_at timestamptz default now()
);

alter table passports enable row level security;
create policy "Users manage own passports" on passports for all using (auth.uid() = user_id);
create index passports_user_id_idx on passports(user_id);

-- Trips
create table trips (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  destination_country text not null,
  destination_country_code text not null,
  start_date date not null,
  end_date date not null,
  purpose text not null default 'business',
  state text not null default 'exploratory',
  compliance_status text,
  passport_id uuid references passports(id) on delete set null,
  assessment_result text,
  is_historical boolean default false,
  created_at timestamptz default now(),
  activated_at timestamptz,
  constraint valid_state check (state in ('exploratory','active','completed','cancelled')),
  constraint valid_purpose check (purpose in ('business','tourism','education','relocation','other')),
  constraint valid_dates check (end_date >= start_date)
);

alter table trips enable row level security;
create policy "Users manage own trips" on trips for all using (auth.uid() = user_id);
create index trips_user_id_idx on trips(user_id);
create index trips_user_state_idx on trips(user_id, state);

-- Requirements (generated on trip activation)
create table requirements (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references trips(id) on delete cascade not null,
  name text not null,
  type text not null,
  is_mandatory boolean default true,
  status text not null default 'not_started',
  time_required_days integer not null default 0,
  latest_start_date date,
  completed_at timestamptz,
  why_it_applies text,
  guidance text,
  external_link text,
  what_you_need text[],
  created_at timestamptz default now(),
  constraint valid_status check (status in ('not_started','in_progress','at_risk','complete'))
);

alter table requirements enable row level security;
create policy "Users manage own requirements" on requirements
  for all using (
    auth.uid() = (select user_id from trips where id = requirements.trip_id)
  );
create index requirements_trip_id_idx on requirements(trip_id);

-- Sub-tasks
create table sub_tasks (
  id uuid default gen_random_uuid() primary key,
  requirement_id uuid references requirements(id) on delete cascade not null,
  name text not null,
  type text not null,
  status text not null default 'pending',
  ai_generated_content text,
  approval_status text,
  evidence_document_id uuid,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  constraint valid_type check (type in ('automated','generatable','primary_action','third_party')),
  constraint valid_status check (status in ('pending','complete'))
);

alter table sub_tasks enable row level security;
create policy "Users manage own sub_tasks" on sub_tasks
  for all using (
    auth.uid() = (
      select t.user_id from trips t
      join requirements r on r.trip_id = t.id
      where r.id = sub_tasks.requirement_id
    )
  );
create index sub_tasks_requirement_id_idx on sub_tasks(requirement_id);

-- Documents (Phase 3+)
create table documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null,
  layer text not null default 'compliance',
  trip_id uuid references trips(id) on delete set null,
  requirement_id uuid references requirements(id) on delete set null,
  file_url text not null,
  file_size bigint,
  mime_type text,
  upload_date timestamptz default now(),
  constraint valid_layer check (layer in ('compliance','travel_essentials','profile'))
);

alter table documents enable row level security;
create policy "Users manage own documents" on documents for all using (auth.uid() = user_id);
create index documents_user_id_idx on documents(user_id);
create index documents_trip_id_idx on documents(trip_id);
