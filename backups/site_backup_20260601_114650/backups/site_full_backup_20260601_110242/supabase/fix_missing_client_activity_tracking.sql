-- Recreate the missing client_activity_tracking table for the operational CRM.
-- This prevents delete flows from failing when the table is absent in the
-- target Supabase project.

CREATE TABLE IF NOT EXISTS public.client_activity_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  action TEXT NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.client_activity_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view client activity tracking" ON public.client_activity_tracking;
DROP POLICY IF EXISTS "Authenticated users can insert client activity tracking" ON public.client_activity_tracking;
DROP POLICY IF EXISTS "Authenticated users can update client activity tracking" ON public.client_activity_tracking;
DROP POLICY IF EXISTS "Authenticated users can delete client activity tracking" ON public.client_activity_tracking;

CREATE POLICY "Authenticated users can view client activity tracking"
ON public.client_activity_tracking
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert client activity tracking"
ON public.client_activity_tracking
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update client activity tracking"
ON public.client_activity_tracking
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete client activity tracking"
ON public.client_activity_tracking
FOR DELETE
TO authenticated
USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_activity_tracking TO anon, authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.client_activity_tracking';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
