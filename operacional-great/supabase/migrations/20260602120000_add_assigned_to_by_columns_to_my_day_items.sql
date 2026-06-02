BEGIN;

ALTER TABLE IF EXISTS public.my_day_items
  ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.my_day_items
  ADD COLUMN IF NOT EXISTS assigned_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

UPDATE public.my_day_items
SET assigned_to_user_id = COALESCE(assigned_to_user_id, user_id)
WHERE assigned_to_user_id IS NULL;

UPDATE public.my_day_items
SET assigned_by_user_id = COALESCE(assigned_by_user_id, origin_reporter_user_id)
WHERE assigned_by_user_id IS NULL;

UPDATE public.my_day_items
SET origin_reporter_user_id = COALESCE(origin_reporter_user_id, assigned_by_user_id)
WHERE origin_reporter_user_id IS NULL;

CREATE OR REPLACE FUNCTION public.sync_my_day_assignment_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_id := COALESCE(NEW.user_id, NEW.assigned_to_user_id);
  NEW.assigned_to_user_id := COALESCE(NEW.assigned_to_user_id, NEW.user_id);
  NEW.origin_reporter_user_id := COALESCE(NEW.origin_reporter_user_id, NEW.assigned_by_user_id);
  NEW.assigned_by_user_id := COALESCE(NEW.assigned_by_user_id, NEW.origin_reporter_user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_my_day_assignment_columns_trigger ON public.my_day_items;

CREATE TRIGGER sync_my_day_assignment_columns_trigger
BEFORE INSERT OR UPDATE ON public.my_day_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_my_day_assignment_columns();

CREATE INDEX IF NOT EXISTS idx_my_day_items_assigned_to_user_id
  ON public.my_day_items (assigned_to_user_id);

CREATE INDEX IF NOT EXISTS idx_my_day_items_assigned_by_user_id
  ON public.my_day_items (assigned_by_user_id);

COMMIT;
