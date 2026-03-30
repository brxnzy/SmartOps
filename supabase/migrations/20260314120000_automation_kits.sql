create table if not exists public.automation_kits (
  id uuid not null default gen_random_uuid (),
  company_id uuid not null,
  name text not null,
  discount_percent numeric(5, 2) not null default 0,
  created_at timestamp with time zone not null default now(),
  constraint automation_kits_pkey primary key (id),
  constraint automation_kits_company_id_fkey foreign key (company_id) references companies (id) on update cascade on delete cascade,
  constraint automation_kits_discount_check check (discount_percent >= 0 and discount_percent <= 100)
) tablespace pg_default;

create table if not exists public.automation_kit_items (
  id uuid not null default gen_random_uuid (),
  kit_id uuid not null,
  device_id uuid not null,
  quantity integer not null,
  constraint automation_kit_items_pkey primary key (id),
  constraint automation_kit_items_kit_fkey foreign key (kit_id) references automation_kits (id) on delete cascade,
  constraint automation_kit_items_device_fkey foreign key (device_id) references devices (id) on delete restrict,
  constraint automation_kit_items_quantity_check check (quantity > 0)
) tablespace pg_default;

create index if not exists automation_kits_company_id_idx on public.automation_kits (company_id);
create index if not exists automation_kit_items_kit_id_idx on public.automation_kit_items (kit_id);
create index if not exists automation_kit_items_device_id_idx on public.automation_kit_items (device_id);

insert into public.permissions (code)
values
  ('kits.read'),
  ('kits.create'),
  ('kits.update'),
  ('kits.delete')
on conflict (code) do nothing;
