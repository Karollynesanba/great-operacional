-- Keep crisis manual client scores on a 0..5 scale.
-- Existing legacy rows from the old 0..100 scale are normalized before the
-- new check constraint is applied.

DO $$
BEGIN
  IF to_regclass('public.crisis_manual_clients') IS NOT NULL THEN
    UPDATE public.crisis_manual_clients
    SET score = CASE
      WHEN score > 5 THEN GREATEST(0, LEAST(5, ROUND(score::numeric / 20.0)::int))
      ELSE GREATEST(0, LEAST(5, score))
    END;

    ALTER TABLE public.crisis_manual_clients
      DROP CONSTRAINT IF EXISTS crisis_manual_clients_score_check;

    ALTER TABLE public.crisis_manual_clients
      ADD CONSTRAINT crisis_manual_clients_score_check
      CHECK (score BETWEEN 0 AND 5);
  END IF;
END $$;
