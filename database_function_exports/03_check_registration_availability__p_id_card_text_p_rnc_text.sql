CREATE OR REPLACE FUNCTION public.check_registration_availability(p_id_card text, p_rnc text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.users WHERE id_card = p_id_card) THEN
    RETURN json_build_object('available', false, 'reason', 'La cédula ya está registrada');
  END IF;

  IF EXISTS (SELECT 1 FROM public.companies WHERE rnc = p_rnc) THEN
    RETURN json_build_object('available', false, 'reason', 'El RNC ya está registrado');
  END IF;

  RETURN json_build_object('available', true, 'reason', null);
END;
$function$

