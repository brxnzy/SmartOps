-- Add updated_at support for Customer Profile 360 tables

alter table if exists public.customer_installations
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.customer_devices
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.customer_contracts
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.invoices
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.payments
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.tickets
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.quotes
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.technical_visits
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_customer_profile_360_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_customer_installations_updated_at on public.customer_installations;
create trigger trg_customer_installations_updated_at
before update on public.customer_installations
for each row
execute function public.set_customer_profile_360_updated_at();

drop trigger if exists trg_customer_devices_updated_at on public.customer_devices;
create trigger trg_customer_devices_updated_at
before update on public.customer_devices
for each row
execute function public.set_customer_profile_360_updated_at();

drop trigger if exists trg_customer_contracts_updated_at on public.customer_contracts;
create trigger trg_customer_contracts_updated_at
before update on public.customer_contracts
for each row
execute function public.set_customer_profile_360_updated_at();

drop trigger if exists trg_invoices_updated_at on public.invoices;
create trigger trg_invoices_updated_at
before update on public.invoices
for each row
execute function public.set_customer_profile_360_updated_at();

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
before update on public.payments
for each row
execute function public.set_customer_profile_360_updated_at();

drop trigger if exists trg_tickets_updated_at on public.tickets;
create trigger trg_tickets_updated_at
before update on public.tickets
for each row
execute function public.set_customer_profile_360_updated_at();

drop trigger if exists trg_quotes_updated_at on public.quotes;
create trigger trg_quotes_updated_at
before update on public.quotes
for each row
execute function public.set_customer_profile_360_updated_at();

drop trigger if exists trg_technical_visits_updated_at on public.technical_visits;
create trigger trg_technical_visits_updated_at
before update on public.technical_visits
for each row
execute function public.set_customer_profile_360_updated_at();
