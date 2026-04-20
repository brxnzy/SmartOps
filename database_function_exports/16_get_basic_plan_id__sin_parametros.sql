CREATE OR REPLACE FUNCTION public.get_basic_plan_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select id
  from public.pricing_plans
  where key = 'basic'
  order by is_active desc, sort_order asc
  limit 1;
$function$

