-- SmartOps: Plans + subscriptions + RPC to change plan (all-in-one)
-- Run this in Supabase SQL Editor (or via CLI) to ensure the RPC exists:
--   public.change_company_plan(p_company_id uuid, p_plan_key text)

create extension if not exists pgcrypto;

-- 1) Core tables

create table if not exists public.pricing_plans (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text null,
  price numeric null,
  billing_cycle text not null default 'monthly',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pricing_plans_billing_cycle_check'
  ) then
    alter table public.pricing_plans
      add constraint pricing_plans_billing_cycle_check
      check (billing_cycle in ('monthly', 'annual'));
  end if;
end $$;

create unique index if not exists pricing_plans_key_uniq_idx on public.pricing_plans(key);

create table if not exists public.plan_limits (
  plan_id uuid primary key references public.pricing_plans(id) on delete cascade,
  max_clients integer null,
  max_sites integer null,
  max_devices integer null,
  max_technicians integer null,
  max_tickets_per_month integer null,
  allow_simulator boolean not null default false,
  allow_advanced_automations boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists plan_limits_plan_id_uniq_idx on public.plan_limits(plan_id);

create table if not exists public.company_subscriptions (
  company_id uuid primary key references public.companies(id) on delete cascade,
  plan_id uuid not null references public.pricing_plans(id) on delete restrict,
  status text not null default 'active',
  start_date timestamptz not null default now(),
  end_date timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'company_subscriptions_status_check'
  ) then
    alter table public.company_subscriptions
      add constraint company_subscriptions_status_check
      check (status in ('active', 'trialing', 'past_due', 'canceled'));
  end if;
end $$;

create index if not exists company_subscriptions_plan_idx on public.company_subscriptions(plan_id);
create unique index if not exists company_subscriptions_company_id_uniq_idx on public.company_subscriptions(company_id);

-- 2) Helper functions

create or replace function public.normalize_role_name(role_name text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(coalesce(role_name, '')), '[\\s_-]+', '', 'g');
$$;

create or replace function public.get_basic_plan_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.pricing_plans
  where key = 'basic'
  order by is_active desc, sort_order asc
  limit 1;
$$;

create or replace function public.ensure_company_subscription(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  basic_plan_id uuid;
begin
  if p_company_id is null then
    return;
  end if;

  if exists (select 1 from public.company_subscriptions cs where cs.company_id = p_company_id) then
    return;
  end if;

  basic_plan_id := public.get_basic_plan_id();
  if basic_plan_id is null then
    raise exception 'No existe el plan base (basic) para inicializar suscripciones.';
  end if;

  insert into public.company_subscriptions (company_id, plan_id, status, start_date)
  values (p_company_id, basic_plan_id, 'active', now())
  on conflict (company_id) do nothing;
end;
$$;

-- 3) Seed plans + limits (idempotent)

insert into public.pricing_plans (key, name, description, price, billing_cycle, is_active, sort_order)
values
  ('basic', 'Básico', 'Para empezar y organizar operaciones.', 0, 'monthly', true, 1),
  ('pro', 'Pro', 'Para equipos en crecimiento con más automatización.', 49, 'monthly', true, 2),
  ('enterprise', 'Enterprise', 'Para operaciones avanzadas y soporte dedicado.', 199, 'monthly', true, 3)
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  billing_cycle = excluded.billing_cycle,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.plan_limits (
  plan_id,
  max_clients,
  max_sites,
  max_devices,
  max_technicians,
  max_tickets_per_month,
  allow_simulator,
  allow_advanced_automations
)
select
  p.id,
  case p.key when 'basic' then 10 when 'pro' then 200 when 'enterprise' then null end as max_clients,
  case p.key when 'basic' then 5 when 'pro' then 100 when 'enterprise' then null end as max_sites,
  case p.key when 'basic' then 50 when 'pro' then 1000 when 'enterprise' then null end as max_devices,
  case p.key when 'basic' then 2 when 'pro' then 10 when 'enterprise' then null end as max_technicians,
  case p.key when 'basic' then 100 when 'pro' then 1000 when 'enterprise' then null end as max_tickets_per_month,
  case p.key when 'basic' then true when 'pro' then true when 'enterprise' then true end as allow_simulator,
  case p.key when 'basic' then false when 'pro' then true when 'enterprise' then true end as allow_advanced_automations
from public.pricing_plans p
where p.key in ('basic', 'pro', 'enterprise')
on conflict (plan_id) do update
set
  max_clients = excluded.max_clients,
  max_sites = excluded.max_sites,
  max_devices = excluded.max_devices,
  max_technicians = excluded.max_technicians,
  max_tickets_per_month = excluded.max_tickets_per_month,
  allow_simulator = excluded.allow_simulator,
  allow_advanced_automations = excluded.allow_advanced_automations,
  updated_at = now();

-- 4) RPC: change plan for a company (used by the app)

create or replace function public.change_company_plan(p_company_id uuid, p_plan_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id uuid;
  v_is_allowed boolean;
begin
  if p_company_id is null then
    raise exception 'company_id is required';
  end if;

  if auth.uid() is null then
    raise exception 'No authenticated user';
  end if;

  select id
  into v_plan_id
  from public.pricing_plans
  where key = p_plan_key
    and is_active = true
  limit 1;

  if v_plan_id is null then
    raise exception 'Invalid plan key: %', coalesce(p_plan_key, 'null');
  end if;

  -- Only allow authenticated members of the company that are not customers.
  if to_regclass('public.user_roles') is null or to_regclass('public.roles') is null then
    raise exception 'Missing required tables (user_roles/roles) to validate permissions';
  end if;

  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and ur.company_id = p_company_id
      and public.normalize_role_name(r.name) <> 'customer'
  )
  into v_is_allowed;

  if not v_is_allowed then
    raise exception using
      errcode = '42501',
      message = 'Not allowed to change plan for this company';
  end if;

  perform public.ensure_company_subscription(p_company_id);

  update public.company_subscriptions
  set
    plan_id = v_plan_id,
    status = 'active',
    end_date = null,
    updated_at = now()
  where company_id = p_company_id;
end;
$$;

grant execute on function public.change_company_plan(uuid, text) to authenticated;

-- 5) Force schema cache reload (best-effort)
do $$
begin
  perform pg_notify('pgrst', 'reload schema');
exception
  when insufficient_privilege then
    null;
end $$;

