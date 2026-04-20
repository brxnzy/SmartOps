CREATE OR REPLACE FUNCTION public.can_manage_role_permissions(p_role_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.roles r
    join public.user_roles ur
      on ur.company_id = r.company_id
    where r.id = p_role_id
      and ur.user_id = auth.uid()
  );
$function$

