CREATE OR REPLACE FUNCTION public.get_superadmin_company_detail(p_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_caller_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_caller_user_id is null then
    raise exception 'Debes iniciar sesion para consultar este modulo.';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = v_caller_user_id
      and lower(regexp_replace(coalesce(r.name, ''), '[\s_-]+', '', 'g')) = 'superadmin'
  ) then
    raise exception 'Solo un superadmin puede consultar este modulo.';
  end if;

  with company_members as (
    select distinct on (ur.company_id, u.id)
      ur.company_id,
      u.id,
      u.name,
      u.id_card,
      u.photo_url,
      au.email
    from public.user_roles ur
    join public.users u on u.id = ur.user_id
    left join auth.users au on au.id = u.id
    where ur.company_id = p_company_id
    order by ur.company_id, u.id
  )
  select jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'logoUrl', c.logo_url,
    'createdAt', c.created_at,
    'users',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', cm.id,
            'name', cm.name,
            'idCard', cm.id_card,
            'email', cm.email,
            'photoUrl', cm.photo_url
          )
          order by lower(cm.name), cm.id
        )
        from company_members cm
      ),
      '[]'::jsonb
    ),
    'totalUsers',
    (select count(*) from company_members)
  )
  into v_result
  from public.companies c
  where c.id = p_company_id;

  if v_result is null then
    raise exception 'La compania solicitada no existe.';
  end if;

  return v_result;
end;
$function$

