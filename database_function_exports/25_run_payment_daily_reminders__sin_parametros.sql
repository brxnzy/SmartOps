CREATE OR REPLACE FUNCTION public.run_payment_daily_reminders()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_config public.payment_scheduler_config%rowtype;
  v_request_id bigint;
begin
  select *
  into v_config
  from public.payment_scheduler_config
  where id = true;

  if v_config is null or not v_config.enabled then
    return null;
  end if;

  select net.http_post(
    url := v_config.function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer scheduled-task',
      'x-cron-secret', v_config.cron_secret
    ),
    body := jsonb_build_object(
      'mode', 'send_daily_reminders'
    )
  )
  into v_request_id;

  return v_request_id;
end;
$function$

