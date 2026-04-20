CREATE OR REPLACE FUNCTION public.upsert_installation_project_visit(p_company_id uuid, p_project_id uuid, p_technician_id uuid, p_scheduled_start timestamp with time zone, p_scheduled_end timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(technical_visit_id uuid, created boolean, visit_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_uid uuid;
  v_is_member boolean;
  v_project record;
  v_existing_visit record;
  v_visit_id uuid;
  v_created boolean := false;
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  if p_scheduled_end is not null and p_scheduled_end <= p_scheduled_start then
    raise exception 'La fecha/hora fin debe ser mayor que inicio';
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

  select ip.id, ip.status, b.survey_id
  into v_project
  from public.installation_projects ip
  join public.budgets b on b.id = ip.budget_id
  where ip.id = p_project_id
    and ip.company_id = p_company_id
  limit 1;

  if v_project is null then
    raise exception 'Proyecto no encontrado';
  end if;

  if lower(coalesce(v_project.status, '')) in ('terminado', 'cancelado') then
    raise exception 'No se puede programar visita para un proyecto terminado/cancelado';
  end if;

  select tv.id, tv.status
  into v_existing_visit
  from public.technical_visits tv
  where tv.installation_project_id = p_project_id
  order by tv.created_at desc nulls last, tv.scheduled_start desc nulls last
  limit 1;

  if v_existing_visit is not null then
    if lower(coalesce(v_existing_visit.status, '')) = 'completada' then
      raise exception 'No se puede reprogramar una visita completada';
    end if;

    update public.technical_visits
    set technician_id = p_technician_id,
        scheduled_start = p_scheduled_start,
        scheduled_end = p_scheduled_end,
        status = 'programada'
    where id = v_existing_visit.id
    returning id into v_visit_id;

    v_created := false;
  else
    insert into public.technical_visits (
      company_id,
      site_survey_id,
      ticket_id,
      installation_project_id,
      technician_id,
      scheduled_start,
      scheduled_end,
      status
    )
    values (
      p_company_id,
      v_project.survey_id,
      null,
      p_project_id,
      p_technician_id,
      p_scheduled_start,
      p_scheduled_end,
      'programada'
    )
    on conflict (installation_project_id)
    where installation_project_id is not null
    do update
      set technician_id = excluded.technician_id,
          scheduled_start = excluded.scheduled_start,
          scheduled_end = excluded.scheduled_end,
          status = 'programada'
    returning id into v_visit_id;

    v_created := true;
  end if;

  update public.installation_projects
  set responsible_user_id = p_technician_id,
      status = case when status = 'pendiente' then 'en_progreso' else status end,
      updated_at = now()
  where id = p_project_id;

  return query select v_visit_id, v_created, 'programada'::text;
end;
$function$

