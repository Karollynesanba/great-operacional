-- Repair production schema for all user-created flows.
-- This migration is intentionally idempotent so it can be applied safely
-- to production projects that are missing some of the later schema changes.

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  read BOOLEAN NOT NULL DEFAULT false,
  related_entity TEXT NULL,
  related_entity_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- My Day
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.my_day_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL DEFAULT 'MANUAL',
  source_id UUID NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDENTE',
  priority TEXT NOT NULL DEFAULT 'MEDIA',
  deadline_time TEXT NULL,
  deadline_date DATE NULL,
  deadline_notified BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.my_day_items
  ADD COLUMN IF NOT EXISTS deadline_time TEXT NULL,
  ADD COLUMN IF NOT EXISTS deadline_date DATE NULL,
  ADD COLUMN IF NOT EXISTS deadline_notified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL;

ALTER TABLE public.my_day_items DROP CONSTRAINT IF EXISTS my_day_items_source_check;
ALTER TABLE public.my_day_items
  ADD CONSTRAINT my_day_items_source_check
  CHECK (source = ANY (ARRAY['WORKITEM'::text, 'WORK_ITEM'::text, 'MEETING'::text, 'MANUAL'::text, 'PERMANENT'::text]));

ALTER TABLE public.my_day_items DROP CONSTRAINT IF EXISTS my_day_items_priority_check;
ALTER TABLE public.my_day_items
  ADD CONSTRAINT my_day_items_priority_check
  CHECK (priority = ANY (ARRAY['BAIXA'::text, 'MEDIA'::text, 'ALTA'::text, 'URGENTE'::text]));

ALTER TABLE public.my_day_items DROP CONSTRAINT IF EXISTS my_day_items_status_check;
ALTER TABLE public.my_day_items
  ADD CONSTRAINT my_day_items_status_check
  CHECK (status = ANY (ARRAY['PENDENTE'::text, 'EM_ANDAMENTO'::text, 'CONCLUIDO'::text]));

CREATE UNIQUE INDEX IF NOT EXISTS unique_permanent_task_per_user_day
ON public.my_day_items (user_id, title, date)
WHERE source = 'PERMANENT';

ALTER TABLE IF EXISTS public.my_day_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Users can insert own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Users can update own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Users can delete own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Admins/coordinators can insert my_day_items for others" ON public.my_day_items;
DROP POLICY IF EXISTS "Admins/coordinators can update my_day_items for others" ON public.my_day_items;

CREATE POLICY "Users can view own my_day_items"
ON public.my_day_items FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
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
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins/coordinators can insert my_day_items for others"
ON public.my_day_items FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
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
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.operational_role = 'COORDENADOR_RED'
  )
);

-- ---------------------------------------------------------------------------
-- Work items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'TASK',
  title TEXT NOT NULL,
  description TEXT NULL,
  status TEXT NOT NULL DEFAULT 'BACKLOG',
  priority TEXT NOT NULL DEFAULT 'MEDIA',
  due_date DATE NULL,
  assignee_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reporter_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  related_client_id UUID REFERENCES public.operational_clients(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  tags JSONB NULL,
  estimate_points INTEGER NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.work_items
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

ALTER TABLE public.work_items DROP CONSTRAINT IF EXISTS work_items_status_check;
ALTER TABLE public.work_items
  ADD CONSTRAINT work_items_status_check
  CHECK (status = ANY (ARRAY['BACKLOG'::text, 'TODO'::text, 'DOING'::text, 'EM_ANDAMENTO'::text, 'REVIEW'::text, 'BLOCKED'::text, 'BLOQUEADO'::text, 'DONE'::text, 'CONCLUIDO'::text]));

ALTER TABLE public.work_items DROP CONSTRAINT IF EXISTS work_items_priority_check;
ALTER TABLE public.work_items
  ADD CONSTRAINT work_items_priority_check
  CHECK (priority = ANY (ARRAY['BAIXA'::text, 'MEDIA'::text, 'ALTA'::text, 'URGENTE'::text]));

ALTER TABLE IF EXISTS public.work_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Work items viewable by authenticated users" ON public.work_items;
DROP POLICY IF EXISTS "Work items insertable by authenticated users" ON public.work_items;
DROP POLICY IF EXISTS "Work items updatable by authenticated users" ON public.work_items;
DROP POLICY IF EXISTS "Work items deletable by owner or admin" ON public.work_items;

CREATE POLICY "Work items viewable by authenticated users"
ON public.work_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Work items insertable by authenticated users"
ON public.work_items FOR INSERT
TO authenticated
WITH CHECK (reporter_user_id = auth.uid());

CREATE POLICY "Work items updatable by authenticated users"
ON public.work_items FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Work items deletable by owner or admin"
ON public.work_items FOR DELETE
TO authenticated
USING (reporter_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- ---------------------------------------------------------------------------
-- Meetings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL DEFAULT 'GERAL',
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  agenda TEXT NULL,
  datetime_start TIMESTAMPTZ NOT NULL,
  datetime_end TIMESTAMPTZ NOT NULL,
  created_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participants JSONB NULL,
  notes TEXT NULL,
  recording_link TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS meetings_scope_check;
ALTER TABLE public.meetings
  ADD CONSTRAINT meetings_scope_check
  CHECK (scope = ANY (ARRAY['GERAL'::text, 'EQUIPE'::text, 'ONBOARDING'::text, 'CLIENTE'::text]));

ALTER TABLE IF EXISTS public.meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Meetings viewable by authenticated users" ON public.meetings;
DROP POLICY IF EXISTS "Meetings insertable by authenticated users" ON public.meetings;
DROP POLICY IF EXISTS "Meetings updatable by creator" ON public.meetings;
DROP POLICY IF EXISTS "Meetings deletable by creator or admin" ON public.meetings;

CREATE POLICY "Meetings viewable by authenticated users"
ON public.meetings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Meetings insertable by authenticated users"
ON public.meetings FOR INSERT
TO authenticated
WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "Meetings updatable by creator"
ON public.meetings FOR UPDATE
TO authenticated
USING (created_by_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Meetings deletable by creator or admin"
ON public.meetings FOR DELETE
TO authenticated
USING (created_by_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- ---------------------------------------------------------------------------
-- Announcements
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  created_by_user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NULL,
  is_active BOOLEAN DEFAULT true,
  target_team TEXT DEFAULT 'all'
);

ALTER TABLE IF EXISTS public.announcements
  ADD COLUMN IF NOT EXISTS target_team TEXT DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE public.announcements DROP CONSTRAINT IF EXISTS announcements_priority_check;
ALTER TABLE public.announcements
  ADD CONSTRAINT announcements_priority_check
  CHECK (priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]));

ALTER TABLE public.announcements DROP CONSTRAINT IF EXISTS announcements_target_team_check;
ALTER TABLE public.announcements
  ADD CONSTRAINT announcements_target_team_check
  CHECK (target_team = ANY (ARRAY['all'::text, 'equipe-7'::text, 'tropa-de-elite'::text]));

ALTER TABLE IF EXISTS public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view active announcements" ON public.announcements;
DROP POLICY IF EXISTS "Allow announcement inserts" ON public.announcements;
DROP POLICY IF EXISTS "Allow announcement updates" ON public.announcements;
DROP POLICY IF EXISTS "Allow announcement deletes" ON public.announcements;

CREATE POLICY "Everyone can view active announcements"
ON public.announcements
FOR SELECT
TO authenticated
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Allow announcement inserts"
ON public.announcements
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow announcement updates"
ON public.announcements
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow announcement deletes"
ON public.announcements
FOR DELETE
TO authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.notify_all_users_on_announcement()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, related_entity, related_entity_id)
  SELECT
    p.id,
    '📢 Novo Aviso: ' || NEW.title,
    LEFT(NEW.content, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END,
    'announcement',
    'announcements',
    NEW.id::text
  FROM public.profiles p
  WHERE p.is_active = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS notify_users_on_announcement_insert ON public.announcements;
CREATE TRIGGER notify_users_on_announcement_insert
AFTER INSERT ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.notify_all_users_on_announcement();

-- ---------------------------------------------------------------------------
-- Meeting action items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meeting_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assignee_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date DATE NULL,
  workitem_id UUID REFERENCES public.work_items(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ABERTO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_action_items DROP CONSTRAINT IF EXISTS meeting_action_items_status_check;
ALTER TABLE public.meeting_action_items
  ADD CONSTRAINT meeting_action_items_status_check
  CHECK (status = ANY (ARRAY['ABERTO'::text, 'EM_ANDAMENTO'::text, 'CONCLUIDO'::text]));

ALTER TABLE IF EXISTS public.meeting_action_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Action items viewable by authenticated users" ON public.meeting_action_items;
DROP POLICY IF EXISTS "Action items insertable by authenticated users" ON public.meeting_action_items;
DROP POLICY IF EXISTS "Action items updatable by assignee or admin" ON public.meeting_action_items;
DROP POLICY IF EXISTS "Action items deletable by admin or coordinator" ON public.meeting_action_items;

CREATE POLICY "Action items viewable by authenticated users"
ON public.meeting_action_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Action items insertable by authenticated users"
ON public.meeting_action_items FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Action items updatable by assignee or admin"
ON public.meeting_action_items FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Action items deletable by admin or coordinator"
ON public.meeting_action_items FOR DELETE
TO authenticated
USING (true);

-- ---------------------------------------------------------------------------
-- Exec / ClickUp-style boards
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exec_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  team_scope TEXT NOT NULL DEFAULT 'EQUIPE',
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exec_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.exec_boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  wip_limit INTEGER NULL,
  color_tag TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exec_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.exec_boards(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES public.exec_columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NULL,
  client_id UUID REFERENCES public.operational_clients(id) ON DELETE SET NULL,
  assigned_to_user_id TEXT NULL,
  watchers JSONB NOT NULL DEFAULT '[]'::jsonb,
  priority TEXT NOT NULL DEFAULT 'MEDIA',
  due_date DATE NULL,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  cover_image TEXT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_by_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL,
  pinned BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.exec_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.exec_cards(id) ON DELETE CASCADE,
  author_user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exec_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.exec_boards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort JSONB NULL,
  group_by TEXT NOT NULL DEFAULT 'column',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.exec_boards
  ALTER COLUMN created_by_user_id TYPE TEXT USING created_by_user_id::text;

ALTER TABLE IF EXISTS public.exec_cards
  ALTER COLUMN created_by_user_id TYPE TEXT USING created_by_user_id::text,
  ALTER COLUMN assigned_to_user_id TYPE TEXT USING assigned_to_user_id::text;

ALTER TABLE IF EXISTS public.exec_comments
  ALTER COLUMN author_user_id TYPE TEXT USING author_user_id::text;

ALTER TABLE IF EXISTS public.exec_views
  ALTER COLUMN user_id TYPE TEXT USING user_id::text;

ALTER TABLE IF EXISTS public.exec_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exec_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exec_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exec_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exec_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Exec boards viewable by authenticated users" ON public.exec_boards;
DROP POLICY IF EXISTS "Exec boards insertable by authenticated users" ON public.exec_boards;
DROP POLICY IF EXISTS "Exec boards updatable by creator or coordinator or admin" ON public.exec_boards;
DROP POLICY IF EXISTS "Exec boards deletable by creator or coordinator or admin" ON public.exec_boards;
DROP POLICY IF EXISTS "Exec columns viewable by authenticated users" ON public.exec_columns;
DROP POLICY IF EXISTS "Exec columns insertable by authenticated users" ON public.exec_columns;
DROP POLICY IF EXISTS "Exec columns updatable by authenticated users" ON public.exec_columns;
DROP POLICY IF EXISTS "Exec columns deletable by coordinator or admin" ON public.exec_columns;
DROP POLICY IF EXISTS "Exec cards viewable by authenticated users" ON public.exec_cards;
DROP POLICY IF EXISTS "Exec cards insertable by authenticated users" ON public.exec_cards;
DROP POLICY IF EXISTS "Exec cards updatable by assignee or creator or coordinator or admin" ON public.exec_cards;
DROP POLICY IF EXISTS "Exec cards deletable by creator or coordinator or admin" ON public.exec_cards;
DROP POLICY IF EXISTS "Exec comments viewable by authenticated users" ON public.exec_comments;
DROP POLICY IF EXISTS "Exec comments insertable by authenticated users" ON public.exec_comments;
DROP POLICY IF EXISTS "Exec comments updatable by author" ON public.exec_comments;
DROP POLICY IF EXISTS "Exec comments deletable by author or admin" ON public.exec_comments;
DROP POLICY IF EXISTS "Exec views viewable by owner" ON public.exec_views;
DROP POLICY IF EXISTS "Exec views insertable by owner" ON public.exec_views;
DROP POLICY IF EXISTS "Exec views updatable by owner" ON public.exec_views;
DROP POLICY IF EXISTS "Exec views deletable by owner" ON public.exec_views;

CREATE POLICY "Allow exec boards select"
ON public.exec_boards
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow exec boards insert"
ON public.exec_boards
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow exec boards update"
ON public.exec_boards
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow exec boards delete"
ON public.exec_boards
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Allow exec columns select"
ON public.exec_columns
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow exec columns insert"
ON public.exec_columns
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow exec columns update"
ON public.exec_columns
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow exec columns delete"
ON public.exec_columns
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Allow exec cards select"
ON public.exec_cards
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow exec cards insert"
ON public.exec_cards
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow exec cards update"
ON public.exec_cards
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow exec cards delete"
ON public.exec_cards
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Allow exec comments select"
ON public.exec_comments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow exec comments insert"
ON public.exec_comments
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow exec comments update"
ON public.exec_comments
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow exec comments delete"
ON public.exec_comments
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Allow exec views select"
ON public.exec_views
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow exec views insert"
ON public.exec_views
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow exec views update"
ON public.exec_views
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow exec views delete"
ON public.exec_views
FOR DELETE
TO authenticated
USING (true);

CREATE INDEX IF NOT EXISTS idx_exec_boards_sector ON public.exec_boards(sector);
CREATE INDEX IF NOT EXISTS idx_exec_columns_board ON public.exec_columns(board_id);
CREATE INDEX IF NOT EXISTS idx_exec_cards_board ON public.exec_cards(board_id);
CREATE INDEX IF NOT EXISTS idx_exec_cards_column ON public.exec_cards(column_id);
CREATE INDEX IF NOT EXISTS idx_exec_cards_assigned ON public.exec_cards(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_exec_comments_card ON public.exec_comments(card_id);
CREATE INDEX IF NOT EXISTS idx_exec_views_board ON public.exec_views(board_id);

-- ---------------------------------------------------------------------------
-- Study AI persistence
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  context_mode TEXT NOT NULL DEFAULT 'general',
  category_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.study_ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.study_ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.study_ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.study_ai_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Study AI conversations view own" ON public.study_ai_conversations;
DROP POLICY IF EXISTS "Study AI conversations insert own" ON public.study_ai_conversations;
DROP POLICY IF EXISTS "Study AI conversations update own" ON public.study_ai_conversations;
DROP POLICY IF EXISTS "Study AI conversations delete own" ON public.study_ai_conversations;
DROP POLICY IF EXISTS "Study AI messages view own" ON public.study_ai_messages;
DROP POLICY IF EXISTS "Study AI messages insert own" ON public.study_ai_messages;
DROP POLICY IF EXISTS "Study AI messages update own" ON public.study_ai_messages;
DROP POLICY IF EXISTS "Study AI messages delete own" ON public.study_ai_messages;

CREATE POLICY "Study AI conversations view own"
ON public.study_ai_conversations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Study AI conversations insert own"
ON public.study_ai_conversations
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Study AI conversations update own"
ON public.study_ai_conversations
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Study AI conversations delete own"
ON public.study_ai_conversations
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Study AI messages view own"
ON public.study_ai_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.study_ai_conversations c
    WHERE c.id = conversation_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Study AI messages insert own"
ON public.study_ai_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.study_ai_conversations c
    WHERE c.id = conversation_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Study AI messages update own"
ON public.study_ai_messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.study_ai_conversations c
    WHERE c.id = conversation_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Study AI messages delete own"
ON public.study_ai_messages
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.study_ai_conversations c
    WHERE c.id = conversation_id
      AND c.user_id = auth.uid()
  )
);

