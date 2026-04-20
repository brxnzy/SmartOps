CREATE OR REPLACE FUNCTION public.create_installation_project(p_company_id uuid, p_budget_id uuid, p_technician_id uuid DEFAULT NULL::uuid, p_scheduled_start timestamp with time zone DEFAULT NULL::timestamp with time zone, p_scheduled_end timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(project_id uuid, technical_visit_id uuid, created boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_budget record;
  v_project_id uuid;
  v_visit_id uuid;
  v_uid uuid;
  v_is_member boolean;
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = v_uid
      and ur.company_id = p_company_id
  )
  or exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = v_uid
      and ur.company_id is null
      and lower(r.name) = 'admin'
  )
  into v_is_member;

  if not coalesce(v_is_member, false) then
    raise exception 'No autorizado para esta compania';
  end if;

  select b.id, b.status, b.survey_id, ss.site_id
  into v_budget
  from public.budgets b
  join public.site_surveys ss on ss.id = b.survey_id
  where b.id = p_budget_id
    and b.company_id = p_company_id;

  if v_budget is null then
    raise exception 'Presupuesto no encontrado';
  end if;

  if lower(coalesce(v_budget.status, '')) <> 'aprobada' then
    raise exception 'No se puede crear OT: la cotizacion no esta aprobada';
  end if;

  select id into v_project_id
  from public.installation_projects
  where budget_id = p_budget_id
  limit 1;

  if v_project_id is not null then
    select id into v_visit_id
    from public.technical_visits
    where installation_project_id = v_project_id
    order by scheduled_start asc nulls last
    limit 1;

    return query select v_project_id, v_visit_id, false;
    return;
  end if;

  insert into public.installation_projects (
    company_id,
    budget_id,
    site_id,
    responsible_user_id,
    status,
    created_at,
    updated_at
  )
  values (
    p_company_id,
    p_budget_id,
    v_budget.site_id,
    null,
    'pendiente',
    now(),
    now()
  )
  returning id into v_project_id;

  return query select v_project_id, null::uuid, true;
end;
$function$

