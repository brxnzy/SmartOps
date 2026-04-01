-- Formal quotes (PDF + email)

create table if not exists public.budget_quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  budget_id uuid not null references public.budgets(id) on delete cascade,
  status text not null default 'borrador',
  quote_number text not null,
  valid_until timestamptz null,
  terms text null,
  pdf_path text null,
  sent_at timestamptz null,
  created_by uuid null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists budget_quotes_budget_idx on public.budget_quotes (budget_id);
create index if not exists budget_quotes_company_idx on public.budget_quotes (company_id);

alter table public.budget_quotes enable row level security;

create policy "Company members can read quotes" on public.budget_quotes
for select to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = budget_quotes.company_id
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

create policy "Company members can insert quotes" on public.budget_quotes
for insert to authenticated
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = budget_quotes.company_id
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

create policy "Company members can update quotes" on public.budget_quotes
for update to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = budget_quotes.company_id
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
      and ur.company_id = budget_quotes.company_id
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

-- Storage bucket for quotes
insert into storage.buckets (id, name, public)
values ('quotes_pdfs', 'quotes_pdfs', false)
on conflict (id) do nothing;

create policy "Company members can read quote pdfs" on storage.objects
for select to authenticated
using (bucket_id = 'quotes_pdfs');

create policy "Company members can upload quote pdfs" on storage.objects
for insert to authenticated
with check (bucket_id = 'quotes_pdfs');

create policy "Company members can update quote pdfs" on storage.objects
for update to authenticated
using (bucket_id = 'quotes_pdfs');
