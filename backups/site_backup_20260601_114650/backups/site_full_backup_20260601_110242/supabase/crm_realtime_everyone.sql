-- CRM operational sync for all users in the same Supabase project.
-- This makes inserts, updates and deletes visible to every client that
-- is subscribed to Realtime on these tables.
--
-- Important:
-- - This does NOT sync between different Supabase projects/databases.
-- - It applies to all users inside the same database/project.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;

DO $$
DECLARE
  tbl text;
  policy_suffix text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'profiles',
    'teams',
    'operational_clients',
    'ad_creatives',
    'client_files',
    'client_activity_tracking',
    'crm_events',
    'my_day_items',
    'work_items',
    'meetings',
    'meeting_action_items',
    'announcements',
    'study_categories',
    'study_resources'
  ]
  LOOP
    IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

      policy_suffix := format('%s', tbl);

      EXECUTE format('DROP POLICY IF EXISTS crm_sync_public_select_%s ON public.%I', policy_suffix, tbl);
      EXECUTE format('DROP POLICY IF EXISTS crm_sync_public_insert_%s ON public.%I', policy_suffix, tbl);
      EXECUTE format('DROP POLICY IF EXISTS crm_sync_public_update_%s ON public.%I', policy_suffix, tbl);
      EXECUTE format('DROP POLICY IF EXISTS crm_sync_public_delete_%s ON public.%I', policy_suffix, tbl);

      EXECUTE format(
        'CREATE POLICY crm_sync_public_select_%s ON public.%I FOR SELECT TO public USING (true)',
        policy_suffix,
        tbl
      );

      EXECUTE format(
        'CREATE POLICY crm_sync_public_insert_%s ON public.%I FOR INSERT TO public WITH CHECK (true)',
        policy_suffix,
        tbl
      );

      EXECUTE format(
        'CREATE POLICY crm_sync_public_update_%s ON public.%I FOR UPDATE TO public USING (true) WITH CHECK (true)',
        policy_suffix,
        tbl
      );

      EXECUTE format(
        'CREATE POLICY crm_sync_public_delete_%s ON public.%I FOR DELETE TO public USING (true)',
        policy_suffix,
        tbl
      );

      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO anon, authenticated, service_role',
        tbl
      );
    END IF;
  END LOOP;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('ad-creatives', 'ad-creatives', true),
  ('client-files', 'client-files', true),
  ('study-files', 'study-files', true)
ON CONFLICT (id)
DO UPDATE SET
  name = EXCLUDED.name,
  public = true;

DO $$
DECLARE
  bucket_name text;
  policy_key text;
BEGIN
  FOREACH bucket_name IN ARRAY ARRAY['ad-creatives', 'client-files', 'study-files']
  LOOP
    policy_key := replace(bucket_name, '-', '_');

    EXECUTE format('DROP POLICY IF EXISTS crm_sync_view_%s ON storage.objects', policy_key);
    EXECUTE format('DROP POLICY IF EXISTS crm_sync_insert_%s ON storage.objects', policy_key);
    EXECUTE format('DROP POLICY IF EXISTS crm_sync_delete_%s ON storage.objects', policy_key);

    EXECUTE format(
      'CREATE POLICY crm_sync_view_%s ON storage.objects FOR SELECT TO public USING (bucket_id = %L)',
      policy_key,
      bucket_name
    );

    EXECUTE format(
      'CREATE POLICY crm_sync_insert_%s ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = %L)',
      policy_key,
      bucket_name
    );

    EXECUTE format(
      'CREATE POLICY crm_sync_delete_%s ON storage.objects FOR DELETE TO public USING (bucket_id = %L)',
      policy_key,
      bucket_name
    );
  END LOOP;
END $$;

DO $$
DECLARE
  tbl text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH tbl IN ARRAY ARRAY[
      'profiles',
      'teams',
      'operational_clients',
      'ad_creatives',
      'client_files',
      'client_activity_tracking',
      'crm_events',
      'my_day_items',
      'work_items',
      'meetings',
      'meeting_action_items',
      'announcements',
      'study_categories',
      'study_resources'
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

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;

COMMIT;
