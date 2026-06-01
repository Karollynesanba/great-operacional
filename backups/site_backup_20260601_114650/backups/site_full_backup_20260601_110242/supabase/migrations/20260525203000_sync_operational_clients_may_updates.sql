-- Sync the operational CRM with the updated May 2026 spreadsheets:
-- - EQUIPE TIME 7 - MAIO (1).csv
-- - EQUIPE TROPA DE ELITE - MAIO (1).csv

BEGIN;

UPDATE public.operational_clients
SET
  status_operacional = 'ENCERRADO',
  updated_at = '2026-05-25T00:00:00.000Z'::timestamptz,
  status_updated_at = '2026-05-25T00:00:00.000Z'::timestamptz
WHERE upper(trim(client_name)) = upper(trim('GIULIANA FRANÇA'))
  AND team_id = '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid;

UPDATE public.operational_clients
SET
  status_operacional = 'ATIVO',
  onboarding_stage = 'ATIVO',
  onboarding_done_at = '2026-05-19T00:00:00.000Z'::timestamptz,
  activated_at = '2026-05-19T00:00:00.000Z'::timestamptz,
  updated_at = '2026-05-19T00:00:00.000Z'::timestamptz,
  status_updated_at = '2026-05-19T00:00:00.000Z'::timestamptz
WHERE upper(trim(client_name)) = upper(trim('Modellen Clínica (ELAINE)'))
  AND team_id = '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid;

INSERT INTO public.operational_clients (
  id,
  client_name,
  clinic_name,
  plan,
  pacote,
  deal_value,
  status_operacional,
  onboarding_stage,
  team_id,
  assigned_gestor_id,
  assigned_atendente_id,
  stage_marketing,
  stage_trafego,
  stage_atendimento,
  creative_source,
  pagador_anuncio,
  start_meeting_date,
  onboarding_start_at,
  onboarding_done_at,
  activated_at,
  client_tier,
  has_recharge,
  created_at,
  updated_at,
  status_updated_at
)
SELECT
  gen_random_uuid(),
  v.client_name,
  NULL,
  v.plan,
  v.pacote,
  0,
  v.status_operacional,
  v.onboarding_stage,
  v.team_id,
  v.assigned_gestor_id,
  v.assigned_atendente_id,
  'NAO_INICIADO',
  'NAO_INICIADO',
  'NAO_INICIADO',
  'Planilha Maio 2026',
  'CLIENTE',
  v.start_meeting_date,
  v.onboarding_start_at,
  v.onboarding_done_at,
  v.activated_at,
  NULL,
  FALSE,
  v.created_at,
  v.updated_at,
  v.status_updated_at
FROM (
  VALUES
    (
      'ANA JULIA',
      'MENSAL',
      'TRÁFEGO, ARTES E CONSULTOR DE VENDAS',
      'ATIVO',
      'ATIVO',
      '0469e3aa-5b34-42e2-b89d-f412efaa27ba'::uuid,
      (SELECT id FROM public.profiles WHERE lower(full_name) LIKE '%' || lower('BRAYTON') || '%' LIMIT 1),
      NULL::uuid,
      NULL::timestamptz,
      NULL::timestamptz,
      NULL::timestamptz,
      '2026-05-21T00:00:00.000Z'::timestamptz,
      '2026-05-21T00:00:00.000Z'::timestamptz,
      '2026-05-21T00:00:00.000Z'::timestamptz,
      '2026-05-21T00:00:00.000Z'::timestamptz
    ),
    (
      'DR MATHEUS RODRIGUES',
      'TRIMESTRAL',
      'TRÁFEGO E CRIATIVOS',
      'ENCERRADO',
      'CONTRATO',
      '38c9028d-856d-481e-95c9-bb2eb8b459f5'::uuid,
      NULL::uuid,
      NULL::uuid,
      '2026-05-14T00:00:00.000Z'::timestamptz,
      '2026-05-14T00:00:00.000Z'::timestamptz,
      NULL::timestamptz,
      NULL::timestamptz,
      '2026-05-14T00:00:00.000Z'::timestamptz,
      '2026-05-14T00:00:00.000Z'::timestamptz,
      '2026-05-14T00:00:00.000Z'::timestamptz
    )
) AS v (
  client_name,
  plan,
  pacote,
  status_operacional,
  onboarding_stage,
  team_id,
  assigned_gestor_id,
  assigned_atendente_id,
  start_meeting_date,
  onboarding_start_at,
  onboarding_done_at,
  activated_at,
  created_at,
  updated_at,
  status_updated_at
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.operational_clients oc
  WHERE upper(trim(oc.client_name)) = upper(trim(v.client_name))
    AND oc.team_id = v.team_id
);

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;

COMMIT;
