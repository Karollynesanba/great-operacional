import type { TablesInsert } from '@/integrations/supabase/types';

export type ImportTeam = {
  id: string;
  name: string;
};

export type ImportProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean | null;
};

export type ImportExistingClient = {
  id: string;
  client_name: string;
  clinic_name: string | null;
};

type CsvRow = Record<string, string>;

const TEAM_UUID_MAP: Record<string, string> = {
  'equipe 7': '0469e3aa-5b34-42e2-b89d-f412efaa27ba',
  'equipe-7': '0469e3aa-5b34-42e2-b89d-f412efaa27ba',
  '0469e3aa-5b34-42e2-b89d-f412efaa27ba': '0469e3aa-5b34-42e2-b89d-f412efaa27ba',
  'tropa de elite': '38c9028d-856d-481e-95c9-bb2eb8b459f5',
  'tropa-de-elite': '38c9028d-856d-481e-95c9-bb2eb8b459f5',
  '38c9028d-856d-481e-95c9-bb2eb8b459f5': '38c9028d-856d-481e-95c9-bb2eb8b459f5',
};

const PLAN_MAP: Record<string, string> = {
  '30_DIAS': 'MENSAL',
  '90_DIAS': 'TRIMESTRAL',
  '90_MRR': 'TRIMESTRAL',
  '180_DIAS': 'SEMESTRAL',
  MENSAL: 'MENSAL',
  TRIMESTRAL: 'TRIMESTRAL',
  SEMESTRAL: 'SEMESTRAL',
};

function parseDelimitedLine(line: string, delimiter = ',') {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
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

function parseDelimitedCsv(content: string, delimiter = ',') {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.replace(/\uFEFF/g, ''))
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return [] as CsvRow[];

  const headers = parseDelimitedLine(lines[0], delimiter);
  return lines.slice(1).map((line) => {
    const values = parseDelimitedLine(line, delimiter);
    return headers.reduce<CsvRow>((accumulator, header, index) => {
      accumulator[header] = values[index] ?? '';
      return accumulator;
    }, {});
  });
}

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeHeader(value: string | null | undefined) {
  return normalizeText(value)
    .replace(/[^a-z0-9_]+/g, '')
    .trim();
}

function getRowValue(row: CsvRow, ...possibleKeys: string[]) {
  const normalizedKeys = new Set(possibleKeys.map((key) => normalizeHeader(key)));

  for (const [key, value] of Object.entries(row)) {
    if (possibleKeys.includes(key)) return value;
    if (normalizedKeys.has(normalizeHeader(key))) return value;
  }

  return '';
}

function parseNumber(value: string | null | undefined) {
  const normalized = emptyToNull(value);
  if (!normalized) return null;
  const parsed = Number(normalized.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBool(value: string | null | undefined) {
  const normalized = emptyToNull(value)?.toLowerCase();
  if (!normalized) return null;
  if (['t', 'true', '1', 'sim', 'yes'].includes(normalized)) return true;
  if (['f', 'false', '0', 'nao', 'não', 'no'].includes(normalized)) return false;
  return null;
}

function parseDate(value: string | null | undefined) {
  const normalized = emptyToNull(value);
  if (!normalized) return null;

  const ddmmyy = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (ddmmyy) {
    const day = Number(ddmmyy[1]);
    const month = Number(ddmmyy[2]);
    const year = Number(ddmmyy[3].length === 2 ? `20${ddmmyy[3]}` : ddmmyy[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0000-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeClientKey(value: string | null | undefined) {
  return normalizeText(value).replace(/^[~]+/, '').replace(/[^\w\s/+-]/g, '').trim();
}

function normalizeOperationalStatus(value: string | null | undefined) {
  const normalized = normalizeText(value);

  if (!normalized) return 'ATIVO';
  if (['em avaliacao', 'em avaliacao.', 'avaliacao', 'em analise'].includes(normalized)) return 'EM_ATIVACAO';
  if (['ativo', 'ativa', 'active'].includes(normalized)) return 'ATIVO';
  if (['encerrado', 'encerrada', 'finalizado', 'finalizada', 'fechado'].includes(normalized)) return 'ENCERRADO';
  if (['pausado', 'paused', 'suspenso'].includes(normalized)) return 'PAUSADO';

  return normalized.toUpperCase().replace(/\s+/g, '_');
}

function normalizeClientTier(value: string | null | undefined) {
  const normalized = normalizeText(value);

  if (!normalized || normalized === '-' || normalized === 'n/a' || normalized === 'na') return null;
  if (normalized.includes('popular')) return 'POPULAR';
  if (normalized.includes('premium')) return 'PREMIUM';

  return (value ?? '').trim().toUpperCase() as 'PREMIUM' | 'POPULAR';
}

function deriveOnboardingStageFromStatus(status: string) {
  if (status === 'EM_ATIVACAO') return 'CONTRATO';
  if (status === 'ATIVO') return 'ATIVO';
  if (status === 'PAUSADO') return 'ATIVO';
  if (status === 'ENCERRADO') return 'ATIVO';
  return 'ATIVO';
}

function buildClientLookupKeys(client: Pick<ImportExistingClient, 'client_name' | 'clinic_name'>) {
  const keys = new Set<string>();
  const clientName = normalizeClientKey(client.client_name);
  const clinicName = normalizeClientKey(client.clinic_name);
  if (clientName) keys.add(clientName);
  if (clinicName) keys.add(clinicName);
  return keys;
}

function buildProfileLookup(profiles: ImportProfile[]) {
  const lookup = new Map<string, string>();

  profiles.forEach((profile) => {
    const fullName = normalizeText(profile.full_name);
    const email = normalizeText(profile.email);
    if (fullName) lookup.set(fullName, profile.id);
    if (email) lookup.set(email, profile.id);
  });

  return lookup;
}

function buildTeamLookup(teams: ImportTeam[]) {
  const lookup = new Map<string, string>();
  teams.forEach((team) => {
    const key = normalizeText(team.name);
    if (key) lookup.set(key, team.id);
    lookup.set(team.id.toLowerCase(), team.id);
  });
  return lookup;
}

function resolveProfileId(value: string | null | undefined, profileLookup: Map<string, string>) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  return profileLookup.get(normalized) ?? null;
}

function resolveTeamId(value: string | null | undefined, teamLookup: Map<string, string>) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  return TEAM_UUID_MAP[normalized] ?? teamLookup.get(normalized) ?? null;
}

function normalizePlan(value: string | null | undefined) {
  const normalized = emptyToNull(value)?.toUpperCase();
  if (!normalized) return null;
  return PLAN_MAP[normalized] ?? null;
}

function findExistingClientId(existingClients: ImportExistingClient[], clientName: string, clinicName: string | null) {
  const searchKeys = buildClientLookupKeys({ client_name: clientName, clinic_name: clinicName });
  for (const client of existingClients) {
    const existingKeys = buildClientLookupKeys(client);
    for (const key of searchKeys) {
      if (existingKeys.has(key)) return client.id;
    }
  }
  return null;
}

export function parseOperationalClientsCsv(
  csvContent: string,
  teams: ImportTeam[],
  profiles: ImportProfile[],
  existingClients: ImportExistingClient[],
) {
  const rows = parseDelimitedCsv(csvContent, ',');
  const teamLookup = buildTeamLookup(teams);
  const profileLookup = buildProfileLookup(profiles);

  const payloads = rows.map((row, index) => {
    const clientName = emptyToNull(getRowValue(row, 'client_name', 'Cliente', 'cliente')) ?? `Cliente ${index + 1}`;
    const clinicName = emptyToNull(getRowValue(row, 'clinic_name', 'Clínica', 'Clinica'));
    const existingId = findExistingClientId(existingClients, clientName, clinicName);
    const createdAt = parseDate(getRowValue(row, 'created_at', 'Entrada', 'entrada')) ?? new Date().toISOString();
    const updatedAt = parseDate(getRowValue(row, 'updated_at', 'Atualizado em', 'atualizado_em')) ?? createdAt;
    const rechargeValue = parseNumber(getRowValue(row, 'recharge_value', 'recharge', 'recarga'));
    const statusOperational = normalizeOperationalStatus(getRowValue(row, 'status_operacional', 'Status', 'status'));
    const onboardingStage = emptyToNull(getRowValue(row, 'onboarding_stage', 'Etapa', 'etapa'))
      ?? deriveOnboardingStageFromStatus(statusOperational);

    const payload: TablesInsert<'operational_clients'> = {
      id: existingId ?? crypto.randomUUID(),
      client_name: clientName,
      clinic_name: clinicName,
      status_operacional: statusOperational,
      onboarding_stage: onboardingStage,
      pacote: emptyToNull(getRowValue(row, 'pacote', 'Pacote', 'pacote_plano')),
      plan: normalizePlan(getRowValue(row, 'plan', 'Plano', 'plano')),
      deal_value: parseNumber(getRowValue(row, 'deal_value', 'Valor', 'valor')),
      recharge_value: rechargeValue,
      team_id: resolveTeamId(getRowValue(row, 'team', 'team_name', 'team_id', 'Equipe', 'equipe'), teamLookup),
      assigned_gestor_id: resolveProfileId(getRowValue(row, 'gestor', 'Gestor', 'manager'), profileLookup),
      assigned_atendente_id: resolveProfileId(getRowValue(row, 'atendente', 'Atendente'), profileLookup),
      assigned_design_id: resolveProfileId(getRowValue(row, 'designer', 'Design', 'Designer'), profileLookup),
      assigned_editor_video_id: resolveProfileId(getRowValue(row, 'editor_video', 'Editor de Vídeo', 'Editor Video'), profileLookup),
      client_tier: normalizeClientTier(getRowValue(row, 'client_tier', 'Tier', 'tier')),
      pagador_anuncio: emptyToNull(getRowValue(row, 'pagador_anuncio', 'Pagador'),),
      ad_account_name: emptyToNull(getRowValue(row, 'ad_account_name', 'Conta de anúncio', 'Conta de Anúncio')),
      creative_source: emptyToNull(getRowValue(row, 'creative_source', 'Origem', 'origem')),
      stage_trafego: emptyToNull(getRowValue(row, 'stage_trafego', 'Tráfego', 'trafego')) ?? 'NAO_INICIADO',
      stage_atendimento: emptyToNull(getRowValue(row, 'stage_atendimento', 'Atendimento', 'atendimento')) ?? 'NAO_INICIADO',
      stage_marketing: emptyToNull(getRowValue(row, 'stage_marketing', 'Marketing', 'marketing')) ?? 'NAO_INICIADO',
      start_meeting_date: parseDate(getRowValue(row, 'start_meeting_date', 'start_meeting', 'Reunião', 'reuniao')),
      activated_at: parseDate(getRowValue(row, 'activated_at', 'Ativado em', 'ativado_em')),
      onboarding_start_at: parseDate(getRowValue(row, 'onboarding_start_at', 'onboarding_start', 'Inicio Onboarding')),
      onboarding_done_at: parseDate(getRowValue(row, 'onboarding_done_at', 'onboarding_done', 'Fim Onboarding')),
      churn_status: emptyToNull(getRowValue(row, 'churn_status', 'Churn Status', 'churn')),
      churn_reason: emptyToNull(getRowValue(row, 'churn_reason', 'Motivo Churn', 'motivo_churn')),
      churn_date: parseDate(getRowValue(row, 'churn_date', 'Data Churn', 'data_churn')),
      renewal_status: emptyToNull(getRowValue(row, 'renewal_status', 'Renewal Status', 'renovacao_status')),
      renewal_date: parseDate(getRowValue(row, 'renewal_date', 'Data Renovação', 'data_renovacao')),
      renewal_due_date: parseDate(getRowValue(row, 'renewal_due_date', 'Renovação Prevista', 'renovacao_prevista')),
      nps_sent: parseBool(getRowValue(row, 'nps_sent', 'NPS Enviado', 'nps_enviado')),
      nps_answered: parseBool(getRowValue(row, 'nps_answered', 'NPS Respondido', 'nps_respondido')),
      has_recharge: rechargeValue !== null ? rechargeValue > 0 : null,
      status_updated_at: updatedAt,
      created_at: createdAt,
      updated_at: updatedAt,
    };

    return payload;
  });

  return payloads;
}
