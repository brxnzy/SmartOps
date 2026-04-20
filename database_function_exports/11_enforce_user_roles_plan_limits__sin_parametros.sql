CREATE OR REPLACE FUNCTION public.enforce_user_roles_plan_limits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  role_norm text;
  limits record;
  current_count integer;
begin
  if new.company_id is null then
    return new;
  end if;

  select public.normalize_role_name(r.name)
    into role_norm
  from public.roles r
  where r.id = new.role_id;

  if role_norm is null then
    return new;
  end if;

  select * into limits
  from public.get_company_plan_limits(new.company_id);

  -- Clientes (rol customer) -> max_clients
  if role_norm = 'customer' then
    if limits.max_clients is null then
      return new;
    end if;

    select count(*) into current_count
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.company_id = new.company_id
      and public.normalize_role_name(r.name) = 'customer';

    if current_count >= limits.max_clients then
      perform public.raise_limit_exceeded(new.company_id, 'clients', limits.max_clients, current_count, limits.plan_key);
    end if;

    return new;
  end if;

  -- Cualquier miembro NO customer cuenta como "usuario interno" -> max_technicians
  if limits.max_technicians is null then
    return new;
  end if;

  select count(*) into current_count
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.company_id = new.company_id
    and public.normalize_role_name(r.name) <> 'customer';

  if current_count >= limits.max_technicians then
    perform public.raise_limit_exceeded(new.company_id, 'technicians', limits.max_technicians, current_count, limits.plan_key);
  end if;

  return new;
end;
$function$

