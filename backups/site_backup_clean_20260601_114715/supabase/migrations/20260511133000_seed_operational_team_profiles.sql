-- Seed operational team profiles in Supabase.
-- This keeps the assignable-user list aligned with the operational team.

WITH team_row AS (
  SELECT id AS team_id
  FROM public.teams
  WHERE name = 'Equipe 7'
  ORDER BY created_at ASC
  LIMIT 1
),
source_rows AS (
  SELECT *
  FROM (VALUES
    ('isaquegreatsd@gmail.com', 'Isaque Soares', 'ATENDENTE'::public.operational_role, false, 'Great2026!'),
    ('gugaliraclash@gmail.com', 'Gustavo Lira', 'ATENDENTE'::public.operational_role, false, 'Great2026!'),
    ('gersonlopesgreat@gmail.com', 'Gerson Lopes', 'ATENDENTE'::public.operational_role, false, 'Great2026!'),
    ('ocdremex@gmail.com', 'Matheus Tchaka', 'ATENDENTE'::public.operational_role, false, 'Great2026!'),
    ('kauananderson1919@gmail.com', 'Kauan Anderson', 'ATENDENTE'::public.operational_role, false, 'Great2026!'),
    ('braytonmaycon5@gmail.com', 'Brayton Maycon', 'GESTOR'::public.operational_role, false, 'Great2026!')
  ) AS v(email, full_name, operational_role, is_admin, login_password)
),
resolved_rows AS (
  SELECT
    COALESCE(
      (
        SELECT p.id
        FROM public.profiles p
        WHERE LOWER(p.email) = LOWER(s.email)
        LIMIT 1
      ),
      gen_random_uuid()
    ) AS id,
    LOWER(s.email) AS email,
    s.full_name,
    NULL::text AS avatar_url,
    s.operational_role,
    NULL::public.commercial_role AS commercial_role,
    (SELECT team_id FROM team_row) AS team_id,
    true AS is_active,
    s.login_password,
    s.is_admin,
    now() AS created_at,
    now() AS updated_at
  FROM source_rows s
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
FROM resolved_rows
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

WITH source_rows AS (
  SELECT *
  FROM (VALUES
    ('isaquegreatsd@gmail.com'),
    ('gugaliraclash@gmail.com'),
    ('gersonlopesgreat@gmail.com'),
    ('ocdremex@gmail.com'),
    ('kauananderson1919@gmail.com'),
    ('braytonmaycon5@gmail.com')
  ) AS v(email)
),
resolved_users AS (
  SELECT p.id
  FROM public.profiles p
  JOIN source_rows s ON LOWER(p.email) = LOWER(s.email)
)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user'::public.app_role
FROM resolved_users
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.profiles
SET login_password = CASE LOWER(email)
  WHEN 'isaquegreatsd@gmail.com' THEN 'Great2026!'
  WHEN 'gugaliraclash@gmail.com' THEN 'Great2026!'
  WHEN 'gersonlopesgreat@gmail.com' THEN 'Great2026!'
  WHEN 'ocdremex@gmail.com' THEN 'Great2026!'
  WHEN 'kauananderson1919@gmail.com' THEN 'Great2026!'
  WHEN 'braytonmaycon5@gmail.com' THEN 'Great2026!'
  ELSE login_password
END,
updated_at = now()
WHERE LOWER(email) IN (
  'isaquegreatsd@gmail.com',
  'gugaliraclash@gmail.com',
  'gersonlopesgreat@gmail.com',
  'ocdremex@gmail.com',
  'kauananderson1919@gmail.com',
  'braytonmaycon5@gmail.com'
);

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
