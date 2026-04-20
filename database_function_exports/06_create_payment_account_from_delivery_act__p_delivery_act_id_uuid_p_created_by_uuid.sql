CREATE OR REPLACE FUNCTION public.create_payment_account_from_delivery_act(p_delivery_act_id uuid, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(account_id uuid, company_id uuid, customer_id uuid, project_id uuid, budget_id uuid, amount_total numeric, amount_pending numeric, invoice_number text, created boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_act record;
  v_project record;
  v_budget_total numeric(12, 2);
  v_account public.payment_accounts%rowtype;
  v_account_id uuid;
  v_invoice_number text;
begin
  if to_regclass('public.delivery_acts') is null then
    raise exception 'La tabla delivery_acts no esta disponible en este entorno.';
  end if;

  execute
    'select id, company_id, project_id, customer_id from public.delivery_acts where id = $1'
  into v_act
  using p_delivery_act_id;

  if v_act is null then
    raise exception 'No se encontro el acta indicada.';
  end if;

  select pa.*
  into v_account
  from public.payment_accounts pa
  where pa.project_id = v_act.project_id
  limit 1;

  if found then
    return query
    select
      v_account.id,
      v_account.company_id,
      v_account.customer_id,
      v_account.project_id,
      v_account.budget_id,
      v_account.amount_total,
      v_account.amount_pending,
      v_account.invoice_number,
      false;
    return;
  end if;

  select ip.id, ip.company_id, ip.budget_id
  into v_project
  from public.installation_projects ip
  where ip.id = v_act.project_id
    and ip.company_id = v_act.company_id;

  if v_project is null then
    raise exception 'No se encontro el proyecto relacionado al acta.';
  end if;

  select coalesce(b.total, 0)
  into v_budget_total
  from public.budgets b
  where b.id = v_project.budget_id
    and b.company_id = v_project.company_id;

  v_account_id := gen_random_uuid();
  v_invoice_number := 'FAC-' || to_char(now(), 'YYYYMMDD') || '-' || upper(right(replace(v_account_id::text, '-', ''), 6));

  insert into public.payment_accounts (
    id,
    company_id,
    customer_id,
    project_id,
    budget_id,
    delivery_act_id,
    status,
    currency,
    amount_total,
    amount_paid,
    amount_pending,
    invoice_number,
    created_by,
    created_at,
    updated_at
  ) values (
    v_account_id,
    v_project.company_id,
    v_act.customer_id,
    v_project.id,
    v_project.budget_id,
    p_delivery_act_id,
    'pending',
    'USD',
    v_budget_total,
    0,
    v_budget_total,
    v_invoice_number,
    p_created_by,
    now(),
    now()
  );

  return query
  select
    v_account_id,
    v_project.company_id,
    v_act.customer_id,
    v_project.id,
    v_project.budget_id,
    v_budget_total,
    v_budget_total,
    v_invoice_number,
    true;
end;
$function$

