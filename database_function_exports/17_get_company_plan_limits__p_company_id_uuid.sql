CREATE OR REPLACE FUNCTION public.get_company_plan_limits(p_company_id uuid)
 RETURNS TABLE(plan_key text, plan_name text, max_clients integer, max_sites integer, max_devices integer, max_technicians integer, max_tickets_per_month integer, allow_simulator boolean, allow_advanced_automations boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  basic_plan_id uuid;
begin
  perform public.ensure_company_subscription(p_company_id);

  return query
  select
    p.key,
    p.name,
    l.max_clients,
    l.max_sites,
    l.max_devices,
    l.max_technicians,
    l.max_tickets_per_month,
    coalesce(l.allow_simulator, false),
    coalesce(l.allow_advanced_automations, false)
  from public.company_subscriptions cs
  join public.pricing_plans p on p.id = cs.plan_id
  left join public.plan_limits l on l.plan_id = p.id
  where cs.company_id = p_company_id
    and cs.status in ('active', 'trialing', 'past_due')
  order by
    case cs.status
      when 'active' then 1
      when 'trialing' then 2
      when 'past_due' then 3
      else 4
    end,
    cs.start_date desc
  limit 1;

  if not found then
    basic_plan_id := public.get_basic_plan_id();
    if basic_plan_id is null then
      return;
    end if;

    return query
    select
      p.key,
      p.name,
      l.max_clients,
      l.max_sites,
      l.max_devices,
      l.max_technicians,
      l.max_tickets_per_month,
      coalesce(l.allow_simulator, false),
      coalesce(l.allow_advanced_automations, false)
    from public.pricing_plans p
    left join public.plan_limits l on l.plan_id = p.id
    where p.id = basic_plan_id
    limit 1;
  end if;
end;
$function$

