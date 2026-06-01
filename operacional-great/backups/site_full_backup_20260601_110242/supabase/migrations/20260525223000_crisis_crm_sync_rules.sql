-- Crisis x CRM sync rules
-- Goal:
-- 1) Anything created/edited in crisis stays saved in crisis and is visible to everyone.
-- 2) Deleting a crisis client must NOT delete the CRM client.
-- 3) Deleting a CRM client must remove the linked crisis client when that crisis row came from CRM.
-- 4) Realtime stays enabled so all users see inserts/updates/deletes immediately.

-- ---------------------------------------------------------------------------
-- RLS and permissions
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.crisis_manual_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.operational_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Crisis manual clients viewable by public" ON public.crisis_manual_clients;
DROP POLICY IF EXISTS "Crisis manual clients insertable by public" ON public.crisis_manual_clients;
DROP POLICY IF EXISTS "Crisis manual clients updatable by public" ON public.crisis_manual_clients;
DROP POLICY IF EXISTS "Crisis manual clients deletable by public" ON public.crisis_manual_clients;

CREATE POLICY "Crisis manual clients viewable by public"
ON public.crisis_manual_clients
FOR SELECT
TO public
USING (true);

CREATE POLICY "Crisis manual clients insertable by public"
ON public.crisis_manual_clients
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Crisis manual clients updatable by public"
ON public.crisis_manual_clients
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Crisis manual clients deletable by public"
ON public.crisis_manual_clients
FOR DELETE
TO public
USING (true);

DROP POLICY IF EXISTS "Operational clients viewable by authenticated users" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients insertable by authenticated users" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients updatable by authenticated users" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients deletable by authenticated users" ON public.operational_clients;

CREATE POLICY "Operational clients viewable by authenticated users"
ON public.operational_clients
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Operational clients insertable by authenticated users"
ON public.operational_clients
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Operational clients updatable by authenticated users"
ON public.operational_clients
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Operational clients deletable by authenticated users"
ON public.operational_clients
FOR DELETE
TO authenticated
USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crisis_manual_clients TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_clients TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.crisis_manual_clients';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.operational_clients';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- One-way sync: CRM delete removes linked crisis row, but crisis delete does
-- not affect CRM.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cascade_delete_crisis_client_from_operational_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.crisis_manual_clients
  WHERE source_operational_client_id = OLD.id::text;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS operational_clients_delete_cascade_crisis ON public.operational_clients;
CREATE TRIGGER operational_clients_delete_cascade_crisis
AFTER DELETE ON public.operational_clients
FOR EACH ROW
EXECUTE FUNCTION public.cascade_delete_crisis_client_from_operational_delete();

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
