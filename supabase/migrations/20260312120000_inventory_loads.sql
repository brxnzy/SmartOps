create table if not exists public.inventory_loads (
  id uuid not null default gen_random_uuid (),
  company_id uuid not null,
  supplier_id uuid not null,
  created_at timestamp with time zone not null default now(),
  constraint inventory_loads_pkey primary key (id),
  constraint inventory_loads_company_id_fkey foreign key (company_id) references companies (id) on update cascade on delete cascade,
  constraint inventory_loads_supplier_id_fkey foreign key (supplier_id) references suppliers (id) on update cascade on delete restrict
) tablespace pg_default;

create table if not exists public.inventory_load_items (
  id uuid not null default gen_random_uuid (),
  inventory_load_id uuid not null,
  device_id uuid not null,
  quantity integer not null,
  constraint inventory_load_items_pkey primary key (id),
  constraint inventory_load_items_load_fkey foreign key (inventory_load_id) references inventory_loads (id) on delete cascade,
  constraint inventory_load_items_device_fkey foreign key (device_id) references devices (id) on delete restrict,
  constraint inventory_load_items_quantity_check check (quantity > 0)
) tablespace pg_default;

create index if not exists inventory_loads_company_id_idx on public.inventory_loads (company_id);
create index if not exists inventory_loads_supplier_id_idx on public.inventory_loads (supplier_id);
create index if not exists inventory_loads_created_at_idx on public.inventory_loads (created_at desc);
create index if not exists inventory_load_items_load_id_idx on public.inventory_load_items (inventory_load_id);
create index if not exists inventory_load_items_device_id_idx on public.inventory_load_items (device_id);

insert into public.permissions (code)
values
  ('inventory.loads.read'),
  ('inventory.loads.create')
on conflict (code) do nothing;
