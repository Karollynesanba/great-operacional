-- Add the Tropa de Elite clients from the May CSV without deleting existing CRM data.
-- Safe to re-run: existing clients are skipped by normalized client name.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO public.teams (id, name)
VALUES ('38c9028d-856d-481e-95c9-bb2eb8b459f5', 'Tropa de Elite')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

CREATE OR REPLACE FUNCTION public.resolve_profile_id_by_name(p_name text)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT p.id
  FROM public.profiles p
  WHERE lower(coalesce(p.full_name, '')) = lower(trim(coalesce(p_name, '')))
     OR lower(coalesce(p.full_name, '')) LIKE '%' || lower(trim(coalesce(p_name, ''))) || '%'
  ORDER BY CASE WHEN lower(coalesce(p.full_name, '')) = lower(trim(coalesce(p_name, ''))) THEN 0 ELSE 1 END,
           length(coalesce(p.full_name, '')),
           p.full_name
  LIMIT 1;
$$;

WITH source_rows AS (
  SELECT *
  FROM (VALUES
  (gen_random_uuid(), NULL, 'ALANNA', NULL, 'MENSAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, public.resolve_profile_id_by_name('AMANDA'), NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-05-12T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-05-12T00:00:00.000Z'::timestamptz, 'PREMIUM', 'COMPLETO', NULL, NULL, FALSE, NULL::numeric, '2026-05-12T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-05-12T00:00:00.000Z'::timestamptz, '2026-05-12T00:00:00.000Z'::timestamptz, '2026-05-12T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'GIULIANA FRANÇA', NULL, 'TRIMESTRAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-02-23T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-02-23T00:00:00.000Z'::timestamptz, 'POPULAR', 'TRÁFEGO E CRIATIVOS', NULL, NULL, FALSE, NULL::numeric, '2026-02-23T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-02-23T00:00:00.000Z'::timestamptz, '2026-02-23T00:00:00.000Z'::timestamptz, '2026-02-23T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'PRISCILA MOLEIRO', NULL, 'SEMESTRAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-03-06T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-03-06T00:00:00.000Z'::timestamptz, 'POPULAR', 'TREINAMENTO/ TRAFEGO / DESIGN', NULL, NULL, FALSE, NULL::numeric, '2026-03-06T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-03-06T00:00:00.000Z'::timestamptz, '2026-03-06T00:00:00.000Z'::timestamptz, '2026-03-06T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'RODOLFO GUTH', NULL, 'TRIMESTRAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-03-12T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-03-12T00:00:00.000Z'::timestamptz, 'POPULAR', 'TRÁFEGO E CRIATIVOS', NULL, NULL, FALSE, NULL::numeric, '2026-03-12T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-03-12T00:00:00.000Z'::timestamptz, '2026-03-12T00:00:00.000Z'::timestamptz, '2026-03-12T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'Vanessa', NULL, 'MENSAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, public.resolve_profile_id_by_name('AMANDA'), NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-04-19T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-04-19T00:00:00.000Z'::timestamptz, 'PREMIUM', 'TRÁFEGO E CRIATIVOS', NULL, NULL, FALSE, NULL::numeric, '2026-04-19T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-04-19T00:00:00.000Z'::timestamptz, '2026-04-19T00:00:00.000Z'::timestamptz, '2026-04-19T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'MARCELA NOGUEIRA', NULL, 'TRIMESTRAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-03-17T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-03-17T00:00:00.000Z'::timestamptz, 'POPULAR', 'TREINAMENTO/ TRAFEGO / DESIGN', NULL, NULL, FALSE, NULL::numeric, '2026-03-17T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-03-17T00:00:00.000Z'::timestamptz, '2026-03-17T00:00:00.000Z'::timestamptz, '2026-03-17T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'GABRIELA MONTANHAL', NULL, 'TRIMESTRAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, public.resolve_profile_id_by_name('AMANDA'), NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-01-15T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-01-15T00:00:00.000Z'::timestamptz, 'POPULAR', 'COMPLETO', NULL, NULL, FALSE, NULL::numeric, '2026-01-15T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-01-15T00:00:00.000Z'::timestamptz, '2026-01-15T00:00:00.000Z'::timestamptz, '2026-01-15T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'DR ALEIXO', NULL, 'SEMESTRAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-03-19T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-03-19T00:00:00.000Z'::timestamptz, 'POPULAR', 'COMPLETO', NULL, NULL, FALSE, NULL::numeric, '2026-03-19T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-03-19T00:00:00.000Z'::timestamptz, '2026-03-19T00:00:00.000Z'::timestamptz, '2026-03-19T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'PAULA HOLZ', NULL, 'TRIMESTRAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-03-23T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-03-23T00:00:00.000Z'::timestamptz, 'POPULAR', 'TREINAMENTO/ TRAFEGO / DESIGN', NULL, NULL, FALSE, NULL::numeric, '2026-03-23T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-03-23T00:00:00.000Z'::timestamptz, '2026-03-23T00:00:00.000Z'::timestamptz, '2026-03-23T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'FABIANA KISS', NULL, 'TRIMESTRAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-03-12T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-03-12T00:00:00.000Z'::timestamptz, 'POPULAR', 'TREINAMENTO/ TRAFEGO / DESIGN', NULL, NULL, FALSE, NULL::numeric, '2026-03-12T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-03-12T00:00:00.000Z'::timestamptz, '2026-03-12T00:00:00.000Z'::timestamptz, '2026-03-12T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'ANDRA OLIVEIRA', NULL, 'TRIMESTRAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-04-06T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-04-06T00:00:00.000Z'::timestamptz, 'POPULAR', 'TREINAMENTO/ TRAFEGO / DESIGN', NULL, NULL, FALSE, NULL::numeric, '2026-04-06T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-04-06T00:00:00.000Z'::timestamptz, '2026-04-06T00:00:00.000Z'::timestamptz, '2026-04-06T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'DRA DANIELA GOUVEIA', NULL, 'TRIMESTRAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-04-13T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-04-13T00:00:00.000Z'::timestamptz, 'POPULAR', 'TREINAMENTO/ TRAFEGO / DESIGN', NULL, NULL, FALSE, NULL::numeric, '2026-04-13T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-04-13T00:00:00.000Z'::timestamptz, '2026-04-13T00:00:00.000Z'::timestamptz, '2026-04-13T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'PAULA MANUELLY', NULL, 'TRIMESTRAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-04-14T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-04-14T00:00:00.000Z'::timestamptz, 'POPULAR', 'TRÁFEGO E CRIATIVOS', NULL, NULL, FALSE, NULL::numeric, '2026-04-14T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-04-14T00:00:00.000Z'::timestamptz, '2026-04-14T00:00:00.000Z'::timestamptz, '2026-04-14T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'ANA CAROLINA SAKASHITA', NULL, 'TRIMESTRAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-04-17T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-04-17T00:00:00.000Z'::timestamptz, 'POPULAR', 'COMPLETO', NULL, NULL, FALSE, NULL::numeric, '2026-04-17T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-04-17T00:00:00.000Z'::timestamptz, '2026-04-17T00:00:00.000Z'::timestamptz, '2026-04-17T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'ODONTO EXCELLENCE', NULL, 'SEMESTRAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-04-29T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-04-29T00:00:00.000Z'::timestamptz, 'POPULAR', 'TREINAMENTO/ TRAFEGO / DESIGN', NULL, NULL, FALSE, NULL::numeric, '2026-04-29T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-04-29T00:00:00.000Z'::timestamptz, '2026-04-29T00:00:00.000Z'::timestamptz, '2026-04-29T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'DRA KARINE', NULL, 'SEMESTRAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-04-27T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-04-27T00:00:00.000Z'::timestamptz, 'PREMIUM', 'TREINAMENTO/ TRAFEGO / DESIGN', NULL, NULL, FALSE, NULL::numeric, '2026-04-27T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-04-27T00:00:00.000Z'::timestamptz, '2026-04-27T00:00:00.000Z'::timestamptz, '2026-04-27T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'JOSE FABIO', NULL, 'TRIMESTRAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-04-23T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-04-23T00:00:00.000Z'::timestamptz, 'POPULAR', 'TREINAMENTO/ TRAFEGO / DESIGN', NULL, NULL, FALSE, NULL::numeric, '2026-04-23T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-04-23T00:00:00.000Z'::timestamptz, '2026-04-23T00:00:00.000Z'::timestamptz, '2026-04-23T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'LORRANE RABELO', NULL, 'TRIMESTRAL', 4188.41, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-04-28T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-04-28T00:00:00.000Z'::timestamptz, 'PREMIUM', 'TRÁFEGO E CRIATIVOS', NULL, NULL, FALSE, NULL::numeric, '2026-04-28T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-04-28T00:00:00.000Z'::timestamptz, '2026-04-28T00:00:00.000Z'::timestamptz, '2026-04-28T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'KAIO CEZAR', NULL, 'MENSAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-04-28T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-04-28T00:00:00.000Z'::timestamptz, 'POPULAR', 'TREINAMENTO/ TRAFEGO / DESIGN', NULL, NULL, FALSE, NULL::numeric, '2026-04-28T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-04-28T00:00:00.000Z'::timestamptz, '2026-04-28T00:00:00.000Z'::timestamptz, '2026-04-28T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'FRANK NARCY', NULL, 'MENSAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-04-29T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-04-29T00:00:00.000Z'::timestamptz, 'POPULAR', 'TREINAMENTO/ TRAFEGO / DESIGN', NULL, NULL, FALSE, NULL::numeric, '2026-04-29T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-04-29T00:00:00.000Z'::timestamptz, '2026-04-29T00:00:00.000Z'::timestamptz, '2026-04-29T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'DRA PATRICIA COSTA', NULL, 'TRIMESTRAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-04-30T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-04-30T00:00:00.000Z'::timestamptz, 'POPULAR', 'TREINAMENTO/ TRAFEGO / DESIGN', NULL, NULL, FALSE, NULL::numeric, '2026-04-30T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-04-30T00:00:00.000Z'::timestamptz, '2026-04-30T00:00:00.000Z'::timestamptz, '2026-04-30T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'INSTITUTO MONICA SILVA', NULL, 'MENSAL', 1301.86, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-05-06T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-05-06T00:00:00.000Z'::timestamptz, 'POPULAR', 'TRÁFEGO E CRIATIVOS', NULL, NULL, FALSE, NULL::numeric, '2026-05-06T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-05-06T00:00:00.000Z'::timestamptz, '2026-05-06T00:00:00.000Z'::timestamptz, '2026-05-06T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'ANDRE', NULL, 'TRIMESTRAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-05-08T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-05-08T00:00:00.000Z'::timestamptz, 'POPULAR', 'COMPLETO', NULL, NULL, FALSE, NULL::numeric, '2026-05-08T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-05-08T00:00:00.000Z'::timestamptz, '2026-05-08T00:00:00.000Z'::timestamptz, '2026-05-08T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'ANGELA MARIA', NULL, 'MENSAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-05-08T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-05-08T00:00:00.000Z'::timestamptz, 'POPULAR', 'TRÁFEGO E CRIATIVOS', NULL, NULL, FALSE, NULL::numeric, '2026-05-08T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-05-08T00:00:00.000Z'::timestamptz, '2026-05-08T00:00:00.000Z'::timestamptz, '2026-05-08T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'KARLA TORRES', NULL, 'SEMESTRAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-05-08T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-05-08T00:00:00.000Z'::timestamptz, 'POPULAR', 'TREINAMENTO/ TRAFEGO / DESIGN', NULL, NULL, FALSE, NULL::numeric, '2026-05-08T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-05-08T00:00:00.000Z'::timestamptz, '2026-05-08T00:00:00.000Z'::timestamptz, '2026-05-08T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'EMAGRECENTRO ASA NORTE', NULL, 'TRIMESTRAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-05-06T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-05-06T00:00:00.000Z'::timestamptz, 'POPULAR', 'TREINAMENTO/ TRAFEGO / DESIGN', NULL, NULL, FALSE, NULL::numeric, '2026-05-06T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-05-06T00:00:00.000Z'::timestamptz, '2026-05-06T00:00:00.000Z'::timestamptz, '2026-05-06T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'NAYARA CALDEIRA', NULL, 'TRIMESTRAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-05-08T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-05-08T00:00:00.000Z'::timestamptz, 'POPULAR', 'COMPLETO', NULL, NULL, FALSE, NULL::numeric, '2026-05-08T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-05-08T00:00:00.000Z'::timestamptz, '2026-05-08T00:00:00.000Z'::timestamptz, '2026-05-08T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'DRA ISABELLE', NULL, 'TRIMESTRAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-05-13T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-05-13T00:00:00.000Z'::timestamptz, 'PREMIUM', 'TREINAMENTO/ TRAFEGO / DESIGN', NULL, NULL, FALSE, NULL::numeric, '2026-05-13T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-05-13T00:00:00.000Z'::timestamptz, '2026-05-13T00:00:00.000Z'::timestamptz, '2026-05-13T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'ROSALIA OLIVEIRA', NULL, 'MENSAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-05-14T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-05-14T00:00:00.000Z'::timestamptz, 'POPULAR', 'TRAFEGO E TREINAMENTO', NULL, NULL, FALSE, NULL::numeric, '2026-05-14T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-05-14T00:00:00.000Z'::timestamptz, '2026-05-14T00:00:00.000Z'::timestamptz, '2026-05-14T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'Modellen Clínica (ELAINE)', NULL, 'TRIMESTRAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-05-19T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-05-19T00:00:00.000Z'::timestamptz, 'POPULAR', 'COMPLETO', NULL, NULL, FALSE, NULL::numeric, '2026-05-19T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-05-19T00:00:00.000Z'::timestamptz, '2026-05-19T00:00:00.000Z'::timestamptz, '2026-05-19T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'ROBERTA ALBINATI', NULL, 'TRIMESTRAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-05-15T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-05-15T00:00:00.000Z'::timestamptz, 'POPULAR', 'TREINAMENTO/ TRAFEGO / DESIGN', NULL, NULL, FALSE, NULL::numeric, '2026-05-15T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-05-15T00:00:00.000Z'::timestamptz, '2026-05-15T00:00:00.000Z'::timestamptz, '2026-05-15T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'PALOMA GOMES', NULL, 'TRIMESTRAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-05-18T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-05-18T00:00:00.000Z'::timestamptz, 'POPULAR', 'TRÁFEGO E CRIATIVOS', NULL, NULL, FALSE, NULL::numeric, '2026-05-18T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-05-18T00:00:00.000Z'::timestamptz, '2026-05-18T00:00:00.000Z'::timestamptz, '2026-05-18T00:00:00.000Z'::timestamptz),
  (gen_random_uuid(), NULL, 'DR MATHEUS RODRIGUES', NULL, 'TRIMESTRAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', NULL::timestamptz, NULL::timestamptz, NULL::timestamptz, 'POPULAR', 'TRÁFEGO E CRIATIVOS', NULL, NULL, FALSE, NULL::numeric, NULL::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, now(), now(), now()),
  (gen_random_uuid(), NULL, 'DIEGO FIGUEIREDO', NULL, 'MENSAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', NULL::timestamptz, NULL::timestamptz, NULL::timestamptz, 'POPULAR', 'TRÁFEGO E CRIATIVOS', NULL, NULL, FALSE, NULL::numeric, NULL::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, now(), now(), now()),
  (gen_random_uuid(), NULL, 'CAMILA SLOMP', NULL, 'TRIMESTRAL', NULL::numeric, 'Planilha Maio 2026', '38c9028d-856d-481e-95c9-bb2eb8b459f5', NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, 'ATIVO', 'ATIVO', 'NAO_INICIADO', 'NAO_INICIADO', 'NAO_INICIADO', '2026-02-19T00:00:00.000Z'::timestamptz, NULL::timestamptz, '2026-02-19T00:00:00.000Z'::timestamptz, 'POPULAR', 'TREINAMENTO/ TRAFEGO / DESIGN', NULL, NULL, FALSE, NULL::numeric, '2026-02-19T00:00:00.000Z'::timestamptz, NULL::date, NULL::date, NULL::text, NULL::date, NULL::text, NULL::text, FALSE, FALSE, '2026-02-19T00:00:00.000Z'::timestamptz, '2026-02-19T00:00:00.000Z'::timestamptz, '2026-02-19T00:00:00.000Z'::timestamptz)
  ) AS v (
    id,
    commercial_id,
    client_name,
    clinic_name,
    plan,
    deal_value,
    creative_source,
    team_id,
    assigned_gestor_id,
    assigned_atendente_id,
    assigned_design_id,
    assigned_editor_video_id,
    status_operacional,
    onboarding_stage,
    stage_marketing,
    stage_trafego,
    stage_atendimento,
    onboarding_start_at,
    onboarding_done_at,
    activated_at,
    client_tier,
    pacote,
    pagador_anuncio,
    ad_account_name,
    has_recharge,
    recharge_value,
    start_meeting_date,
    renewal_due_date,
    renewal_date,
    renewal_status,
    churn_date,
    churn_status,
    churn_reason,
    nps_sent,
    nps_answered,
    created_at,
    updated_at,
    status_updated_at
  )
)
INSERT INTO public.operational_clients (
  id,
  commercial_id,
  client_name,
  clinic_name,
  plan,
  deal_value,
  creative_source,
  team_id,
  assigned_gestor_id,
  assigned_atendente_id,
  assigned_design_id,
  assigned_editor_video_id,
  status_operacional,
  onboarding_stage,
  stage_marketing,
  stage_trafego,
  stage_atendimento,
  onboarding_start_at,
  onboarding_done_at,
  activated_at,
  client_tier,
  pacote,
  pagador_anuncio,
  ad_account_name,
  has_recharge,
  recharge_value,
  start_meeting_date,
  renewal_due_date,
  renewal_date,
  renewal_status,
  churn_date,
  churn_status,
  churn_reason,
  nps_sent,
  nps_answered,
  created_at,
  updated_at,
  status_updated_at
)
SELECT
  s.id,
  s.commercial_id,
  s.client_name,
  s.clinic_name,
  s.plan,
  s.deal_value,
  s.creative_source,
  s.team_id::uuid,
  s.assigned_gestor_id::uuid,
  s.assigned_atendente_id::uuid,
  s.assigned_design_id::uuid,
  s.assigned_editor_video_id::uuid,
  s.status_operacional,
  s.onboarding_stage,
  s.stage_marketing,
  s.stage_trafego,
  s.stage_atendimento,
  s.onboarding_start_at,
  s.onboarding_done_at,
  s.activated_at,
  s.client_tier,
  s.pacote,
  s.pagador_anuncio,
  s.ad_account_name,
  s.has_recharge,
  s.recharge_value,
  s.start_meeting_date,
  s.renewal_due_date,
  s.renewal_date,
  s.renewal_status,
  s.churn_date,
  s.churn_status,
  s.churn_reason,
  s.nps_sent,
  s.nps_answered,
  s.created_at,
  s.updated_at,
  s.status_updated_at
FROM source_rows s
WHERE NOT EXISTS (
  SELECT 1
  FROM public.operational_clients oc
  WHERE lower(trim(coalesce(oc.client_name, ''))) = lower(trim(s.client_name))
);

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;

COMMIT;
