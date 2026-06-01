-- Force public CRUD for operational announcements and meetings so deletes
-- work from the browser login flow and do not fall back to local-only state.

-- Announcements
ALTER TABLE IF EXISTS public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view active announcements" ON public.announcements;
DROP POLICY IF EXISTS "Coordinators can create announcements" ON public.announcements;
DROP POLICY IF EXISTS "Coordinators can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Coordinators can delete announcements" ON public.announcements;
DROP POLICY IF EXISTS "Allow announcements select" ON public.announcements;
DROP POLICY IF EXISTS "Allow announcements insert" ON public.announcements;
DROP POLICY IF EXISTS "Allow announcements update" ON public.announcements;
DROP POLICY IF EXISTS "Allow announcements delete" ON public.announcements;
DROP POLICY IF EXISTS "Announcements viewable by public" ON public.announcements;
DROP POLICY IF EXISTS "Announcements insertable by public" ON public.announcements;
DROP POLICY IF EXISTS "Announcements updatable by public" ON public.announcements;
DROP POLICY IF EXISTS "Announcements deletable by public" ON public.announcements;

CREATE POLICY "Announcements viewable by public"
ON public.announcements
FOR SELECT
TO public
USING (true);

CREATE POLICY "Announcements insertable by public"
ON public.announcements
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Announcements updatable by public"
ON public.announcements
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Announcements deletable by public"
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

-- Meetings
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

-- Meeting action items already cascade on meeting delete; keep them editable too.
ALTER TABLE IF EXISTS public.meeting_action_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Action items viewable by authenticated users" ON public.meeting_action_items;
DROP POLICY IF EXISTS "Action items insertable by authenticated users" ON public.meeting_action_items;
DROP POLICY IF EXISTS "Action items updatable by assignee or admin" ON public.meeting_action_items;
DROP POLICY IF EXISTS "Action items deletable by admin or coordinator" ON public.meeting_action_items;
DROP POLICY IF EXISTS "Action items viewable by public" ON public.meeting_action_items;
DROP POLICY IF EXISTS "Action items insertable by public" ON public.meeting_action_items;
DROP POLICY IF EXISTS "Action items updatable by public" ON public.meeting_action_items;
DROP POLICY IF EXISTS "Action items deletable by public" ON public.meeting_action_items;

CREATE POLICY "Action items viewable by public"
ON public.meeting_action_items
FOR SELECT
TO public
USING (true);

CREATE POLICY "Action items insertable by public"
ON public.meeting_action_items
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Action items updatable by public"
ON public.meeting_action_items
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Action items deletable by public"
ON public.meeting_action_items
FOR DELETE
TO public
USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.meeting_action_items TO anon, authenticated, service_role;

