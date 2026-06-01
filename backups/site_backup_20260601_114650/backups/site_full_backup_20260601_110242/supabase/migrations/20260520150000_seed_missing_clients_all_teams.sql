-- Single SQL to seed missing clients from both team documents.
-- Team 7 source: EQUIPE TIME 7 - REGISTRO DE CLIENTES.csv
-- Tropa de Elite source: EQUIPE TROPA DE ELITE - NÃO USAR.csv

WITH new_clients (
  client_name,
  team_id,
  status_operacional,
  pacote,
  plan,
  deal_value
) AS (
  VALUES
    -- Equipe 7
    ('BRUNA/ VIVA PLASTICA', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'ATIVO', NULL, NULL, NULL),
    ('KELLY LEÃO', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'ATIVO', NULL, NULL, NULL),
    ('ISACC', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'ATIVO', NULL, NULL, NULL),
    ('EMERSON', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'ATIVO', NULL, NULL, NULL),
    ('JULIANA MIGUEL', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'ATIVO', NULL, NULL, NULL),
    ('GUSTAVO ARIA', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'ATIVO', NULL, NULL, NULL),
    ('GESLAINE MATOS', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'ATIVO', NULL, NULL, NULL),
    ('SABRINA CAMARGO', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'ATIVO', NULL, NULL, NULL),
    ('EMILY VASCONSELOS', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'ATIVO', NULL, NULL, NULL),
    ('HELEN SANTORELI', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'ATIVO', NULL, NULL, NULL),
    ('RAFAEL MOLINA', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'ATIVO', NULL, NULL, NULL),
    ('MARCOS BIGAGÃO', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'ATIVO', NULL, NULL, NULL),
    ('DR CESAR/ EKOLIFE', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'ATIVO', NULL, NULL, NULL),

    -- Tropa de Elite
    ('JULIA ANDREATA', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'ATIVO', 'TRÁFEGO+CONSULTORIA', 'TRIMESTRAL', NULL),
    ('GABRIELLA CARVALHO', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'ATIVO', 'COMPLETO', 'MENSAL', 2447.00),
    ('RICARDO GIOVANELLI', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'ATIVO', 'COMPLETO NOVA ERA', 'TRIMESTRAL', 4649.50),
    ('CINTIA / PERLEA MAISON', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'ENCERRADO', 'COMPLETO NOVA ERA', 'MENSAL', 2097.00),
    ('ADRIANA REAIS', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'ENCERRADO', 'TRÁFEGO E CRIATIVOS', 'MENSAL', 1600.00),
    ('Dra Alanna', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'ATIVO', NULL, NULL, NULL),
    ('Doralice Renove', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'ATIVO', NULL, NULL, NULL),
    ('Beatriz Coutinho', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'ATIVO', NULL, NULL, NULL),
    ('NATALIA CAMARGO', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'ATIVO', NULL, NULL, NULL),
    ('SANDRA ROBERT', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'ATIVO', NULL, NULL, NULL),
    ('ANA Crismeira', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'ATIVO', NULL, NULL, NULL),
    ('PAULO VICTOR', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'ATIVO', NULL, NULL, NULL),
    ('ANA PAULA', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'ATIVO', NULL, NULL, NULL),
    ('CAROL CAMPOS', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'ATIVO', NULL, NULL, NULL),
    ('GONÇALO | Phorma Estética', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'ATIVO', NULL, NULL, NULL)
)
INSERT INTO public.operational_clients (
  id,
  client_name,
  clinic_name,
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
  n.client_name,
  NULL,
  n.status_operacional,
  'CONTRATO',
  n.team_id::uuid,
  n.pacote,
  n.plan,
  n.deal_value,
  now(),
  now(),
  now()
FROM new_clients n
WHERE NOT EXISTS (
  SELECT 1
  FROM public.operational_clients oc
  WHERE upper(trim(oc.client_name)) = upper(trim(n.client_name))
);

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
