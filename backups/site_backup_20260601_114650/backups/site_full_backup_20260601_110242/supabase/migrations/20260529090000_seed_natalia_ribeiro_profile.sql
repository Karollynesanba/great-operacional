-- Seed Natalia Ribeiro into public.profiles so she appears in every profile list.
-- The script is idempotent and safe to rerun.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

WITH team_row AS (
  SELECT id AS team_id
  FROM public.teams
  WHERE name = 'Equipe 7'
  ORDER BY created_at ASC
  LIMIT 1
),
natalia_profile AS (
  SELECT
    '3b1e0190-7985-409c-b7a9-f544a86fbb9d'::uuid AS id,
    'natalia.ribeiro@great.local'::text AS email,
    'Natalia Ribeiro'::text AS full_name,
    NULL::text AS avatar_url,
    'DESIGN'::public.operational_role AS operational_role,
    NULL::public.commercial_role AS commercial_role,
    (SELECT team_id FROM team_row) AS team_id,
    true AS is_active,
    'Great2026!'::text AS login_password,
    false AS is_admin,
    now() AS created_at,
    now() AS updated_at
)
DELETE FROM public.profiles p
USING natalia_profile n
WHERE LOWER(p.email) = LOWER(n.email)
  AND p.id <> n.id;

WITH team_row AS (
  SELECT id AS team_id
  FROM public.teams
  WHERE name = 'Equipe 7'
  ORDER BY created_at ASC
  LIMIT 1
),
natalia_profile AS (
  SELECT
    '3b1e0190-7985-409c-b7a9-f544a86fbb9d'::uuid AS id,
    'natalia.ribeiro@great.local'::text AS email,
    'Natalia Ribeiro'::text AS full_name,
    NULL::text AS avatar_url,
    'DESIGN'::public.operational_role AS operational_role,
    NULL::public.commercial_role AS commercial_role,
    (SELECT team_id FROM team_row) AS team_id,
    true AS is_active,
    'Great2026!'::text AS login_password,
    false AS is_admin,
    now() AS created_at,
    now() AS updated_at
)
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  avatar_url,
  operational_role,
  commercial_role,
  team_id,
  is_active,
  login_password,
  is_admin,
  created_at,
  updated_at
)
SELECT
  id,
  email,
  full_name,
  avatar_url,
  operational_role,
  commercial_role,
  team_id,
  is_active,
  login_password,
  is_admin,
  created_at,
  updated_at
FROM natalia_profile
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  avatar_url = EXCLUDED.avatar_url,
  operational_role = EXCLUDED.operational_role,
  commercial_role = EXCLUDED.commercial_role,
  team_id = EXCLUDED.team_id,
  is_active = EXCLUDED.is_active,
  login_password = COALESCE(public.profiles.login_password, EXCLUDED.login_password),
  is_admin = EXCLUDED.is_admin,
  updated_at = now();

WITH natalia_profile AS (
  SELECT '3b1e0190-7985-409c-b7a9-f544a86fbb9d'::uuid AS id
)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user'::public.app_role
FROM natalia_profile
ON CONFLICT (user_id, role) DO NOTHING;

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;

COMMIT;
