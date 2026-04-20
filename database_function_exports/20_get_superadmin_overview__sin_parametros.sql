CREATE OR REPLACE FUNCTION public.get_superadmin_overview()
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
    where ur.company_id is not null
    order by ur.company_id, u.id
  ),
  company_payload as (
    select
      c.id,
      c.name,
      c.logo_url,
      c.created_at,
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
          where cm.company_id = c.id
        ),
        '[]'::jsonb
      ) as users,
      (
        select count(*)
        from company_members cm
        where cm.company_id = c.id
      ) as total_users
    from public.companies c
  )
  select jsonb_build_object(
    'companiesCount',
    count(*),
    'totalUsers',
    coalesce((select count(distinct cm.id) from company_members cm), 0),
    'companies',
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', cp.id,
          'name', cp.name,
          'logoUrl', cp.logo_url,
          'createdAt', cp.created_at,
          'users', cp.users,
          'totalUsers', cp.total_users
        )
        order by cp.created_at desc, cp.name asc
      ),
      '[]'::jsonb
    )
  )
  into v_result
  from company_payload cp;

  return coalesce(
    v_result,
    jsonb_build_object(
      'companiesCount', 0,
      'totalUsers', 0,
      'companies', '[]'::jsonb
    )
  );
end;
$function$

