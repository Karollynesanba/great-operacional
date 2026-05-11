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
  return teamLookup.get(normalized) ?? null;
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
    const clientName = emptyToNull(row.client_name) ?? `Cliente ${index + 1}`;
    const clinicName = emptyToNull(row.clinic_name);
    const existingId = findExistingClientId(existingClients, clientName, clinicName);
    const createdAt = parseDate(row.created_at) ?? new Date().toISOString();
    const updatedAt = parseDate(row.updated_at) ?? createdAt;
    const rechargeValue = parseNumber(row.recharge_value);

    const payload: TablesInsert<'operational_clients'> = {
      id: existingId ?? crypto.randomUUID(),
      client_name: clientName,
      clinic_name: clinicName,
      status_operacional: emptyToNull(row.status_operacional) ?? 'ATIVO',
      onboarding_stage: emptyToNull(row.onboarding_stage) ?? 'ATIVO',
      pacote: emptyToNull(row.pacote),
      plan: emptyToNull(row.plan),
      deal_value: parseNumber(row.deal_value),
      recharge_value: rechargeValue,
      team_id: resolveTeamId(row.team, teamLookup),
      assigned_gestor_id: resolveProfileId(row.gestor, profileLookup),
      assigned_atendente_id: resolveProfileId(row.atendente, profileLookup),
      assigned_design_id: resolveProfileId(row.designer, profileLookup),
      assigned_editor_video_id: resolveProfileId(row.editor_video, profileLookup),
      client_tier: (emptyToNull(row.client_tier) as TablesInsert<'operational_clients'>['client_tier']) ?? null,
      pagador_anuncio: emptyToNull(row.pagador_anuncio),
      ad_account_name: emptyToNull(row.ad_account_name),
      creative_source: emptyToNull(row.creative_source),
      stage_trafego: emptyToNull(row.stage_trafego) ?? 'NAO_INICIADO',
      stage_atendimento: emptyToNull(row.stage_atendimento) ?? 'NAO_INICIADO',
      stage_marketing: emptyToNull(row.stage_marketing) ?? 'NAO_INICIADO',
      start_meeting_date: parseDate(row.start_meeting_date),
      activated_at: parseDate(row.activated_at),
      onboarding_start_at: parseDate(row.onboarding_start_at),
      onboarding_done_at: parseDate(row.onboarding_done_at),
      churn_status: emptyToNull(row.churn_status),
      churn_reason: emptyToNull(row.churn_reason),
      churn_date: parseDate(row.churn_date),
      renewal_status: emptyToNull(row.renewal_status),
      renewal_date: parseDate(row.renewal_date),
      renewal_due_date: parseDate(row.renewal_due_date),
      nps_sent: parseBool(row.nps_sent),
      nps_answered: parseBool(row.nps_answered),
      has_recharge: rechargeValue !== null ? rechargeValue > 0 : null,
      status_updated_at: updatedAt,
      created_at: createdAt,
      updated_at: updatedAt,
    };

    return payload;
  });

  return payloads;
}
