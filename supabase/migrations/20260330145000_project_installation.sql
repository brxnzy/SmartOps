-- Project installation + technical visit link

create table if not exists public.proyect_instalation (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  budget_id uuid not null references public.budgets(id) on delete cascade,
  survey_id uuid not null references public.site_surveys(id) on delete cascade,
  technical_visit_id bigint null references public.technical_visits(id),
  status text not null default 'pendiente',
  created_by uuid null references public.users(id),
  created_at timestamptz not null default now()
);

create unique index if not exists proyect_instalation_budget_idx on public.proyect_instalation (budget_id);

alter table public.proyect_instalation enable row level security;

create policy "Company members can read installations" on public.proyect_instalation
for select to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = proyect_instalation.company_id
  )
  or exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and ur.company_id is null
      and lower(r.name) = 'admin'
  )
);

create policy "Company members can insert installations" on public.proyect_instalation
for insert to authenticated
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = proyect_instalation.company_id
  )
  or exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and ur.company_id is null
      and lower(r.name) = 'admin'
  )
);

create policy "Company members can update installations" on public.proyect_instalation
for update to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = proyect_instalation.company_id
  )
  or exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and ur.company_id is null
      and lower(r.name) = 'admin'
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = proyect_instalation.company_id
  )
  or exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and ur.company_id is null
      and lower(r.name) = 'admin'
  )
);
