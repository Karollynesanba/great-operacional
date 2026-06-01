-- Seed Jeferson Luiz and Carlos André into public.profiles so they appear in the operational user list.
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
target_profiles AS (
  SELECT *
  FROM (VALUES
    ('56fded44-04d3-4b4a-a420-c1b5296416fa'::uuid, 'luiz46340@gmail.com'::text, 'Jeferson Luiz'::text),
    ('48558d23-4c6c-4c40-bae5-318691a5e356'::uuid, 'ci.andrade99@gmail.com'::text, 'Carlos André'::text)
  ) AS v(id, email, full_name)
),
cleanup AS (
  DELETE FROM public.profiles p
  USING target_profiles t
  WHERE LOWER(p.email) = LOWER(t.email)
    AND p.id <> t.id
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
  t.id,
  LOWER(t.email) AS email,
  t.full_name,
  NULL::text AS avatar_url,
  'GESTOR'::public.operational_role AS operational_role,
  NULL::public.commercial_role AS commercial_role,
  (SELECT team_id FROM team_row) AS team_id,
  true AS is_active,
  'Great2026!'::text AS login_password,
  false AS is_admin,
  now() AS created_at,
  now() AS updated_at
FROM target_profiles t
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  avatar_url = EXCLUDED.avatar_url,
  operational_role = EXCLUDED.operational_role,
  commercial_role = EXCLUDED.commercial_role,
  team_id = EXCLUDED.team_id,
  is_active = EXCLUDED.is_active,
  is_admin = EXCLUDED.is_admin,
  login_password = COALESCE(public.profiles.login_password, EXCLUDED.login_password),
  updated_at = now();

WITH target_profiles AS (
  SELECT *
  FROM (VALUES
    ('luiz46340@gmail.com'::text),
    ('ci.andrade99@gmail.com'::text)
  ) AS v(email)
),
resolved_users AS (
  SELECT p.id
  FROM public.profiles p
  JOIN target_profiles t ON LOWER(p.email) = LOWER(t.email)
)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user'::public.app_role
FROM resolved_users
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.profiles
SET login_password = CASE LOWER(email)
  WHEN 'luiz46340@gmail.com' THEN 'Great2026!'
  WHEN 'ci.andrade99@gmail.com' THEN 'Great2026!'
  ELSE login_password
END,
updated_at = now()
WHERE LOWER(email) IN (
  'luiz46340@gmail.com',
  'ci.andrade99@gmail.com'
);

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;

COMMIT;
