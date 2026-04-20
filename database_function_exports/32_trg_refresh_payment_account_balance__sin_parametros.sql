CREATE OR REPLACE FUNCTION public.trg_refresh_payment_account_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.refresh_payment_account_balance(coalesce(new.payment_account_id, old.payment_account_id));
  return coalesce(new, old);
end;
$function$

