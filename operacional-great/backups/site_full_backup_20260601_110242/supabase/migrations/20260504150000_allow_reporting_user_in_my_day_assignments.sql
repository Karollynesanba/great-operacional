-- Allow any authenticated user to assign My Day tasks to other users while
-- preserving the reporter identity for transfer text and shared visibility.

ALTER TABLE public.my_day_items
  ADD COLUMN IF NOT EXISTS origin_reporter_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

UPDATE public.my_day_items AS m
SET origin_reporter_user_id = w.reporter_user_id
FROM public.work_items AS w
WHERE m.origin_reporter_user_id IS NULL
  AND m.source = 'WORK_ITEM'
  AND m.source_id::text = w.id::text;

ALTER TABLE IF EXISTS public.my_day_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Users can insert own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Users can update own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Users can delete own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Admins/coordinators can insert my_day_items for others" ON public.my_day_items;
DROP POLICY IF EXISTS "Authenticated users can insert work_item assignments for others" ON public.my_day_items;

CREATE POLICY "Users can view own my_day_items"
ON public.my_day_items FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR origin_reporter_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Users can insert own my_day_items"
ON public.my_day_items FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR origin_reporter_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Users can update own my_day_items"
ON public.my_day_items FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR origin_reporter_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Users can delete own my_day_items"
ON public.my_day_items FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR origin_reporter_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
