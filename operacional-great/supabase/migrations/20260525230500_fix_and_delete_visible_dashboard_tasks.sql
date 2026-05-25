-- Fix the work_items cleanup trigger and delete the visible test tasks.
-- Run this in Supabase SQL Editor.

BEGIN;

CREATE OR REPLACE FUNCTION public.cleanup_on_work_item_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.my_day_items
  WHERE source IN ('WORK_ITEM', 'WORKITEM')
    AND source_id::text = OLD.id::text;

  DELETE FROM public.notifications
  WHERE related_entity = 'work_items'
    AND related_entity_id::text = OLD.id::text;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS work_items_cleanup_after_delete ON public.work_items;
CREATE TRIGGER work_items_cleanup_after_delete
AFTER DELETE ON public.work_items
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_on_work_item_delete();

WITH deleted_tasks AS (
  DELETE FROM public.work_items
  WHERE lower(trim(title)) IN ('teste', 'teste 2.0', 'ana julia')
  RETURNING id
)
DELETE FROM public.my_day_items
WHERE source IN ('WORK_ITEM', 'WORKITEM')
  AND source_id::text IN (SELECT id::text FROM deleted_tasks);

DELETE FROM public.notifications
WHERE related_entity = 'work_items'
  AND lower(coalesce(title, '')) LIKE '%teste%'
  AND lower(coalesce(title, '')) NOT LIKE '%reuni%';

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;

COMMIT;
