-- Align My Day storage with the app behavior:
-- source_id is used as a logical assignment key (string), not a UUID.
-- Also remove duplicated rows already present in production and add a
-- unique index so future inserts/upserts stay idempotent.

ALTER TABLE public.my_day_items
  ALTER COLUMN source_id TYPE TEXT
  USING source_id::text;

DELETE FROM public.my_day_items a
USING (
  SELECT
    ctid,
    row_number() OVER (
      PARTITION BY user_id, date, source, source_id, title
      ORDER BY created_at, id
    ) AS rn
  FROM public.my_day_items
) dup
WHERE a.ctid = dup.ctid
  AND dup.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS my_day_items_unique_assignment
ON public.my_day_items (user_id, date, source, source_id, title);
