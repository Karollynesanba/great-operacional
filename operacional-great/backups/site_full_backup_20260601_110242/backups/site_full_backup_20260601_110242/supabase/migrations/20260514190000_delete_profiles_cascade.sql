-- Guarantee admin-driven profile deletion at the database level.
-- Safe to re-run.

CREATE OR REPLACE FUNCTION public.delete_profile_cascade(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_is_admin BOOLEAN;
BEGIN
  requester_is_admin := COALESCE(
    public.has_role(auth.uid(), 'admin'::public.app_role),
    false
  ) OR COALESCE(
    (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()),
    false
  );

  IF NOT requester_is_admin THEN
    RAISE EXCEPTION 'Only admins can delete profiles';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = target_user_id;

  DELETE FROM public.profiles
  WHERE id = target_user_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_profile_cascade(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_profile_cascade(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_profile_cascade(UUID) TO service_role;

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can update profiles" ON public.profiles;

CREATE POLICY "Anyone can read profiles"
ON public.profiles
FOR SELECT
TO public
USING (true);

CREATE POLICY "Anyone can insert profiles"
ON public.profiles
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can update profiles"
ON public.profiles
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO public
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR COALESCE((SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()), false)
);

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO public
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO public
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
