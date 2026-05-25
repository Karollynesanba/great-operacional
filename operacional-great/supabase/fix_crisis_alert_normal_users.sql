-- Repair script for the crisis alert module.
-- Paste this file into the Supabase SQL editor and run it once.
-- It is safe to re-run: policies are dropped/recreated and columns use IF NOT EXISTS.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Crisis manual clients
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.crisis_manual_clients ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.crisis_manual_clients
  ADD COLUMN IF NOT EXISTS source_operational_client_id TEXT,
  ADD COLUMN IF NOT EXISTS initials TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS sector TEXT,
  ADD COLUMN IF NOT EXISTS responsible TEXT,
  ADD COLUMN IF NOT EXISTS team TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS risk_band TEXT,
  ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS health_score JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS active_since TEXT,
  ADD COLUMN IF NOT EXISTS complaint_since TEXT,
  ADD COLUMN IF NOT EXISTS active_for TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_probability INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS response_time TEXT,
  ADD COLUMN IF NOT EXISTS bottleneck TEXT,
  ADD COLUMN IF NOT EXISTS bottleneck_owner TEXT,
  ADD COLUMN IF NOT EXISTS alert_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE IF EXISTS public.crisis_manual_clients
  DROP CONSTRAINT IF EXISTS crisis_manual_clients_status_check;

ALTER TABLE IF EXISTS public.crisis_manual_clients
  ADD CONSTRAINT crisis_manual_clients_status_check
  CHECK (status IN ('monitorado', 'atencao', 'risco', 'critico', 'estabilizado'));

ALTER TABLE IF EXISTS public.crisis_manual_clients
  DROP CONSTRAINT IF EXISTS crisis_manual_clients_risk_band_check;

ALTER TABLE IF EXISTS public.crisis_manual_clients
  ADD CONSTRAINT crisis_manual_clients_risk_band_check
  CHECK (risk_band IN ('saudavel', 'atencao', 'risco', 'critico'));

DROP POLICY IF EXISTS "Crisis manual clients viewable by public" ON public.crisis_manual_clients;
DROP POLICY IF EXISTS "Crisis manual clients insertable by public" ON public.crisis_manual_clients;
DROP POLICY IF EXISTS "Crisis manual clients updatable by public" ON public.crisis_manual_clients;
DROP POLICY IF EXISTS "Crisis manual clients deletable by public" ON public.crisis_manual_clients;
DROP POLICY IF EXISTS "Crisis manual clients viewable by authenticated users" ON public.crisis_manual_clients;
DROP POLICY IF EXISTS "Crisis manual clients insertable by authenticated users" ON public.crisis_manual_clients;
DROP POLICY IF EXISTS "Crisis manual clients updatable by authenticated users" ON public.crisis_manual_clients;
DROP POLICY IF EXISTS "Crisis manual clients deletable by authenticated users" ON public.crisis_manual_clients;

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

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crisis_manual_clients TO anon, authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.crisis_manual_clients';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Operational clients
-- ---------------------------------------------------------------------------
-- The CRM picker reads from operational_clients. If normal users are not using a
-- live Supabase auth session, "public" policies keep the picker and the add flow
-- working for the same rows the app already shows.

ALTER TABLE IF EXISTS public.operational_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operational clients viewable by authenticated users" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients insertable by authenticated users" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients updatable by authenticated users" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients deletable by authenticated users" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients viewable by public" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients insertable by public" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients updatable by public" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients deletable by public" ON public.operational_clients;

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

-- ---------------------------------------------------------------------------
-- Refresh PostgREST schema cache
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;

COMMIT;
