-- Importa apenas os clientes válidos do CSV de vendas de maio/2026.
-- Regras aplicadas:
-- - KAUAN => Equipe 7
-- - LIRA => Tropa de Elite
-- - linhas com "taxa de interesse" foram excluídas

WITH input_rows (
  client_name,
  creative_source,
  team_id,
  raw_plan,
  pacote,
  created_at
) AS (
  VALUES
    ('CLÍNICA REVITALIZEPNZ', 'FORMS CAIXINHA EVENTO 01', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'TRIMESTRAL', 'COMPLETO NOVA ERA', '2026-05-01T00:00:00.000Z'::timestamptz),
    ('DRA ISABELLE', 'INDICAÇÃO', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'TRIMESTRAL', 'COMPLETO NOVA ERA', '2026-05-04T00:00:00.000Z'::timestamptz),
    ('ROSI', 'BOTOX', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'TRIMESTRAL', 'TRÁFEGO E CRIATIVOS', '2026-05-05T00:00:00.000Z'::timestamptz),
    ('ANDRE E ALANA', 'FORMS ADS/EVENTO03', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'MENSAL', 'TRÁFEGO E CRIATIVOS', '2026-05-05T00:00:00.000Z'::timestamptz),
    ('ROSALIA OLIVEIRA', 'FORMS ADS/EVENTO03', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'MENSAL', 'TRÁFEGO+CONSULTORIA', '2026-05-06T00:00:00.000Z'::timestamptz),
    ('PEDRO LUCAS', 'FORMS ADS/EVENTO03', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'MENSAL', 'TRÁFEGO E CRIATIVOS', '2026-05-06T00:00:00.000Z'::timestamptz),
    ('NAYARA CALDEIRA', 'FORMS ADS/EVENTO03', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'TRIMESTRAL', 'COMPLETO', '2026-05-06T00:00:00.000Z'::timestamptz),
    ('Modellen Clínica (ELAINE)', 'FORMS CAIXINHA/OFICIAL00', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'TRIMESTRAL', 'COMPLETO', '2026-05-07T00:00:00.000Z'::timestamptz),
    ('DANIELA SANTOS', 'INSTAGRAM', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'TRIMESTRAL', 'TRÁFEGO E CRIATIVOS', '2026-05-07T00:00:00.000Z'::timestamptz),
    ('RAFAELA BATISTA', 'INSTAGRAM', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'TRIMESTRAL', 'COMPLETO', '2026-05-07T00:00:00.000Z'::timestamptz),
    ('DRA SUZANE', 'INSTAGRAM', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'TRIMESTRAL', 'TRÁFEGO E CRIATIVOS', '2026-05-07T00:00:00.000Z'::timestamptz),
    ('ROBERTA ALBINATI/RAFAEL CUNHA', 'FORMS CAIXINHA EVENTO 01', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'TRIMESTRAL', 'COMPLETO NOVA ERA', '2026-05-08T00:00:00.000Z'::timestamptz),
    ('THAIS DI MONACO', 'INSTAGRAM', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'TRIMESTRAL', 'TRÁFEGO E CRIATIVOS', '2026-05-11T00:00:00.000Z'::timestamptz),
    ('PALOMA GOMES', 'FORMS ADS/EVENTO03', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'TRIMESTRAL', 'TRÁFEGO E CRIATIVOS', '2026-05-11T00:00:00.000Z'::timestamptz),
    ('BRUNA TERRA', 'INSTAGRAM', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'TRIMESTRAL', 'COMPLETO', '2026-05-12T00:00:00.000Z'::timestamptz),
    ('DR MATHEUS RODRIGUES', 'INDICAÇÃO', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'TRIMESTRAL', 'TRÁFEGO E CRIATIVOS', '2026-05-13T00:00:00.000Z'::timestamptz),
    ('CAMILA SCATOLIN', 'FORMS CAIXINHA EVENTO 01', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'MENSAL', 'COMPLETO', '2026-05-13T00:00:00.000Z'::timestamptz),
    ('JESSICA GAMA', 'CAIXA DE PERGUNTA', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'MENSAL', 'TRÁFEGO E CRIATIVOS', '2026-05-14T00:00:00.000Z'::timestamptz),
    ('LIALIANY MARIA COELHO', 'INSTAGRAM', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'TRIMESTRAL', 'COMPLETO NOVA ERA', '2026-05-14T00:00:00.000Z'::timestamptz),
    ('DIEGO FIGUEIREDO', 'FORMS ADS/EVENTO03', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'MENSAL', 'TRÁFEGO E CRIATIVOS', '2026-05-14T00:00:00.000Z'::timestamptz),
    ('ANA JULIA', 'FORMS CAIXINHA EVENTO 01', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'MENSAL', 'COMPLETO NOVA ERA', '2026-05-15T00:00:00.000Z'::timestamptz),
    ('CLÍNICA ALECIA BRITO - DANIELA', 'FORMS ADS/EVENTO03', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'TRIMESTRAL', 'COMPLETO', '2026-05-15T00:00:00.000Z'::timestamptz),
    ('DRA WANNA', 'INSTAGRAM', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'MENSAL', 'TRAFEGO+ATENDIMENTO', '2026-05-15T00:00:00.000Z'::timestamptz),
    ('DRA NERCI CARLINI', 'FORMS ESTÁTICO GOOGLE', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'TRIMESTRAL', 'TRAFEGO+ATENDIMENTO', '2026-05-18T00:00:00.000Z'::timestamptz),
    ('CICERO - SAQUAMED', 'FORMS CAIXINHA/OFICIAL00', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'SEMESTRAL', 'COMPLETO NOVA ERA', '2026-05-18T00:00:00.000Z'::timestamptz),
    ('ANA PAULA LOPES', 'FORMS ADS/EVENTO03', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'TRIMESTRAL', 'COMPLETO', '2026-05-18T00:00:00.000Z'::timestamptz),
    ('LORENA SOUZA', 'FORMS CAIXINHA EVENTO 01', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'TRIMESTRAL', 'COMPLETO', '2026-05-19T00:00:00.000Z'::timestamptz),
    ('REMPEL MORAIS - CARIN', 'FORMS ADS/EVENTO03', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'TRIMESTRAL', 'COMPLETO', '2026-05-20T00:00:00.000Z'::timestamptz),
    ('HOMOVITA - Grazziele', 'FORMS ADS/EVENTO03', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'TRIMESTRAL', 'TRAFEGO+ATENDIMENTO', '2026-05-21T00:00:00.000Z'::timestamptz),
    ('FELIPE LIMA', 'FORMS ADS/EVENTO03', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'MENSAL', 'ATENDIMENTO', '2026-05-21T00:00:00.000Z'::timestamptz),
    ('NEMER', 'INSTAGRAM', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'MENSAL', 'TRÁFEGO E CRIATIVOS', '2026-05-22T00:00:00.000Z'::timestamptz),
    ('MICHELLE PARADELLA', 'FORMS CAIXINHA EVENTO 01', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'TRIMESTRAL', 'ATENDIMENTO', '2026-05-26T00:00:00.000Z'::timestamptz)
)
INSERT INTO public.operational_clients (
  id,
  client_name,
  creative_source,
  team_id,
  plan,
  pacote,
  status_operacional,
  onboarding_stage,
  stage_marketing,
  stage_trafego,
  stage_atendimento,
  created_at,
  updated_at,
  status_updated_at
)
SELECT
  gen_random_uuid(),
  r.client_name,
  r.creative_source,
  r.team_id,
  r.raw_plan,
  r.pacote,
  'ATIVO',
  'ATIVO',
  'NAO_INICIADO',
  'NAO_INICIADO',
  'NAO_INICIADO',
  r.created_at,
  r.created_at,
  r.created_at
FROM input_rows r
WHERE NOT EXISTS (
  SELECT 1
  FROM public.operational_clients oc
  WHERE lower(coalesce(oc.client_name, '')) = lower(r.client_name)
);
