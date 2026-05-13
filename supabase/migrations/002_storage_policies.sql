-- Storage RLS policies for documents bucket
-- Run AFTER creating the 'documents' bucket in Supabase Dashboard (Storage → New bucket → private)

create policy "Users can upload own documents"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view own documents"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own documents"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
