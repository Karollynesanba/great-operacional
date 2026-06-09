-- Global agenda/agendamento CRUD for the current Supabase project.
-- This script makes agenda-related rows visible and editable from any browser/device
-- that connects to the same database, while keeping Supabase Realtime enabled.
--
-- Tables covered:
--   - public.agenda_events
--   - public.agendamento_leads
--
-- Notes:
--   - This does NOT replicate data across different Supabase projects.
--   - If your app has frontend filters, those may still need to be adjusted.

BEGIN;

-- ---------------------------------------------------------------------------
-- agenda_events
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.agenda_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  meeting_link TEXT,
  color TEXT DEFAULT '#3b82f6',
  reminder_2h_sent BOOLEAN DEFAULT false,
  reminder_30min_sent BOOLEAN DEFAULT false,
  created_by_user_id UUID REFERENCES public.profiles(id),
  assigned_closer_id UUID REFERENCES public.profiles(id),
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agenda_events
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.agenda_events
  ADD COLUMN IF NOT EXISTS assigned_closer_id UUID REFERENCES public.profiles(id);

ALTER TABLE public.agenda_events
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.agenda_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_agenda_events_event_date
  ON public.agenda_events (event_date);

CREATE INDEX IF NOT EXISTS idx_agenda_events_event_date_time
  ON public.agenda_events (event_date, event_time);

CREATE INDEX IF NOT EXISTS idx_agenda_events_created_by_user_id
  ON public.agenda_events (created_by_user_id);

CREATE INDEX IF NOT EXISTS idx_agenda_events_assigned_closer_id
  ON public.agenda_events (assigned_closer_id);

CREATE INDEX IF NOT EXISTS idx_agenda_events_team_id
  ON public.agenda_events (team_id);

DROP POLICY IF EXISTS "Users can view all agenda events" ON public.agenda_events;
DROP POLICY IF EXISTS "Authenticated users can create agenda events" ON public.agenda_events;
DROP POLICY IF EXISTS "Authenticated users can update agenda events" ON public.agenda_events;
DROP POLICY IF EXISTS "Authenticated users can delete agenda events" ON public.agenda_events;

DROP POLICY IF EXISTS "agenda_events_select_public" ON public.agenda_events;
DROP POLICY IF EXISTS "agenda_events_insert_public" ON public.agenda_events;
DROP POLICY IF EXISTS "agenda_events_update_public" ON public.agenda_events;
DROP POLICY IF EXISTS "agenda_events_delete_public" ON public.agenda_events;

CREATE POLICY "agenda_events_select_public"
ON public.agenda_events
FOR SELECT
TO public
USING (true);

CREATE POLICY "agenda_events_insert_public"
ON public.agenda_events
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "agenda_events_update_public"
ON public.agenda_events
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "agenda_events_delete_public"
ON public.agenda_events
FOR DELETE
TO public
USING (true);

DROP TRIGGER IF EXISTS update_agenda_events_updated_at ON public.agenda_events;
CREATE TRIGGER update_agenda_events_updated_at
BEFORE UPDATE ON public.agenda_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.agenda_events
TO anon, authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'agenda_events'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.agenda_events;
    END IF;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- agendamento_leads
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.agendamento_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data TEXT NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  horario TEXT NOT NULL CHECK (horario IN ('MANHA', 'TARDE', 'NOITE')),
  horario_especifico TEXT,
  tem_socio TEXT NOT NULL CHECK (tem_socio IN ('SIM', 'NAO')),
  tem_mkt TEXT NOT NULL CHECK (tem_mkt IN ('SIM', 'NAO')),
  tem_secretaria TEXT NOT NULL DEFAULT 'NAO' CHECK (tem_secretaria IN ('SIM', 'NAO')),
  salao_ou_clinica TEXT NOT NULL DEFAULT 'NAO_INFORMADO' CHECK (salao_ou_clinica IN ('SALAO', 'CLINICA', 'NAO_INFORMADO')),
  faturamento TEXT NOT NULL CHECK (faturamento IN ('0_A_15K', '15K_A_30K', '30K_A_50K', '50K_A_100K', '100K_PLUS')),
  pode_investir TEXT DEFAULT NULL,
  agendado_via TEXT DEFAULT NULL,
  funil TEXT NOT NULL,
  status TEXT NOT NULL,
  created_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agendamento_leads
  ADD COLUMN IF NOT EXISTS horario_especifico TEXT;

ALTER TABLE public.agendamento_leads
  ADD COLUMN IF NOT EXISTS tem_secretaria TEXT NOT NULL DEFAULT 'NAO';

ALTER TABLE public.agendamento_leads
  ADD COLUMN IF NOT EXISTS salao_ou_clinica TEXT NOT NULL DEFAULT 'NAO_INFORMADO';

ALTER TABLE public.agendamento_leads
  ADD COLUMN IF NOT EXISTS pode_investir TEXT DEFAULT NULL;

ALTER TABLE public.agendamento_leads
  ADD COLUMN IF NOT EXISTS agendado_via TEXT DEFAULT NULL;

ALTER TABLE IF EXISTS public.agendamento_leads ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_agendamento_leads_data
  ON public.agendamento_leads (data);

CREATE INDEX IF NOT EXISTS idx_agendamento_leads_telefone
  ON public.agendamento_leads (telefone);

CREATE INDEX IF NOT EXISTS idx_agendamento_leads_created_by_user_id
  ON public.agendamento_leads (created_by_user_id);

CREATE INDEX IF NOT EXISTS idx_agendamento_leads_status
  ON public.agendamento_leads (status);

DROP POLICY IF EXISTS "Users can view all agendamento leads" ON public.agendamento_leads;
DROP POLICY IF EXISTS "Users can create agendamento leads" ON public.agendamento_leads;
DROP POLICY IF EXISTS "Users can update agendamento leads" ON public.agendamento_leads;
DROP POLICY IF EXISTS "Users can delete agendamento leads" ON public.agendamento_leads;

DROP POLICY IF EXISTS "agendamento_leads_select_public" ON public.agendamento_leads;
DROP POLICY IF EXISTS "agendamento_leads_insert_public" ON public.agendamento_leads;
DROP POLICY IF EXISTS "agendamento_leads_update_public" ON public.agendamento_leads;
DROP POLICY IF EXISTS "agendamento_leads_delete_public" ON public.agendamento_leads;

CREATE POLICY "agendamento_leads_select_public"
ON public.agendamento_leads
FOR SELECT
TO public
USING (true);

CREATE POLICY "agendamento_leads_insert_public"
ON public.agendamento_leads
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "agendamento_leads_update_public"
ON public.agendamento_leads
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "agendamento_leads_delete_public"
ON public.agendamento_leads
FOR DELETE
TO public
USING (true);

DROP TRIGGER IF EXISTS update_agendamento_leads_updated_at ON public.agendamento_leads;
CREATE TRIGGER update_agendamento_leads_updated_at
BEFORE UPDATE ON public.agendamento_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.agendamento_leads
TO anon, authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'agendamento_leads'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.agendamento_leads;
    END IF;
  END IF;
END
$$;

COMMIT;
