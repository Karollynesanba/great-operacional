-- Fix Amanda tabs and goals dashboard so they use real Supabase data with usable RLS policies.
-- This migration is idempotent and safe to re-run.

-- ---------------------------------------------------------------------------
-- brand_profiles seed
-- ---------------------------------------------------------------------------
INSERT INTO public.brand_profiles (
  id,
  display_name,
  profile_type,
  specialty,
  city,
  notes,
  is_active,
  created_at,
  updated_at
)
VALUES
  (
    '8f8d8f1a-4a1c-4f85-8b7d-0f0a1d7a1111',
    'Amanda Great - Doutor',
    'DOCTOR',
    'Odontologia',
    'Fortaleza',
    'Perfil padrao para o upgrade da Amanda.',
    true,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '8f8d8f1a-4a1c-4f85-8b7d-0f0a1d7a2222',
    'Amanda Great - Cliente',
    'CLIENT',
    null,
    'Fortaleza',
    'Segundo perfil padrao para selecionar nos CRUDs.',
    true,
    timezone('utc', now()),
    timezone('utc', now())
  )
ON CONFLICT (id) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  profile_type = EXCLUDED.profile_type,
  specialty = EXCLUDED.specialty,
  city = EXCLUDED.city,
  notes = EXCLUDED.notes,
  is_active = EXCLUDED.is_active,
  updated_at = timezone('utc', now());

-- ---------------------------------------------------------------------------
-- Amanda / goals tables RLS hardening
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'brand_profiles',
    'brand_colors',
    'brand_applications',
    'brand_files',
    'calendar_recordings',
    'validated_scripts',
    'performance_structures',
    'ready_models',
    'commercial_goals',
    'sdr_goals',
    'work_items'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF to_regclass(format('public.%I', v_table)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO anon, authenticated, service_role', v_table);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "upgrade_amanda_public_select_brand_profiles" ON public.brand_profiles;
DROP POLICY IF EXISTS "upgrade_amanda_public_insert_brand_profiles" ON public.brand_profiles;
DROP POLICY IF EXISTS "upgrade_amanda_public_update_brand_profiles" ON public.brand_profiles;
DROP POLICY IF EXISTS "upgrade_amanda_public_delete_brand_profiles" ON public.brand_profiles;
CREATE POLICY "upgrade_amanda_public_select_brand_profiles"
  ON public.brand_profiles
  FOR SELECT
  TO public
  USING (true);
CREATE POLICY "upgrade_amanda_public_insert_brand_profiles"
  ON public.brand_profiles
  FOR INSERT
  TO public
  WITH CHECK (true);
CREATE POLICY "upgrade_amanda_public_update_brand_profiles"
  ON public.brand_profiles
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);
CREATE POLICY "upgrade_amanda_public_delete_brand_profiles"
  ON public.brand_profiles
  FOR DELETE
  TO public
  USING (true);

DROP POLICY IF EXISTS "upgrade_amanda_public_select_brand_colors" ON public.brand_colors;
DROP POLICY IF EXISTS "upgrade_amanda_public_insert_brand_colors" ON public.brand_colors;
DROP POLICY IF EXISTS "upgrade_amanda_public_update_brand_colors" ON public.brand_colors;
DROP POLICY IF EXISTS "upgrade_amanda_public_delete_brand_colors" ON public.brand_colors;
CREATE POLICY "upgrade_amanda_public_select_brand_colors"
  ON public.brand_colors
  FOR SELECT
  TO public
  USING (true);
CREATE POLICY "upgrade_amanda_public_insert_brand_colors"
  ON public.brand_colors
  FOR INSERT
  TO public
  WITH CHECK (true);
CREATE POLICY "upgrade_amanda_public_update_brand_colors"
  ON public.brand_colors
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);
CREATE POLICY "upgrade_amanda_public_delete_brand_colors"
  ON public.brand_colors
  FOR DELETE
  TO public
  USING (true);

DROP POLICY IF EXISTS "upgrade_amanda_public_select_brand_applications" ON public.brand_applications;
DROP POLICY IF EXISTS "upgrade_amanda_public_insert_brand_applications" ON public.brand_applications;
DROP POLICY IF EXISTS "upgrade_amanda_public_update_brand_applications" ON public.brand_applications;
DROP POLICY IF EXISTS "upgrade_amanda_public_delete_brand_applications" ON public.brand_applications;
CREATE POLICY "upgrade_amanda_public_select_brand_applications"
  ON public.brand_applications
  FOR SELECT
  TO public
  USING (true);
CREATE POLICY "upgrade_amanda_public_insert_brand_applications"
  ON public.brand_applications
  FOR INSERT
  TO public
  WITH CHECK (true);
CREATE POLICY "upgrade_amanda_public_update_brand_applications"
  ON public.brand_applications
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);
CREATE POLICY "upgrade_amanda_public_delete_brand_applications"
  ON public.brand_applications
  FOR DELETE
  TO public
  USING (true);

DROP POLICY IF EXISTS "upgrade_amanda_public_select_brand_files" ON public.brand_files;
DROP POLICY IF EXISTS "upgrade_amanda_public_insert_brand_files" ON public.brand_files;
DROP POLICY IF EXISTS "upgrade_amanda_public_update_brand_files" ON public.brand_files;
DROP POLICY IF EXISTS "upgrade_amanda_public_delete_brand_files" ON public.brand_files;
CREATE POLICY "upgrade_amanda_public_select_brand_files"
  ON public.brand_files
  FOR SELECT
  TO public
  USING (true);
CREATE POLICY "upgrade_amanda_public_insert_brand_files"
  ON public.brand_files
  FOR INSERT
  TO public
  WITH CHECK (true);
CREATE POLICY "upgrade_amanda_public_update_brand_files"
  ON public.brand_files
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);
CREATE POLICY "upgrade_amanda_public_delete_brand_files"
  ON public.brand_files
  FOR DELETE
  TO public
  USING (true);

DROP POLICY IF EXISTS "upgrade_amanda_public_select_calendar_recordings" ON public.calendar_recordings;
DROP POLICY IF EXISTS "upgrade_amanda_public_insert_calendar_recordings" ON public.calendar_recordings;
DROP POLICY IF EXISTS "upgrade_amanda_public_update_calendar_recordings" ON public.calendar_recordings;
DROP POLICY IF EXISTS "upgrade_amanda_public_delete_calendar_recordings" ON public.calendar_recordings;
CREATE POLICY "upgrade_amanda_public_select_calendar_recordings"
  ON public.calendar_recordings
  FOR SELECT
  TO public
  USING (true);
CREATE POLICY "upgrade_amanda_public_insert_calendar_recordings"
  ON public.calendar_recordings
  FOR INSERT
  TO public
  WITH CHECK (true);
CREATE POLICY "upgrade_amanda_public_update_calendar_recordings"
  ON public.calendar_recordings
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);
CREATE POLICY "upgrade_amanda_public_delete_calendar_recordings"
  ON public.calendar_recordings
  FOR DELETE
  TO public
  USING (true);

DROP POLICY IF EXISTS "upgrade_amanda_public_select_validated_scripts" ON public.validated_scripts;
DROP POLICY IF EXISTS "upgrade_amanda_public_insert_validated_scripts" ON public.validated_scripts;
DROP POLICY IF EXISTS "upgrade_amanda_public_update_validated_scripts" ON public.validated_scripts;
DROP POLICY IF EXISTS "upgrade_amanda_public_delete_validated_scripts" ON public.validated_scripts;
CREATE POLICY "upgrade_amanda_public_select_validated_scripts"
  ON public.validated_scripts
  FOR SELECT
  TO public
  USING (true);
CREATE POLICY "upgrade_amanda_public_insert_validated_scripts"
  ON public.validated_scripts
  FOR INSERT
  TO public
  WITH CHECK (true);
CREATE POLICY "upgrade_amanda_public_update_validated_scripts"
  ON public.validated_scripts
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);
CREATE POLICY "upgrade_amanda_public_delete_validated_scripts"
  ON public.validated_scripts
  FOR DELETE
  TO public
  USING (true);

DROP POLICY IF EXISTS "upgrade_amanda_public_select_performance_structures" ON public.performance_structures;
DROP POLICY IF EXISTS "upgrade_amanda_public_insert_performance_structures" ON public.performance_structures;
DROP POLICY IF EXISTS "upgrade_amanda_public_update_performance_structures" ON public.performance_structures;
DROP POLICY IF EXISTS "upgrade_amanda_public_delete_performance_structures" ON public.performance_structures;
CREATE POLICY "upgrade_amanda_public_select_performance_structures"
  ON public.performance_structures
  FOR SELECT
  TO public
  USING (true);
CREATE POLICY "upgrade_amanda_public_insert_performance_structures"
  ON public.performance_structures
  FOR INSERT
  TO public
  WITH CHECK (true);
CREATE POLICY "upgrade_amanda_public_update_performance_structures"
  ON public.performance_structures
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);
CREATE POLICY "upgrade_amanda_public_delete_performance_structures"
  ON public.performance_structures
  FOR DELETE
  TO public
  USING (true);

DROP POLICY IF EXISTS "upgrade_amanda_public_select_ready_models" ON public.ready_models;
DROP POLICY IF EXISTS "upgrade_amanda_public_insert_ready_models" ON public.ready_models;
DROP POLICY IF EXISTS "upgrade_amanda_public_update_ready_models" ON public.ready_models;
DROP POLICY IF EXISTS "upgrade_amanda_public_delete_ready_models" ON public.ready_models;
CREATE POLICY "upgrade_amanda_public_select_ready_models"
  ON public.ready_models
  FOR SELECT
  TO public
  USING (true);
CREATE POLICY "upgrade_amanda_public_insert_ready_models"
  ON public.ready_models
  FOR INSERT
  TO public
  WITH CHECK (true);
CREATE POLICY "upgrade_amanda_public_update_ready_models"
  ON public.ready_models
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);
CREATE POLICY "upgrade_amanda_public_delete_ready_models"
  ON public.ready_models
  FOR DELETE
  TO public
  USING (true);

DROP POLICY IF EXISTS "upgrade_amanda_public_select_commercial_goals" ON public.commercial_goals;
DROP POLICY IF EXISTS "upgrade_amanda_public_insert_commercial_goals" ON public.commercial_goals;
DROP POLICY IF EXISTS "upgrade_amanda_public_update_commercial_goals" ON public.commercial_goals;
DROP POLICY IF EXISTS "upgrade_amanda_public_delete_commercial_goals" ON public.commercial_goals;
CREATE POLICY "upgrade_amanda_public_select_commercial_goals"
  ON public.commercial_goals
  FOR SELECT
  TO public
  USING (true);
CREATE POLICY "upgrade_amanda_public_insert_commercial_goals"
  ON public.commercial_goals
  FOR INSERT
  TO public
  WITH CHECK (true);
CREATE POLICY "upgrade_amanda_public_update_commercial_goals"
  ON public.commercial_goals
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);
CREATE POLICY "upgrade_amanda_public_delete_commercial_goals"
  ON public.commercial_goals
  FOR DELETE
  TO public
  USING (true);

DROP POLICY IF EXISTS "upgrade_amanda_public_select_sdr_goals" ON public.sdr_goals;
DROP POLICY IF EXISTS "upgrade_amanda_public_insert_sdr_goals" ON public.sdr_goals;
DROP POLICY IF EXISTS "upgrade_amanda_public_update_sdr_goals" ON public.sdr_goals;
DROP POLICY IF EXISTS "upgrade_amanda_public_delete_sdr_goals" ON public.sdr_goals;
CREATE POLICY "upgrade_amanda_public_select_sdr_goals"
  ON public.sdr_goals
  FOR SELECT
  TO public
  USING (true);
CREATE POLICY "upgrade_amanda_public_insert_sdr_goals"
  ON public.sdr_goals
  FOR INSERT
  TO public
  WITH CHECK (true);
CREATE POLICY "upgrade_amanda_public_update_sdr_goals"
  ON public.sdr_goals
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);
CREATE POLICY "upgrade_amanda_public_delete_sdr_goals"
  ON public.sdr_goals
  FOR DELETE
  TO public
  USING (true);

DROP POLICY IF EXISTS "upgrade_amanda_public_select_work_items" ON public.work_items;
DROP POLICY IF EXISTS "upgrade_amanda_public_insert_work_items" ON public.work_items;
DROP POLICY IF EXISTS "upgrade_amanda_public_update_work_items" ON public.work_items;
DROP POLICY IF EXISTS "upgrade_amanda_public_delete_work_items" ON public.work_items;
CREATE POLICY "upgrade_amanda_public_select_work_items"
  ON public.work_items
  FOR SELECT
  TO public
  USING (true);
CREATE POLICY "upgrade_amanda_public_insert_work_items"
  ON public.work_items
  FOR INSERT
  TO public
  WITH CHECK (true);
CREATE POLICY "upgrade_amanda_public_update_work_items"
  ON public.work_items
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);
CREATE POLICY "upgrade_amanda_public_delete_work_items"
  ON public.work_items
  FOR DELETE
  TO public
  USING (true);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.brand_profiles';
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.brand_colors';
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.brand_applications';
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.brand_files';
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_recordings';
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.validated_scripts';
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.performance_structures';
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.ready_models';
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.commercial_goals';
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.sdr_goals';
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.work_items';
  END IF;
END $$;
