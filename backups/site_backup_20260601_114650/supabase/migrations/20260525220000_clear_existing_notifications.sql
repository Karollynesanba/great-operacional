-- Clear all existing notifications from the platform before publishing.
-- This removes the current bell history, but keeps the notification triggers
-- and app behavior intact for future actions.

BEGIN;

DELETE FROM public.notifications;

COMMIT;
