-- Emergency delete unlock for the operational platform.
-- This migration opens DELETE access for the main content tables and adds
-- cleanup triggers so parent deletes do not fail because of dependent rows.

-- ---------------------------------------------------------------------------
-- Core delete policies
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  tbl text;
  policy_name text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'my_day_items',
    'work_items',
    'meetings',
    'meeting_action_items',
    'announcements',
    'notifications',
    'criativos',
    'challenges',
    'crm_events',
    'client_files',
    'ad_creatives',
    'projects',
    'project_phases',
    'project_milestones',
    'project_deliverables',
    'project_risks',
    'project_updates',
    'exec_boards',
    'exec_columns',
    'exec_cards',
    'exec_comments',
    'exec_views',
    'exec_card_sync_blocks',
    'client_activity_tracking',
    'crisis_alerts',
    'crisis_alert_events',
    'crisis_alert_notes',
    'crisis_alert_actions',
    'crisis_manual_clients',
    'workspaces',
    'payment_reminders',
    'commercial_settings',
    'study_categories',
    'study_resources',
    'study_collections',
    'study_quizzes',
    'knowledge_base_docs',
    'study_ai_conversations',
    'user_study_progress'
  ]
  LOOP
    IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
      policy_name := format('allow_delete_public_%s', tbl);

      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, tbl);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO public USING (true)',
        policy_name,
        tbl
      );
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO anon, authenticated, service_role',
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Cleanup triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cleanup_on_operational_client_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.client_start_form_responses
  WHERE client_id = OLD.id;

  DELETE FROM public.client_activity_tracking
  WHERE client_id = OLD.id;

  DELETE FROM public.client_files
  WHERE client_id = OLD.id;

  DELETE FROM public.ad_creatives
  WHERE client_id = OLD.id;

  DELETE FROM public.crm_events
  WHERE client_id = OLD.id;

  DELETE FROM public.my_day_items
  WHERE source = 'WORKITEM'
    AND source_id IN (
      SELECT id
      FROM public.work_items
      WHERE related_client_id = OLD.id
    );

  DELETE FROM public.work_items
  WHERE related_client_id = OLD.id;

  DELETE FROM public.projects
  WHERE client_id = OLD.id;

  UPDATE public.exec_cards
  SET client_id = NULL
  WHERE client_id = OLD.id;

  DELETE FROM public.exec_card_sync_blocks
  WHERE client_id = OLD.id;

  DELETE FROM public.crisis_manual_clients
  WHERE source_operational_client_id = OLD.id::text
     OR id = OLD.id::text;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS operational_clients_cleanup_before_delete ON public.operational_clients;
CREATE TRIGGER operational_clients_cleanup_before_delete
BEFORE DELETE ON public.operational_clients
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_on_operational_client_delete();

CREATE OR REPLACE FUNCTION public.cleanup_on_work_item_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.my_day_items
  WHERE source = 'WORKITEM'
    AND source_id::text = OLD.id::text;

  DELETE FROM public.notifications
  WHERE related_entity = 'work_items'
    AND related_entity_id::text = OLD.id::text;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS work_items_cleanup_after_delete ON public.work_items;
CREATE TRIGGER work_items_cleanup_after_delete
AFTER DELETE ON public.work_items
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_on_work_item_delete();

CREATE OR REPLACE FUNCTION public.cleanup_on_meeting_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.my_day_items
  WHERE source = 'MEETING'
    AND source_id::text = OLD.id::text;

  DELETE FROM public.notifications
  WHERE related_entity = 'meetings'
    AND related_entity_id::text = OLD.id::text;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS meetings_cleanup_after_delete ON public.meetings;
CREATE TRIGGER meetings_cleanup_after_delete
AFTER DELETE ON public.meetings
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_on_meeting_delete();

CREATE OR REPLACE FUNCTION public.cleanup_on_announcement_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE related_entity = 'announcements'
    AND related_entity_id::text = OLD.id::text;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS announcements_cleanup_after_delete ON public.announcements;
CREATE TRIGGER announcements_cleanup_after_delete
AFTER DELETE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_on_announcement_delete();

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
