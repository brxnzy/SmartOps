-- Allow multiple installations per budget (history)

drop index if exists public.proyect_instalation_budget_idx;

create index if not exists proyect_instalation_budget_idx on public.proyect_instalation (budget_id);
