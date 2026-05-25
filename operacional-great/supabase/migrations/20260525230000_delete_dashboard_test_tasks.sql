-- Remove the visible test tasks from the dashboard right away.
-- This targets the exact tasks shown in the screenshot and cleans up
-- their linked My Day rows and notifications.

BEGIN;

DO $$
DECLARE
  deleted_task_ids uuid[];
BEGIN
  WITH deleted_tasks AS (
    DELETE FROM public.work_items
    WHERE lower(trim(title)) IN ('teste', 'teste 2.0', 'ana julia')
    RETURNING id
  )
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
  INTO deleted_task_ids
  FROM deleted_tasks;

  DELETE FROM public.my_day_items
  WHERE source IN ('WORK_ITEM', 'WORKITEM')
    AND source_id = ANY (deleted_task_ids);

  DELETE FROM public.notifications
  WHERE related_entity = 'work_items'
    AND lower(coalesce(title, '')) LIKE '%teste%';
END $$;

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;

COMMIT;
