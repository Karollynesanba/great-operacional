-- Restore CRUD access on the operational tables used by the main tabs.
-- This migration does not drop or truncate any data.

DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'my_day_items',
    'work_items',
    'meetings',
    'announcements',
    'notifications',
    'operational_clients',
    'pipeline_clients',
    'ad_creatives',
    'client_files',
    'client_activity_tracking',
    'crm_events',
    'projects',
    'project_phases',
    'project_goals',
    'project_deliverables',
    'project_milestones',
    'project_updates',
    'project_risks',
    'study_categories',
    'study_resources',
    'study_ai_conversations',
    'study_ai_messages',
    'exec_boards',
    'exec_columns',
    'exec_cards',
    'exec_comments',
    'exec_views',
    'teams',
    'user_preferences',
    'strategic_tasks',
    'strategic_decisions',
    'expense_categories',
    'expenses',
    'finance_simulations',
    'payment_reminders',
    'whatsapp_reminder_logs',
    'tech_tasks',
    'tech_deployments'
  ];
  v_policy text;
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF to_regclass(format('public.%I', v_table)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);

    v_policy := format('authenticated_select_%s', v_table);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = v_table
        AND policyname = v_policy
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
        v_policy,
        v_table
      );
    END IF;

    v_policy := format('authenticated_insert_%s', v_table);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = v_table
        AND policyname = v_policy
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)',
        v_policy,
        v_table
      );
    END IF;

    v_policy := format('authenticated_update_%s', v_table);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = v_table
        AND policyname = v_policy
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL)',
        v_policy,
        v_table
      );
    END IF;

    v_policy := format('authenticated_delete_%s', v_table);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = v_table
        AND policyname = v_policy
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (true)',
        v_policy,
        v_table
      );
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
