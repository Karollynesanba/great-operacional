-- New persistent table for the "Alerta de Crise" module.
-- This table links each alert row to one CRM client and keeps the CRM record untouched.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.crisis_alert_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.operational_clients(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'monitorado',
  crisis_score INTEGER NOT NULL DEFAULT 3 CHECK (crisis_score BETWEEN 1 AND 5),
  cancellation_risk INTEGER NOT NULL DEFAULT 0 CHECK (cancellation_risk BETWEEN 0 AND 100),
  bottleneck_area TEXT NULL,
  symptoms TEXT[] NOT NULL DEFAULT '{}'::text[],
  notes TEXT NULL,
  action_plan TEXT NULL,
  responsible_user_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  complaint_started_at DATE NULL,
  avg_response_time_minutes INTEGER NULL CHECK (avg_response_time_minutes IS NULL OR avg_response_time_minutes >= 0),
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT crisis_alert_clients_client_id_unique UNIQUE (client_id)
);

CREATE INDEX IF NOT EXISTS idx_crisis_alert_clients_client_id
  ON public.crisis_alert_clients (client_id);

CREATE INDEX IF NOT EXISTS idx_crisis_alert_clients_status
  ON public.crisis_alert_clients (status);

CREATE INDEX IF NOT EXISTS idx_crisis_alert_clients_cancellation_risk
  ON public.crisis_alert_clients (cancellation_risk);

CREATE INDEX IF NOT EXISTS idx_crisis_alert_clients_created_at
  ON public.crisis_alert_clients (created_at DESC);

ALTER TABLE IF EXISTS public.crisis_alert_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Crisis alert clients viewable by authenticated users" ON public.crisis_alert_clients;
DROP POLICY IF EXISTS "Crisis alert clients insertable by authenticated users" ON public.crisis_alert_clients;
DROP POLICY IF EXISTS "Crisis alert clients updatable by authenticated users" ON public.crisis_alert_clients;
DROP POLICY IF EXISTS "Crisis alert clients deletable by authenticated users" ON public.crisis_alert_clients;

CREATE POLICY "Crisis alert clients viewable by authenticated users"
ON public.crisis_alert_clients
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Crisis alert clients insertable by authenticated users"
ON public.crisis_alert_clients
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Crisis alert clients updatable by authenticated users"
ON public.crisis_alert_clients
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Crisis alert clients deletable by authenticated users"
ON public.crisis_alert_clients
FOR DELETE
TO authenticated
USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crisis_alert_clients TO authenticated, service_role;

DROP TRIGGER IF EXISTS update_crisis_alert_clients_updated_at ON public.crisis_alert_clients;
CREATE TRIGGER update_crisis_alert_clients_updated_at
BEFORE UPDATE ON public.crisis_alert_clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.delete_crisis_alert_client(p_client_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.crisis_alert_clients
  WHERE id = p_client_id
     OR client_id = p_client_id;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count = 0 THEN
    RAISE EXCEPTION 'Nenhum registro encontrado para remoção.';
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_crisis_alert_client(UUID) TO authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.crisis_alert_clients';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Backfill from the previous table if it exists.
DO $$
BEGIN
  IF to_regclass('public.crisis_manual_clients') IS NOT NULL THEN
    INSERT INTO public.crisis_alert_clients (
      id,
      client_id,
      status,
      crisis_score,
      cancellation_risk,
      bottleneck_area,
      symptoms,
      notes,
      action_plan,
      responsible_user_id,
      complaint_started_at,
      avg_response_time_minutes,
      history,
      metadata,
      created_at,
      updated_at
    )
    SELECT
      gen_random_uuid(),
      CASE
        WHEN cmc.source_operational_client_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          THEN cmc.source_operational_client_id::uuid
        ELSE NULL
      END AS client_id,
      COALESCE(cmc.status, 'monitorado'),
      GREATEST(1, LEAST(5, COALESCE(cmc.score, 3))) AS crisis_score,
      GREATEST(0, LEAST(100, COALESCE(cmc.cancellation_probability, 0))) AS cancellation_risk,
      cmc.bottleneck,
      CASE
        WHEN cmc.alert_summary IS NULL THEN '{}'::text[]
        ELSE ARRAY[cmc.alert_summary::text]
      END,
      cmc.notes,
      NULLIF(cmc.recommended_actions::text, ''),
      p.id,
      cmc.complaint_since::date,
      NULLIF(regexp_replace(COALESCE(cmc.response_time, ''), '[^0-9]', '', 'g'), '')::integer,
      '[]'::jsonb,
      jsonb_build_object(
        'sector', cmc.sector,
        'team_name', cmc.team,
        'responsible_name', cmc.responsible,
        'bottleneck_owner', cmc.bottleneck_owner,
        'active_since', cmc.active_since,
        'active_for', cmc.active_for,
        'response_time', cmc.response_time::text,
        'health_score', cmc.health_score::text,
        'metrics', cmc.metrics::text,
        'recommended_actions', cmc.recommended_actions::text,
        'timeline', cmc.timeline::text,
        'initials', cmc.initials::text,
        'logo_url', cmc.logo_url::text,
        'alert_summary', cmc.alert_summary::text
      ),
      COALESCE(cmc.created_at, now()),
      COALESCE(cmc.updated_at, now())
    FROM public.crisis_manual_clients cmc
    LEFT JOIN public.profiles p
      ON lower(trim(p.full_name)) = lower(trim(cmc.responsible))
    WHERE CASE
      WHEN cmc.source_operational_client_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        THEN TRUE
      ELSE FALSE
    END
    ON CONFLICT (client_id) DO NOTHING;
  END IF;
END $$;

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;

COMMIT;
