-- Fix the operational_clients schema so the CSV import works in production.
-- Run this in the Supabase SQL Editor if the live project is missing columns
-- that exist in the local app schema.

ALTER TABLE IF EXISTS public.operational_clients
  ADD COLUMN IF NOT EXISTS onboarding_stage TEXT NOT NULL DEFAULT 'CONTRATO',
  ADD COLUMN IF NOT EXISTS briefing_completed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS activated_by UUID NULL,
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS client_tier TEXT NULL,
  ADD COLUMN IF NOT EXISTS pacote TEXT NULL,
  ADD COLUMN IF NOT EXISTS pagador_anuncio TEXT NULL,
  ADD COLUMN IF NOT EXISTS ad_account_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS has_recharge BOOLEAN NULL,
  ADD COLUMN IF NOT EXISTS recharge_value NUMERIC(12,2) NULL,
  ADD COLUMN IF NOT EXISTS start_meeting_date TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS renewal_due_date TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS renewal_date TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS renewal_status TEXT NULL,
  ADD COLUMN IF NOT EXISTS renewal_responsible_team_id UUID NULL,
  ADD COLUMN IF NOT EXISTS churn_status TEXT NULL,
  ADD COLUMN IF NOT EXISTS churn_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS churn_date TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS churn_responsible_team_id UUID NULL,
  ADD COLUMN IF NOT EXISTS nps_sent BOOLEAN NULL,
  ADD COLUMN IF NOT EXISTS nps_answered BOOLEAN NULL;

ALTER TABLE public.operational_clients
  DROP CONSTRAINT IF EXISTS operational_clients_status_operacional_check;

ALTER TABLE public.operational_clients
  ADD CONSTRAINT operational_clients_status_operacional_check
  CHECK (
    status_operacional = ANY (
      ARRAY[
        'NOVO_CLIENTE'::text,
        'ONBOARDING'::text,
        'ATIVO'::text,
        'PAUSADO'::text,
        'ENCERRADO'::text,
        'EM_ATIVACAO'::text
      ]
    )
  );

ALTER TABLE public.operational_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operational clients viewable by authenticated users" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients insertable by authenticated users" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients updatable by authenticated users" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients deletable by authenticated users" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients viewable by public" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients insertable by public" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients updatable by public" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients deletable by public" ON public.operational_clients;

CREATE POLICY "Operational clients viewable by public"
ON public.operational_clients
FOR SELECT
TO public
USING (true);

CREATE POLICY "Operational clients insertable by public"
ON public.operational_clients
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Operational clients updatable by public"
ON public.operational_clients
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Operational clients deletable by public"
ON public.operational_clients
FOR DELETE
TO public
USING (true);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'operational_clients'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.operational_clients;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
