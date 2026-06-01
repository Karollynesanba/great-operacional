-- Restore missing operational profiles from auth.users without touching existing rows.
-- This migration is insert-only: it never deletes or overwrites existing profiles.

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
    ('amanda.operacional@great.local', 'Amanda Great', 'EDITOR_VIDEO'::public.operational_role, false, 'Great2026!'),
    ('braytonmaycon5@gmail.com', 'Brayton Maycon', 'GESTOR'::public.operational_role, false, 'Great2026!'),
    ('luiz46340@gmail.com', 'Jeferson Luiz', 'GESTOR'::public.operational_role, false, 'Great2026!'),
    ('ci.andrade99@gmail.com', 'Carlos André', 'GESTOR'::public.operational_role, false, 'Great2026!'),
    ('cleristonfelipe711@gmail.com', 'Cleriston Felipe', 'ATENDENTE'::public.operational_role, false, 'Great2026!')
  ) AS v(email, full_name, operational_role, is_admin, login_password)
),
auth_source AS (
  SELECT
    au.id,
    LOWER(au.email) AS email,
    s.full_name,
    s.operational_role,
    s.is_admin,
    s.login_password,
    (SELECT team_id FROM team_row) AS team_id,
    true AS is_active,
    COALESCE(au.created_at, now()) AS created_at,
    now() AS updated_at
  FROM source_rows s
  JOIN auth.users au
    ON LOWER(au.email) = LOWER(s.email)
  LEFT JOIN public.profiles p
    ON LOWER(p.email) = LOWER(s.email)
  WHERE p.id IS NULL
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
  NULL::text AS avatar_url,
  operational_role,
  NULL::public.commercial_role AS commercial_role,
  team_id,
  is_active,
  login_password,
  is_admin,
  created_at,
  updated_at
FROM auth_source
ON CONFLICT (id) DO NOTHING;

WITH source_rows AS (
  SELECT *
  FROM (VALUES
    ('isaquegreatsd@gmail.com'),
    ('gugaliraclash@gmail.com'),
    ('gersonlopesgreat@gmail.com'),
    ('ocdremex@gmail.com'),
    ('kauananderson1919@gmail.com'),
    ('amanda.operacional@great.local'),
    ('braytonmaycon5@gmail.com'),
    ('luiz46340@gmail.com'),
    ('ci.andrade99@gmail.com'),
    ('cleristonfelipe711@gmail.com')
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

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
