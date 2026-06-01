-- Seed missing CRM clients from the uploaded team CSV.
-- Source document: C:\Users\karol\Downloads\EQUIPE TROPA DE ELITE - NÃO USAR.csv
-- The other uploaded CSV only contained metrics, not client rows.

INSERT INTO public.operational_clients (
  id,
  client_name,
  status_operacional,
  onboarding_stage,
  team_id,
  pacote,
  plan,
  deal_value,
  created_at,
  updated_at,
  status_updated_at
)
SELECT
  gen_random_uuid(),
  'JULIA ANDREATA',
  'ATIVO',
  'ATIVO',
  '38c9028d-856d-481e-95c9-bb2eb8b459f5',
  'TRÁFEGO+CONSULTORIA',
  'TRIMESTRAL',
  NULL,
  now(),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.operational_clients oc
  WHERE upper(trim(oc.client_name)) = upper(trim('JULIA ANDREATA'))
);

INSERT INTO public.operational_clients (
  id,
  client_name,
  status_operacional,
  onboarding_stage,
  team_id,
  pacote,
  plan,
  deal_value,
  created_at,
  updated_at,
  status_updated_at
)
SELECT
  gen_random_uuid(),
  'GABRIELLA CARVALHO',
  'ATIVO',
  'ATIVO',
  '38c9028d-856d-481e-95c9-bb2eb8b459f5',
  'COMPLETO',
  'MENSAL',
  2447.00,
  now(),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.operational_clients oc
  WHERE upper(trim(oc.client_name)) = upper(trim('GABRIELLA CARVALHO'))
);

INSERT INTO public.operational_clients (
  id,
  client_name,
  status_operacional,
  onboarding_stage,
  team_id,
  pacote,
  plan,
  deal_value,
  created_at,
  updated_at,
  status_updated_at
)
SELECT
  gen_random_uuid(),
  'RICARDO GIOVANELLI',
  'ATIVO',
  'ATIVO',
  '38c9028d-856d-481e-95c9-bb2eb8b459f5',
  'COMPLETO NOVA ERA',
  'TRIMESTRAL',
  4649.50,
  now(),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.operational_clients oc
  WHERE upper(trim(oc.client_name)) = upper(trim('RICARDO GIOVANELLI'))
);

INSERT INTO public.operational_clients (
  id,
  client_name,
  status_operacional,
  onboarding_stage,
  team_id,
  pacote,
  plan,
  deal_value,
  created_at,
  updated_at,
  status_updated_at
)
SELECT
  gen_random_uuid(),
  'CINTIA / PERLEA MAISON',
  'ENCERRADO',
  'ATIVO',
  '38c9028d-856d-481e-95c9-bb2eb8b459f5',
  'COMPLETO NOVA ERA',
  'MENSAL',
  2097.00,
  now(),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.operational_clients oc
  WHERE upper(trim(oc.client_name)) = upper(trim('CINTIA / PERLEA MAISON'))
);

INSERT INTO public.operational_clients (
  id,
  client_name,
  status_operacional,
  onboarding_stage,
  team_id,
  pacote,
  plan,
  deal_value,
  created_at,
  updated_at,
  status_updated_at
)
SELECT
  gen_random_uuid(),
  'ADRIANA REAIS',
  'ENCERRADO',
  'ATIVO',
  '38c9028d-856d-481e-95c9-bb2eb8b459f5',
  'TRÁFEGO E CRIATIVOS',
  'MENSAL',
  1600.00,
  now(),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.operational_clients oc
  WHERE upper(trim(oc.client_name)) = upper(trim('ADRIANA REAIS'))
);

INSERT INTO public.operational_clients (
  id,
  client_name,
  status_operacional,
  onboarding_stage,
  team_id,
  pacote,
  plan,
  deal_value,
  created_at,
  updated_at,
  status_updated_at
)
SELECT
  gen_random_uuid(),
  'Dra Alanna',
  'NOVO_CLIENTE',
  'ATIVO',
  '38c9028d-856d-481e-95c9-bb2eb8b459f5',
  NULL,
  NULL,
  NULL,
  now(),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.operational_clients oc
  WHERE upper(trim(oc.client_name)) = upper(trim('Dra Alanna'))
);

INSERT INTO public.operational_clients (
  id,
  client_name,
  status_operacional,
  onboarding_stage,
  team_id,
  pacote,
  plan,
  deal_value,
  created_at,
  updated_at,
  status_updated_at
)
SELECT
  gen_random_uuid(),
  'Doralice Renove',
  'NOVO_CLIENTE',
  'ATIVO',
  '38c9028d-856d-481e-95c9-bb2eb8b459f5',
  NULL,
  NULL,
  NULL,
  now(),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.operational_clients oc
  WHERE upper(trim(oc.client_name)) = upper(trim('Doralice Renove'))
);

INSERT INTO public.operational_clients (
  id,
  client_name,
  status_operacional,
  onboarding_stage,
  team_id,
  pacote,
  plan,
  deal_value,
  created_at,
  updated_at,
  status_updated_at
)
SELECT
  gen_random_uuid(),
  'Beatriz Coutinho',
  'NOVO_CLIENTE',
  'ATIVO',
  '38c9028d-856d-481e-95c9-bb2eb8b459f5',
  NULL,
  NULL,
  NULL,
  now(),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.operational_clients oc
  WHERE upper(trim(oc.client_name)) = upper(trim('Beatriz Coutinho'))
);

INSERT INTO public.operational_clients (
  id,
  client_name,
  status_operacional,
  onboarding_stage,
  team_id,
  pacote,
  plan,
  deal_value,
  created_at,
  updated_at,
  status_updated_at
)
SELECT
  gen_random_uuid(),
  'NATALIA CAMARGO',
  'NOVO_CLIENTE',
  'ATIVO',
  '38c9028d-856d-481e-95c9-bb2eb8b459f5',
  NULL,
  NULL,
  NULL,
  now(),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.operational_clients oc
  WHERE upper(trim(oc.client_name)) = upper(trim('NATALIA CAMARGO'))
);

INSERT INTO public.operational_clients (
  id,
  client_name,
  status_operacional,
  onboarding_stage,
  team_id,
  pacote,
  plan,
  deal_value,
  created_at,
  updated_at,
  status_updated_at
)
SELECT
  gen_random_uuid(),
  'SANDRA ROBERT',
  'NOVO_CLIENTE',
  'ATIVO',
  '38c9028d-856d-481e-95c9-bb2eb8b459f5',
  NULL,
  NULL,
  NULL,
  now(),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.operational_clients oc
  WHERE upper(trim(oc.client_name)) = upper(trim('SANDRA ROBERT'))
);

INSERT INTO public.operational_clients (
  id,
  client_name,
  status_operacional,
  onboarding_stage,
  team_id,
  pacote,
  plan,
  deal_value,
  created_at,
  updated_at,
  status_updated_at
)
SELECT
  gen_random_uuid(),
  'ANA Crismeira',
  'NOVO_CLIENTE',
  'ATIVO',
  '38c9028d-856d-481e-95c9-bb2eb8b459f5',
  NULL,
  NULL,
  NULL,
  now(),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.operational_clients oc
  WHERE upper(trim(oc.client_name)) = upper(trim('ANA Crismeira'))
);

INSERT INTO public.operational_clients (
  id,
  client_name,
  status_operacional,
  onboarding_stage,
  team_id,
  pacote,
  plan,
  deal_value,
  created_at,
  updated_at,
  status_updated_at
)
SELECT
  gen_random_uuid(),
  'PAULO VICTOR',
  'NOVO_CLIENTE',
  'ATIVO',
  '38c9028d-856d-481e-95c9-bb2eb8b459f5',
  NULL,
  NULL,
  NULL,
  now(),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.operational_clients oc
  WHERE upper(trim(oc.client_name)) = upper(trim('PAULO VICTOR'))
);

INSERT INTO public.operational_clients (
  id,
  client_name,
  status_operacional,
  onboarding_stage,
  team_id,
  pacote,
  plan,
  deal_value,
  created_at,
  updated_at,
  status_updated_at
)
SELECT
  gen_random_uuid(),
  'ANA PAULA',
  'NOVO_CLIENTE',
  'ATIVO',
  '38c9028d-856d-481e-95c9-bb2eb8b459f5',
  NULL,
  NULL,
  NULL,
  now(),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.operational_clients oc
  WHERE upper(trim(oc.client_name)) = upper(trim('ANA PAULA'))
);

INSERT INTO public.operational_clients (
  id,
  client_name,
  status_operacional,
  onboarding_stage,
  team_id,
  pacote,
  plan,
  deal_value,
  created_at,
  updated_at,
  status_updated_at
)
SELECT
  gen_random_uuid(),
  'CAROL CAMPOS',
  'NOVO_CLIENTE',
  'ATIVO',
  '38c9028d-856d-481e-95c9-bb2eb8b459f5',
  NULL,
  NULL,
  NULL,
  now(),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.operational_clients oc
  WHERE upper(trim(oc.client_name)) = upper(trim('CAROL CAMPOS'))
);

INSERT INTO public.operational_clients (
  id,
  client_name,
  status_operacional,
  onboarding_stage,
  team_id,
  pacote,
  plan,
  deal_value,
  created_at,
  updated_at,
  status_updated_at
)
SELECT
  gen_random_uuid(),
  'GONÇALO | Phorma Estética',
  'NOVO_CLIENTE',
  'ATIVO',
  '38c9028d-856d-481e-95c9-bb2eb8b459f5',
  NULL,
  NULL,
  NULL,
  now(),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.operational_clients oc
  WHERE upper(trim(oc.client_name)) = upper(trim('GONÇALO | Phorma Estética'))
);

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
