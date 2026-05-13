-- Authorizations (visas, permits, ETAs, rights to work or reside)
create table authorizations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  passport_id uuid references passports(id) on delete set null,
  name text not null,
  country text not null,
  country_code text not null,
  issue_date date not null,
  expiry_date date not null,
  created_at timestamptz default now()
);

alter table authorizations enable row level security;
create policy "Users manage own authorizations" on authorizations for all using (auth.uid() = user_id);
create index authorizations_user_id_idx on authorizations(user_id);
