-- Customer site attachments support

create table if not exists public.customer_site_attachments (
  id uuid primary key default gen_random_uuid(),
  customer_site_id uuid not null references public.customer_sites (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  file_name text not null,
  file_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_customer_site_attachments_company_site
  on public.customer_site_attachments (company_id, customer_site_id);

alter table if exists public.customer_site_attachments enable row level security;

drop policy if exists "customer_site_attachments_same_company_all" on public.customer_site_attachments;
create policy "customer_site_attachments_same_company_all"
on public.customer_site_attachments
for all
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = customer_site_attachments.company_id
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = customer_site_attachments.company_id
  )
);

drop policy if exists "customer_site_attachments_bucket_access" on storage.objects;
create policy "customer_site_attachments_bucket_access"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'customer-site-attachments'
  and exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id::text = split_part(name, '/', 1)
  )
)
with check (
  bucket_id = 'customer-site-attachments'
  and exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id::text = split_part(name, '/', 1)
  )
);
