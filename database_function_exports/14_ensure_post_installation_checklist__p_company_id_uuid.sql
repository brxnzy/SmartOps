CREATE OR REPLACE FUNCTION public.ensure_post_installation_checklist(p_company_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_uid uuid;
  v_is_member boolean;
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

  insert into public.post_installation_checks (company_id, name, description)
  values (p_company_id, 'Pruebas post instalacion', 'Checklist general para cerrar proyectos de instalacion')
  on conflict (company_id)
  do update set updated_at = now()
  returning id into v_checklist_id;

  insert into public.post_installation_check_items (checklist_id, text, item_order)
  values
    (v_checklist_id, 'Encendido general verificado', 0),
    (v_checklist_id, 'Comunicacion estable entre dispositivos', 1),
    (v_checklist_id, 'Automatizaciones principales funcionando', 2),
    (v_checklist_id, 'Respuesta en app/control confirmada', 3),
    (v_checklist_id, 'Capacitacion basica al cliente completada', 4)
  on conflict (checklist_id, text) do nothing;

  return v_checklist_id;
end;
$function$

