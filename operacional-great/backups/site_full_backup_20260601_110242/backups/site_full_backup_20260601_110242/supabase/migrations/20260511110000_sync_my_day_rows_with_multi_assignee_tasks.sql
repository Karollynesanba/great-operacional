-- Keep My Day in sync with work item assignments without duplicating rows.
-- This replaces the single-assignee trigger behavior with one My Day row per
-- assigned user, using the multi-assignee payload already stored in work_items.tags.

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

CREATE OR REPLACE FUNCTION public.handle_task_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reporter_name TEXT;
  task_priority TEXT;
  task_date DATE;
  assignee_ids UUID[];
  assignee_id UUID;
BEGIN
  IF NEW.reporter_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT full_name
    INTO reporter_name
  FROM public.profiles
  WHERE id = NEW.reporter_user_id;

  task_priority := COALESCE(NEW.priority, 'MEDIA');
  task_date := COALESCE(NEW.due_date, CURRENT_DATE);

  assignee_ids := ARRAY(
    SELECT DISTINCT value::uuid
    FROM jsonb_array_elements_text(COALESCE(NEW.tags->'assignee_user_ids', '[]'::jsonb)) AS t(value)
    WHERE value IS NOT NULL AND value <> ''
  );

  IF array_length(assignee_ids, 1) IS NULL AND NEW.assignee_user_id IS NOT NULL THEN
    assignee_ids := ARRAY[NEW.assignee_user_id];
  END IF;

  IF array_length(assignee_ids, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  FOREACH assignee_id IN ARRAY assignee_ids LOOP
    INSERT INTO public.my_day_items (
      user_id,
      title,
      source,
      source_id,
      priority,
      status,
      date,
      deadline_date,
      deadline_time,
      deadline_notified,
      origin_reporter_user_id,
      origin_reporter_name
    )
    VALUES (
      assignee_id,
      NEW.title,
      'WORK_ITEM',
      NEW.id::text,
      task_priority,
      'PENDENTE',
      task_date,
      task_date,
      NULL,
      false,
      NEW.reporter_user_id,
      reporter_name
    )
    ON CONFLICT (user_id, date, source, source_id, title)
    DO UPDATE SET
      title = EXCLUDED.title,
      priority = EXCLUDED.priority,
      deadline_date = EXCLUDED.deadline_date,
      deadline_time = EXCLUDED.deadline_time,
      deadline_notified = EXCLUDED.deadline_notified,
      origin_reporter_user_id = EXCLUDED.origin_reporter_user_id,
      origin_reporter_name = EXCLUDED.origin_reporter_name,
      updated_at = now();
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_assigned ON public.work_items;

CREATE TRIGGER on_task_assigned
  AFTER INSERT OR UPDATE ON public.work_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_assignment();

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
