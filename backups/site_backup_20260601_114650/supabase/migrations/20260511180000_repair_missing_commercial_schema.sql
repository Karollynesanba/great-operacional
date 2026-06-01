-- Repair missing commercial schema pieces for production Supabase projects.
-- This is idempotent and safe to run multiple times.

-- ---------------------------------------------------------------------------
-- pipeline_clients
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pipeline_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ativo BOOLEAN DEFAULT true,
  client_name TEXT NOT NULL,
  clinic_name TEXT,
  telefone TEXT,
  vendedor TEXT,
  criativo TEXT,
  equipe TEXT,
  faturamento TEXT,
  faturamento_personalizado TEXT,
  pacote TEXT,
  periodo TEXT,
  indicacao TEXT,
  entrada NUMERIC DEFAULT 0,
  data_entrada TIMESTAMPTZ DEFAULT now(),
  stage TEXT DEFAULT 'NOVO',
  last_stage_change TIMESTAMPTZ,
  lost_reason TEXT,
  no_show_reason TEXT,
  notes TEXT,
  agendado_por TEXT,
  agendado_via TEXT,
  pagador_anuncio TEXT,
  tem_socio TEXT,
  tem_mkt TEXT,
  tem_secretaria TEXT,
  salao_ou_clinica TEXT,
  meeting_date TEXT,
  meeting_time TEXT,
  followup_done BOOLEAN DEFAULT false,
  pode_investir TEXT,
  created_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.pipeline_clients
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

ALTER TABLE IF EXISTS public.pipeline_clients
  ADD COLUMN IF NOT EXISTS faturamento_personalizado TEXT;

ALTER TABLE IF EXISTS public.pipeline_clients
  ADD COLUMN IF NOT EXISTS agendado_via TEXT;

ALTER TABLE IF EXISTS public.pipeline_clients
  ADD COLUMN IF NOT EXISTS tem_secretaria TEXT;

ALTER TABLE IF EXISTS public.pipeline_clients
  ADD COLUMN IF NOT EXISTS salao_ou_clinica TEXT;

ALTER TABLE IF EXISTS public.pipeline_clients
  ADD COLUMN IF NOT EXISTS followup_done BOOLEAN DEFAULT false;

ALTER TABLE IF EXISTS public.pipeline_clients
  ADD COLUMN IF NOT EXISTS pode_investir TEXT;

ALTER TABLE IF EXISTS public.pipeline_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated users can view pipeline clients" ON public.pipeline_clients;
DROP POLICY IF EXISTS "All authenticated users can insert pipeline clients" ON public.pipeline_clients;
DROP POLICY IF EXISTS "All authenticated users can update pipeline clients" ON public.pipeline_clients;
DROP POLICY IF EXISTS "All authenticated users can delete pipeline clients" ON public.pipeline_clients;

CREATE POLICY "All authenticated users can view pipeline clients"
ON public.pipeline_clients
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can insert pipeline clients"
ON public.pipeline_clients
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can update pipeline clients"
ON public.pipeline_clients
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can delete pipeline clients"
ON public.pipeline_clients
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP TRIGGER IF EXISTS update_pipeline_clients_updated_at ON public.pipeline_clients;
CREATE TRIGGER update_pipeline_clients_updated_at
BEFORE UPDATE ON public.pipeline_clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

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
      AND tablename = 'pipeline_clients'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_clients;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- commercial_goals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commercial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month VARCHAR(7) NOT NULL,
  goal_value NUMERIC NOT NULL DEFAULT 100000,
  created_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(month)
);

ALTER TABLE IF EXISTS public.commercial_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view goals" ON public.commercial_goals;
DROP POLICY IF EXISTS "Admin can manage goals" ON public.commercial_goals;

CREATE POLICY "Authenticated users can view goals"
ON public.commercial_goals
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin can manage goals"
ON public.commercial_goals
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS update_commercial_goals_updated_at ON public.commercial_goals;
CREATE TRIGGER update_commercial_goals_updated_at
BEFORE UPDATE ON public.commercial_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

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
      AND tablename = 'commercial_goals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.commercial_goals;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- sdr_goals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sdr_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendador VARCHAR(50) NOT NULL,
  month VARCHAR(7) NOT NULL,
  goal_count INTEGER NOT NULL DEFAULT 10,
  created_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agendador, month)
);

ALTER TABLE IF EXISTS public.sdr_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view SDR goals" ON public.sdr_goals;
DROP POLICY IF EXISTS "Admin can manage SDR goals" ON public.sdr_goals;

CREATE POLICY "Authenticated users can view SDR goals"
ON public.sdr_goals
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin can manage SDR goals"
ON public.sdr_goals
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS update_sdr_goals_updated_at ON public.sdr_goals;
CREATE TRIGGER update_sdr_goals_updated_at
BEFORE UPDATE ON public.sdr_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

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
      AND tablename = 'sdr_goals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sdr_goals;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

