CREATE OR REPLACE FUNCTION public.enforce_budget_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.status is distinct from old.status then
    if new.status in ('aprobada', 'rechazada') and old.status <> 'enviada' then
      raise exception 'Solo se puede aprobar/rechazar una cotizacion enviada';
    end if;
  end if;

  return new;
end;
$function$

