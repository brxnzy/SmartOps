CREATE OR REPLACE FUNCTION public.ensure_payment_account_for_project(p_project_id uuid, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(account_id uuid, delivery_act_id uuid, created boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_act record;
  v_created record;
begin
  select da.id, da.created_by, da.signed_by
  into v_act
  from public.delivery_acts da
  where da.project_id = p_project_id
    and da.status in ('signed', 'accepted')
  order by coalesce(da.signed_at, da.accepted_at, da.updated_at, da.created_at) desc
  limit 1;

  if v_act is null then
    raise exception 'No existe un acta firmada/aceptada para este proyecto.';
  end if;

  select created_account.account_id, created_account.created
  into v_created
  from public.create_payment_account_from_delivery_act(
    v_act.id,
    coalesce(p_created_by, v_act.signed_by, v_act.created_by)
  ) as created_account;

  return query
  select
    v_created.account_id,
    v_act.id,
    v_created.created;
end;
$function$

