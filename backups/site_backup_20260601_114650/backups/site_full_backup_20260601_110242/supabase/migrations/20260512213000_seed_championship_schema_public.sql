-- Great Operacional
-- Seed completo do campeonato para o Supabase online
-- Cria tabelas se estiverem ausentes e abre as policies para o login operacional local

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.championship_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  badge_color TEXT NOT NULL DEFAULT '#2563EB',
  total_points INTEGER NOT NULL DEFAULT 0,
  renewals INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  items_sold INTEGER NOT NULL DEFAULT 0,
  previous_rank INTEGER,
  current_rank INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.championship_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  points INTEGER NOT NULL,
  description TEXT,
  item_label TEXT,
  client_name TEXT,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.championship_monthly_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL,
  month TEXT NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  renewals INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  items_sold INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, month)
);

ALTER TABLE IF EXISTS public.championship_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.championship_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.championship_monthly_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view championship teams" ON public.championship_teams;
DROP POLICY IF EXISTS "Public can manage championship teams" ON public.championship_teams;
DROP POLICY IF EXISTS "Public can view championship events" ON public.championship_events;
DROP POLICY IF EXISTS "Public can create championship events" ON public.championship_events;
DROP POLICY IF EXISTS "Public can update championship events" ON public.championship_events;
DROP POLICY IF EXISTS "Public can delete championship events" ON public.championship_events;
DROP POLICY IF EXISTS "Public can view monthly history" ON public.championship_monthly_history;
DROP POLICY IF EXISTS "Public can manage monthly history" ON public.championship_monthly_history;

CREATE POLICY "Public can view championship teams"
ON public.championship_teams
FOR SELECT
TO public
USING (true);

CREATE POLICY "Public can manage championship teams"
ON public.championship_teams
FOR ALL
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can view championship events"
ON public.championship_events
FOR SELECT
TO public
USING (true);

CREATE POLICY "Public can create championship events"
ON public.championship_events
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Public can update championship events"
ON public.championship_events
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can delete championship events"
ON public.championship_events
FOR DELETE
TO public
USING (true);

CREATE POLICY "Public can view monthly history"
ON public.championship_monthly_history
FOR SELECT
TO public
USING (true);

CREATE POLICY "Public can manage monthly history"
ON public.championship_monthly_history
FOR ALL
TO public
USING (true)
WITH CHECK (true);

INSERT INTO public.championship_teams (team_id, label, badge_color, current_rank)
VALUES
  ('TIME_7', 'Equipe 7', '#2563EB', 1),
  ('TROPA_DE_ELITE', 'Tropa de Elite', '#DC2626', 2)
ON CONFLICT (team_id) DO UPDATE
SET label = EXCLUDED.label,
    badge_color = EXCLUDED.badge_color,
    current_rank = EXCLUDED.current_rank,
    updated_at = now();

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
      AND tablename = 'championship_teams'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.championship_teams;
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
      AND tablename = 'championship_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.championship_events;
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
