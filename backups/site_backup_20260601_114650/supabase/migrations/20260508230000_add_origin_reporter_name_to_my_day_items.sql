-- Persist the reporting user's display name so My Day can show "Ana -> Clara".

ALTER TABLE public.my_day_items
  ADD COLUMN IF NOT EXISTS origin_reporter_name TEXT;

-- Backfill from the direct reporter user when available.
UPDATE public.my_day_items mdi
SET origin_reporter_name = COALESCE(NULLIF(mdi.origin_reporter_name, ''), p.full_name, p.email)
FROM public.profiles p
WHERE mdi.origin_reporter_user_id = p.id
  AND COALESCE(mdi.origin_reporter_name, '') = '';

-- Backfill work-item sourced rows using the linked work item reporter as a fallback.
UPDATE public.my_day_items mdi
SET origin_reporter_name = COALESCE(NULLIF(mdi.origin_reporter_name, ''), p.full_name, p.email)
FROM public.work_items wi
LEFT JOIN public.profiles p ON p.id = wi.reporter_user_id
WHERE mdi.source = 'WORK_ITEM'
  AND mdi.source_id = wi.id
  AND COALESCE(mdi.origin_reporter_name, '') = '';

-- Reload schema cache for PostgREST when available.
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
