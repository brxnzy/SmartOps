-- Users photos bucket and policies

insert into storage.buckets (id, name, public)
values ('users_photos', 'users_photos', true)
on conflict (id) do update set public = true;

create policy "Users can upload own photo" on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'users_photos'
  and name = auth.uid()::text
);

create policy "Users can update own photo" on storage.objects
for update
to authenticated
using (
  bucket_id = 'users_photos'
  and name = auth.uid()::text
)
with check (
  bucket_id = 'users_photos'
  and name = auth.uid()::text
);

create policy "Users can delete own photo" on storage.objects
for delete
to authenticated
using (
  bucket_id = 'users_photos'
  and name = auth.uid()::text
);
