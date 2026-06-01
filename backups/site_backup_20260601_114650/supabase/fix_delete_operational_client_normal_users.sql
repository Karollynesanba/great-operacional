-- Repair script for deleting operational clients from the CRM.
-- Paste this file into the Supabase SQL editor and run it once.
-- Safe to re-run.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  tbl text;
  policy_name text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'client_activity_tracking',
    'client_files',
    'crm_events',
    'projects',
    'ad_creatives',
    'exec_cards',
    'crisis_manual_clients',
    'operational_clients'
  ]
  LOOP
    IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

      policy_name := format('allow_public_select_%s', tbl);
      IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = tbl
          AND policyname = policy_name
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR SELECT TO public USING (true)',
          policy_name,
          tbl
        );
      END IF;

      policy_name := format('allow_public_insert_%s', tbl);
      IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = tbl
          AND policyname = policy_name
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR INSERT TO public WITH CHECK (true)',
          policy_name,
          tbl
        );
      END IF;

      policy_name := format('allow_public_update_%s', tbl);
      IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = tbl
          AND policyname = policy_name
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR UPDATE TO public USING (true) WITH CHECK (true)',
          policy_name,
          tbl
        );
      END IF;

      policy_name := format('allow_public_delete_%s', tbl);
      IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = tbl
          AND policyname = policy_name
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR DELETE TO public USING (true)',
          policy_name,
          tbl
        );
      END IF;
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'client_activity_tracking',
    'client_files',
    'crm_events',
    'projects',
    'ad_creatives',
    'exec_cards',
    'crisis_manual_clients',
    'operational_clients'
  ]
  LOOP
    IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated, service_role',
        tbl
      );
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND to_regclass('public.operational_clients') IS NOT NULL THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.operational_clients';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.delete_operational_client_cascade(p_client_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'client_activity_tracking',
    'client_files',
    'ad_creatives',
    'crm_events',
    'projects'
  ]
  LOOP
    IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
      EXECUTE format('DELETE FROM public.%I WHERE client_id = $1', tbl)
      USING p_client_id;
    END IF;
  END LOOP;

  IF to_regclass('public.exec_cards') IS NOT NULL THEN
    EXECUTE 'UPDATE public.exec_cards SET client_id = NULL WHERE client_id = $1'
    USING p_client_id;
  END IF;

  IF to_regclass('public.projects') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.projects WHERE client_id = $1'
    USING p_client_id;
  END IF;

  IF to_regclass('public.crisis_manual_clients') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.crisis_manual_clients WHERE source_operational_client_id = $1::text OR id = $1::text'
    USING p_client_id;
  END IF;

  IF to_regclass('public.operational_clients') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.operational_clients WHERE id = $1'
    USING p_client_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_operational_client_cascade(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_operational_client_cascade(UUID) TO anon, authenticated, service_role;

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;

COMMIT;
