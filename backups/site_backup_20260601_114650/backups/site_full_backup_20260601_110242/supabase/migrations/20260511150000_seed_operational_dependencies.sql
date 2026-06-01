-- Base dependencies for the operational schema.
-- Run this before the schema block that creates work_items and my_day_items.

CREATE TABLE IF NOT EXISTS public.operational_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_id TEXT NULL,
  client_name TEXT NOT NULL,
  clinic_name TEXT NULL,
  plan TEXT CHECK (plan IN ('MENSAL', 'TRIMESTRAL', 'SEMESTRAL')) NULL,
  deal_value NUMERIC(12,2) DEFAULT 0,
  creative_source TEXT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  assigned_gestor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_atendente_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_design_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_editor_video_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status_operacional TEXT NOT NULL DEFAULT 'NOVO_CLIENTE' CHECK (status_operacional IN ('NOVO_CLIENTE', 'ONBOARDING', 'ATIVO', 'PAUSADO', 'ENCERRADO')),
  stage_trafego TEXT DEFAULT 'NAO_INICIADO' CHECK (stage_trafego IN ('NAO_INICIADO', 'EM_ANDAMENTO', 'OK', 'BLOQUEADO')),
  stage_atendimento TEXT DEFAULT 'NAO_INICIADO' CHECK (stage_atendimento IN ('NAO_INICIADO', 'EM_ANDAMENTO', 'OK', 'BLOQUEADO')),
  stage_marketing TEXT DEFAULT 'NAO_INICIADO' CHECK (stage_marketing IN ('NAO_INICIADO', 'EM_ANDAMENTO', 'OK', 'BLOQUEADO')),
  onboarding_start_at TIMESTAMPTZ NULL,
  onboarding_done_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.operational_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operational clients viewable by authenticated users" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients insertable by authenticated users" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients updatable by authenticated users" ON public.operational_clients;
DROP POLICY IF EXISTS "Operational clients deletable by authenticated users" ON public.operational_clients;

CREATE POLICY "Operational clients viewable by authenticated users"
ON public.operational_clients FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Operational clients insertable by authenticated users"
ON public.operational_clients FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Operational clients updatable by authenticated users"
ON public.operational_clients FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Operational clients deletable by authenticated users"
ON public.operational_clients FOR DELETE
TO authenticated
USING (true);

CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'SPACE' CHECK (type IN ('SPACE', 'FOLDER', 'LIST')),
  created_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspaces viewable by authenticated users" ON public.workspaces;
DROP POLICY IF EXISTS "Workspaces insertable by authenticated users" ON public.workspaces;
DROP POLICY IF EXISTS "Workspaces updatable by creator or admin" ON public.workspaces;
DROP POLICY IF EXISTS "Workspaces deletable by creator or admin" ON public.workspaces;

CREATE POLICY "Workspaces viewable by authenticated users"
ON public.workspaces FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Workspaces insertable by authenticated users"
ON public.workspaces FOR INSERT
TO authenticated
WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "Workspaces updatable by creator or admin"
ON public.workspaces FOR UPDATE
TO authenticated
USING (created_by_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Workspaces deletable by creator or admin"
ON public.workspaces FOR DELETE
TO authenticated
USING (created_by_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_operational_clients_updated_at ON public.operational_clients;
CREATE TRIGGER update_operational_clients_updated_at
BEFORE UPDATE ON public.operational_clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspaces_updated_at ON public.workspaces;
CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
