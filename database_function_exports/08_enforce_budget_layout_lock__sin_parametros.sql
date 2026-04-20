CREATE OR REPLACE FUNCTION public.enforce_budget_layout_lock()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if (
    new.layout_json is distinct from old.layout_json
    or new.subtotal is distinct from old.subtotal
    or new.tax_rate is distinct from old.tax_rate
    or new.tax_amount is distinct from old.tax_amount
    or new.total is distinct from old.total
  ) then
    if lower(coalesce(old.status, '')) <> 'borrador' then
      raise exception 'No se puede modificar el plano/totales cuando el presupuesto no esta en borrador';
    end if;

    if exists (
      select 1
      from public.installation_projects ip
      where ip.budget_id = old.id
    ) then
      raise exception 'No se puede modificar el plano/totales: la OT ya fue creada';
    end if;
  end if;

  return new;
end;
$function$

