import fs from 'node:fs';
import path from 'node:path';

const time7CsvPath = 'C:/Users/karol/Downloads/EQUIPE TIME 7 - MAIO (3).csv';
const tropaCsvPath = 'C:/Users/karol/Downloads/EQUIPE TROPA DE ELITE - MAIO (3).csv';
const outputPath = path.resolve('operacional-great/supabase/seed_may2026_clients_with_crud.sql');

const TEAM_7_ID = '0469e3aa-5b34-42e2-b89d-f412efaa27ba';
const TROPA_ID = '38c9028d-856d-481e-95c9-bb2eb8b459f5';

function parseLine(line, delimiter = ',') {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0000-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function clean(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed ? trimmed : null;
}

function sqlString(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlBool(value) {
  if (value === true) return 'TRUE';
  if (value === false) return 'FALSE';
  return 'NULL';
}

function sqlNumber(value) {
  if (value === null || value === undefined || value === '') return 'NULL';
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/[R$\s.]/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed.toFixed(2) : 'NULL';
}

function parseDate(value) {
  const normalized = clean(value);
  if (!normalized) return null;

  const match = normalized.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3] ?? 2026);
    const fullYear = year < 100 ? 2000 + year : year;
    return new Date(Date.UTC(fullYear, month - 1, day)).toISOString();
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function sqlDate(value) {
  const parsed = parseDate(value);
  return parsed ? `'${parsed}'::timestamptz` : 'NULL';
}

function mapPlan(period) {
  const normalized = normalizeText(period).replace(/_/g, ' ');
  if (!normalized) return 'MENSAL';
  if (normalized.includes('30 dias') || normalized === 'mensal') return 'MENSAL';
  if (normalized.includes('90 dias') || normalized.includes('trimestral') || normalized.includes('90 mrr')) return 'TRIMESTRAL';
  if (normalized.includes('180 dias') || normalized.includes('semestral')) return 'SEMESTRAL';
  return normalized.toUpperCase();
}

function mapClientTier(rawClass) {
  const normalized = normalizeText(rawClass).toUpperCase();
  if (normalized.includes('CLASSE A') || normalized === 'A') return 'PREMIUM';
  if (normalized.includes('CLASSE B') || normalized.includes('CLASSE C') || normalized === 'B' || normalized === 'C') return 'POPULAR';
  return null;
}

function mapStatus(label, raw) {
  const candidate = clean(label) || clean(raw) || '';
  const normalized = normalizeText(candidate).toUpperCase();

  if (normalized.includes('ENCERR')) return 'ENCERRADO';
  if (normalized.includes('NAO ESTA ATIVO')) return 'ENCERRADO';
  if (normalized.includes('PAUS')) return 'PAUSADO';
  if (normalized.includes('PROCESSO DE START')) return 'EM_ATIVACAO';
  if (normalized.includes('FALTAM 2 DIAS') || normalized.includes('FALTAM 3 DIAS')) return 'ATIVO';
  if (normalized.includes('ULTIMOS 30 DIAS')) return 'ATIVO';
  if (normalized.includes('FOI COBRADO')) return 'ATIVO';
  if (normalized.includes('RENOVOU')) return 'ATIVO';
  if (normalized === 'SIM' || normalized.includes('ATIVO')) return 'ATIVO';
  if (normalized === 'NAO') return 'ENCERRADO';
  return 'ATIVO';
}

function onboardingStageFromStatus(status) {
  if (status === 'ATIVO') return 'ATIVO';
  if (status === 'EM_ATIVACAO') return 'ONBOARDING';
  return 'CONTRATO';
}

function profileResolver(name) {
  const cleaned = clean(name);
  if (!cleaned) return 'NULL';
  return `public.resolve_profile_id_by_name(${sqlString(cleaned)})`;
}

function readLines(filePath) {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.replace(/\uFEFF/g, ''))
    .filter((line) => line.trim().length > 0);
}

function buildRows() {
  const all = [];
  const seen = new Set();

  const addRow = (record) => {
    const key = normalizeText(record.client_name);
    if (!key || key === 'nome' || key === 'clientes') return;
    if (seen.has(key)) return;
    seen.add(key);
    all.push(record);
  };

  const time7Lines = readLines(time7CsvPath);
  for (const line of time7Lines.slice(2)) {
    const row = parseLine(line);
    const clientName = clean(row[1]);
    if (!clientName) continue;

    const status = mapStatus(row[11], row[0]);
    addRow({
      client_name: clientName,
      clinic_name: null,
      plan: mapPlan(row[3]),
      deal_value: 0,
      creative_source: 'Planilha Maio 2026',
      team_id: TEAM_7_ID,
      assigned_gestor_name: clean(row[6]),
      assigned_atendente_name: clean(row[7]),
      client_tier: mapClientTier(row[5]),
      pacote: clean(row[4]),
      pagador_anuncio: clean(row[2]) ?? 'CLIENTE',
      ad_account_name: clean(row[9]),
      status_operacional: status,
      onboarding_stage: onboardingStageFromStatus(status),
      stage_marketing: 'NAO_INICIADO',
      stage_trafego: 'NAO_INICIADO',
      stage_atendimento: 'NAO_INICIADO',
      start_meeting_date: null,
      activated_at: sqlDate(row[10]),
      onboarding_start_at: sqlDate(row[10]),
      onboarding_done_at: status === 'ATIVO' ? sqlDate(row[10]) : null,
      churn_status: null,
      churn_reason: null,
      churn_date: null,
      renewal_status: null,
      renewal_date: null,
      renewal_due_date: null,
      nps_sent: false,
      nps_answered: false,
      created_at: sqlDate(row[10]),
      updated_at: sqlDate(row[10]),
      status_updated_at: sqlDate(row[10]),
      commercial_id: null,
      recharge_value: null,
      has_recharge: false,
    });
  }

  const tropaLines = readLines(tropaCsvPath);
  for (const line of tropaLines.slice(2)) {
    const row = parseLine(line);
    const clientName = clean(row[1]);
    if (!clientName) continue;

    const status = mapStatus(row[12], row[0]);
    const activatedAtIso = parseDate(row[10]) || parseDate(row[9]) || null;

    addRow({
      client_name: clientName,
      clinic_name: null,
      plan: mapPlan(row[3]),
      deal_value: sqlNumber(row[8]),
      creative_source: 'Planilha Maio 2026',
      team_id: TROPA_ID,
      assigned_gestor_name: null,
      assigned_atendente_name: clean(row[6]),
      client_tier: mapClientTier(row[5]),
      pacote: clean(row[2]),
      pagador_anuncio: 'CLIENTE',
      ad_account_name: null,
      status_operacional: status,
      onboarding_stage: onboardingStageFromStatus(status),
      stage_marketing: 'NAO_INICIADO',
      stage_trafego: 'NAO_INICIADO',
      stage_atendimento: 'NAO_INICIADO',
      start_meeting_date: null,
      activated_at: activatedAtIso ? `'${activatedAtIso}'::timestamptz` : 'NULL',
      onboarding_start_at: activatedAtIso ? `'${activatedAtIso}'::timestamptz` : 'NULL',
      onboarding_done_at: status === 'ATIVO' && activatedAtIso ? `'${activatedAtIso}'::timestamptz` : null,
      churn_status: null,
      churn_reason: null,
      churn_date: null,
      renewal_status: null,
      renewal_date: null,
      renewal_due_date: null,
      nps_sent: false,
      nps_answered: false,
      created_at: activatedAtIso ? `'${activatedAtIso}'::timestamptz` : `'${new Date().toISOString()}'::timestamptz`,
      updated_at: activatedAtIso ? `'${activatedAtIso}'::timestamptz` : `'${new Date().toISOString()}'::timestamptz`,
      status_updated_at: activatedAtIso ? `'${activatedAtIso}'::timestamptz` : `'${new Date().toISOString()}'::timestamptz`,
      commercial_id: null,
      recharge_value: null,
      has_recharge: false,
    });
  }

  return all;
}

function buildSql(rows) {
  const nowIso = new Date().toISOString();
  const valuesRows = rows
    .map((row) =>
      `(${[
        'gen_random_uuid()',
        sqlString(row.client_name),
        sqlString(row.clinic_name),
        sqlString(row.plan),
        sqlNumber(row.deal_value),
        sqlString(row.creative_source),
        sqlString(row.team_id),
        profileResolver(row.assigned_gestor_name),
        profileResolver(row.assigned_atendente_name),
        'NULL',
        'NULL',
        sqlString(row.status_operacional),
        sqlString(row.onboarding_stage),
        sqlString(row.stage_marketing),
        sqlString(row.stage_trafego),
        sqlString(row.stage_atendimento),
        row.onboarding_start_at ?? 'NULL',
        row.onboarding_done_at ?? 'NULL',
        row.activated_at ?? 'NULL',
        sqlString(row.client_tier),
        sqlString(row.pacote),
        sqlString(row.pagador_anuncio),
        sqlString(row.ad_account_name),
        sqlBool(row.has_recharge),
        sqlNumber(row.recharge_value),
        sqlDate(row.start_meeting_date),
        sqlDate(row.renewal_due_date),
        sqlDate(row.renewal_date),
        sqlString(row.renewal_status),
        sqlDate(row.churn_date),
        sqlString(row.churn_status),
        sqlString(row.churn_reason),
        sqlBool(row.nps_sent),
        sqlBool(row.nps_answered),
        row.created_at ?? `'${nowIso}'::timestamptz`,
        row.updated_at ?? `'${nowIso}'::timestamptz`,
        row.status_updated_at ?? `'${nowIso}'::timestamptz`,
        sqlString(row.commercial_id),
      ].join(', ')})`
    )
    .join(',\n  ');

  return `-- Seed operational clients from the May 2026 spreadsheets.
-- Safe to re-run: the insert skips clients that already exist by name.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Teams needed by this seed
INSERT INTO public.teams (id, name)
VALUES
  ('${TEAM_7_ID}', 'Equipe 7'),
  ('${TROPA_ID}', 'Tropa de Elite')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Resolve profile ids by the names used in the spreadsheets.
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

-- Open CRUD for the client tables and the tables touched by client deletion.
ALTER TABLE IF EXISTS public.operational_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crm_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.client_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ad_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.client_activity_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exec_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crisis_manual_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exec_card_sync_blocks ENABLE ROW LEVEL SECURITY;

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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_clients TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "CRM events viewable by public" ON public.crm_events;
DROP POLICY IF EXISTS "CRM events insertable by public" ON public.crm_events;
DROP POLICY IF EXISTS "CRM events updatable by public" ON public.crm_events;
DROP POLICY IF EXISTS "CRM events deletable by public" ON public.crm_events;
CREATE POLICY "CRM events viewable by public" ON public.crm_events FOR SELECT TO public USING (true);
CREATE POLICY "CRM events insertable by public" ON public.crm_events FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "CRM events updatable by public" ON public.crm_events FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "CRM events deletable by public" ON public.crm_events FOR DELETE TO public USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_events TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Client files viewable by public" ON public.client_files;
DROP POLICY IF EXISTS "Client files insertable by public" ON public.client_files;
DROP POLICY IF EXISTS "Client files updatable by public" ON public.client_files;
DROP POLICY IF EXISTS "Client files deletable by public" ON public.client_files;
CREATE POLICY "Client files viewable by public" ON public.client_files FOR SELECT TO public USING (true);
CREATE POLICY "Client files insertable by public" ON public.client_files FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Client files updatable by public" ON public.client_files FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Client files deletable by public" ON public.client_files FOR DELETE TO public USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_files TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Ad creatives viewable by public" ON public.ad_creatives;
DROP POLICY IF EXISTS "Ad creatives insertable by public" ON public.ad_creatives;
DROP POLICY IF EXISTS "Ad creatives updatable by public" ON public.ad_creatives;
DROP POLICY IF EXISTS "Ad creatives deletable by public" ON public.ad_creatives;
CREATE POLICY "Ad creatives viewable by public" ON public.ad_creatives FOR SELECT TO public USING (true);
CREATE POLICY "Ad creatives insertable by public" ON public.ad_creatives FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Ad creatives updatable by public" ON public.ad_creatives FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Ad creatives deletable by public" ON public.ad_creatives FOR DELETE TO public USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_creatives TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Client activity tracking viewable by public" ON public.client_activity_tracking;
DROP POLICY IF EXISTS "Client activity tracking insertable by public" ON public.client_activity_tracking;
DROP POLICY IF EXISTS "Client activity tracking updatable by public" ON public.client_activity_tracking;
DROP POLICY IF EXISTS "Client activity tracking deletable by public" ON public.client_activity_tracking;
CREATE POLICY "Client activity tracking viewable by public" ON public.client_activity_tracking FOR SELECT TO public USING (true);
CREATE POLICY "Client activity tracking insertable by public" ON public.client_activity_tracking FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Client activity tracking updatable by public" ON public.client_activity_tracking FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Client activity tracking deletable by public" ON public.client_activity_tracking FOR DELETE TO public USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_activity_tracking TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Exec cards viewable by public" ON public.exec_cards;
DROP POLICY IF EXISTS "Exec cards insertable by public" ON public.exec_cards;
DROP POLICY IF EXISTS "Exec cards updatable by public" ON public.exec_cards;
DROP POLICY IF EXISTS "Exec cards deletable by public" ON public.exec_cards;
CREATE POLICY "Exec cards viewable by public" ON public.exec_cards FOR SELECT TO public USING (true);
CREATE POLICY "Exec cards insertable by public" ON public.exec_cards FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Exec cards updatable by public" ON public.exec_cards FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Exec cards deletable by public" ON public.exec_cards FOR DELETE TO public USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exec_cards TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Projects viewable by public" ON public.projects;
DROP POLICY IF EXISTS "Projects insertable by public" ON public.projects;
DROP POLICY IF EXISTS "Projects updatable by public" ON public.projects;
DROP POLICY IF EXISTS "Projects deletable by public" ON public.projects;
CREATE POLICY "Projects viewable by public" ON public.projects FOR SELECT TO public USING (true);
CREATE POLICY "Projects insertable by public" ON public.projects FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Projects updatable by public" ON public.projects FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Projects deletable by public" ON public.projects FOR DELETE TO public USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Crisis manual clients viewable by public" ON public.crisis_manual_clients;
DROP POLICY IF EXISTS "Crisis manual clients insertable by public" ON public.crisis_manual_clients;
DROP POLICY IF EXISTS "Crisis manual clients updatable by public" ON public.crisis_manual_clients;
DROP POLICY IF EXISTS "Crisis manual clients deletable by public" ON public.crisis_manual_clients;
CREATE POLICY "Crisis manual clients viewable by public" ON public.crisis_manual_clients FOR SELECT TO public USING (true);
CREATE POLICY "Crisis manual clients insertable by public" ON public.crisis_manual_clients FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Crisis manual clients updatable by public" ON public.crisis_manual_clients FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Crisis manual clients deletable by public" ON public.crisis_manual_clients FOR DELETE TO public USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crisis_manual_clients TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Exec card sync blocks viewable by public" ON public.exec_card_sync_blocks;
DROP POLICY IF EXISTS "Exec card sync blocks insertable by public" ON public.exec_card_sync_blocks;
DROP POLICY IF EXISTS "Exec card sync blocks updatable by public" ON public.exec_card_sync_blocks;
DROP POLICY IF EXISTS "Exec card sync blocks deletable by public" ON public.exec_card_sync_blocks;
CREATE POLICY "Exec card sync blocks viewable by public" ON public.exec_card_sync_blocks FOR SELECT TO public USING (true);
CREATE POLICY "Exec card sync blocks insertable by public" ON public.exec_card_sync_blocks FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Exec card sync blocks updatable by public" ON public.exec_card_sync_blocks FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Exec card sync blocks deletable by public" ON public.exec_card_sync_blocks FOR DELETE TO public USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exec_card_sync_blocks TO anon, authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.operational_clients';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Delete helper used by the CRM UI.
CREATE OR REPLACE FUNCTION public.delete_operational_client_cascade(p_client_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.client_activity_tracking WHERE client_id = p_client_id;
  DELETE FROM public.client_files WHERE client_id = p_client_id;
  DELETE FROM public.ad_creatives WHERE client_id = p_client_id;
  DELETE FROM public.crm_events WHERE client_id = p_client_id;
  DELETE FROM public.projects WHERE client_id = p_client_id;
  UPDATE public.exec_cards SET client_id = NULL WHERE client_id = p_client_id;
  DELETE FROM public.exec_card_sync_blocks WHERE client_id = p_client_id;
  DELETE FROM public.crisis_manual_clients WHERE source_operational_client_id = p_client_id::text OR id = p_client_id::text;
  DELETE FROM public.operational_clients WHERE id = p_client_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_operational_client_cascade(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_operational_client_cascade(UUID) TO anon, authenticated, service_role;

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
  v.id,
  v.commercial_id,
  v.client_name,
  v.clinic_name,
  v.plan,
  v.deal_value,
  v.creative_source,
  v.team_id,
  v.assigned_gestor_id,
  v.assigned_atendente_id,
  v.assigned_design_id,
  v.assigned_editor_video_id,
  v.status_operacional,
  v.onboarding_stage,
  v.stage_marketing,
  v.stage_trafego,
  v.stage_atendimento,
  v.onboarding_start_at,
  v.onboarding_done_at,
  v.activated_at,
  v.client_tier,
  v.pacote,
  v.pagador_anuncio,
  v.ad_account_name,
  v.has_recharge,
  v.recharge_value,
  v.start_meeting_date,
  v.renewal_due_date,
  v.renewal_date,
  v.renewal_status,
  v.churn_date,
  v.churn_status,
  v.churn_reason,
  v.nps_sent,
  v.nps_answered,
  v.created_at,
  v.updated_at,
  v.status_updated_at
FROM (VALUES
  ${valuesRows}
) AS v (
  id,
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
  status_updated_at,
  commercial_id
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.operational_clients oc
  WHERE lower(trim(coalesce(oc.client_name, ''))) = lower(trim(v.client_name))
);

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;

COMMIT;
`;
}

const rows = buildRows();
const sql = buildSql(rows);
fs.writeFileSync(outputPath, sql, 'utf8');
console.log(`Wrote ${rows.length} clients to ${outputPath}`);
