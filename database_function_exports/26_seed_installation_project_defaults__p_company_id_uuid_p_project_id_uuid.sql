CREATE OR REPLACE FUNCTION public.seed_installation_project_defaults(p_company_id uuid, p_project_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_uid uuid;
  v_is_member boolean;
  v_project record;
  v_checklist_id uuid;
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

  select ip.id, ip.company_id, ip.budget_id
  into v_project
  from public.installation_projects ip
  where ip.id = p_project_id
    and ip.company_id = p_company_id
  limit 1;

  if v_project is null then
    raise exception 'Proyecto no encontrado';
  end if;

  insert into public.installation_project_tasks (
    company_id,
    project_id,
    code,
    title,
    position,
    status
  )
  values
    (p_company_id, p_project_id, 'cableado', 'Cableado', 0, 'pendiente'),
    (p_company_id, p_project_id, 'configuracion_hub', 'Configuracion hub', 1, 'pendiente'),
    (p_company_id, p_project_id, 'emparejamiento', 'Emparejamiento', 2, 'pendiente'),
    (p_company_id, p_project_id, 'pruebas', 'Pruebas', 3, 'pendiente'),
    (p_company_id, p_project_id, 'capacitacion', 'Capacitacion', 4, 'pendiente')
  on conflict (project_id, code)
  where code is not null
  do nothing;

  v_checklist_id := public.ensure_post_installation_checklist(p_company_id);

  update public.installation_projects ip
  set post_installation_checks_state = (
    select coalesce(
      jsonb_object_agg(
        pci.id::text,
        coalesce(
          ip.post_installation_checks_state -> (pci.id::text),
          jsonb_build_object(
            'checked', false,
            'notes', null,
            'checked_at', null,
            'checked_by', null
          )
        )
      ),
      '{}'::jsonb
    )
    from public.post_installation_check_items pci
    where pci.checklist_id = v_checklist_id
      and pci.is_active = true
  ),
  updated_at = now()
  where ip.id = p_project_id
    and ip.company_id = p_company_id;
end;
$function$

