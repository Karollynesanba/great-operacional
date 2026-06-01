-- Backup/restore snapshot of operational user profiles at 2026-06-01 10:46.
-- This version keeps only the operational users and avoids commercial accounts.
-- It is idempotent and only touches public.profiles and public.user_roles.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

WITH seed_rows AS (
  SELECT *
  FROM (VALUES
    ('isaquegreatsd@gmail.com'::text, 'Isaque Soares'::text, 'ATENDENTE'::public.operational_role, 'Great2026!'::text, '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid),
    ('gugaliraclash@gmail.com'::text, 'Gustavo Lira'::text, 'ATENDENTE'::public.operational_role, 'Great2026!'::text, '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid),
    ('gersonlopesgreat@gmail.com'::text, 'Gerson Lopes'::text, 'ATENDENTE'::public.operational_role, 'Great2026!'::text, '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid),
    ('ocdremex@gmail.com'::text, 'Matheus Tchaka'::text, 'ATENDENTE'::public.operational_role, 'Great2026!'::text, '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid),
    ('kauananderson1919@gmail.com'::text, 'Kauan Anderson'::text, 'ATENDENTE'::public.operational_role, 'Great2026!'::text, '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid),
    ('amanda.operacional@great.local'::text, 'Amanda Great'::text, 'EDITOR_VIDEO'::public.operational_role, 'Great2026!'::text, '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid),
    ('luiz46340@gmail.com'::text, 'Jeferson Luiz'::text, 'GESTOR'::public.operational_role, 'Great2026!'::text, '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid),
    ('ci.andrade99@gmail.com'::text, 'Carlos André'::text, 'GESTOR'::public.operational_role, 'Great2026!'::text, '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid),
    ('braytonmaycon5@gmail.com'::text, 'Brayton Maycon'::text, 'GESTOR'::public.operational_role, 'Great2026!'::text, '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid)
  ) AS v(email, full_name, operational_role, login_password, team_id)
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
    s.operational_role,
    s.login_password,
    s.team_id
  FROM seed_rows s
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
  true AS is_active,
  login_password,
  false AS is_admin,
  now() AS created_at,
  now() AS updated_at
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

WITH resolved_rows AS (
  SELECT
    p.id,
    LOWER(p.email) AS email
  FROM public.profiles p
  WHERE LOWER(p.email) IN (
    'isaquegreatsd@gmail.com',
    'gugaliraclash@gmail.com',
    'gersonlopesgreat@gmail.com',
    'ocdremex@gmail.com',
    'kauananderson1919@gmail.com',
    'amanda.operacional@great.local',
    'luiz46340@gmail.com',
    'ci.andrade99@gmail.com',
    'braytonmaycon5@gmail.com'
  )
)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user'::public.app_role
FROM resolved_rows
ON CONFLICT (user_id, role) DO NOTHING;

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;

COMMIT;
