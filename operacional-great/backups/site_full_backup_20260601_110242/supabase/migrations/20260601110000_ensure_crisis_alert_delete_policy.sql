BEGIN;

ALTER TABLE IF EXISTS public.crisis_alert_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can delete crisis alert clients" ON public.crisis_alert_clients;

CREATE POLICY "Authenticated users can delete crisis alert clients"
ON public.crisis_alert_clients
FOR DELETE
TO authenticated
USING (true);

GRANT DELETE ON public.crisis_alert_clients TO authenticated, service_role;

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;

COMMIT;
