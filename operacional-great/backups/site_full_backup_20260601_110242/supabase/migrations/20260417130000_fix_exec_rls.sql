-- ==============================================
-- Fix exec tables: RLS + user_id column types
-- The app uses local auth (not Supabase auth),
-- so auth.uid() is always NULL. Fix RLS and
-- convert UUID user_id columns to TEXT to allow
-- non-UUID user IDs like 'admin-1'.
-- ==============================================

-- Drop policies first so column type changes do not fail on dependencies
DROP POLICY IF EXISTS "Exec boards insertable by authenticated users" ON public.exec_boards;
DROP POLICY IF EXISTS "Exec boards updatable by creator or coordinator or admin" ON public.exec_boards;
DROP POLICY IF EXISTS "Exec boards deletable by creator or coordinator or admin" ON public.exec_boards;
DROP POLICY IF EXISTS "Exec columns deletable by coordinator or admin" ON public.exec_columns;
DROP POLICY IF EXISTS "Exec cards insertable by authenticated users" ON public.exec_cards;
DROP POLICY IF EXISTS "Exec cards updatable by assignee or creator or coordinator or admin" ON public.exec_cards;
DROP POLICY IF EXISTS "Exec cards deletable by creator or coordinator or admin" ON public.exec_cards;
DROP POLICY IF EXISTS "Exec comments insertable by authenticated users" ON public.exec_comments;
DROP POLICY IF EXISTS "Exec comments updatable by author" ON public.exec_comments;
DROP POLICY IF EXISTS "Exec comments deletable by author or admin" ON public.exec_comments;
DROP POLICY IF EXISTS "Exec views viewable by owner" ON public.exec_views;
DROP POLICY IF EXISTS "Exec views insertable by owner" ON public.exec_views;
DROP POLICY IF EXISTS "Exec views updatable by owner" ON public.exec_views;
DROP POLICY IF EXISTS "Exec views deletable by owner" ON public.exec_views;

-- Change created_by_user_id from UUID to TEXT in exec_boards
ALTER TABLE public.exec_boards
  ALTER COLUMN created_by_user_id TYPE TEXT USING created_by_user_id::text;

-- Change user ID columns in exec_cards to TEXT
ALTER TABLE public.exec_cards
  ALTER COLUMN created_by_user_id TYPE TEXT USING created_by_user_id::text,
  ALTER COLUMN assigned_to_user_id TYPE TEXT USING assigned_to_user_id::text;

-- Change author_user_id in exec_comments to TEXT
ALTER TABLE public.exec_comments
  ALTER COLUMN author_user_id TYPE TEXT USING author_user_id::text;

-- Change user_id in exec_views to TEXT
ALTER TABLE public.exec_views
  ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- Fix exec_boards RLS: remove auth.uid() dependency
DROP POLICY IF EXISTS "Allow exec boards insert" ON public.exec_boards;
DROP POLICY IF EXISTS "Allow exec boards update" ON public.exec_boards;
DROP POLICY IF EXISTS "Allow exec boards delete" ON public.exec_boards;
CREATE POLICY "Allow exec boards insert"
  ON public.exec_boards FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow exec boards update"
  ON public.exec_boards FOR UPDATE USING (true);

CREATE POLICY "Allow exec boards delete"
  ON public.exec_boards FOR DELETE USING (true);

-- Fix exec_columns RLS
DROP POLICY IF EXISTS "Allow exec columns delete" ON public.exec_columns;
CREATE POLICY "Allow exec columns delete"
  ON public.exec_columns FOR DELETE USING (true);

-- Fix exec_cards RLS
DROP POLICY IF EXISTS "Allow exec cards insert" ON public.exec_cards;
DROP POLICY IF EXISTS "Allow exec cards update" ON public.exec_cards;
DROP POLICY IF EXISTS "Allow exec cards delete" ON public.exec_cards;
CREATE POLICY "Allow exec cards insert"
  ON public.exec_cards FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow exec cards update"
  ON public.exec_cards FOR UPDATE USING (true);

CREATE POLICY "Allow exec cards delete"
  ON public.exec_cards FOR DELETE USING (true);

-- Fix exec_comments RLS
DROP POLICY IF EXISTS "Allow exec comments insert" ON public.exec_comments;
DROP POLICY IF EXISTS "Allow exec comments update" ON public.exec_comments;
DROP POLICY IF EXISTS "Allow exec comments delete" ON public.exec_comments;
CREATE POLICY "Allow exec comments insert"
  ON public.exec_comments FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow exec comments update"
  ON public.exec_comments FOR UPDATE USING (true);

CREATE POLICY "Allow exec comments delete"
  ON public.exec_comments FOR DELETE USING (true);

-- Fix exec_views RLS
DROP POLICY IF EXISTS "Allow exec views select" ON public.exec_views;
DROP POLICY IF EXISTS "Allow exec views insert" ON public.exec_views;
DROP POLICY IF EXISTS "Allow exec views update" ON public.exec_views;
DROP POLICY IF EXISTS "Allow exec views delete" ON public.exec_views;
CREATE POLICY "Allow exec views select"
  ON public.exec_views FOR SELECT USING (true);

CREATE POLICY "Allow exec views insert"
  ON public.exec_views FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow exec views update"
  ON public.exec_views FOR UPDATE USING (true);

CREATE POLICY "Allow exec views delete"
  ON public.exec_views FOR DELETE USING (true);
