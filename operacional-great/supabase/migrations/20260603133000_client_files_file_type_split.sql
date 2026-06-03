BEGIN;

ALTER TABLE IF EXISTS public.client_files
  ADD COLUMN IF NOT EXISTS file_type TEXT DEFAULT 'arquivo';

UPDATE public.client_files
SET file_type = 'arquivo'
WHERE file_type IS NULL OR file_type <> 'criativo';

ALTER TABLE IF EXISTS public.client_files
  ALTER COLUMN file_type SET DEFAULT 'arquivo';

CREATE INDEX IF NOT EXISTS idx_client_files_client_id_file_type
  ON public.client_files (client_id, file_type);

DROP POLICY IF EXISTS "Authenticated users can view client files" ON public.client_files;
DROP POLICY IF EXISTS "Authenticated users can insert client files" ON public.client_files;
DROP POLICY IF EXISTS "Users can delete their own files" ON public.client_files;
DROP POLICY IF EXISTS "Client files viewable by public" ON public.client_files;
DROP POLICY IF EXISTS "Client files insertable by public" ON public.client_files;
DROP POLICY IF EXISTS "Client files deletable by public" ON public.client_files;

ALTER TABLE IF EXISTS public.client_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client files viewable by authenticated users"
ON public.client_files
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Client files insertable by authenticated users"
ON public.client_files
FOR INSERT
TO authenticated
WITH CHECK (file_type IN ('arquivo', 'criativo'));

CREATE POLICY "Client files updatable by authenticated users"
ON public.client_files
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (file_type IN ('arquivo', 'criativo'));

CREATE POLICY "Client files deletable by authenticated users"
ON public.client_files
FOR DELETE
TO authenticated
USING (true);

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
