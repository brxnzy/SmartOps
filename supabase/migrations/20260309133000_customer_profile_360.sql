-- Customer Profile 360 domain tables + seed data

create table if not exists public.customer_installations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  address text not null,
  status text not null default 'active',
  is_main boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_devices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.users (id) on delete cascade,
  installation_id uuid null references public.customer_installations (id) on delete set null,
  name text not null,
  serial text null,
  status text not null default 'online',
  created_at timestamptz not null default now()
);

create table if not exists public.customer_contracts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.users (id) on delete cascade,
  plan_name text not null,
  status text not null default 'active',
  amount numeric(12, 2) null,
  currency text not null default 'DOP',
  start_date date null,
  end_date date null,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.users (id) on delete cascade,
  number text not null,
  status text not null default 'pending',
  amount numeric(12, 2) null,
  currency text not null default 'DOP',
  issued_at date null,
  due_at date null,
  paid_at date null,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.users (id) on delete cascade,
  invoice_id uuid null references public.invoices (id) on delete set null,
  reference text not null,
  status text not null default 'applied',
  amount numeric(12, 2) null,
  currency text not null default 'DOP',
  paid_at date null,
  created_at timestamptz not null default now()
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.users (id) on delete cascade,
  code text not null,
  title text not null,
  priority text not null default 'media',
  status text not null default 'abierto',
  created_at timestamptz not null default now(),
  closed_at timestamptz null
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.users (id) on delete cascade,
  code text not null,
  title text not null,
  status text not null default 'pendiente',
  amount numeric(12, 2) null,
  currency text not null default 'DOP',
  created_at timestamptz not null default now()
);

create table if not exists public.technical_visits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  status text not null default 'completada',
  technician_name text null,
  scheduled_at timestamptz null,
  finished_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists idx_customer_installations_company_customer
  on public.customer_installations (company_id, customer_id);
create index if not exists idx_customer_devices_company_customer
  on public.customer_devices (company_id, customer_id);
create index if not exists idx_customer_contracts_company_customer
  on public.customer_contracts (company_id, customer_id);
create index if not exists idx_invoices_company_customer
  on public.invoices (company_id, customer_id);
create index if not exists idx_payments_company_customer
  on public.payments (company_id, customer_id);
create index if not exists idx_tickets_company_customer
  on public.tickets (company_id, customer_id);
create index if not exists idx_quotes_company_customer
  on public.quotes (company_id, customer_id);
create index if not exists idx_technical_visits_company_customer
  on public.technical_visits (company_id, customer_id);

alter table public.customer_installations enable row level security;
alter table public.customer_devices enable row level security;
alter table public.customer_contracts enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.tickets enable row level security;
alter table public.quotes enable row level security;
alter table public.technical_visits enable row level security;

drop policy if exists "customer_installations_same_company_all" on public.customer_installations;
create policy "customer_installations_same_company_all"
on public.customer_installations
for all
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = customer_installations.company_id
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = customer_installations.company_id
  )
);

drop policy if exists "customer_devices_same_company_all" on public.customer_devices;
create policy "customer_devices_same_company_all"
on public.customer_devices
for all
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = customer_devices.company_id
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = customer_devices.company_id
  )
);

drop policy if exists "customer_contracts_same_company_all" on public.customer_contracts;
create policy "customer_contracts_same_company_all"
on public.customer_contracts
for all
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = customer_contracts.company_id
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = customer_contracts.company_id
  )
);

drop policy if exists "invoices_same_company_all" on public.invoices;
create policy "invoices_same_company_all"
on public.invoices
for all
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = invoices.company_id
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = invoices.company_id
  )
);

drop policy if exists "payments_same_company_all" on public.payments;
create policy "payments_same_company_all"
on public.payments
for all
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = payments.company_id
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = payments.company_id
  )
);

drop policy if exists "tickets_same_company_all" on public.tickets;
create policy "tickets_same_company_all"
on public.tickets
for all
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = tickets.company_id
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = tickets.company_id
  )
);

drop policy if exists "quotes_same_company_all" on public.quotes;
create policy "quotes_same_company_all"
on public.quotes
for all
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = quotes.company_id
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = quotes.company_id
  )
);

drop policy if exists "technical_visits_same_company_all" on public.technical_visits;
create policy "technical_visits_same_company_all"
on public.technical_visits
for all
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = technical_visits.company_id
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = technical_visits.company_id
  )
);

with customer_scope as (
  select distinct
    ur.company_id,
    ur.user_id as customer_id,
    u.name as customer_name
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  join public.users u on u.id = ur.user_id
  where lower(r.name) = 'customer'
)
insert into public.customer_installations (
  company_id,
  customer_id,
  name,
  address,
  status,
  is_main
)
select
  cs.company_id,
  cs.customer_id,
  'Sede Principal',
  'Av. Winston Churchill 1100, Santo Domingo',
  'active',
  true
from customer_scope cs
where not exists (
  select 1
  from public.customer_installations ci
  where ci.company_id = cs.company_id
    and ci.customer_id = cs.customer_id
);

with customer_scope as (
  select distinct
    ur.company_id,
    ur.user_id as customer_id
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where lower(r.name) = 'customer'
)
insert into public.customer_devices (
  company_id,
  customer_id,
  installation_id,
  name,
  serial,
  status
)
select
  cs.company_id,
  cs.customer_id,
  ci.id as installation_id,
  payload.name,
  payload.serial,
  payload.status
from customer_scope cs
join public.customer_installations ci
  on ci.company_id = cs.company_id
 and ci.customer_id = cs.customer_id
 and ci.is_main = true
cross join lateral (
  values
    ('Router Edge', 'RTR-' || substring(cs.customer_id::text, 1, 8), 'online'),
    ('ONU Fibra', 'ONU-' || substring(cs.customer_id::text, 1, 8), 'online')
) as payload(name, serial, status)
where not exists (
  select 1
  from public.customer_devices cd
  where cd.company_id = cs.company_id
    and cd.customer_id = cs.customer_id
);

with customer_scope as (
  select distinct
    ur.company_id,
    ur.user_id as customer_id
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where lower(r.name) = 'customer'
)
insert into public.customer_contracts (
  company_id,
  customer_id,
  plan_name,
  status,
  amount,
  currency,
  start_date,
  end_date
)
select
  cs.company_id,
  cs.customer_id,
  'Plan Empresarial 500 Mbps',
  'active',
  4500.00,
  'DOP',
  current_date - interval '3 months',
  current_date + interval '9 months'
from customer_scope cs
where not exists (
  select 1
  from public.customer_contracts cc
  where cc.company_id = cs.company_id
    and cc.customer_id = cs.customer_id
);

with customer_scope as (
  select distinct
    ur.company_id,
    ur.user_id as customer_id
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where lower(r.name) = 'customer'
)
insert into public.invoices (
  company_id,
  customer_id,
  number,
  status,
  amount,
  currency,
  issued_at,
  due_at,
  paid_at
)
select
  cs.company_id,
  cs.customer_id,
  'INV-' || upper(substring(cs.customer_id::text, 1, 6)),
  'pending',
  4500.00,
  'DOP',
  current_date - interval '10 days',
  current_date + interval '20 days',
  null
from customer_scope cs
where not exists (
  select 1
  from public.invoices i
  where i.company_id = cs.company_id
    and i.customer_id = cs.customer_id
);

with customer_scope as (
  select distinct
    ur.company_id,
    ur.user_id as customer_id
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where lower(r.name) = 'customer'
)
insert into public.tickets (
  company_id,
  customer_id,
  code,
  title,
  priority,
  status,
  created_at
)
select
  cs.company_id,
  cs.customer_id,
  'TK-' || upper(substring(cs.customer_id::text, 1, 6)),
  'Intermitencia en enlace principal',
  'alta',
  'abierto',
  now() - interval '2 days'
from customer_scope cs
where not exists (
  select 1
  from public.tickets t
  where t.company_id = cs.company_id
    and t.customer_id = cs.customer_id
);

with customer_scope as (
  select distinct
    ur.company_id,
    ur.user_id as customer_id
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where lower(r.name) = 'customer'
)
insert into public.quotes (
  company_id,
  customer_id,
  code,
  title,
  status,
  amount,
  currency
)
select
  cs.company_id,
  cs.customer_id,
  'QT-' || upper(substring(cs.customer_id::text, 1, 6)),
  'Expansion de cobertura en nueva sucursal',
  'pendiente',
  28000.00,
  'DOP'
from customer_scope cs
where not exists (
  select 1
  from public.quotes q
  where q.company_id = cs.company_id
    and q.customer_id = cs.customer_id
);

with customer_scope as (
  select distinct
    ur.company_id,
    ur.user_id as customer_id
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where lower(r.name) = 'customer'
)
insert into public.technical_visits (
  company_id,
  customer_id,
  title,
  status,
  technician_name,
  scheduled_at,
  finished_at
)
select
  cs.company_id,
  cs.customer_id,
  'Mantenimiento preventivo trimestral',
  'completada',
  'Ricardo Mendez',
  now() - interval '6 days',
  now() - interval '6 days' + interval '90 minutes'
from customer_scope cs
where not exists (
  select 1
  from public.technical_visits tv
  where tv.company_id = cs.company_id
    and tv.customer_id = cs.customer_id
);
