-- Remove the auth.users dependency from client file uploads.
-- The operational app does not rely on Supabase Auth user IDs for this table.

ALTER TABLE IF EXISTS public.client_files
DROP CONSTRAINT IF EXISTS client_files_uploaded_by_user_id_fkey;

ALTER TABLE IF EXISTS public.client_files
ALTER COLUMN uploaded_by_user_id DROP NOT NULL;

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
