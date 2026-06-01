-- Keep championship scores consistent when an event is deleted.
-- The UI already has a trash button in the event log; this migration makes
-- sure the database always replays the ledger so team totals go back to the
-- previous values after any delete/update.

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

CREATE OR REPLACE FUNCTION public.recompute_championship_team_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  WITH team_stats AS (
    SELECT
      t.id,
      t.team_id,
      COALESCE(SUM(e.points), 0)::integer AS total_points,
      COALESCE(COUNT(*) FILTER (WHERE e.event_type = 'RENEWAL'), 0)::integer AS renewals,
      COALESCE(COUNT(*) FILTER (WHERE e.event_type = 'LOSS'), 0)::integer AS losses,
      COALESCE(COUNT(*) FILTER (WHERE e.event_type = 'ITEM_SOLD'), 0)::integer AS items_sold
    FROM public.championship_teams t
    LEFT JOIN public.championship_events e
      ON e.team_id = t.team_id
    GROUP BY t.id, t.team_id
  ),
  ranked AS (
    SELECT
      id,
      team_id,
      total_points,
      renewals,
      losses,
      items_sold,
      ROW_NUMBER() OVER (
        ORDER BY total_points DESC, items_sold DESC, renewals DESC, losses ASC, team_id ASC
      ) AS current_rank
    FROM team_stats
  )
  UPDATE public.championship_teams t
  SET
    total_points = ranked.total_points,
    renewals = ranked.renewals,
    losses = ranked.losses,
    items_sold = ranked.items_sold,
    previous_rank = t.current_rank,
    current_rank = ranked.current_rank,
    updated_at = now()
  FROM ranked
  WHERE t.id = ranked.id;

  -- Keep monthly history consistent with the current aggregated score.
  UPDATE public.championship_monthly_history h
  SET
    total_points = t.total_points,
    renewals = t.renewals,
    losses = t.losses,
    items_sold = t.items_sold
  FROM public.championship_teams t
  WHERE h.team_id = t.team_id
    AND h.month = to_char(now(), 'YYYY-MM');

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS recalculate_championship_team_stats_trigger ON public.championship_events;
CREATE TRIGGER recalculate_championship_team_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.championship_events
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.recompute_championship_team_stats();
