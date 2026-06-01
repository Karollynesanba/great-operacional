-- Repair script for the operational site CRUD.
-- Paste into the Supabase SQL Editor and run once.
-- Safe to re-run: policies are dropped/recreated and missing tables are skipped.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Main app tables: open SELECT/INSERT/UPDATE/DELETE for every user
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  tbl text;
  policy_name text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'operational_clients',
    'crm_events',
    'client_files',
    'ad_creatives',
    'projects',
    'project_phases',
    'project_milestones',
    'project_deliverables',
    'project_risks',
    'project_updates',
    'notifications',
    'announcements',
    'meetings',
    'meeting_action_items',
    'my_day_items',
    'work_items',
    'client_activity_tracking',
    'exec_boards',
    'exec_columns',
    'exec_cards',
    'exec_comments',
    'exec_views',
    'exec_card_sync_blocks',
    'crisis_alerts',
    'crisis_alert_events',
    'crisis_alert_notes',
    'crisis_alert_actions',
    'crisis_manual_clients',
    'payment_reminders',
    'commercial_settings'
  ]
  LOOP
    IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

      policy_name := format('repair_public_select_%s', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, tbl);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO public USING (true)',
        policy_name,
        tbl
      );

      policy_name := format('repair_public_insert_%s', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, tbl);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO public WITH CHECK (true)',
        policy_name,
        tbl
      );

      policy_name := format('repair_public_update_%s', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, tbl);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO public USING (true) WITH CHECK (true)',
        policy_name,
        tbl
      );

      policy_name := format('repair_public_delete_%s', tbl);
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
-- Storage buckets used by the UI
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('ad-creatives', 'ad-creatives', true),
  ('client-files', 'client-files', true),
  ('exec-attachments', 'exec-attachments', true),
  ('study-files', 'study-files', true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = true;

DO $$
DECLARE
  bucket_name text;
BEGIN
  FOREACH bucket_name IN ARRAY ARRAY[
    'ad-creatives',
    'client-files',
    'exec-attachments',
    'study-files'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'repair_view_' || bucket_name);
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR SELECT TO public USING (bucket_id = %L)',
      'repair_view_' || bucket_name,
      bucket_name
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'repair_insert_' || bucket_name);
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = %L)',
      'repair_insert_' || bucket_name,
      bucket_name
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'repair_delete_' || bucket_name);
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR DELETE TO public USING (bucket_id = %L)',
      'repair_delete_' || bucket_name,
      bucket_name
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  tbl text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH tbl IN ARRAY ARRAY[
      'operational_clients',
      'crm_events',
      'client_files',
      'ad_creatives',
      'notifications',
      'announcements',
      'meetings',
      'meeting_action_items',
      'my_day_items',
      'work_items',
      'client_activity_tracking',
      'crisis_manual_clients',
      'exec_cards'
    ]
    LOOP
      IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
        BEGIN
          EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END;
      END IF;
    END LOOP;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Safe cleanup/delete helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cleanup_on_operational_client_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF to_regclass('public.client_start_form_responses') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.client_start_form_responses WHERE client_id = $1' USING OLD.id;
  END IF;

  IF to_regclass('public.client_activity_tracking') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.client_activity_tracking WHERE client_id = $1' USING OLD.id;
  END IF;

  IF to_regclass('public.client_files') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.client_files WHERE client_id = $1' USING OLD.id;
  END IF;

  IF to_regclass('public.ad_creatives') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.ad_creatives WHERE client_id = $1' USING OLD.id;
  END IF;

  IF to_regclass('public.crm_events') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.crm_events WHERE client_id = $1' USING OLD.id;
  END IF;

  IF to_regclass('public.my_day_items') IS NOT NULL AND to_regclass('public.work_items') IS NOT NULL THEN
    EXECUTE $sql$
      DELETE FROM public.my_day_items
      WHERE source = 'WORKITEM'
        AND source_id IN (
          SELECT id
          FROM public.work_items
          WHERE related_client_id = $1
        )
    $sql$ USING OLD.id;
  END IF;

  IF to_regclass('public.work_items') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.work_items WHERE related_client_id = $1' USING OLD.id;
  END IF;

  IF to_regclass('public.projects') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.projects WHERE client_id = $1' USING OLD.id;
  END IF;

  IF to_regclass('public.exec_cards') IS NOT NULL THEN
    EXECUTE 'UPDATE public.exec_cards SET client_id = NULL WHERE client_id = $1' USING OLD.id;
  END IF;

  IF to_regclass('public.exec_card_sync_blocks') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.exec_card_sync_blocks WHERE client_id = $1' USING OLD.id;
  END IF;

  IF to_regclass('public.crisis_manual_clients') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.crisis_manual_clients WHERE source_operational_client_id = $1::text OR id = $1::text' USING OLD.id;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS operational_clients_cleanup_before_delete ON public.operational_clients;
CREATE TRIGGER operational_clients_cleanup_before_delete
BEFORE DELETE ON public.operational_clients
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_on_operational_client_delete();

CREATE OR REPLACE FUNCTION public.delete_operational_client_cascade(p_client_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF to_regclass('public.client_activity_tracking') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.client_activity_tracking WHERE client_id = $1' USING p_client_id;
  END IF;

  IF to_regclass('public.client_files') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.client_files WHERE client_id = $1' USING p_client_id;
  END IF;

  IF to_regclass('public.ad_creatives') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.ad_creatives WHERE client_id = $1' USING p_client_id;
  END IF;

  IF to_regclass('public.crm_events') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.crm_events WHERE client_id = $1' USING p_client_id;
  END IF;

  IF to_regclass('public.projects') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.projects WHERE client_id = $1' USING p_client_id;
  END IF;

  IF to_regclass('public.exec_cards') IS NOT NULL THEN
    EXECUTE 'UPDATE public.exec_cards SET client_id = NULL WHERE client_id = $1' USING p_client_id;
  END IF;

  IF to_regclass('public.crisis_manual_clients') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.crisis_manual_clients WHERE source_operational_client_id = $1::text OR id = $1::text' USING p_client_id;
  END IF;

  IF to_regclass('public.operational_clients') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.operational_clients WHERE id = $1' USING p_client_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_operational_client_cascade(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_operational_client_cascade(UUID) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Schema cache refresh
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;

COMMIT;
