CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$DECLARE
  v_company_id uuid;
  v_admin_role_id uuid;
  v_selected_role_id uuid;
  v_role_text text;
  v_company_id_text text;
BEGIN
  -- Solo cuando pasa de NO confirmado -> confirmado
  IF NOT (
    OLD.email_confirmed_at IS NULL
    AND NEW.email_confirmed_at IS NOT NULL
  ) THEN
    RETURN NEW;
  END IF;

  -- Si es invitado de cliente, no ejecutar logica de users/companies/user_roles
  IF COALESCE(NEW.raw_user_meta_data->>'invited_customer', 'false') = 'true' THEN
    RETURN NEW;
  END IF;

  -- 1) Perfil usuario (idempotente)
  INSERT INTO public.users (id, name, id_card)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(NEW.raw_user_meta_data->>'idCard', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    id_card = EXCLUDED.id_card;

  -- 2) Resolver company_id
  v_company_id_text := NEW.raw_user_meta_data->>'company_id';

  IF v_company_id_text IS NOT NULL
     AND v_company_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  THEN
    v_company_id := v_company_id_text::uuid;

    IF NOT EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = v_company_id
    ) THEN
      v_company_id := NULL;
    END IF;
  END IF;

  IF v_company_id IS NULL
     AND COALESCE(NEW.raw_user_meta_data->>'company_name', '') <> ''
  THEN
    INSERT INTO public.companies (name, address, phone, rnc, created_by)
    VALUES (
      NEW.raw_user_meta_data->>'company_name',
      NULLIF(NEW.raw_user_meta_data->>'company_address', ''),
      NULLIF(NEW.raw_user_meta_data->>'company_phone', ''),
      NULLIF(NEW.raw_user_meta_data->>'company_rnc', ''),
      NEW.id
    )
    RETURNING id INTO v_company_id;
  END IF;

  -- 3) Resolver rol
  SELECT r.id
    INTO v_admin_role_id
  FROM public.roles r
  WHERE LOWER(r.name) = 'admin'
  LIMIT 1;

  v_selected_role_id := v_admin_role_id;
  v_role_text := NEW.raw_user_meta_data->>'role_id';

  IF v_role_text IS NOT NULL
     AND v_role_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  THEN
    SELECT r.id
      INTO v_selected_role_id
    FROM public.roles r
    WHERE r.id = v_role_text::uuid
    LIMIT 1;

    IF v_selected_role_id IS NULL THEN
      v_selected_role_id := v_admin_role_id;
    END IF;
  END IF;

  -- 4) user_roles solo si hay company y role
  IF v_company_id IS NOT NULL AND v_selected_role_id IS NOT NULL THEN
    -- Primero intenta update (evita requerir unique constraint para ON CONFLICT)
    UPDATE public.user_roles
      SET role_id = v_selected_role_id
    WHERE user_id = NEW.id
      AND company_id = v_company_id;

    -- Si no existia fila, inserta
    IF NOT FOUND THEN
      INSERT INTO public.user_roles (user_id, role_id, company_id)
      VALUES (NEW.id, v_selected_role_id, v_company_id);
    END IF;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error al confirmar usuario %: %', NEW.id, SQLERRM;
END;$function$

