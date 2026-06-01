-- The platform is using profile-based login in some environments.
-- When there is no real Supabase Auth session, authenticated-only RLS
-- prevents task writes from being shared across browsers/users.
-- This migration makes the task tables usable by the current app flow.

ALTER TABLE IF EXISTS public.work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.my_day_items ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Work items
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Work items viewable by authenticated users" ON public.work_items;
DROP POLICY IF EXISTS "Work items insertable by authenticated users" ON public.work_items;
DROP POLICY IF EXISTS "Work items updatable by authenticated users" ON public.work_items;
DROP POLICY IF EXISTS "Work items deletable by owner or admin" ON public.work_items;

CREATE POLICY "Work items viewable by public"
ON public.work_items
FOR SELECT
TO public
USING (true);

CREATE POLICY "Work items insertable by public"
ON public.work_items
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Work items updatable by public"
ON public.work_items
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Work items deletable by public"
ON public.work_items
FOR DELETE
TO public
USING (true);

-- ---------------------------------------------------------------------------
-- My Day items
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Users can insert own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Users can update own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Users can delete own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Admins/coordinators can insert my_day_items for others" ON public.my_day_items;
DROP POLICY IF EXISTS "Reporters can insert my_day_items for assigned users" ON public.my_day_items;

CREATE POLICY "My Day items viewable by public"
ON public.my_day_items
FOR SELECT
TO public
USING (true);

CREATE POLICY "My Day items insertable by public"
ON public.my_day_items
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "My Day items updatable by public"
ON public.my_day_items
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "My Day items deletable by public"
ON public.my_day_items
FOR DELETE
TO public
USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.work_items TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.my_day_items TO anon, authenticated, service_role;

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
