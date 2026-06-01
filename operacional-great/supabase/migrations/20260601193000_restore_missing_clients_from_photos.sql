-- Restore clients from clientes_great_importacao.csv.
-- Insert-only: skips any client that already exists by client_name.

WITH new_clients (
  client_name,
  team_id,
  status_operacional,
  onboarding_stage,
  pacote,
  client_tier,
  created_at
) AS (
  VALUES
    ('ANA KARINA', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'EM_ATIVACAO', 'CONTRATO', 'Tráfego', NULL, '2026-05-29T00:00:00.000Z'::timestamptz),
    ('DRA KARINA COBUCCI', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'EM_ATIVACAO', 'CONTRATO', 'Completo', NULL, '2026-05-29T00:00:00.000Z'::timestamptz),
    ('GLEICY PIRES', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'EM_ATIVACAO', 'CONTRATO', 'Completo', NULL, '2026-05-27T00:00:00.000Z'::timestamptz),
    ('DRA REGIANNE', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'EM_ATIVACAO', 'CONTRATO', 'Completo', NULL, '2026-05-27T00:00:00.000Z'::timestamptz),
    ('DR MATHEUS RODRIGUES', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'ATIVO', 'ATIVO', 'TRÁFEGO E CRIATIVOS', 'POPULAR', '2026-05-25T00:00:00.000Z'::timestamptz),
    ('MICHELLE PARADELLA', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'ATIVO', 'ATIVO', 'Atendimento', NULL, '2026-05-25T00:00:00.000Z'::timestamptz),
    ('NEMER', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'ATIVO', 'ATIVO', 'TRÁFEGO E CRIATIVOS', NULL, '2026-05-21T00:00:00.000Z'::timestamptz),
    ('HOMOVITA - Grazziele', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'ATIVO', 'ATIVO', 'TRÁFEGO+ATENDIMENTO', NULL, '2026-05-20T00:00:00.000Z'::timestamptz),
    ('FELIPE LIMA', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'ATIVO', 'ATIVO', 'Atendimento', NULL, '2026-05-20T00:00:00.000Z'::timestamptz),
    ('ANA JULIA', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'ATIVO', 'ATIVO', 'TRÁFEGO, ARTES E CONSULTOR DE VENDAS', 'POPULAR', '2026-05-20T00:00:00.000Z'::timestamptz),
    ('REMPEL MORAIS - CARIN', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'ATIVO', 'ATIVO', 'Completo', NULL, '2026-05-19T00:00:00.000Z'::timestamptz),
    ('THAIS DIMONACO', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'ATIVO', 'ATIVO', 'TRÁFEGO E CRIATIVOS', NULL, '2026-05-17T00:00:00.000Z'::timestamptz),
    ('CICERO - SAQUAREMED', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'ATIVO', 'ATIVO', 'COMPLETO NOVA ERA', NULL, '2026-05-17T00:00:00.000Z'::timestamptz),
    ('CLÍNICA ALECI BRITO - DANIELA', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'ATIVO', 'ATIVO', 'Completo', NULL, '2026-05-14T00:00:00.000Z'::timestamptz),
    ('LIALIANY MARIA COELHO', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'ATIVO', 'ATIVO', 'COMPLETO NOVA ERA', NULL, '2026-05-13T00:00:00.000Z'::timestamptz),
    ('ANDREE ALANA', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'ATIVO', 'ATIVO', 'TRÁFEGO E CRIATIVOS', NULL, '2026-05-11T00:00:00.000Z'::timestamptz),
    ('LUCAS SAMPAULO', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'ATIVO', 'ATIVO', 'TREINAMENTO/TRAFEGO/DESIGN', NULL, '2026-05-08T00:00:00.000Z'::timestamptz),
    ('ROBERTA ALBINATI/RAFAEL CUNHA', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'ATIVO', 'ATIVO', 'COMPLETO NOVA ERA', NULL, '2026-05-07T00:00:00.000Z'::timestamptz),
    ('NATAYRA CALDEIRA', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'ATIVO', 'ATIVO', 'Completo', NULL, '2026-05-07T00:00:00.000Z'::timestamptz),
    ('DANIELE BUBNER', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'ATIVO', 'ATIVO', 'TRÁFEGO, ARTES E CONSULTOR DE VENDAS', NULL, '2026-05-03T00:00:00.000Z'::timestamptz),
    ('ANELLE', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'ATIVO', 'ATIVO', 'TRÁFEGO E CRIATIVOS', NULL, '2026-05-03T00:00:00.000Z'::timestamptz),
    ('RODRIGO / CESOF', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'ATIVO', 'ATIVO', 'TRÁFEGO E CRIATIVOS', NULL, '2026-04-15T00:00:00.000Z'::timestamptz),
    ('BARBARA ROCHA', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'ATIVO', 'ATIVO', 'TRÁFEGO, ARTES E CONSULTOR DE VENDAS', NULL, '2026-04-14T00:00:00.000Z'::timestamptz),
    ('DRA ALEIXO', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'ATIVO', 'ATIVO', 'Completo', NULL, '2026-03-18T00:00:00.000Z'::timestamptz),
    ('DRA DANIELA LIMA', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'EM_ATIVACAO', 'CONTRATO', 'TREINAMENTO/TRAFEGO/DESIGN', NULL, '2026-03-06T00:00:00.000Z'::timestamptz),
    ('VITORIA REGAN', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'ENCERRADO', 'CONTRATO', 'TRÁFEGO, ARTES E CONSULTOR DE VENDAS', NULL, '2026-02-26T00:00:00.000Z'::timestamptz),
    ('GIULIANA FRANÇA', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'EM_ATIVACAO', 'CONTRATO', 'TRÁFEGO E CRIATIVOS', NULL, '2026-02-22T00:00:00.000Z'::timestamptz),
    ('CLAUDIA GIACOMINI', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'PAUSADO', 'CONTRATO', 'Completo', NULL, '2026-02-22T00:00:00.000Z'::timestamptz),
    ('CAMILA SLOMP', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'ENCERRADO', 'CONTRATO', 'TREINAMENTO/TRAFEGO/DESIGN', NULL, '2026-02-18T00:00:00.000Z'::timestamptz),
    ('Mallore', '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid, 'ENCERRADO', 'CONTRATO', 'TRÁFEGO E CRIATIVOS', NULL, '2026-02-17T00:00:00.000Z'::timestamptz),
    ('GABRIELA MONTANHAL', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'ENCERRADO', 'CONTRATO', 'Completo', NULL, '2026-01-14T00:00:00.000Z'::timestamptz),
    ('RIKARY HAIR', '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid, 'PAUSADO', 'CONTRATO', 'Completo', NULL, '2026-01-13T00:00:00.000Z'::timestamptz)
)
INSERT INTO public.operational_clients (
  id,
  client_name,
  deal_value,
  team_id,
  status_operacional,
  onboarding_stage,
  pacote,
  client_tier,
  creative_source,
  created_at,
  updated_at,
  status_updated_at
)
SELECT
  gen_random_uuid(),
  n.client_name,
  0,
  n.team_id,
  n.status_operacional,
  n.onboarding_stage,
  n.pacote,
  n.client_tier,
  'clientes_great_importacao.csv',
  n.created_at,
  n.created_at,
  n.created_at
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
