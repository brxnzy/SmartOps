CREATE OR REPLACE FUNCTION public.trg_payment_scheduler_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.configure_payment_daily_reminders_job();
  return new;
end;
$function$

