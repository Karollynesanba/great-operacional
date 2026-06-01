-- Restore upload/save/delete for client files.
-- Run this in the Supabase SQL editor.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Make sure the bucket exists and is public.
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-files', 'client-files', true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = true;

-- Open the client_files table for authenticated/public CRUD.
ALTER TABLE IF EXISTS public.client_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Client files viewable by public" ON public.client_files;
DROP POLICY IF EXISTS "Client files insertable by public" ON public.client_files;
DROP POLICY IF EXISTS "Client files updatable by public" ON public.client_files;
DROP POLICY IF EXISTS "Client files deletable by public" ON public.client_files;
DROP POLICY IF EXISTS "Authenticated users can view client files" ON public.client_files;
DROP POLICY IF EXISTS "Authenticated users can insert client files" ON public.client_files;
DROP POLICY IF EXISTS "Users can delete their own files" ON public.client_files;

CREATE POLICY "Client files viewable by public"
ON public.client_files
FOR SELECT
TO public
USING (true);

CREATE POLICY "Client files insertable by public"
ON public.client_files
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Client files updatable by public"
ON public.client_files
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Client files deletable by public"
ON public.client_files
FOR DELETE
TO public
USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_files TO anon, authenticated, service_role;

-- Open the storage bucket objects too.
DROP POLICY IF EXISTS "Client files viewable by public" ON storage.objects;
DROP POLICY IF EXISTS "Client files insertable by public" ON storage.objects;
DROP POLICY IF EXISTS "Client files deletable by public" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload client files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view client files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete client files" ON storage.objects;

CREATE POLICY "Client files viewable by public"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'client-files');

CREATE POLICY "Client files insertable by public"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'client-files');

CREATE POLICY "Client files deletable by public"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'client-files');

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.client_files';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;

COMMIT;
