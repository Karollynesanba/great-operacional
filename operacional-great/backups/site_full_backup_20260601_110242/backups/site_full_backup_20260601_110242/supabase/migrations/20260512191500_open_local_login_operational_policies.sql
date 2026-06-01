-- Open the operational flows for the app's local-login model.
-- This keeps meetings, announcements, clients, creatives and notifications
-- writable from the browser while still allowing per-user filtering in the app.

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Notifications viewable by public" ON public.notifications;
DROP POLICY IF EXISTS "Notifications insertable by public" ON public.notifications;
DROP POLICY IF EXISTS "Notifications updatable by public" ON public.notifications;
DROP POLICY IF EXISTS "Notifications deletable by public" ON public.notifications;

CREATE POLICY "Notifications viewable by public"
ON public.notifications
FOR SELECT
TO public
USING (true);

CREATE POLICY "Notifications insertable by public"
ON public.notifications
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Notifications updatable by public"
ON public.notifications
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Notifications deletable by public"
ON public.notifications
FOR DELETE
TO public
USING (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Operational clients
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.operational_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operational clients viewable by authenticated users" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients insertable by authenticated users" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients updatable by authenticated users" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients deletable by authenticated users" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients viewable by public" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients insertable by public" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients updatable by public" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients deletable by public" ON public.operational_clients;

CREATE POLICY "Operational clients viewable by public"
ON public.operational_clients
FOR SELECT
TO public
USING (true);

CREATE POLICY "Operational clients insertable by public"
ON public.operational_clients
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Operational clients updatable by public"
ON public.operational_clients
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Operational clients deletable by public"
ON public.operational_clients
FOR DELETE
TO public
USING (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.operational_clients;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Meetings
-- ---------------------------------------------------------------------------
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

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Meeting action items
-- ---------------------------------------------------------------------------
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

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_action_items;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Announcements
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view active announcements" ON public.announcements;
DROP POLICY IF EXISTS "Allow announcement inserts" ON public.announcements;
DROP POLICY IF EXISTS "Allow announcement updates" ON public.announcements;
DROP POLICY IF EXISTS "Allow announcement deletes" ON public.announcements;
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

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Ad creatives + storage bucket
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.ad_creatives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Authenticated users can insert ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Authenticated users can update ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Authenticated users can delete ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Anyone can view ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Anyone can insert ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Anyone can update ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Anyone can delete ad creatives" ON public.ad_creatives;

CREATE POLICY "Ad creatives viewable by public"
ON public.ad_creatives
FOR SELECT
TO public
USING (true);

CREATE POLICY "Ad creatives insertable by public"
ON public.ad_creatives
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Ad creatives updatable by public"
ON public.ad_creatives
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Ad creatives deletable by public"
ON public.ad_creatives
FOR DELETE
TO public
USING (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ad_creatives;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-creatives', 'ad-creatives', true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = true;

DROP POLICY IF EXISTS "Anyone can view ad creative images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload ad creative images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete ad creative images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload ad creative images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete ad creative images" ON storage.objects;

CREATE POLICY "Anyone can view ad creative images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'ad-creatives');

CREATE POLICY "Anyone can upload ad creative images"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'ad-creatives');

CREATE POLICY "Anyone can delete ad creative images"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'ad-creatives');

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
