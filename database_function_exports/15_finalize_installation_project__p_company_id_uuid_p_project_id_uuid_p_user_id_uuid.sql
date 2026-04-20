CREATE OR REPLACE FUNCTION public.finalize_installation_project(p_company_id uuid, p_project_id uuid, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(project_id uuid, already_finalized boolean, inventory_consumed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_uid uuid;
  v_actor uuid;
  v_is_member boolean;
  v_project record;
  v_visit record;
  v_phases_total integer;
  v_phases_pending integer;
  v_post_total integer;
  v_post_pending integer;
  v_inventory record;
  v_req record;
  v_consumed boolean := false;
  v_idempotency_key text := 'finalize_v1';
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  v_actor := coalesce(p_user_id, v_uid);

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

  select ip.id, ip.budget_id, ip.status, ip.phases, ip.post_installation_checks_state
  into v_project
  from public.installation_projects ip
  where ip.id = p_project_id
    and ip.company_id = p_company_id
  for update;

  if v_project is null then
    raise exception 'Proyecto no encontrado';
  end if;

  if lower(coalesce(v_project.status, '')) = 'cancelado' then
    raise exception 'No se puede cerrar un proyecto cancelado';
  end if;

  if lower(coalesce(v_project.status, '')) = 'terminado' then
    return query select p_project_id, true, false;
    return;
  end if;

  select tv.id, tv.status
  into v_visit
  from public.technical_visits tv
  where tv.installation_project_id = p_project_id
  order by tv.created_at desc nulls last, tv.scheduled_start desc nulls last
  limit 1;

  if v_visit is null then
    raise exception 'Debes programar una visita tecnica antes de cerrar el proyecto';
  end if;

  if lower(coalesce(v_visit.status, '')) = 'cancelada' then
    raise exception 'La visita tecnica del proyecto esta cancelada. Reprograma primero';
  end if;

  select
    count(*)::integer,
    count(*) filter (
      where (
        case
          when jsonb_typeof(phase_item.value) = 'object'
            then coalesce((phase_item.value ->> 'done')::boolean, false) = false
          when jsonb_typeof(phase_item.value) = 'string'
            then true
          else true
        end
      )
      and (
        case
          when jsonb_typeof(phase_item.value) = 'object'
            then length(btrim(coalesce(phase_item.value ->> 'title', ''))) > 0
          when jsonb_typeof(phase_item.value) = 'string'
            then length(btrim(trim(both '"' from phase_item.value::text))) > 0
          else false
        end
      )
    )::integer
  into v_phases_total, v_phases_pending
  from jsonb_array_elements(coalesce(v_project.phases, '[]'::jsonb)) as phase_item(value)
  where (
    case
      when jsonb_typeof(phase_item.value) = 'object'
        then length(btrim(coalesce(phase_item.value ->> 'title', ''))) > 0
      when jsonb_typeof(phase_item.value) = 'string'
        then length(btrim(trim(both '"' from phase_item.value::text))) > 0
      else false
    end
  );

  if coalesce(v_phases_total, 0) = 0 then
    raise exception 'Debes definir al menos una fase en el plan del proyecto antes de cerrar';
  end if;

  if coalesce(v_phases_pending, 0) > 0 then
    raise exception 'No puedes cerrar: faltan fases del plan por completar';
  end if;

  select
    count(*)::integer,
    count(*) filter (
      where coalesce(
        (coalesce(v_project.post_installation_checks_state, '{}'::jsonb) -> (pci.id::text) ->> 'checked')::boolean,
        false
      ) = false
    )::integer
  into v_post_total, v_post_pending
  from public.post_installation_checks pc
  join public.post_installation_check_items pci on pci.checklist_id = pc.id
  where pc.company_id = p_company_id
    and pci.is_active = true;

  if coalesce(v_post_total, 0) = 0 then
    raise exception 'Debes configurar los items de pruebas post instalacion antes de cerrar';
  end if;

  if coalesce(v_post_pending, 0) > 0 then
    raise exception 'No puedes cerrar: faltan items en pruebas post instalacion';
  end if;

  if exists (
    select 1
    from public.installation_project_inventory_consumption c
    where c.company_id = p_company_id
      and c.project_id = p_project_id
      and c.idempotency_key = v_idempotency_key
    limit 1
  ) then
    v_consumed := false;
  else
    for v_req in
      select
        bi.id as budget_item_id,
        bi.device_id,
        greatest(coalesce(bi.quantity, 1), 1)::integer as required_qty
      from public.installation_projects ip
      join public.budget_items bi on bi.budget_id = ip.budget_id
      where ip.id = p_project_id
      order by bi.created_at asc, bi.id asc
    loop
      select di.id, di.quantity
      into v_inventory
      from public.device_inventory di
      where di.device_id = v_req.device_id
      for update;

      if v_inventory.id is null then
        raise exception 'Inventario no encontrado para el dispositivo requerido';
      end if;

      if coalesce(v_inventory.quantity, 0) < v_req.required_qty then
        raise exception 'Inventario insuficiente para completar la instalacion';
      end if;

      update public.device_inventory
      set quantity = quantity - v_req.required_qty,
          status = case
            when (quantity - v_req.required_qty) <= 0 then 'out_of_stock'
            when (quantity - v_req.required_qty) <= 5 then 'low_stock'
            else 'available'
          end,
          last_updated = now()
      where id = v_inventory.id;

      insert into public.installation_project_inventory_consumption (
        company_id,
        project_id,
        device_id,
        budget_item_id,
        idempotency_key,
        quantity,
        consumed_by,
        consumed_at
      )
      values (
        p_company_id,
        p_project_id,
        v_req.device_id,
        v_req.budget_item_id,
        v_idempotency_key,
        v_req.required_qty,
        v_actor,
        now()
      )
      on conflict do nothing;
    end loop;

    v_consumed := true;
  end if;

  update public.installation_projects
  set status = 'terminado',
      completed_at = coalesce(completed_at, now()),
      updated_at = now()
  where id = p_project_id;

  update public.technical_visits
  set status = 'completada',
      scheduled_end = coalesce(scheduled_end, now())
  where installation_project_id = p_project_id
    and status in ('programada', 'en_progreso');

  return query select p_project_id, false, v_consumed;
end;
$function$

