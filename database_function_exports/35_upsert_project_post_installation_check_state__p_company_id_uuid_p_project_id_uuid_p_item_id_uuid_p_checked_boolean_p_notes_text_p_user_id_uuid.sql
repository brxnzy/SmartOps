CREATE OR REPLACE FUNCTION public.upsert_project_post_installation_check_state(p_company_id uuid, p_project_id uuid, p_item_id uuid, p_checked boolean, p_notes text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_uid uuid;
  v_actor uuid;
  v_is_member boolean;
  v_project_exists boolean;
  v_item_exists boolean;
  v_value jsonb;
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

  select exists (
    select 1
    from public.installation_projects ip
    where ip.id = p_project_id
      and ip.company_id = p_company_id
  )
  into v_project_exists;

  if not v_project_exists then
    raise exception 'Proyecto no encontrado';
  end if;

  select exists (
    select 1
    from public.post_installation_checks pc
    join public.post_installation_check_items pci on pci.checklist_id = pc.id
    where pc.company_id = p_company_id
      and pci.id = p_item_id
      and pci.is_active = true
  )
  into v_item_exists;

  if not v_item_exists then
    raise exception 'Item de prueba post instalacion no encontrado';
  end if;

  v_value := jsonb_build_object(
    'checked', p_checked,
    'notes', nullif(btrim(coalesce(p_notes, '')), ''),
    'checked_at', case when p_checked then now() else null end,
    'checked_by', case when p_checked then v_actor else null end
  );

  update public.installation_projects ip
  set post_installation_checks_state = jsonb_set(
        coalesce(ip.post_installation_checks_state, '{}'::jsonb),
        array[p_item_id::text],
        v_value,
        true
      ),
      updated_at = now()
  where ip.id = p_project_id
    and ip.company_id = p_company_id;
end;
$function$

