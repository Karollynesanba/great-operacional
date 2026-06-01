-- Generic audit backup layer for important user-facing tables.
-- This migration is intentionally non-destructive: it creates tables, functions,
-- policies, and triggers without dropping existing data.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.data_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid,
  user_id uuid,
  team_id uuid,
  action text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS data_backups_table_name_idx
  ON public.data_backups (table_name);

CREATE INDEX IF NOT EXISTS data_backups_record_id_idx
  ON public.data_backups (record_id);

CREATE INDEX IF NOT EXISTS data_backups_user_id_idx
  ON public.data_backups (user_id);

CREATE INDEX IF NOT EXISTS data_backups_team_id_idx
  ON public.data_backups (team_id);

CREATE INDEX IF NOT EXISTS data_backups_created_at_idx
  ON public.data_backups (created_at DESC);

ALTER TABLE public.data_backups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'data_backups'
      AND policyname = 'Admins can view data backups'
  ) THEN
    CREATE POLICY "Admins can view data backups"
    ON public.data_backups
    FOR SELECT
    TO public
    USING (
      EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_admin = true
      )
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'data_backups'
      AND policyname = 'Authenticated users can insert backups'
  ) THEN
    CREATE POLICY "Authenticated users can insert backups"
    ON public.data_backups
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

REVOKE UPDATE, DELETE ON public.data_backups FROM PUBLIC;
REVOKE UPDATE, DELETE ON public.data_backups FROM anon;
REVOKE UPDATE, DELETE ON public.data_backups FROM authenticated;

GRANT SELECT, INSERT ON public.data_backups TO authenticated;

CREATE OR REPLACE FUNCTION public.safe_uuid(p_value text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
BEGIN
  RETURN p_value::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.jsonb_uuid(p_payload jsonb, p_keys text[])
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_key text;
  v_value text;
BEGIN
  FOREACH v_key IN ARRAY p_keys LOOP
    v_value := NULLIF(p_payload ->> v_key, '');
    IF v_value IS NOT NULL THEN
      BEGIN
        RETURN v_value::uuid;
      EXCEPTION
        WHEN invalid_text_representation THEN
          CONTINUE;
      END;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.write_data_backup(
  p_table_name text,
  p_record_id uuid,
  p_user_id uuid,
  p_team_id uuid,
  p_action text,
  p_old_data jsonb,
  p_new_data jsonb,
  p_created_by uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_backup_id uuid;
BEGIN
  INSERT INTO public.data_backups (
    table_name,
    record_id,
    user_id,
    team_id,
    action,
    old_data,
    new_data,
    created_by
  )
  VALUES (
    p_table_name,
    p_record_id,
    p_user_id,
    p_team_id,
    p_action,
    p_old_data,
    p_new_data,
    p_created_by
  )
  RETURNING id INTO v_backup_id;

  RETURN v_backup_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.capture_data_backup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_data jsonb;
  v_new_data jsonb;
  v_payload jsonb;
  v_action text;
  v_record_id uuid;
  v_user_id uuid;
  v_team_id uuid;
  v_created_by uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    v_action := 'UPDATE';
    v_payload := v_new_data;
  ELSIF TG_OP = 'DELETE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
    v_action := 'DELETE';
    v_payload := v_old_data;
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_record_id := public.jsonb_uuid(v_payload, ARRAY['id']);
  v_user_id := public.jsonb_uuid(v_payload, ARRAY['user_id', 'created_by_user_id', 'updated_by_user_id', 'origin_reporter_user_id']);
  v_team_id := public.jsonb_uuid(v_payload, ARRAY['team_id']);
  v_created_by := COALESCE(
    auth.uid(),
    public.jsonb_uuid(v_payload, ARRAY['created_by_user_id', 'created_by', 'updated_by_user_id', 'user_id'])
  );

  PERFORM public.write_data_backup(
    TG_TABLE_NAME,
    v_record_id,
    v_user_id,
    v_team_id,
    v_action,
    v_old_data,
    v_new_data,
    v_created_by
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_data_backup(p_backup_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_backup public.data_backups%ROWTYPE;
  v_sql text;
  v_update_set text;
  v_restored jsonb;
BEGIN
  SELECT *
  INTO v_backup
  FROM public.data_backups
  WHERE id = p_backup_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Backup % not found', p_backup_id;
  END IF;

  IF v_backup.old_data IS NULL THEN
    RAISE EXCEPTION 'Backup % does not contain old_data', p_backup_id;
  END IF;

  SELECT string_agg(format('%I = EXCLUDED.%I', c.column_name, c.column_name), ', ' ORDER BY c.ordinal_position)
  INTO v_update_set
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = v_backup.table_name
    AND c.column_name <> 'id'
    AND c.is_generated = 'NEVER';

  IF v_update_set IS NULL THEN
    v_update_set := 'id = EXCLUDED.id';
  END IF;

  v_sql := format(
    'WITH restored AS (
       INSERT INTO public.%I
       SELECT * FROM jsonb_populate_record(NULL::public.%I, $1)
       ON CONFLICT (id) DO UPDATE SET %s
       RETURNING *
     )
     SELECT to_jsonb(restored) FROM restored',
    v_backup.table_name,
    v_backup.table_name,
    v_update_set
  );

  EXECUTE v_sql USING v_backup.old_data INTO v_restored;
  RETURN v_restored;
END;
$$;

DO $$
DECLARE
  v_table_name text;
  v_tables text[] := ARRAY[
    'activity_logs',
    'ad_creatives',
    'agenda_events',
    'agendamento_leads',
    'announcements',
    'challenges',
    'championship_events',
    'championship_monthly_history',
    'championship_teams',
    'client_activity_tracking',
    'client_files',
    'client_start_form_responses',
    'commercial_goals',
    'commercial_settings',
    'commission_config',
    'criativos',
    'crm_events',
    'exec_boards',
    'exec_cards',
    'exec_card_sync_blocks',
    'exec_columns',
    'exec_comments',
    'exec_views',
    'expense_categories',
    'expenses',
    'finance_simulations',
    'knowledge_base_docs',
    'meeting_action_items',
    'meetings',
    'my_day_items',
    'notifications',
    'operational_clients',
    'payment_reminders',
    'pipeline_clients',
    'profiles',
    'project_deliverables',
    'project_goals',
    'project_milestones',
    'project_phases',
    'project_risks',
    'project_updates',
    'projects',
    'role_cost_defaults',
    'sdr_goals',
    'strategic_decisions',
    'strategic_tasks',
    'study_ai_conversations',
    'study_ai_messages',
    'study_categories',
    'study_collections',
    'study_quiz_attempts',
    'study_quizzes',
    'study_resources',
    'team_cost_config',
    'team_cost_overrides',
    'team_member_costs',
    'teams',
    'user_preferences',
    'tech_deployments',
    'tech_tasks',
    'user_roles',
    'user_study_progress',
    'whatsapp_reminder_logs',
    'work_items',
    'workspaces'
  ];
  v_trigger_name text := 'capture_data_backup_trigger';
BEGIN
  FOREACH v_table_name IN ARRAY v_tables LOOP
    IF to_regclass(format('public.%I', v_table_name)) IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger t
        WHERE t.tgname = v_trigger_name
          AND t.tgrelid = to_regclass(format('public.%I', v_table_name))
      ) THEN
        EXECUTE format(
          'CREATE TRIGGER %I
             BEFORE UPDATE OR DELETE ON public.%I
             FOR EACH ROW
             EXECUTE FUNCTION public.capture_data_backup()',
          v_trigger_name,
          v_table_name
        );
      END IF;
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
