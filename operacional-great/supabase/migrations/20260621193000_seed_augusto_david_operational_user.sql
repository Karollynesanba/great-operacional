-- Seed Augusto David as an operational user so he appears in the user list
-- and can be assigned tasks in Meu Dia.

WITH team_row AS (
  SELECT id AS team_id
  FROM public.teams
  WHERE name = 'Equipe 7'
  ORDER BY created_at ASC
  LIMIT 1
),
source_row AS (
  SELECT
    'augustodavid112@gmail.com'::text AS email,
    'Augusto David'::text AS full_name,
    'ATENDENTE'::public.operational_role AS operational_role,
    false AS is_admin,
    'Great2026!'::text AS login_password
),
resolved_profile AS (
  SELECT
    COALESCE(existing_profile.id, auth_user.id, gen_random_uuid()) AS id,
    LOWER(s.email) AS email,
    s.full_name,
    NULL::text AS avatar_url,
    s.operational_role,
    NULL::public.commercial_role AS commercial_role,
    (SELECT team_id FROM team_row) AS team_id,
    true AS is_active,
    s.login_password,
    s.is_admin,
    COALESCE(existing_profile.created_at, auth_user.created_at, now()) AS created_at,
    now() AS updated_at
  FROM source_row s
  LEFT JOIN LATERAL (
    SELECT p.id, p.created_at
    FROM public.profiles p
    WHERE LOWER(p.email) = LOWER(s.email)
    LIMIT 1
  ) AS existing_profile ON true
  LEFT JOIN LATERAL (
    SELECT au.id, COALESCE(au.created_at, now()) AS created_at
    FROM auth.users au
    WHERE LOWER(au.email) = LOWER(s.email)
    LIMIT 1
  ) AS auth_user ON true
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
FROM resolved_profile
ON CONFLICT ((LOWER(email))) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  avatar_url = EXCLUDED.avatar_url,
  operational_role = EXCLUDED.operational_role,
  commercial_role = EXCLUDED.commercial_role,
  team_id = EXCLUDED.team_id,
  is_active = EXCLUDED.is_active,
  login_password = EXCLUDED.login_password,
  is_admin = EXCLUDED.is_admin,
  updated_at = now();

WITH resolved_profile AS (
  SELECT p.id
  FROM public.profiles p
  WHERE LOWER(p.email) = 'augustodavid112@gmail.com'
  LIMIT 1
)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user'::public.app_role
FROM resolved_profile
ON CONFLICT (user_id, role) DO NOTHING;

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
