-- Keep CRM client file uploads writable for every session.
-- This script is safe to run even if public.client_files was never created.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Main table: client_files
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.operational_clients(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  uploaded_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.client_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view client files" ON public.client_files;
DROP POLICY IF EXISTS "Authenticated users can insert client files" ON public.client_files;
DROP POLICY IF EXISTS "Users can delete their own files" ON public.client_files;
DROP POLICY IF EXISTS "Client files viewable by public" ON public.client_files;
DROP POLICY IF EXISTS "Client files insertable by public" ON public.client_files;
DROP POLICY IF EXISTS "Client files updatable by public" ON public.client_files;
DROP POLICY IF EXISTS "Client files deletable by public" ON public.client_files;

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

-- ---------------------------------------------------------------------------
-- Storage bucket: client-files
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-files', 'client-files', true)
ON CONFLICT (id)
DO UPDATE SET
  name = EXCLUDED.name,
  public = true;

DROP POLICY IF EXISTS "Authenticated users can upload client files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete client files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view client files" ON storage.objects;
DROP POLICY IF EXISTS "Client files viewable by public" ON storage.objects;
DROP POLICY IF EXISTS "Client files insertable by public" ON storage.objects;
DROP POLICY IF EXISTS "Client files deletable by public" ON storage.objects;

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
