CREATE OR REPLACE FUNCTION public.ensure_company_subscription(p_company_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  basic_plan_id uuid;
begin
  if p_company_id is null then
    return;
  end if;

  if exists (select 1 from public.company_subscriptions cs where cs.company_id = p_company_id) then
    return;
  end if;

  basic_plan_id := public.get_basic_plan_id();
  if basic_plan_id is null then
    raise exception 'No existe el plan base (basic) para inicializar suscripciones.';
  end if;

  insert into public.company_subscriptions (company_id, plan_id, status, start_date)
  values (p_company_id, basic_plan_id, 'active', now())
  on conflict (company_id) do nothing;
end;
$function$

