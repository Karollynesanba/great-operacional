-- Announcements are already surfaced as notifications in the UI by reading
-- the announcements table directly. Keeping a trigger that fan-outs one
-- notification per user adds unnecessary work to the publish transaction and
-- can make the dialog appear stuck on "Publicando...".
--
-- Drop that extra write path so publishing an announcement only stores the
-- announcement itself.

DROP TRIGGER IF EXISTS notify_users_on_announcement_insert ON public.announcements;

DROP FUNCTION IF EXISTS public.notify_all_users_on_announcement();
