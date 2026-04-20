CREATE OR REPLACE FUNCTION public.raise_limit_exceeded(p_company_id uuid, p_resource text, p_limit integer, p_current integer, p_plan_key text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  raise exception using
    errcode = 'P0001',
    message = json_build_object(
      'error', 'limit_exceeded',
      'resource', coalesce(p_resource, 'unknown'),
      'companyId', p_company_id,
      'limit', p_limit,
      'current', p_current,
      'planKey', coalesce(p_plan_key, 'unknown')
    )::text;
end;
$function$

