-- ════════════════════════════════════════════════════════════════
-- MIGRATION: Lead images storage bucket and RLS policies
-- ════════════════════════════════════════════════════════════════

-- 1. Create the storage bucket for lead images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lead-images',
  'lead-images',
  true,
  2097152, -- 2MB per file
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- 2. RLS: Allow anon uploads only to the lead-images bucket with rate limiting via service role
create policy "lead_images_public_select"
  on storage.objects for select
  using (bucket_id = 'lead-images');

create policy "lead_images_auth_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'lead-images'
    and (storage.foldername(name))[1] = 'leads'
  );

-- 3. Allow public reads but restrict deletes to authenticated users
create policy "lead_images_auth_delete"
  on storage.objects for delete
  using (
    bucket_id = 'lead-images'
    and auth.role() = 'authenticated'
  );
