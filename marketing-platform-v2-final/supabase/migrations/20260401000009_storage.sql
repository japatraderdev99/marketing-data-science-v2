-- Migration 009 — Storage buckets for media and knowledge base

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media', 'media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4']),
  ('knowledge', 'knowledge', false, 20971520, array['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

-- Media bucket: workspace members can upload and read
create policy "workspace member uploads media"
  on storage.objects for insert
  with check (
    bucket_id = 'media'
    and auth.uid() is not null
  );

create policy "public reads media"
  on storage.objects for select
  using (bucket_id = 'media');

create policy "owner deletes media"
  on storage.objects for delete
  using (
    bucket_id = 'media'
    and auth.uid() = owner
  );

-- Knowledge bucket: workspace members can upload, only authenticated reads
create policy "workspace member uploads knowledge"
  on storage.objects for insert
  with check (
    bucket_id = 'knowledge'
    and auth.uid() is not null
  );

create policy "authenticated reads knowledge"
  on storage.objects for select
  using (
    bucket_id = 'knowledge'
    and auth.uid() is not null
  );

create policy "owner deletes knowledge"
  on storage.objects for delete
  using (
    bucket_id = 'knowledge'
    and auth.uid() = owner
  );
