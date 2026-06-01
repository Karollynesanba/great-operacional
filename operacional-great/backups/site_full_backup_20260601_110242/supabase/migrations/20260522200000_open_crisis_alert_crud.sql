-- Open CRUD for the crisis alert module in production.
-- This migration makes the crisis dashboard writable for anon/authenticated
-- users in the same way the rest of the operational app already works.

ALTER TABLE IF EXISTS public.crisis_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crisis_alert_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crisis_alert_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crisis_alert_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crisis_manual_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Crisis alerts viewable by public" ON public.crisis_alerts;
DROP POLICY IF EXISTS "Crisis alerts insertable by public" ON public.crisis_alerts;
DROP POLICY IF EXISTS "Crisis alerts updatable by public" ON public.crisis_alerts;
DROP POLICY IF EXISTS "Crisis alerts deletable by public" ON public.crisis_alerts;

CREATE POLICY "Crisis alerts viewable by public"
ON public.crisis_alerts
FOR SELECT
TO public
USING (true);

CREATE POLICY "Crisis alerts insertable by public"
ON public.crisis_alerts
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Crisis alerts updatable by public"
ON public.crisis_alerts
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Crisis alerts deletable by public"
ON public.crisis_alerts
FOR DELETE
TO public
USING (true);

DROP POLICY IF EXISTS "Crisis alert events viewable by public" ON public.crisis_alert_events;
DROP POLICY IF EXISTS "Crisis alert events insertable by public" ON public.crisis_alert_events;
DROP POLICY IF EXISTS "Crisis alert events updatable by public" ON public.crisis_alert_events;
DROP POLICY IF EXISTS "Crisis alert events deletable by public" ON public.crisis_alert_events;

CREATE POLICY "Crisis alert events viewable by public"
ON public.crisis_alert_events
FOR SELECT
TO public
USING (true);

CREATE POLICY "Crisis alert events insertable by public"
ON public.crisis_alert_events
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Crisis alert events updatable by public"
ON public.crisis_alert_events
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Crisis alert events deletable by public"
ON public.crisis_alert_events
FOR DELETE
TO public
USING (true);

DROP POLICY IF EXISTS "Crisis alert notes viewable by public" ON public.crisis_alert_notes;
DROP POLICY IF EXISTS "Crisis alert notes insertable by public" ON public.crisis_alert_notes;
DROP POLICY IF EXISTS "Crisis alert notes updatable by public" ON public.crisis_alert_notes;
DROP POLICY IF EXISTS "Crisis alert notes deletable by public" ON public.crisis_alert_notes;

CREATE POLICY "Crisis alert notes viewable by public"
ON public.crisis_alert_notes
FOR SELECT
TO public
USING (true);

CREATE POLICY "Crisis alert notes insertable by public"
ON public.crisis_alert_notes
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Crisis alert notes updatable by public"
ON public.crisis_alert_notes
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Crisis alert notes deletable by public"
ON public.crisis_alert_notes
FOR DELETE
TO public
USING (true);

DROP POLICY IF EXISTS "Crisis alert actions viewable by public" ON public.crisis_alert_actions;
DROP POLICY IF EXISTS "Crisis alert actions insertable by public" ON public.crisis_alert_actions;
DROP POLICY IF EXISTS "Crisis alert actions updatable by public" ON public.crisis_alert_actions;
DROP POLICY IF EXISTS "Crisis alert actions deletable by public" ON public.crisis_alert_actions;

CREATE POLICY "Crisis alert actions viewable by public"
ON public.crisis_alert_actions
FOR SELECT
TO public
USING (true);

CREATE POLICY "Crisis alert actions insertable by public"
ON public.crisis_alert_actions
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Crisis alert actions updatable by public"
ON public.crisis_alert_actions
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Crisis alert actions deletable by public"
ON public.crisis_alert_actions
FOR DELETE
TO public
USING (true);

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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crisis_alerts TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crisis_alert_events TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crisis_alert_notes TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crisis_alert_actions TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crisis_manual_clients TO anon, authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'crisis_alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.crisis_alerts;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'crisis_alert_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.crisis_alert_events;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'crisis_alert_notes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.crisis_alert_notes;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'crisis_alert_actions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.crisis_alert_actions;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'crisis_manual_clients'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.crisis_manual_clients;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
