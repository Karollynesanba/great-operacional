-- Restore the shared task assignment flow so a work item assigned to one user
-- also appears in that user's My Day list, even when the task is created or
-- transferred from another browser/session.

BEGIN;

-- ---------------------------------------------------------------------------
-- My Day schema hardening
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.my_day_items
  ALTER COLUMN source_id TYPE TEXT
  USING source_id::text;

ALTER TABLE public.my_day_items
  ADD COLUMN IF NOT EXISTS origin_reporter_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.my_day_items
  ADD COLUMN IF NOT EXISTS origin_reporter_name TEXT;

DO $$
BEGIN
  IF to_regclass('public.work_items') IS NOT NULL THEN
    UPDATE public.my_day_items AS m
    SET origin_reporter_user_id = w.reporter_user_id
    FROM public.work_items AS w
    WHERE m.origin_reporter_user_id IS NULL
      AND m.source = 'WORK_ITEM'
      AND m.source_id::text = w.id::text;

    UPDATE public.my_day_items AS m
    SET origin_reporter_name = COALESCE(NULLIF(m.origin_reporter_name, ''), p.full_name, p.email)
    FROM public.work_items AS w
    LEFT JOIN public.profiles AS p ON p.id = w.reporter_user_id
    WHERE m.source = 'WORK_ITEM'
      AND m.source_id::text = w.id::text
      AND COALESCE(m.origin_reporter_name, '') = '';
  END IF;
END $$;

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

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.my_day_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Work items viewable by authenticated users" ON public.work_items;
DROP POLICY IF EXISTS "Work items insertable by authenticated users" ON public.work_items;
DROP POLICY IF EXISTS "Work items updatable by authenticated users" ON public.work_items;
DROP POLICY IF EXISTS "Work items deletable by owner or admin" ON public.work_items;
DROP POLICY IF EXISTS "Work items viewable by public" ON public.work_items;
DROP POLICY IF EXISTS "Work items insertable by public" ON public.work_items;
DROP POLICY IF EXISTS "Work items updatable by public" ON public.work_items;
DROP POLICY IF EXISTS "Work items deletable by public" ON public.work_items;
DROP POLICY IF EXISTS "Work items insertable by reporter or coordinator or admin" ON public.work_items;
DROP POLICY IF EXISTS "Work items updatable by assignee or reporter or coordinator or admin" ON public.work_items;
DROP POLICY IF EXISTS "Work items deletable by reporter or coordinator or admin" ON public.work_items;

CREATE POLICY "Work items viewable by public"
ON public.work_items
FOR SELECT
TO public
USING (true);

CREATE POLICY "Work items insertable by public"
ON public.work_items
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Work items updatable by public"
ON public.work_items
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Work items deletable by public"
ON public.work_items
FOR DELETE
TO public
USING (true);

DROP POLICY IF EXISTS "Users can view own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Users can insert own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Users can update own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Users can delete own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Admins/coordinators can insert my_day_items for others" ON public.my_day_items;
DROP POLICY IF EXISTS "Admins/coordinators can update my_day_items for others" ON public.my_day_items;
DROP POLICY IF EXISTS "Authenticated users can insert work_item assignments for others" ON public.my_day_items;
DROP POLICY IF EXISTS "Reporters can insert my_day_items for assigned users" ON public.my_day_items;
DROP POLICY IF EXISTS "Allow my_day_items select" ON public.my_day_items;
DROP POLICY IF EXISTS "Allow my_day_items insert" ON public.my_day_items;
DROP POLICY IF EXISTS "Allow my_day_items update" ON public.my_day_items;
DROP POLICY IF EXISTS "Allow my_day_items delete" ON public.my_day_items;
DROP POLICY IF EXISTS "My Day items viewable by public" ON public.my_day_items;
DROP POLICY IF EXISTS "My Day items insertable by public" ON public.my_day_items;
DROP POLICY IF EXISTS "My Day items updatable by public" ON public.my_day_items;
DROP POLICY IF EXISTS "My Day items deletable by public" ON public.my_day_items;

CREATE POLICY "My Day items viewable by public"
ON public.my_day_items
FOR SELECT
TO public
USING (true);

CREATE POLICY "My Day items insertable by public"
ON public.my_day_items
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "My Day items updatable by public"
ON public.my_day_items
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "My Day items deletable by public"
ON public.my_day_items
FOR DELETE
TO public
USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.work_items TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.my_day_items TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Task assignment sync
-- ---------------------------------------------------------------------------

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
    DELETE FROM public.my_day_items
    WHERE source = 'WORK_ITEM'
      AND source_id = NEW.id::text;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    DELETE FROM public.my_day_items
    WHERE source = 'WORK_ITEM'
      AND source_id = NEW.id::text
      AND NOT (user_id = ANY (assignee_ids));
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

-- Backfill any existing work items that still do not have My Day rows.
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
SELECT
  assignee_id,
  wi.title,
  'WORK_ITEM',
  wi.id::text,
  COALESCE(wi.priority, 'MEDIA'),
  'PENDENTE',
  COALESCE(wi.due_date, CURRENT_DATE),
  COALESCE(wi.due_date, CURRENT_DATE),
  NULL,
  false,
  wi.reporter_user_id,
  COALESCE(p.full_name, p.email)
FROM public.work_items wi
LEFT JOIN public.profiles p ON p.id = wi.reporter_user_id
CROSS JOIN LATERAL (
  SELECT DISTINCT value::uuid AS assignee_id
  FROM jsonb_array_elements_text(COALESCE(wi.tags->'assignee_user_ids', '[]'::jsonb)) AS t(value)
  WHERE value IS NOT NULL AND value <> ''

  UNION

  SELECT wi.assignee_user_id
  WHERE wi.assignee_user_id IS NOT NULL
) assignees
WHERE wi.reporter_user_id IS NOT NULL
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

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;

COMMIT;
