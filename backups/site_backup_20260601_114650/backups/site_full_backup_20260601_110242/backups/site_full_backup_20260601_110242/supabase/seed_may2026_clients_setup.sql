-- One-time setup for the May 2026 operational clients seed.
-- Run this once before the chunk files.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO public.teams (id, name)
VALUES
  ('0469e3aa-5b34-42e2-b89d-f412efaa27ba', 'Equipe 7'),
  ('38c9028d-856d-481e-95c9-bb2eb8b459f5', 'Tropa de Elite')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

CREATE OR REPLACE FUNCTION public.resolve_profile_id_by_name(p_name text)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT p.id
  FROM public.profiles p
  WHERE lower(coalesce(p.full_name, '')) = lower(trim(coalesce(p_name, '')))
     OR lower(coalesce(p.full_name, '')) LIKE '%' || lower(trim(coalesce(p_name, ''))) || '%'
  ORDER BY CASE WHEN lower(coalesce(p.full_name, '')) = lower(trim(coalesce(p_name, ''))) THEN 0 ELSE 1 END,
           length(coalesce(p.full_name, '')),
           p.full_name
  LIMIT 1;
$$;

COMMIT;
