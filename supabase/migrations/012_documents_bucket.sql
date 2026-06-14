-- Create the private documents storage bucket.
-- The RLS policies that govern it are already in 002_storage_policies.sql.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;
