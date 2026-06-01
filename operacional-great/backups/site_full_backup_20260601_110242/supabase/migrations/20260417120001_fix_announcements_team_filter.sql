-- Add target_team column to announcements table
ALTER TABLE public.announcements
ADD COLUMN IF NOT EXISTS target_team TEXT DEFAULT 'all'
CHECK (target_team IN ('all', 'equipe-7', 'tropa-de-elite'));

-- Fix announcements RLS: app controls authorization, remove auth.uid() dependency
DROP POLICY IF EXISTS "Coordinators can create announcements" ON public.announcements;
DROP POLICY IF EXISTS "Coordinators can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Coordinators can delete announcements" ON public.announcements;

CREATE POLICY "Allow announcement inserts"
ON public.announcements
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow announcement updates"
ON public.announcements
FOR UPDATE
USING (true);

CREATE POLICY "Allow announcement deletes"
ON public.announcements
FOR DELETE
USING (true);

-- Fix notifications RLS: allow reads/updates/deletes without Supabase auth
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

CREATE POLICY "Allow reading notifications"
ON public.notifications
FOR SELECT
USING (true);

CREATE POLICY "Allow updating notifications"
ON public.notifications
FOR UPDATE
USING (true);

CREATE POLICY "Allow deleting notifications"
ON public.notifications
FOR DELETE
USING (true);

-- Update notify_all_users_on_announcement to respect target_team
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
    NEW.id
  FROM public.profiles p
  WHERE p.is_active = true
    AND (
      NEW.target_team = 'all'
      OR NEW.target_team IS NULL
      OR p.team_id = NEW.target_team
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
