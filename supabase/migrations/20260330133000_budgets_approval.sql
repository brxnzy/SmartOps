-- Budgets, items, and approval links

create extension if not exists pgcrypto;

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  survey_id uuid not null references public.site_surveys(id) on delete cascade,
  status text not null default 'borrador',
  created_by uuid null references public.users(id),
  approval_method text null,
  approval_notes text null,
  approved_by_user_id uuid null references public.users(id),
  approved_at timestamptz null,
  rejected_at timestamptz null,
  sent_at timestamptz null,
  expires_at timestamptz null,
  layout_json jsonb not null default '{}'::jsonb,
  subtotal numeric not null default 0,
  tax_rate numeric not null default 0,
  tax_amount numeric not null default 0,
  total numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budget_items (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  device_id uuid not null references public.devices(id),
  zone_id uuid null references public.customer_site_zones(id),
  quantity integer not null default 0,
  unit_price numeric not null default 0,
  subtotal numeric not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists budget_items_unique on public.budget_items (budget_id, device_id, zone_id);

create table if not exists public.budget_approval_links (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  token_hash bytea not null,
  expires_at timestamptz not null,
  used_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists budget_approval_links_token_hash_idx on public.budget_approval_links (token_hash);

-- RLS
alter table public.budgets enable row level security;
alter table public.budget_items enable row level security;
alter table public.budget_approval_links enable row level security;

create policy "Company members can read budgets" on public.budgets
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = budgets.company_id
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

create policy "Company members can insert budgets" on public.budgets
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = budgets.company_id
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

create policy "Company members can update budgets" on public.budgets
for update
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = budgets.company_id
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
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = budgets.company_id
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

create policy "Company members can delete budgets" on public.budgets
for delete
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = budgets.company_id
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

create policy "Company members can read budget items" on public.budget_items
for select
to authenticated
using (
  exists (
    select 1
    from public.budgets b
    join public.user_roles ur on ur.company_id = b.company_id
    where b.id = budget_items.budget_id
      and ur.user_id = auth.uid()
  )
);

create policy "Company members can insert budget items" on public.budget_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.budgets b
    join public.user_roles ur on ur.company_id = b.company_id
    where b.id = budget_items.budget_id
      and ur.user_id = auth.uid()
  )
);

create policy "Company members can update budget items" on public.budget_items
for update
to authenticated
using (
  exists (
    select 1
    from public.budgets b
    join public.user_roles ur on ur.company_id = b.company_id
    where b.id = budget_items.budget_id
      and ur.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.budgets b
    join public.user_roles ur on ur.company_id = b.company_id
    where b.id = budget_items.budget_id
      and ur.user_id = auth.uid()
  )
);

create policy "Company members can delete budget items" on public.budget_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.budgets b
    join public.user_roles ur on ur.company_id = b.company_id
    where b.id = budget_items.budget_id
      and ur.user_id = auth.uid()
  )
);

create policy "Company members can read approval links" on public.budget_approval_links
for select
to authenticated
using (
  exists (
    select 1
    from public.budgets b
    join public.user_roles ur on ur.company_id = b.company_id
    where b.id = budget_approval_links.budget_id
      and ur.user_id = auth.uid()
  )
);

create policy "Company members can insert approval links" on public.budget_approval_links
for insert
to authenticated
with check (
  exists (
    select 1
    from public.budgets b
    join public.user_roles ur on ur.company_id = b.company_id
    where b.id = budget_approval_links.budget_id
      and ur.user_id = auth.uid()
  )
);

create policy "Company members can update approval links" on public.budget_approval_links
for update
to authenticated
using (
  exists (
    select 1
    from public.budgets b
    join public.user_roles ur on ur.company_id = b.company_id
    where b.id = budget_approval_links.budget_id
      and ur.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.budgets b
    join public.user_roles ur on ur.company_id = b.company_id
    where b.id = budget_approval_links.budget_id
      and ur.user_id = auth.uid()
  )
);

-- Secure approval link functions
create or replace function public.create_budget_approval_link(
  p_budget_id uuid,
  p_token text,
  p_expires_at timestamptz
) returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_link_id uuid;
  v_budget_company uuid;
begin
  select company_id into v_budget_company from public.budgets where id = p_budget_id;
  if v_budget_company is null then
    raise exception 'Presupuesto no encontrado';
  end if;

  insert into public.budget_approval_links (budget_id, token_hash, expires_at)
  values (p_budget_id, digest(p_token, 'sha256'), p_expires_at)
  returning id into v_link_id;

  update public.budgets
  set status = 'enviada',
      sent_at = now(),
      expires_at = p_expires_at,
      updated_at = now()
  where id = p_budget_id;

  return v_link_id;
end;
$$;

create or replace function public.approve_budget_by_token(
  p_token text,
  p_decision text,
  p_notes text
) returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_link record;
  v_status text;
begin
  select id, budget_id, expires_at, used_at
  into v_link
  from public.budget_approval_links
  where token_hash = digest(p_token, 'sha256')
  limit 1;

  if v_link is null then
    raise exception 'Link invalido';
  end if;

  if v_link.used_at is not null then
    raise exception 'Link ya utilizado';
  end if;

  if v_link.expires_at < now() then
    raise exception 'Link expirado';
  end if;

  if lower(p_decision) not in ('aprobar', 'rechazar') then
    raise exception 'Decision invalida';
  end if;

  v_status := case when lower(p_decision) = 'aprobar' then 'aprobada' else 'rechazada' end;

  update public.budgets
  set status = v_status,
      approval_method = 'link',
      approval_notes = p_notes,
      approved_at = case when v_status = 'aprobada' then now() else null end,
      rejected_at = case when v_status = 'rechazada' then now() else null end,
      updated_at = now()
  where id = v_link.budget_id;

  update public.budget_approval_links
  set used_at = now()
  where id = v_link.id;

  return v_link.budget_id;
end;
$$;

grant execute on function public.create_budget_approval_link(uuid, text, timestamptz) to authenticated;
grant execute on function public.approve_budget_by_token(text, text, text) to anon, authenticated;
