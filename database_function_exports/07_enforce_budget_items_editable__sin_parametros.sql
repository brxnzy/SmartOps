CREATE OR REPLACE FUNCTION public.enforce_budget_items_editable()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_budget_id uuid;
  v_status text;
  v_has_ot boolean;
begin
  v_budget_id := coalesce(new.budget_id, old.budget_id);

  select b.status,
         exists (select 1 from public.installation_projects ip where ip.budget_id = b.id)
  into v_status, v_has_ot
  from public.budgets b
  where b.id = v_budget_id
  limit 1;

  if v_status is null then
    raise exception 'Presupuesto no encontrado para validar items';
  end if;

  if lower(coalesce(v_status, '')) <> 'borrador' then
    raise exception 'No se pueden modificar items cuando el presupuesto no esta en borrador';
  end if;

  if coalesce(v_has_ot, false) then
    raise exception 'No se pueden modificar items: la OT ya fue creada';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$function$

