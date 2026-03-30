-- Company permissions

insert into permissions (code)
values
  ('companies.read'),
  ('companies.create'),
  ('companies.update'),
  ('companies.delete')
on conflict (code) do nothing;
