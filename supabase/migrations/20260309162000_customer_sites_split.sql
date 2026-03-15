-- Separate sites from installations for Customer 360

create table if not exists public.customer_sites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  address text not null,
  city text null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customer_sites_company_customer
  on public.customer_sites (company_id, customer_id);

alter table if exists public.customer_sites enable row level security;

drop policy if exists "customer_sites_same_company_all" on public.customer_sites;
create policy "customer_sites_same_company_all"
on public.customer_sites
for all
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = customer_sites.company_id
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = customer_sites.company_id
  )
);

alter table if exists public.customer_installations
  add column if not exists site_id uuid null references public.customer_sites (id) on delete set null;

alter table if exists public.customer_installations
  add column if not exists work_description text null;

-- Seed sites from current installations if they do not exist yet.
insert into public.customer_sites (company_id, customer_id, name, address, city, status)
select distinct
  ci.company_id,
  ci.customer_id,
  coalesce(nullif(trim(ci.name), ''), 'Sitio principal') as name,
  coalesce(nullif(trim(ci.address), ''), 'Direccion no definida') as address,
  null as city,
  coalesce(nullif(trim(ci.status), ''), 'active') as status
from public.customer_installations ci
where not exists (
  select 1
  from public.customer_sites cs
  where cs.company_id = ci.company_id
    and cs.customer_id = ci.customer_id
    and lower(cs.address) = lower(coalesce(nullif(trim(ci.address), ''), 'Direccion no definida'))
);

-- Link installations to sites by customer/company/address.
update public.customer_installations ci
set site_id = cs.id
from public.customer_sites cs
where ci.site_id is null
  and ci.company_id = cs.company_id
  and ci.customer_id = cs.customer_id
  and lower(coalesce(nullif(trim(ci.address), ''), 'direccion no definida')) =
      lower(coalesce(nullif(trim(cs.address), ''), 'direccion no definida'));

-- Backfill installation work description.
update public.customer_installations
set work_description = coalesce(work_description, name)
where work_description is null;

drop trigger if exists trg_customer_sites_updated_at on public.customer_sites;
create trigger trg_customer_sites_updated_at
before update on public.customer_sites
for each row
execute function public.set_customer_profile_360_updated_at();
