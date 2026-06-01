-- Persisted schema for the Sistema de Alerta de Crise.
-- Links crisis monitoring to operational_clients and teams, with timeline,
-- notes and recommended actions stored in Supabase.

CREATE TABLE IF NOT EXISTS public.crisis_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operational_client_id UUID NOT NULL REFERENCES public.operational_clients(id) ON DELETE CASCADE,
  team_id UUID NULL REFERENCES public.teams(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'monitoring',
  risk_band TEXT NOT NULL DEFAULT 'medium',
  health_score INTEGER NOT NULL DEFAULT 100 CHECK (health_score BETWEEN 0 AND 100),
  cancellation_probability INTEGER NOT NULL DEFAULT 0 CHECK (cancellation_probability BETWEEN 0 AND 100),
  complaint_started_at DATE NULL,
  complaint_summary TEXT NULL,
  bottleneck_area TEXT NULL,
  bottleneck_owner TEXT NULL,
  last_response_minutes INTEGER NULL CHECK (last_response_minutes IS NULL OR last_response_minutes >= 0),
  last_contact_at TIMESTAMPTZ NULL,
  monitored_since TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ NULL,
  created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT crisis_alerts_status_check
    CHECK (status IN ('monitoring', 'active', 'resolved', 'dismissed')),
  CONSTRAINT crisis_alerts_risk_band_check
    CHECK (risk_band IN ('low', 'medium', 'high', 'critical'))
);

CREATE INDEX IF NOT EXISTS idx_crisis_alerts_operational_client_id
  ON public.crisis_alerts (operational_client_id);

CREATE INDEX IF NOT EXISTS idx_crisis_alerts_team_id
  ON public.crisis_alerts (team_id);

CREATE INDEX IF NOT EXISTS idx_crisis_alerts_status
  ON public.crisis_alerts (status);

CREATE INDEX IF NOT EXISTS idx_crisis_alerts_risk_band
  ON public.crisis_alerts (risk_band);

CREATE INDEX IF NOT EXISTS idx_crisis_alerts_created_at
  ON public.crisis_alerts (created_at DESC);

CREATE TABLE IF NOT EXISTS public.crisis_alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crisis_alert_id UUID NOT NULL REFERENCES public.crisis_alerts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT crisis_alert_events_type_check
    CHECK (
      event_type IN (
        'created',
        'status_changed',
        'score_changed',
        'complaint_started',
        'bottleneck_identified',
        'note_added',
        'action_created',
        'action_completed',
        'manual_flag',
        'manual_unflag',
        'resolved'
      )
    )
);

CREATE INDEX IF NOT EXISTS idx_crisis_alert_events_crisis_alert_id
  ON public.crisis_alert_events (crisis_alert_id);

CREATE INDEX IF NOT EXISTS idx_crisis_alert_events_created_at
  ON public.crisis_alert_events (created_at DESC);

CREATE TABLE IF NOT EXISTS public.crisis_alert_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crisis_alert_id UUID NOT NULL REFERENCES public.crisis_alerts(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crisis_alert_notes_crisis_alert_id
  ON public.crisis_alert_notes (crisis_alert_id);

CREATE INDEX IF NOT EXISTS idx_crisis_alert_notes_created_at
  ON public.crisis_alert_notes (created_at DESC);

CREATE TABLE IF NOT EXISTS public.crisis_alert_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crisis_alert_id UUID NOT NULL REFERENCES public.crisis_alerts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NULL,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  owner_team_id UUID NULL REFERENCES public.teams(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT crisis_alert_actions_status_check
    CHECK (status IN ('pending', 'in_progress', 'done', 'dismissed')),
  CONSTRAINT crisis_alert_actions_type_check
    CHECK (
      action_type IN (
        'revisar_campanhas',
        'reuniao_comercial',
        'acionar_relacionamento',
        'novos_hooks',
        'auditoria_funil',
        'treinamento_operacional',
        'outro'
      )
    )
);

CREATE INDEX IF NOT EXISTS idx_crisis_alert_actions_crisis_alert_id
  ON public.crisis_alert_actions (crisis_alert_id);

CREATE INDEX IF NOT EXISTS idx_crisis_alert_actions_status
  ON public.crisis_alert_actions (status);

CREATE INDEX IF NOT EXISTS idx_crisis_alert_actions_due_at
  ON public.crisis_alert_actions (due_at);

ALTER TABLE IF EXISTS public.crisis_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crisis_alert_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crisis_alert_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crisis_alert_actions ENABLE ROW LEVEL SECURITY;

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

DROP TRIGGER IF EXISTS update_crisis_alerts_updated_at ON public.crisis_alerts;
CREATE TRIGGER update_crisis_alerts_updated_at
  BEFORE UPDATE ON public.crisis_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_crisis_alert_events_updated_at ON public.crisis_alert_events;
CREATE TRIGGER update_crisis_alert_events_updated_at
  BEFORE UPDATE ON public.crisis_alert_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_crisis_alert_notes_updated_at ON public.crisis_alert_notes;
CREATE TRIGGER update_crisis_alert_notes_updated_at
  BEFORE UPDATE ON public.crisis_alert_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_crisis_alert_actions_updated_at ON public.crisis_alert_actions;
CREATE TRIGGER update_crisis_alert_actions_updated_at
  BEFORE UPDATE ON public.crisis_alert_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

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
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
