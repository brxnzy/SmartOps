CREATE OR REPLACE FUNCTION public.normalize_role_name(role_name text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select regexp_replace(lower(coalesce(role_name, '')), '[\\s_-]+', '', 'g');
$function$

