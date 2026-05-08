-- Seed the shared operational and admin accounts into Supabase so login works across browsers.

INSERT INTO public.teams (id, name, created_at, updated_at)
VALUES
  ('team-1', 'Equipe 7', now(), now()),
  ('team-2', 'Tropa de Elite', now(), now())
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  updated_at = now();

WITH seed_profiles AS (
  SELECT *
  FROM (
    VALUES
      ('admin-1', 'bruno@great.com', 'Bruno Gomes', NULL::public.operational_role, 'SETOR_COMERCIAL'::public.commercial_role, NULL::text, TRUE, TRUE, 'Brunogomes2005!'),
      ('admin-pedro', 'pedroojuann1@gmail.com', 'Pedro Juan', NULL::public.operational_role, 'SETOR_COMERCIAL'::public.commercial_role, NULL::text, TRUE, TRUE, 'Pedro2024!'),
      ('cled-1', 'cled@great.com', 'Cled', NULL::public.operational_role, 'COORDENADOR_COMERCIAL'::public.commercial_role, NULL::text, TRUE, FALSE, 'Cled2001'),
      ('hebert-1', 'hebert@great.com', 'Herbert', NULL::public.operational_role, 'CLOSER'::public.commercial_role, NULL::text, TRUE, FALSE, 'josehebert123'),
      ('miguel-1', 'miguel@great.com', 'Miguel', NULL::public.operational_role, 'SDR'::public.commercial_role, NULL::text, TRUE, FALSE, 'Miguel24'),
      ('felipe-1', 'felipe@great.com', 'Felipe', NULL::public.operational_role, 'SDR'::public.commercial_role, NULL::text, TRUE, FALSE, '343802'),
      ('1', 'comercial@great.com', 'Carlos Silva', NULL::public.operational_role, NULL::public.commercial_role, NULL::text, TRUE, FALSE, 'demo123'),
      ('2', 'gestor@great.com', 'Ana Santos', 'GESTOR'::public.operational_role, NULL::public.commercial_role, 'team-1'::text, TRUE, FALSE, 'demo123'),
      ('3', 'atendente@great.com', 'Pedro Costa', 'ATENDENTE'::public.operational_role, NULL::public.commercial_role, 'team-1'::text, TRUE, FALSE, 'demo123'),
      ('4', 'coordenador@great.com', 'Marcos Oliveira', 'COORDENADOR_RED'::public.operational_role, NULL::public.commercial_role, NULL::text, TRUE, FALSE, 'demo123'),
      ('5', 'design@great.com', 'Julia Mendes', 'DESIGN'::public.operational_role, NULL::public.commercial_role, 'team-2'::text, TRUE, FALSE, 'demo123'),
      ('6', 'editor@great.com', 'Ricardo Alves', 'EDITOR_VIDEO'::public.operational_role, NULL::public.commercial_role, 'team-2'::text, TRUE, FALSE, 'demo123'),
      ('test-user-1', 'user@teste.com', 'Usuário Teste', 'ATENDENTE'::public.operational_role, NULL::public.commercial_role, 'team-1'::text, TRUE, FALSE, '123456'),
      ('test-admin-1', 'admin@teste.com', 'Admin Teste', NULL::public.operational_role, NULL::public.commercial_role, NULL::text, TRUE, TRUE, '123456'),
      ('operacional-isaque-soares', 'isaquegreatsd@gmail.com', 'Isaque Soares', 'ATENDENTE'::public.operational_role, NULL::public.commercial_role, NULL::text, TRUE, FALSE, 'Great2026!'),
      ('operacional-gustavo-lira', 'gugaliraclash@gmail.com', 'Gustavo Lira', 'ATENDENTE'::public.operational_role, NULL::public.commercial_role, NULL::text, TRUE, FALSE, 'Great2026!'),
      ('operacional-victoria-freitas', 'freitasviih00@gmail.com', 'Victória Freitas', 'ATENDENTE'::public.operational_role, NULL::public.commercial_role, NULL::text, TRUE, FALSE, 'Great2026!'),
      ('operacional-gerson-lopes', 'gersonlopesgreat@gmail.com', 'Gerson Lopes', 'ATENDENTE'::public.operational_role, NULL::public.commercial_role, NULL::text, TRUE, FALSE, 'Great2026!'),
      ('operacional-matheus-tchaka', 'ocdremex@gmail.com', 'Matheus Tchaka', 'ATENDENTE'::public.operational_role, NULL::public.commercial_role, NULL::text, TRUE, FALSE, 'Great2026!'),
      ('operacional-kauan-anderson', 'kauananderson1919@gmail.com', 'Kauan Anderson', 'ATENDENTE'::public.operational_role, NULL::public.commercial_role, NULL::text, TRUE, FALSE, 'Great2026!'),
      ('operacional-amanda-great', 'amandagreatsd@gmail.com', 'Amanda Great', 'EDITOR_VIDEO'::public.operational_role, NULL::public.commercial_role, 'team-2'::text, TRUE, FALSE, 'Great2026!')
  ) AS seed_data (
    id,
    email,
    full_name,
    operational_role,
    commercial_role,
    team_id,
    is_active,
    is_admin,
    login_password
  )
)
UPDATE public.profiles AS profiles
SET
  email = seed_profiles.email,
  full_name = seed_profiles.full_name,
  operational_role = seed_profiles.operational_role,
  commercial_role = seed_profiles.commercial_role,
  team_id = seed_profiles.team_id,
  is_active = seed_profiles.is_active,
  is_admin = seed_profiles.is_admin,
  login_password = seed_profiles.login_password,
  updated_at = now()
FROM seed_profiles
WHERE lower(profiles.email) = lower(seed_profiles.email);

INSERT INTO public.profiles (
  id,
  email,
  full_name,
  operational_role,
  commercial_role,
  team_id,
  is_active,
  is_admin,
  login_password,
  avatar_url,
  created_at,
  updated_at
)
SELECT
  seed_profiles.id,
  seed_profiles.email,
  seed_profiles.full_name,
  seed_profiles.operational_role,
  seed_profiles.commercial_role,
  seed_profiles.team_id,
  seed_profiles.is_active,
  seed_profiles.is_admin,
  seed_profiles.login_password,
  NULL,
  now(),
  now()
FROM seed_profiles
WHERE NOT EXISTS (
  SELECT 1
  FROM public.profiles AS profiles
  WHERE lower(profiles.email) = lower(seed_profiles.email)
);

