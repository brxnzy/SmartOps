CREATE OR REPLACE FUNCTION public.enforce_installed_device_project_consistency()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  proj_company_id uuid;
  proj_site_id uuid;
begin
  select p.company_id, p.site_id
    into proj_company_id, proj_site_id
  from public.installation_projects p
  where p.id = new.project_id;

  if proj_company_id is null then
    raise exception 'Proyecto no encontrado para project_id=%', new.project_id;
  end if;

  if new.company_id <> proj_company_id then
    raise exception 'company_id no coincide con el proyecto';
  end if;

  if new.site_id <> proj_site_id then
    raise exception 'site_id no coincide con el proyecto';
  end if;

  return new;
end;
$function$

