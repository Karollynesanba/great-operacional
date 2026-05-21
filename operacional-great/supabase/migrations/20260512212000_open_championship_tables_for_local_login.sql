-- Allow the local operational login flow to record championship events
-- without depending on auth.users rows that do not exist in the mock/local setup.

ALTER TABLE IF EXISTS public.championship_events
  DROP CONSTRAINT IF EXISTS championship_events_created_by_fkey;

ALTER TABLE IF EXISTS public.championship_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.championship_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.championship_monthly_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view championship teams" ON public.championship_teams;
DROP POLICY IF EXISTS "Coordinators can manage championship teams" ON public.championship_teams;
DROP POLICY IF EXISTS "Everyone can view championship events" ON public.championship_events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.championship_events;
DROP POLICY IF EXISTS "Coordinators can manage events" ON public.championship_events;
DROP POLICY IF EXISTS "Coordinators can delete events" ON public.championship_events;
DROP POLICY IF EXISTS "Everyone can view monthly history" ON public.championship_monthly_history;
DROP POLICY IF EXISTS "Coordinators can manage monthly history" ON public.championship_monthly_history;

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
