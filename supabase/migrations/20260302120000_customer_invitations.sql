-- Customer invitations flow

alter table public.customers
  add column if not exists user_id uuid references auth.users (id);

create unique index if not exists idx_customers_user_id_unique
  on public.customers (user_id)
  where user_id is not null;

create table if not exists public.customer_invitations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  invited_by uuid not null references auth.users (id),
  expires_at timestamptz not null,
  accepted_at timestamptz null,
  consumed_by_user_id uuid null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customer_invitations_customer
  on public.customer_invitations (customer_id);

create index if not exists idx_customer_invitations_company
  on public.customer_invitations (company_id);

create index if not exists idx_customer_invitations_email
  on public.customer_invitations (email);

create index if not exists idx_customer_invitations_expires_at
  on public.customer_invitations (expires_at);

create or replace function public.set_customer_invitations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_customer_invitations_updated_at on public.customer_invitations;
create trigger trg_customer_invitations_updated_at
before update on public.customer_invitations
for each row
execute function public.set_customer_invitations_updated_at();

alter table public.customer_invitations enable row level security;

drop policy if exists "customer_invitations_insert_same_company" on public.customer_invitations;
create policy "customer_invitations_insert_same_company"
on public.customer_invitations
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = customer_invitations.company_id
  )
);

drop policy if exists "customer_invitations_select_same_company" on public.customer_invitations;
create policy "customer_invitations_select_same_company"
on public.customer_invitations
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = customer_invitations.company_id
  )
);

drop policy if exists "customer_invitations_update_same_company" on public.customer_invitations;
create policy "customer_invitations_update_same_company"
on public.customer_invitations
for update
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = customer_invitations.company_id
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = customer_invitations.company_id
  )
);
