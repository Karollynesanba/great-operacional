-- Make operational teams always available and writable for the local operational login flow.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE IF EXISTS public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teams are viewable by authenticated users" ON public.teams;
DROP POLICY IF EXISTS "Teams are viewable by public" ON public.teams;
DROP POLICY IF EXISTS "Teams are insertable by public" ON public.teams;
DROP POLICY IF EXISTS "Teams are updatable by public" ON public.teams;
DROP POLICY IF EXISTS "Teams are deletable by public" ON public.teams;

CREATE POLICY "Teams are viewable by public"
ON public.teams
FOR SELECT
TO public
USING (true);

CREATE POLICY "Teams are insertable by public"
ON public.teams
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Teams are updatable by public"
ON public.teams
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Teams are deletable by public"
ON public.teams
FOR DELETE
TO public
USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO anon, authenticated, service_role;

INSERT INTO public.teams (id, name)
VALUES
  ('0469e3aa-5b34-42e2-b89d-f412efaa27ba', 'Equipe 7'),
  ('38c9028d-856d-481e-95c9-bb2eb8b459f5', 'Tropa de Elite')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    updated_at = now();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.teams';
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
