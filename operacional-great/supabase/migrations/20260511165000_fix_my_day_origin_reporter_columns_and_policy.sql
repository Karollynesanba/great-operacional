-- Make the My Day reporter columns available before applying the shared-task policy.
-- This migration is idempotent so it can be run safely in production.

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

    UPDATE public.my_day_items mdi
    SET origin_reporter_name = COALESCE(NULLIF(mdi.origin_reporter_name, ''), p.full_name, p.email)
    FROM public.work_items wi
    LEFT JOIN public.profiles p ON p.id = wi.reporter_user_id
    WHERE mdi.source = 'WORK_ITEM'
      AND mdi.source_id::text = wi.id::text
      AND COALESCE(mdi.origin_reporter_name, '') = '';
  END IF;
END $$;

ALTER TABLE IF EXISTS public.my_day_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reporters can insert my_day_items for assigned users" ON public.my_day_items;

CREATE POLICY "Reporters can insert my_day_items for assigned users"
ON public.my_day_items
FOR INSERT
TO authenticated
WITH CHECK (
  origin_reporter_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.operational_role = 'COORDENADOR_RED'
  )
);

DROP POLICY IF EXISTS "Users can view own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Users can insert own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Users can update own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Users can delete own my_day_items" ON public.my_day_items;

CREATE POLICY "Users can view own my_day_items"
ON public.my_day_items FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR origin_reporter_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.operational_role = 'COORDENADOR_RED'
  )
);

CREATE POLICY "Users can insert own my_day_items"
ON public.my_day_items FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR origin_reporter_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.operational_role = 'COORDENADOR_RED'
  )
);

CREATE POLICY "Users can update own my_day_items"
ON public.my_day_items FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR origin_reporter_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.operational_role = 'COORDENADOR_RED'
  )
);

CREATE POLICY "Users can delete own my_day_items"
ON public.my_day_items FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR origin_reporter_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.operational_role = 'COORDENADOR_RED'
  )
);

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
