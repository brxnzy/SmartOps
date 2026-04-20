CREATE OR REPLACE FUNCTION public.change_company_plan(p_company_id uuid, p_plan_key text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan_id uuid;
  v_is_allowed boolean;
begin
  if p_company_id is null then
    raise exception 'company_id is required';
  end if;

  if auth.uid() is null then
    raise exception 'No authenticated user';
  end if;

  select id
  into v_plan_id
  from public.pricing_plans
  where key = p_plan_key
    and is_active = true
  limit 1;

  if v_plan_id is null then
    raise exception 'Invalid plan key: %', coalesce(p_plan_key, 'null');
  end if;

  -- Only allow authenticated members of the company that are not customers.
  if to_regclass('public.user_roles') is null or to_regclass('public.roles') is null then
    raise exception 'Missing required tables (user_roles/roles) to validate permissions';
  end if;

  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and ur.company_id = p_company_id
      and public.normalize_role_name(r.name) <> 'customer'
  )
  into v_is_allowed;

  if not v_is_allowed then
    raise exception using
      errcode = '42501',
      message = 'Not allowed to change plan for this company';
  end if;

  perform public.ensure_company_subscription(p_company_id);

  update public.company_subscriptions
  set
    plan_id = v_plan_id,
    status = 'active',
    end_date = null,
    updated_at = now()
  where company_id = p_company_id;
end;
$function$

