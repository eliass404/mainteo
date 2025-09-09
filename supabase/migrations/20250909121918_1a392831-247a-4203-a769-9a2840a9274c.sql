-- Create manuals bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('manuals', 'manuals', false)
on conflict (id) do nothing;

-- Enable RLS is already enabled on storage.objects by default

-- Allow admins to fully manage manuals
create policy if not exists "Admins can manage manuals"
  on storage.objects
  for all
  using (bucket_id = 'manuals' and is_admin())
  with check (bucket_id = 'manuals' and is_admin());

-- Allow admins to read manuals (explicit select for clarity)
create policy if not exists "Admins can read manuals"
  on storage.objects
  for select
  using (bucket_id = 'manuals' and is_admin());

-- Allow technicians to read (download) manuals
create policy if not exists "Technicians can read manuals"
  on storage.objects
  for select
  using (
    bucket_id = 'manuals'
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role = 'technicien'
    )
  );