-- Prevent announcement publishing from failing when some profile rows do not
-- have a matching auth.users record.
-- The notification trigger should skip those recipients instead of aborting
-- the original announcement insert.

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
  WHERE p.is_active = true
    AND EXISTS (
      SELECT 1
      FROM auth.users u
      WHERE u.id = p.id
    )
    AND (
      NEW.target_team = 'all'
      OR NEW.target_team IS NULL
      OR p.team_id = NEW.target_team
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
