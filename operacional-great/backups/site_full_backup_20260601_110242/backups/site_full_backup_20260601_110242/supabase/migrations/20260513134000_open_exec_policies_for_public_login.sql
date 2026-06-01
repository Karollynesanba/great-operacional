-- Open Exec / ClickUp-style tables and announcements to the browser login flow.
-- This keeps CRUD working even when the app is using local login instead of
-- a real Supabase Auth session.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.exec_boards,
  public.exec_columns,
  public.exec_cards,
  public.exec_comments,
  public.exec_views,
  public.announcements,
  public.notifications
TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Exec / ClickUp-style tables
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.exec_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exec_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exec_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exec_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exec_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Exec boards viewable by authenticated users" ON public.exec_boards;
DROP POLICY IF EXISTS "Exec boards insertable by authenticated users" ON public.exec_boards;
DROP POLICY IF EXISTS "Exec boards updatable by creator or coordinator or admin" ON public.exec_boards;
DROP POLICY IF EXISTS "Exec boards deletable by creator or coordinator or admin" ON public.exec_boards;
DROP POLICY IF EXISTS "Allow exec boards select" ON public.exec_boards;
DROP POLICY IF EXISTS "Allow exec boards insert" ON public.exec_boards;
DROP POLICY IF EXISTS "Allow exec boards update" ON public.exec_boards;
DROP POLICY IF EXISTS "Allow exec boards delete" ON public.exec_boards;

DROP POLICY IF EXISTS "Exec columns viewable by authenticated users" ON public.exec_columns;
DROP POLICY IF EXISTS "Exec columns insertable by authenticated users" ON public.exec_columns;
DROP POLICY IF EXISTS "Exec columns updatable by authenticated users" ON public.exec_columns;
DROP POLICY IF EXISTS "Exec columns deletable by coordinator or admin" ON public.exec_columns;
DROP POLICY IF EXISTS "Allow exec columns select" ON public.exec_columns;
DROP POLICY IF EXISTS "Allow exec columns insert" ON public.exec_columns;
DROP POLICY IF EXISTS "Allow exec columns update" ON public.exec_columns;
DROP POLICY IF EXISTS "Allow exec columns delete" ON public.exec_columns;

DROP POLICY IF EXISTS "Exec cards viewable by authenticated users" ON public.exec_cards;
DROP POLICY IF EXISTS "Exec cards insertable by authenticated users" ON public.exec_cards;
DROP POLICY IF EXISTS "Exec cards updatable by assignee or creator or coordinator or admin" ON public.exec_cards;
DROP POLICY IF EXISTS "Exec cards deletable by creator or coordinator or admin" ON public.exec_cards;
DROP POLICY IF EXISTS "Allow exec cards select" ON public.exec_cards;
DROP POLICY IF EXISTS "Allow exec cards insert" ON public.exec_cards;
DROP POLICY IF EXISTS "Allow exec cards update" ON public.exec_cards;
DROP POLICY IF EXISTS "Allow exec cards delete" ON public.exec_cards;

DROP POLICY IF EXISTS "Exec comments viewable by authenticated users" ON public.exec_comments;
DROP POLICY IF EXISTS "Exec comments insertable by authenticated users" ON public.exec_comments;
DROP POLICY IF EXISTS "Exec comments updatable by author" ON public.exec_comments;
DROP POLICY IF EXISTS "Exec comments deletable by author or admin" ON public.exec_comments;
DROP POLICY IF EXISTS "Allow exec comments select" ON public.exec_comments;
DROP POLICY IF EXISTS "Allow exec comments insert" ON public.exec_comments;
DROP POLICY IF EXISTS "Allow exec comments update" ON public.exec_comments;
DROP POLICY IF EXISTS "Allow exec comments delete" ON public.exec_comments;

DROP POLICY IF EXISTS "Exec views viewable by owner" ON public.exec_views;
DROP POLICY IF EXISTS "Exec views insertable by owner" ON public.exec_views;
DROP POLICY IF EXISTS "Exec views updatable by owner" ON public.exec_views;
DROP POLICY IF EXISTS "Exec views deletable by owner" ON public.exec_views;
DROP POLICY IF EXISTS "Allow exec views select" ON public.exec_views;
DROP POLICY IF EXISTS "Allow exec views insert" ON public.exec_views;
DROP POLICY IF EXISTS "Allow exec views update" ON public.exec_views;
DROP POLICY IF EXISTS "Allow exec views delete" ON public.exec_views;

CREATE POLICY "Allow exec boards select"
ON public.exec_boards
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow exec boards insert"
ON public.exec_boards
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow exec boards update"
ON public.exec_boards
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow exec boards delete"
ON public.exec_boards
FOR DELETE
TO public
USING (true);

CREATE POLICY "Allow exec columns select"
ON public.exec_columns
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow exec columns insert"
ON public.exec_columns
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow exec columns update"
ON public.exec_columns
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow exec columns delete"
ON public.exec_columns
FOR DELETE
TO public
USING (true);

CREATE POLICY "Allow exec cards select"
ON public.exec_cards
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow exec cards insert"
ON public.exec_cards
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow exec cards update"
ON public.exec_cards
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow exec cards delete"
ON public.exec_cards
FOR DELETE
TO public
USING (true);

CREATE POLICY "Allow exec comments select"
ON public.exec_comments
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow exec comments insert"
ON public.exec_comments
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow exec comments update"
ON public.exec_comments
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow exec comments delete"
ON public.exec_comments
FOR DELETE
TO public
USING (true);

CREATE POLICY "Allow exec views select"
ON public.exec_views
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow exec views insert"
ON public.exec_views
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow exec views update"
ON public.exec_views
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow exec views delete"
ON public.exec_views
FOR DELETE
TO public
USING (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.exec_boards;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.exec_columns;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.exec_cards;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.exec_comments;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.exec_views;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Announcements / Mural de Avisos
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
DROP POLICY IF EXISTS "Coordinators can create announcements" ON public.announcements;
DROP POLICY IF EXISTS "Coordinators can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Coordinators can delete announcements" ON public.announcements;

CREATE POLICY "Announcements viewable by public"
ON public.announcements
FOR SELECT
TO public
USING (
  is_active = true
  AND (expires_at IS NULL OR expires_at > now())
);

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

CREATE OR REPLACE FUNCTION public.enforce_announcement_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at <= now() THEN
    NEW.is_active := false;
  ELSIF NEW.is_active IS NULL THEN
    NEW.is_active := true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS announcements_enforce_expiry_trigger ON public.announcements;
CREATE TRIGGER announcements_enforce_expiry_trigger
BEFORE INSERT OR UPDATE OF expires_at, is_active ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.enforce_announcement_expiry();

CREATE OR REPLACE FUNCTION public.sync_expired_announcements()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.announcements
  SET is_active = false
  WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at <= now();
END;
$$;

-- Runs every 5 minutes so announcements really disappear after expiration.
SELECT cron.schedule(
  'sync-expired-announcements-every-5-minutes',
  '*/5 * * * *',
  $$ SELECT public.sync_expired_announcements(); $$
);

-- Ensure already-expired rows stop showing right away after the migration.
UPDATE public.announcements
SET is_active = false
WHERE is_active = true
  AND expires_at IS NOT NULL
  AND expires_at <= now();
