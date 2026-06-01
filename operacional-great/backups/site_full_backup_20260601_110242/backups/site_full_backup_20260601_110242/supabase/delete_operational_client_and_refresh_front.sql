-- Minimal CRM delete repair.
-- Run this in the Supabase SQL Editor.
-- Goal: when a client is deleted, it disappears from the CRM front for everyone.

ALTER TABLE IF EXISTS public.operational_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operational clients viewable by public" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients insertable by public" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients updatable by public" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients deletable by public" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients viewable by authenticated users" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients insertable by authenticated users" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients updatable by authenticated users" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients deletable by authenticated users" ON public.operational_clients;

CREATE POLICY "Operational clients viewable by public"
ON public.operational_clients
FOR SELECT
TO public
USING (true);

CREATE POLICY "Operational clients insertable by public"
ON public.operational_clients
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Operational clients updatable by public"
ON public.operational_clients
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Operational clients deletable by public"
ON public.operational_clients
FOR DELETE
TO public
USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_clients TO anon, authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.operational_clients';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.delete_operational_client_cascade(p_client_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF to_regclass('public.client_activity_tracking') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.client_activity_tracking WHERE client_id::text = $1::text' USING p_client_id;
  END IF;

  IF to_regclass('public.client_files') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.client_files WHERE client_id::text = $1::text' USING p_client_id;
  END IF;

  IF to_regclass('public.ad_creatives') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.ad_creatives WHERE client_id::text = $1::text' USING p_client_id;
  END IF;

  IF to_regclass('public.crm_events') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.crm_events WHERE client_id::text = $1::text' USING p_client_id;
  END IF;

  IF to_regclass('public.projects') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.projects WHERE client_id::text = $1::text' USING p_client_id;
  END IF;

  IF to_regclass('public.exec_cards') IS NOT NULL THEN
    EXECUTE 'UPDATE public.exec_cards SET client_id = NULL WHERE client_id::text = $1::text' USING p_client_id;
  END IF;

  IF to_regclass('public.crisis_manual_clients') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.crisis_manual_clients WHERE source_operational_client_id = $1::text OR id = $1::text' USING p_client_id;
  END IF;

  IF to_regclass('public.operational_clients') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.operational_clients WHERE id::text = $1::text' USING p_client_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_operational_client_cascade(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_operational_client_cascade(UUID) TO anon, authenticated, service_role;
