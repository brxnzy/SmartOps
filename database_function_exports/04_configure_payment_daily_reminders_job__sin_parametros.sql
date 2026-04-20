CREATE OR REPLACE FUNCTION public.configure_payment_daily_reminders_job()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'cron'
AS $function$
declare
  v_config public.payment_scheduler_config%rowtype;
  v_job record;
begin
  for v_job in
    select jobid
    from cron.job
    where jobname = 'payment-daily-reminders'
  loop
    perform cron.unschedule(v_job.jobid);
  end loop;

  select *
  into v_config
  from public.payment_scheduler_config
  where id = true;

  if v_config is null or not v_config.enabled then
    return;
  end if;

  perform cron.schedule(
    'payment-daily-reminders',
    v_config.reminders_schedule,
    $job$select public.run_payment_daily_reminders();$job$
  );
end;
$function$

