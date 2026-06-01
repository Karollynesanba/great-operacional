-- Allow authenticated reporters to create My Day rows for assigned users.
-- This is needed when the browser upserts one My Day row per assignee.

DROP POLICY IF EXISTS "Reporters can insert my_day_items for assigned users" ON public.my_day_items;

CREATE POLICY "Reporters can insert my_day_items for assigned users"
ON public.my_day_items
FOR INSERT
TO authenticated
WITH CHECK (
  origin_reporter_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.is_coordinator(auth.uid())
);

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
