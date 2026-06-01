-- Ensure the operational teams exist with stable UUIDs so imports can use them.

INSERT INTO public.teams (id, name)
VALUES
  ('0469e3aa-5b34-42e2-b89d-f412efaa27ba', 'Equipe 7'),
  ('38c9028d-856d-481e-95c9-bb2eb8b459f5', 'Tropa de Elite')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    updated_at = now();

ALTER TABLE IF EXISTS public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teams are viewable by authenticated users" ON public.teams;
DROP POLICY IF EXISTS "Teams are viewable by public" ON public.teams;

CREATE POLICY "Teams are viewable by public"
ON public.teams
FOR SELECT
TO public
USING (true);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'teams'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
