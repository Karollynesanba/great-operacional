-- Make meeting deletion reliable in production by removing the old
-- "creator only" dependency. The operational UI is already the source of
-- truth for meeting visibility, so the browser login flow should be able to
-- delete meetings without relying on auth.uid matching the original creator.

ALTER TABLE IF EXISTS public.meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Meetings viewable by authenticated users" ON public.meetings;
DROP POLICY IF EXISTS "Meetings insertable by authenticated users" ON public.meetings;
DROP POLICY IF EXISTS "Meetings updatable by creator" ON public.meetings;
DROP POLICY IF EXISTS "Meetings deletable by creator or admin" ON public.meetings;
DROP POLICY IF EXISTS "Meetings viewable by public" ON public.meetings;
DROP POLICY IF EXISTS "Meetings insertable by public" ON public.meetings;
DROP POLICY IF EXISTS "Meetings updatable by public" ON public.meetings;
DROP POLICY IF EXISTS "Meetings deletable by public" ON public.meetings;

CREATE POLICY "Meetings viewable by public"
ON public.meetings
FOR SELECT
TO public
USING (true);

CREATE POLICY "Meetings insertable by public"
ON public.meetings
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Meetings updatable by public"
ON public.meetings
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Meetings deletable by public"
ON public.meetings
FOR DELETE
TO public
USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.meetings TO anon, authenticated, service_role;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
