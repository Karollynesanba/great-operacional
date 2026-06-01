-- Make announcements deletions persist for the local-login flow.
-- Also add a persisted exclusion table so My Day removals do not reappear
-- when tasks are regenerated from work_items or permanent routines.

-- ---------------------------------------------------------------------------
-- Announcements
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view active announcements" ON public.announcements;
DROP POLICY IF EXISTS "Coordinators can create announcements" ON public.announcements;
DROP POLICY IF EXISTS "Coordinators can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Coordinators can delete announcements" ON public.announcements;
DROP POLICY IF EXISTS "Allow announcements select" ON public.announcements;
DROP POLICY IF EXISTS "Allow announcements insert" ON public.announcements;
DROP POLICY IF EXISTS "Allow announcements update" ON public.announcements;
DROP POLICY IF EXISTS "Allow announcements delete" ON public.announcements;

CREATE POLICY "Allow announcements select"
ON public.announcements
FOR SELECT
TO public
USING (
  is_active = true
  AND (expires_at IS NULL OR expires_at > now())
);

CREATE POLICY "Allow announcements insert"
ON public.announcements
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow announcements update"
ON public.announcements
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow announcements delete"
ON public.announcements
FOR DELETE
TO public
USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.announcements TO anon, authenticated, service_role;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- My Day exclusions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.my_day_item_exclusions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_date DATE NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  created_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS my_day_item_exclusions_unique_key
ON public.my_day_item_exclusions (user_id, item_date, source, source_id, title);

ALTER TABLE IF EXISTS public.my_day_item_exclusions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow my_day_item_exclusions select" ON public.my_day_item_exclusions;
DROP POLICY IF EXISTS "Allow my_day_item_exclusions insert" ON public.my_day_item_exclusions;
DROP POLICY IF EXISTS "Allow my_day_item_exclusions update" ON public.my_day_item_exclusions;
DROP POLICY IF EXISTS "Allow my_day_item_exclusions delete" ON public.my_day_item_exclusions;

CREATE POLICY "Allow my_day_item_exclusions select"
ON public.my_day_item_exclusions
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow my_day_item_exclusions insert"
ON public.my_day_item_exclusions
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow my_day_item_exclusions update"
ON public.my_day_item_exclusions
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow my_day_item_exclusions delete"
ON public.my_day_item_exclusions
FOR DELETE
TO public
USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.my_day_item_exclusions TO anon, authenticated, service_role;

