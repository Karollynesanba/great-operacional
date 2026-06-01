-- Recalculate championship team stats from the event ledger
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

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS recalculate_championship_team_stats_trigger ON public.championship_events;
CREATE TRIGGER recalculate_championship_team_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.championship_events
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.recompute_championship_team_stats();
