-- metriX — project branding / avatar upgrade
-- Run once in Supabase SQL Editor before deploying this UI bundle.

alter table public.projects
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-avatars',
  'project-avatars',
  true,
  2097152,
  array['image/png','image/jpeg','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Project avatars insert own folder" on storage.objects;
create policy "Project avatars insert own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'project-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Project avatars update own folder" on storage.objects;
create policy "Project avatars update own folder"
on storage.objects for update to authenticated
using (
  bucket_id = 'project-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'project-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Project avatars delete own folder" on storage.objects;
create policy "Project avatars delete own folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'project-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
