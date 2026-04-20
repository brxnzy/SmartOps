CREATE OR REPLACE FUNCTION public.refresh_payment_account_balance(p_account_id uuid)
 RETURNS TABLE(account_id uuid, status text, amount_paid numeric, amount_pending numeric, closed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_total numeric(12, 2);
  v_paid numeric(12, 2);
  v_current_status text;
  v_account_id uuid;
  v_status text;
  v_amount_paid numeric(12, 2);
  v_amount_pending numeric(12, 2);
  v_closed_at timestamptz;
begin
  select pa.amount_total, pa.status
  into v_total, v_current_status
  from public.payment_accounts pa
  where pa.id = p_account_id;

  if not found then
    return;
  end if;

  select coalesce(sum(pt.amount), 0)
  into v_paid
  from public.payment_transactions pt
  where pt.payment_account_id = p_account_id
    and pt.status = 'approved';

  update public.payment_accounts pa
  set amount_paid = v_paid,
      amount_pending = greatest(v_total - v_paid, 0),
      status = case
        when v_current_status = 'cancelled' then 'cancelled'
        when greatest(v_total - v_paid, 0) <= 0 then 'paid'
        when v_paid > 0 then 'partial'
        else 'pending'
      end,
      closed_at = case
        when v_current_status = 'cancelled' then pa.closed_at
        when greatest(v_total - v_paid, 0) <= 0 then coalesce(pa.closed_at, now())
        else null
      end,
      updated_at = now()
  where pa.id = p_account_id
  returning pa.id, pa.status, pa.amount_paid, pa.amount_pending, pa.closed_at
  into v_account_id, v_status, v_amount_paid, v_amount_pending, v_closed_at;

  account_id := v_account_id;
  status := v_status;
  amount_paid := v_amount_paid;
  amount_pending := v_amount_pending;
  closed_at := v_closed_at;

  return next;
end;
$function$

