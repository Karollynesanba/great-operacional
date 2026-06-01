-- Seed missing clients from:
-- C:\Users\karol\Downloads\EQUIPE TIME 7 - REGISTRO DE CLIENTES.csv
-- Team: Equipe 7

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
  start_meeting_date,
  created_at,
  updated_at,
  status_updated_at
)
SELECT
  gen_random_uuid(),
  v.client_name,
  NULL,
  'ATIVO',
  'ATIVO',
  '0469e3aa-5b34-42e2-b89d-f412efaa27ba',
  NULL,
  NULL,
  NULL,
  NULL,
  now(),
  now(),
  now()
FROM (
  VALUES
    ('BRUNA/ VIVA PLASTICA'),
    ('KELLY LEÃO'),
    ('ISACC'),
    ('EMERSON'),
    ('JULIANA MIGUEL'),
    ('GUSTAVO ARIA'),
    ('GESLAINE MATOS'),
    ('SABRINA CAMARGO'),
    ('EMILY VASCONSELOS'),
    ('HELEN SANTORELI'),
    ('RAFAEL MOLINA'),
    ('MARCOS BIGAGÃO'),
    ('DR CESAR/ EKOLIFE')
) AS v(client_name)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.operational_clients oc
  WHERE upper(trim(oc.client_name)) = upper(trim(v.client_name))
);

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
