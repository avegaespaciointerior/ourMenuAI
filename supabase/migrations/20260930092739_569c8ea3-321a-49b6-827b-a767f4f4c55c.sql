CREATE OR REPLACE FUNCTION public.create_household(_name text DEFAULT 'Mi familia')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  INSERT INTO public.households (name, owner_id) VALUES (coalesce(_name, 'Mi familia'), _uid)
  RETURNING id INTO _id;

  INSERT INTO public.household_users (household_id, user_id) VALUES (_id, _uid);

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_household(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_household(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_household(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_household(text) TO service_role;
