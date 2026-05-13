-- Add origin country to trips (nullable — only set for manually logged history entries)
alter table trips
  add column origin_country text,
  add column origin_country_code text;

-- Link authorizations to their evidence document
alter table authorizations
  add column document_id uuid references documents(id) on delete set null;
