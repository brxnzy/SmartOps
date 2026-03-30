-- Companies logos bucket and policies

insert into storage.buckets (id, name, public)
values ('companies_logos', 'companies_logos', true)
on conflict (id) do update set public = true;

create policy "Company members can upload logos" on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'companies_logos'
  and exists (
    select 1
    from user_roles
    where user_id = auth.uid()
      and company_id::text = split_part(name, '/', 1)
  )
);

create policy "Company members can update logos" on storage.objects
for update
to authenticated
using (
  bucket_id = 'companies_logos'
  and exists (
    select 1
    from user_roles
    where user_id = auth.uid()
      and company_id::text = split_part(name, '/', 1)
  )
)
with check (
  bucket_id = 'companies_logos'
  and exists (
    select 1
    from user_roles
    where user_id = auth.uid()
      and company_id::text = split_part(name, '/', 1)
  )
);

create policy "Company members can delete logos" on storage.objects
for delete
to authenticated
using (
  bucket_id = 'companies_logos'
  and exists (
    select 1
    from user_roles
    where user_id = auth.uid()
      and company_id::text = split_part(name, '/', 1)
  )
);
