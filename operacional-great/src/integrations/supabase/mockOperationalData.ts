import operationalClientsCsv from './clientesOperacionais.csv?raw';
import pipelineClientsCsv from './pipelineClientesCompleto.csv?raw';
import creativesCsv from './criativos.csv?raw';

const PROFILE_IDS = {
  isaque: 'operacional-isaque-soares',
  gustavo: 'operacional-gustavo-lira',
  victoria: 'operacional-victoria-freitas',
  gerson: 'operacional-gerson-lopes',
  tchaka: 'operacional-matheus-tchaka',
  kauan: 'operacional-kauan-anderson',
  amanda: 'profile-amanda',
  taiwan: 'profile-taiwan',
  brayton: 'profile-brayton',
} as const;

type CsvRow = Record<string, string>;
type PipelineClientRow = Record<string, unknown>;
type OperationalClientRow = Record<string, unknown>;

const CLIENT_BASE = {
  plan: 'MENSAL',
  team_id: 'equipe-7',
  activated_at: null,
  activated_by: null,
  onboarding_start_at: null,
  onboarding_done_at: null,
  onboarding_stage: 'PROCESSO_START_CONCLUIDO',
  briefing_completed_at: null,
  stage_trafego: null,
  stage_atendimento: null,
  stage_marketing: null,
  commercial_id: null,
  creative_source: 'Criativos Great',
  churn_status: null,
  churn_reason: null,
  churn_responsible_team_id: null,
  churn_date: null,
  renewal_status: null,
  renewal_date: null,
  renewal_responsible_team_id: null,
  renewal_due_date: null,
  pagador_anuncio: 'CLIENTE',
  client_tier: 'POPULAR',
  pacote: 'TRAFEGO_E_CRIATIVOS',
  ad_account_name: null,
  has_recharge: false,
  recharge_value: null,
  start_meeting_date: null,
  nps_sent: false,
  nps_answered: false,
  status_updated_at: null,
};

const PLAN_MAP: Record<string, string> = {
  '30_DIAS': 'MENSAL',
  '90_DIAS': 'TRIMESTRAL',
  '90_MRR': 'TRIMESTRAL',
  '180_DIAS': 'SEMESTRAL',
  'MENSAL': 'MENSAL',
  'TRIMESTRAL': 'TRIMESTRAL',
  'SEMESTRAL': 'SEMESTRAL',
};

const PIPELINE_HEADERS = {
  clientName: 'Nome',
  clinicName: 'Cl\u00EDnica',
  phone: 'Telefone',
  seller: 'Vendedor',
  creative: 'Criativo',
  team: 'Equipe',
  revenue: 'Faturamento',
  package: 'Pacote',
  period: 'Per\u00EDodo',
  referral: 'Indica\u00E7\u00E3o',
  entryValue: 'Entrada (R$)',
  entryDate: 'Data Entrada',
  stage: 'Etapa',
  lastStageChange: '\u00DAltima Mudan\u00E7a Etapa',
  lostReason: 'Motivo Perda',
  noShowReason: 'Motivo No Show',
  notes: 'Observa\u00E7\u00F5es',
  scheduledBy: 'Agendado Por',
  adPayer: 'Pagador An\u00FAncio',
  hasPartner: 'Tem S\u00F3cio',
  hasMarketing: 'Tem MKT',
  hasSecretary: 'Tem Secret\u00E1ria',
  meetingDate: 'Data Reuni\u00E3o',
  meetingTime: 'Hora Reuni\u00E3o',
  createdAt: 'Criado Em',
} as const;

const PROFILE_NAME_TO_ID: Record<string, string> = {
  isaque: PROFILE_IDS.isaque,
  'isaque soares': PROFILE_IDS.isaque,
  gustavo: PROFILE_IDS.gustavo,
  'gustavo lira': PROFILE_IDS.gustavo,
  victoria: PROFILE_IDS.victoria,
  'victoria freitas': PROFILE_IDS.victoria,
  gerson: PROFILE_IDS.gerson,
  'gerson lopes': PROFILE_IDS.gerson,
  tchaka: PROFILE_IDS.tchaka,
  matheus: PROFILE_IDS.tchaka,
  'matheus tchaka': PROFILE_IDS.tchaka,
  kauan: PROFILE_IDS.kauan,
  'kauan anderson': PROFILE_IDS.kauan,
  amanda: PROFILE_IDS.amanda,
  taiwan: PROFILE_IDS.taiwan,
  brayton: PROFILE_IDS.brayton,
  'brayton maycon': PROFILE_IDS.brayton,
};

const PIPELINE_STAGE_MAP: Record<string, string> = {
  'NOVO LEAD': 'NOVO',
  'NO SHOW': 'NO_SHOW',
  'TAXA DE INTERESSE': 'TAXA_INTERESSE',
  'NEGOCIACAO': 'NEGOCIACAO',
  'NEGOCIA\u00C7\u00C3O': 'NEGOCIACAO',
  'PERDIDO': 'PERDIDO',
  'FECHADO': 'FECHADO',
};

const PIPELINE_STAGE_SCORE: Record<string, number> = {
  FECHADO: 5,
  NEGOCIACAO: 4,
  TAXA_INTERESSE: 3,
  NOVO: 2,
  NO_SHOW: 1,
  PERDIDO: 0,
};

function parseDelimitedLine(line: string, delimiter = ',') {
  const values: string[] = [];
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
  if (['f', 'false', '0', 'nao', 'n\u00E3o', 'no'].includes(normalized)) return false;
  return null;
}

function parseDate(value: string | null | undefined) {
  const normalized = emptyToNull(value);
  if (!normalized) return null;

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseDateOnly(value: string | null | undefined) {
  const iso = parseDate(value);
  return iso ? iso.slice(0, 10) : null;
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

function normalizeClientName(value: string | null | undefined) {
  return normalizeText(value)
    .replace(/^[~]+/, '')
    .replace(/[^\w\s/+-]/g, '')
    .trim();
}

function slugify(value: string | null | undefined) {
  const normalized = normalizeClientName(value);
  return normalized.replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '') || 'cliente';
}

function normalizePlan(value: string | null | undefined) {
  const normalized = emptyToNull(value)?.toUpperCase();
  if (!normalized) return CLIENT_BASE.plan;
  return PLAN_MAP[normalized] ?? CLIENT_BASE.plan;
}

function normalizePipelineStage(value: string | null | undefined) {
  const normalized = emptyToNull(value)?.toUpperCase();
  if (!normalized) return 'NOVO';
  return PIPELINE_STAGE_MAP[normalized] ?? 'NOVO';
}

function normalizeOperationalTeamId(teamValue: string | null | undefined) {
  const normalized = normalizeText(teamValue);
  if (!normalized) return CLIENT_BASE.team_id;
  if (normalized === 'tropa de elite' || normalized === '38c9028d-856d-481e-95c9-bb2eb8b459f5') return 'tropa-de-elite';
  if (normalized === 'equipe 7' || normalized === '0469e3aa-5b34-42e2-b89d-f412efaa27ba') return 'equipe-7';
  return CLIENT_BASE.team_id;
}

function labelForTeam(teamValue: string | null | undefined) {
  const normalizedId = normalizeOperationalTeamId(teamValue);
  return normalizedId === 'tropa-de-elite' ? 'Tropa de Elite' : 'Equipe 7';
}

function profileIdByName(value: string | null | undefined) {
  const normalized = normalizeClientName(value);
  return PROFILE_NAME_TO_ID[normalized] ?? null;
}

function toDataUrl(contentType: string, content: string) {
  return `data:${contentType};charset=UTF-8,${encodeURIComponent(content)}`;
}

function createTextAsset(title: string, body: string) {
  return toDataUrl('text/plain', `${title}\n\n${body}`);
}

function client<T extends Record<string, unknown>>(data: T): typeof CLIENT_BASE & T {
  return { ...CLIENT_BASE, ...data };
}

function pickEarlierDate(...values: Array<string | null | undefined>) {
  const validValues = values.filter((value): value is string => Boolean(value)).sort();
  return validValues[0] ?? null;
}

function pickLaterDate(...values: Array<string | null | undefined>) {
  const validValues = values.filter((value): value is string => Boolean(value)).sort();
  return validValues[validValues.length - 1] ?? null;
}

function parseImageUrls(value: string | null | undefined, fallbackImageUrl: string | null | undefined) {
  const normalized = emptyToNull(value);
  if (normalized) {
    try {
      const parsed = JSON.parse(normalized);
      if (Array.isArray(parsed)) {
        const urls = parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
        if (urls.length > 0) return urls;
      }
    } catch {
      // Ignore malformed JSON and fall back to the single image URL.
    }
  }

  const fallback = emptyToNull(fallbackImageUrl);
  return fallback ? [fallback] : [];
}

function collectNameKeys(...values: Array<string | null | undefined>) {
  const keys = new Set<string>();

  values.forEach((value) => {
    const normalized = normalizeClientName(value);
    if (!normalized) return;

    keys.add(normalized);

    normalized
      .split(/[\/|-]/)
      .map((part) => part.trim())
      .filter((part) => part.length >= 4)
      .forEach((part) => keys.add(part));
  });

  return Array.from(keys);
}

function shouldReplaceOperationalRow(existingRow: CsvRow, candidateRow: CsvRow) {
  const getStatusScore = (row: CsvRow) => {
    const status = emptyToNull(row.status_operacional)?.toUpperCase();
    if (status === 'ATIVO') return 3;
    if (status === 'ONBOARDING') return 2;
    if (status === 'NOVO_CLIENTE') return 1;
    return 0;
  };

  const statusDelta = getStatusScore(candidateRow) - getStatusScore(existingRow);
  if (statusDelta !== 0) return statusDelta > 0;

  const existingTimestamp = parseDate(existingRow.updated_at) ?? parseDate(existingRow.created_at) ?? '';
  const candidateTimestamp = parseDate(candidateRow.updated_at) ?? parseDate(candidateRow.created_at) ?? '';
  return candidateTimestamp > existingTimestamp;
}

function mapPipelineStageToOperationalStatus(stage: string) {
  if (stage === 'FECHADO') return 'NOVO_CLIENTE';
  if (stage === 'PERDIDO' || stage === 'NO_SHOW') return 'ENCERRADO';
  return 'NOVO_CLIENTE';
}

function mapPipelineStageToOnboardingStage(stage: string) {
  if (stage === 'FECHADO') return 'CONTRATO';
  if (stage === 'PERDIDO' || stage === 'NO_SHOW') return 'ENCERRADO';
  return 'CONTRATO';
}

function parseOperationalClientsCsv(csvContent: string) {
  const rows = parseDelimitedCsv(csvContent, ',');
  const dedupedRows = new Map<string, CsvRow>();

  rows.forEach((row) => {
    const nameKey = normalizeClientName(row.client_name);
    if (!nameKey) return;

    const existingRow = dedupedRows.get(nameKey);
    if (!existingRow || shouldReplaceOperationalRow(existingRow, row)) {
      dedupedRows.set(nameKey, row);
    }
  });

  return Array.from(dedupedRows.values()).map((row) => {
    const createdAt = parseDate(row.created_at) ?? parseDate(row.updated_at) ?? '2026-04-01T00:00:00.000Z';
    const updatedAt = parseDate(row.updated_at) ?? createdAt;
    const teamId = normalizeOperationalTeamId(row.team_name);
    const renewalStatus = emptyToNull(row.renewal_status);
    const churnStatus = emptyToNull(row.churn_status);

    return client({
      id: row.id.trim(),
      client_name: emptyToNull(row.client_name) ?? 'Cliente sem nome',
      clinic_name: emptyToNull(row.clinic_name),
      plan: normalizePlan(row.plan),
      pacote: emptyToNull(row.pacote) ?? CLIENT_BASE.pacote,
      client_tier: emptyToNull(row.client_tier),
      deal_value: parseNumber(row.deal_value) ?? 0,
      recharge_value: parseNumber(row.recharge_value),
      has_recharge: parseBool(row.has_recharge) ?? false,
      ad_account_name: emptyToNull(row.ad_account_name),
      pagador_anuncio: emptyToNull(row.pagador_anuncio) ?? CLIENT_BASE.pagador_anuncio,
      creative_source: emptyToNull(row.creative_source) ?? CLIENT_BASE.creative_source,
      commercial_id: emptyToNull(row.commercial_id),
      status_operacional: emptyToNull(row.status_operacional),
      onboarding_stage: emptyToNull(row.onboarding_stage) ?? CLIENT_BASE.onboarding_stage,
      stage_marketing: emptyToNull(row.stage_marketing),
      stage_trafego: emptyToNull(row.stage_trafego),
      stage_atendimento: emptyToNull(row.stage_atendimento),
      team_id: teamId,
      team_name: emptyToNull(row.team_name) ?? labelForTeam(teamId),
      gestor: emptyToNull(row.gestor),
      atendente: emptyToNull(row.atendente),
      designer: emptyToNull(row.designer),
      editor_video: emptyToNull(row.editor_video),
      start_meeting_date: parseDateOnly(row.start_meeting_date),
      onboarding_start_at: parseDate(row.onboarding_start_at),
      onboarding_done_at: parseDate(row.onboarding_done_at),
      activated_at: parseDate(row.activated_at),
      activated_by: parseDate(row.activated_at) ? PROFILE_IDS.isaque : null,
      renewal_due_date: parseDate(row.renewal_due_date),
      renewal_date: parseDate(row.renewal_date),
      renewal_status: renewalStatus,
      renewal_responsible_team_id: renewalStatus ? teamId : null,
      churn_date: parseDate(row.churn_date),
      churn_status: churnStatus,
      churn_reason: emptyToNull(row.churn_reason),
      churn_responsible_team_id: churnStatus ? teamId : null,
      nps_sent: parseBool(row.nps_sent) ?? false,
      nps_answered: parseBool(row.nps_answered) ?? false,
      created_at: createdAt,
      updated_at: updatedAt,
      status_updated_at: updatedAt,
    });
  });
}

function parsePipelineClientsCsv(csvContent: string) {
  const rows = parseDelimitedCsv(csvContent, ';');

  return rows.map((row, index) => {
    const stage = normalizePipelineStage(row[PIPELINE_HEADERS.stage]);
    const createdAt =
      parseDate(row[PIPELINE_HEADERS.createdAt]) ??
      parseDate(row[PIPELINE_HEADERS.entryDate]) ??
      `2026-04-01T00:00:${String(index).padStart(2, '0')}.000Z`;
    const updatedAt = parseDate(row[PIPELINE_HEADERS.lastStageChange]) ?? createdAt;
    const clientName =
      emptyToNull(row[PIPELINE_HEADERS.clientName]) ??
      emptyToNull(row[PIPELINE_HEADERS.clinicName]) ??
      `Lead ${index + 1}`;
    const clinicName = emptyToNull(row[PIPELINE_HEADERS.clinicName]) ?? clientName;

    return {
      id: `pipeline-${String(index + 1).padStart(4, '0')}-${slugify(clientName)}`,
      ativo: stage !== 'PERDIDO',
      client_name: clientName,
      clinic_name: clinicName,
      telefone: emptyToNull(row[PIPELINE_HEADERS.phone]),
      vendedor: emptyToNull(row[PIPELINE_HEADERS.seller]),
      criativo: (emptyToNull(row[PIPELINE_HEADERS.creative]) ?? 'NAO_IDENTIFICADO').toUpperCase(),
      equipe: emptyToNull(row[PIPELINE_HEADERS.team]),
      faturamento: emptyToNull(row[PIPELINE_HEADERS.revenue]) ?? 'NAO_INFORMADO',
      pacote: emptyToNull(row[PIPELINE_HEADERS.package]) ?? 'COMPLETO',
      periodo: normalizePlan(row[PIPELINE_HEADERS.period]),
      indicacao: emptyToNull(row[PIPELINE_HEADERS.referral]) ?? 'NAO',
      entrada: parseNumber(row[PIPELINE_HEADERS.entryValue]) ?? 0,
      data_entrada: parseDate(row[PIPELINE_HEADERS.entryDate]) ?? createdAt,
      stage,
      last_stage_change: parseDate(row[PIPELINE_HEADERS.lastStageChange]),
      lost_reason: emptyToNull(row[PIPELINE_HEADERS.lostReason]),
      no_show_reason: emptyToNull(row[PIPELINE_HEADERS.noShowReason]),
      notes: emptyToNull(row[PIPELINE_HEADERS.notes]),
      agendado_por: emptyToNull(row[PIPELINE_HEADERS.scheduledBy]),
      pagador_anuncio: emptyToNull(row[PIPELINE_HEADERS.adPayer]),
      tem_socio: emptyToNull(row[PIPELINE_HEADERS.hasPartner]),
      tem_mkt: emptyToNull(row[PIPELINE_HEADERS.hasMarketing]),
      tem_secretaria: emptyToNull(row[PIPELINE_HEADERS.hasSecretary]),
      meeting_date: parseDateOnly(row[PIPELINE_HEADERS.meetingDate]),
      meeting_time: emptyToNull(row[PIPELINE_HEADERS.meetingTime]),
      created_by_user_id: PROFILE_IDS.brayton,
      created_at: createdAt,
      updated_at: updatedAt,
    };
  });
}

function shouldReplacePipelineMatch(existingRow: PipelineClientRow, candidateRow: PipelineClientRow) {
  const existingStageScore = PIPELINE_STAGE_SCORE[String(existingRow.stage)] ?? 0;
  const candidateStageScore = PIPELINE_STAGE_SCORE[String(candidateRow.stage)] ?? 0;

  if (existingStageScore !== candidateStageScore) {
    return candidateStageScore > existingStageScore;
  }

  const existingTimestamp = String(existingRow.updated_at ?? existingRow.created_at ?? '');
  const candidateTimestamp = String(candidateRow.updated_at ?? candidateRow.created_at ?? '');
  return candidateTimestamp > existingTimestamp;
}

function buildPipelineLookup(rows: PipelineClientRow[]) {
  const lookup = new Map<string, PipelineClientRow>();

  rows.forEach((row) => {
    collectNameKeys(String(row.client_name ?? ''), String(row.clinic_name ?? '')).forEach((key) => {
      const existingRow = lookup.get(key);
      if (!existingRow || shouldReplacePipelineMatch(existingRow, row)) {
        lookup.set(key, row);
      }
    });
  });

  return lookup;
}

const pipelineClients = parsePipelineClientsCsv(pipelineClientsCsv);
const pipelineLookup = buildPipelineLookup(pipelineClients);
const creativeCsvRows = parseDelimitedCsv(creativesCsv, ',');

function findPipelineMatch(clientName: string | null | undefined, clinicName: string | null | undefined) {
  const exactKeys = collectNameKeys(clientName, clinicName);

  for (const key of exactKeys) {
    const exactMatch = pipelineLookup.get(key);
    if (exactMatch) return exactMatch;
  }

  for (const key of exactKeys) {
    const partialMatch = pipelineClients.find((row) =>
      collectNameKeys(String(row.client_name ?? ''), String(row.clinic_name ?? '')).some(
        (rowKey) => rowKey.includes(key) || key.includes(rowKey),
      ),
    );
    if (partialMatch) return partialMatch;
  }

  return null;
}

function mergePipelineIntoOperationalClient(baseClient: OperationalClientRow, pipelineRow: PipelineClientRow | null) {
  if (!pipelineRow) return baseClient;

  const pipelineCreatedAt = String(pipelineRow.created_at ?? '');
  const pipelineUpdatedAt = String(pipelineRow.updated_at ?? pipelineCreatedAt);
  const existingCreatedAt = String(baseClient.created_at ?? '');
  const existingUpdatedAt = String(baseClient.updated_at ?? existingCreatedAt);
  const pipelineTeamId = normalizeOperationalTeamId(String(pipelineRow.equipe ?? ''));

  return {
    ...baseClient,
    clinic_name: baseClient.clinic_name ?? pipelineRow.clinic_name ?? null,
    deal_value: Number(baseClient.deal_value ?? 0) || Number(pipelineRow.entrada ?? 0) || 0,
    pacote: baseClient.pacote ?? pipelineRow.pacote ?? CLIENT_BASE.pacote,
    commercial_id: baseClient.commercial_id ?? pipelineRow.id ?? null,
    pagador_anuncio: baseClient.pagador_anuncio ?? pipelineRow.pagador_anuncio ?? CLIENT_BASE.pagador_anuncio,
    creative_source:
      baseClient.creative_source && baseClient.creative_source !== CLIENT_BASE.creative_source
        ? baseClient.creative_source
        : pipelineRow.criativo ?? CLIENT_BASE.creative_source,
    start_meeting_date: baseClient.start_meeting_date ?? pipelineRow.meeting_date ?? null,
    team_id: baseClient.team_id ?? pipelineTeamId,
    team_name: baseClient.team_name ?? labelForTeam(String(pipelineRow.equipe ?? '')),
    telefone: pipelineRow.telefone ?? null,
    vendedor: pipelineRow.vendedor ?? null,
    faturamento: pipelineRow.faturamento ?? null,
    indicacao: pipelineRow.indicacao ?? null,
    notes: pipelineRow.notes ?? null,
    agendado_por: pipelineRow.agendado_por ?? null,
    meeting_time: pipelineRow.meeting_time ?? null,
    created_at: pickEarlierDate(existingCreatedAt, pipelineCreatedAt) ?? existingCreatedAt,
    updated_at: pickLaterDate(existingUpdatedAt, pipelineUpdatedAt) ?? existingUpdatedAt,
    status_updated_at: pickLaterDate(String(baseClient.status_updated_at ?? ''), pipelineUpdatedAt) ?? pipelineUpdatedAt,
  };
}

function createOperationalClientFromPipeline(pipelineRow: PipelineClientRow) {
  const createdAt = String(pipelineRow.created_at ?? '2026-04-01T00:00:00.000Z');
  const updatedAt = String(pipelineRow.updated_at ?? createdAt);
  const teamId = normalizeOperationalTeamId(String(pipelineRow.equipe ?? ''));
  const status = mapPipelineStageToOperationalStatus(String(pipelineRow.stage ?? 'NOVO'));

  return client({
    id: `seed-operational-${slugify(String(pipelineRow.client_name ?? pipelineRow.clinic_name ?? 'cliente'))}`,
    client_name: String(pipelineRow.client_name ?? 'Cliente sem nome'),
    clinic_name: String(pipelineRow.clinic_name ?? pipelineRow.client_name ?? ''),
    plan: normalizePlan(String(pipelineRow.periodo ?? CLIENT_BASE.plan)),
    deal_value: Number(pipelineRow.entrada ?? 0),
    status_operacional: status,
    onboarding_stage: mapPipelineStageToOnboardingStage(String(pipelineRow.stage ?? 'NOVO')),
    commercial_id: String(pipelineRow.id),
    pagador_anuncio: String(pipelineRow.pagador_anuncio ?? CLIENT_BASE.pagador_anuncio),
    team_id: teamId,
    team_name: labelForTeam(String(pipelineRow.equipe ?? '')),
    pacote: String(pipelineRow.pacote ?? CLIENT_BASE.pacote),
    creative_source: String(pipelineRow.criativo ?? CLIENT_BASE.creative_source),
    start_meeting_date: String(pipelineRow.meeting_date ?? '') || null,
    telefone: pipelineRow.telefone ?? null,
    vendedor: pipelineRow.vendedor ?? null,
    faturamento: pipelineRow.faturamento ?? null,
    indicacao: pipelineRow.indicacao ?? null,
    notes: pipelineRow.notes ?? null,
    agendado_por: pipelineRow.agendado_por ?? null,
    meeting_time: pipelineRow.meeting_time ?? null,
    created_at: createdAt,
    updated_at: updatedAt,
    status_updated_at: updatedAt,
  });
}

function createOperationalClientFromCreative(creativeRow: CsvRow, pipelineRow: PipelineClientRow | null) {
  const createdAt = parseDate(creativeRow.created_at) ?? String(pipelineRow?.created_at ?? '2026-04-01T00:00:00.000Z');
  const updatedAt = parseDate(creativeRow.updated_at) ?? String(pipelineRow?.updated_at ?? createdAt);
  const creativeStatus = emptyToNull(creativeRow.status)?.toUpperCase();

  return client({
    id: `seed-creative-client-${slugify(creativeRow.client_name || creativeRow.clinic_name || creativeRow.id)}`,
    client_name: emptyToNull(creativeRow.client_name) ?? emptyToNull(creativeRow.clinic_name) ?? 'Cliente sem nome',
    clinic_name: emptyToNull(creativeRow.clinic_name) ?? String(pipelineRow?.clinic_name ?? ''),
    plan: normalizePlan(String(pipelineRow?.periodo ?? CLIENT_BASE.plan)),
    deal_value: Number(pipelineRow?.entrada ?? 0),
    status_operacional:
      creativeStatus === 'ATIVO'
        ? 'ATIVO'
        : pipelineRow
          ? mapPipelineStageToOperationalStatus(String(pipelineRow.stage ?? 'NOVO'))
          : 'ONBOARDING',
    onboarding_stage:
      creativeStatus === 'ATIVO'
        ? 'ATIVO'
        : pipelineRow
          ? mapPipelineStageToOnboardingStage(String(pipelineRow.stage ?? 'NOVO'))
          : 'CRIATIVOS_EM_PRODUCAO',
    activated_at: creativeStatus === 'ATIVO' ? parseDate(creativeRow.completed_at) ?? updatedAt : null,
    activated_by: creativeStatus === 'ATIVO' ? profileIdByName(creativeRow.completed_by_name) ?? PROFILE_IDS.isaque : null,
    commercial_id: pipelineRow?.id ?? null,
    pagador_anuncio: String(pipelineRow?.pagador_anuncio ?? CLIENT_BASE.pagador_anuncio),
    team_id: normalizeOperationalTeamId(String(pipelineRow?.equipe ?? '')),
    team_name: labelForTeam(String(pipelineRow?.equipe ?? '')),
    pacote: String(pipelineRow?.pacote ?? CLIENT_BASE.pacote),
    creative_source: String(pipelineRow?.criativo ?? CLIENT_BASE.creative_source),
    start_meeting_date: String(pipelineRow?.meeting_date ?? '') || null,
    telefone: pipelineRow?.telefone ?? null,
    vendedor: pipelineRow?.vendedor ?? null,
    faturamento: pipelineRow?.faturamento ?? null,
    indicacao: pipelineRow?.indicacao ?? null,
    notes: pipelineRow?.notes ?? null,
    agendado_por: pipelineRow?.agendado_por ?? null,
    meeting_time: pipelineRow?.meeting_time ?? null,
    created_at: createdAt,
    updated_at: updatedAt,
    status_updated_at: updatedAt,
  });
}

function findOperationalClient(
  clientMap: Map<string, OperationalClientRow>,
  clientName: string | null | undefined,
  clinicName: string | null | undefined,
) {
  const keys = collectNameKeys(clientName, clinicName);

  for (const key of keys) {
    const exactMatch = clientMap.get(key);
    if (exactMatch) return exactMatch;
  }

  const values = Array.from(clientMap.values());
  for (const key of keys) {
    const partialMatch = values.find((row) =>
      collectNameKeys(String(row.client_name ?? ''), String(row.clinic_name ?? '')).some(
        (rowKey) => rowKey.includes(key) || key.includes(rowKey),
      ),
    );
    if (partialMatch) return partialMatch;
  }

  return null;
}

function buildOperationalClients() {
  const baseClients = parseOperationalClientsCsv(operationalClientsCsv);
  const finalClients = new Map<string, OperationalClientRow>();

  const setClient = (clientRow: OperationalClientRow) => {
    const key = normalizeClientName(String(clientRow.client_name ?? clientRow.clinic_name ?? clientRow.id));
    if (key) finalClients.set(key, clientRow);
  };

  baseClients.forEach((baseClient) => {
    const pipelineRow = findPipelineMatch(String(baseClient.client_name ?? ''), String(baseClient.clinic_name ?? ''));
    setClient(mergePipelineIntoOperationalClient(baseClient, pipelineRow));
  });

  pipelineClients
    .filter((row) => String(row.stage) === 'FECHADO')
    .forEach((pipelineRow) => {
      const existing = findOperationalClient(finalClients, String(pipelineRow.client_name ?? ''), String(pipelineRow.clinic_name ?? ''));
      if (!existing) {
        setClient(createOperationalClientFromPipeline(pipelineRow));
      }
    });

  creativeCsvRows.forEach((creativeRow) => {
    const existing = findOperationalClient(finalClients, creativeRow.client_name, creativeRow.clinic_name);
    if (!existing) {
      setClient(createOperationalClientFromCreative(creativeRow, findPipelineMatch(creativeRow.client_name, creativeRow.clinic_name)));
    }
  });

  return Array.from(finalClients.values()).sort((left, right) =>
    String(right.updated_at ?? '').localeCompare(String(left.updated_at ?? '')),
  );
}

const operationalClients = buildOperationalClients();

function requireClientId(clientName: string) {
  const clientEntry = operationalClients.find(
    (clientItem) => normalizeClientName(String(clientItem.client_name)) === normalizeClientName(clientName),
  );

  if (!clientEntry) {
    throw new Error(`Cliente nao encontrado nos seeds: ${clientName}`);
  }

  return String(clientEntry.id);
}

const clientLookup = new Map(
  operationalClients.map((clientItem) => [
    clientItem.id,
    {
      id: clientItem.id,
      client_name: clientItem.client_name,
      clinic_name: clientItem.clinic_name,
      team_id: clientItem.team_id,
    },
  ]),
);

const operationalClientMatchMap = new Map(
  operationalClients.map((clientItem) => [
    normalizeClientName(String(clientItem.client_name ?? clientItem.clinic_name ?? clientItem.id)),
    clientItem,
  ]),
);

function parseAdCreativesCsv(csvContent: string) {
  const rows = parseDelimitedCsv(csvContent, ',');

  return rows.map((row, index) => {
    const operationalClient = findOperationalClient(operationalClientMatchMap, row.client_name, row.clinic_name);
    const clientId =
      String(operationalClient?.id ?? `seed-creative-client-${slugify(row.client_name || row.clinic_name || row.id || String(index + 1))}`);
    const createdAt = parseDate(row.created_at) ?? '2026-04-01T00:00:00.000Z';
    const updatedAt = parseDate(row.updated_at) ?? createdAt;

    return {
      id: emptyToNull(row.id) ?? `seed-creative-${String(index + 1).padStart(4, '0')}`,
      client_id: clientId,
      client_name: emptyToNull(row.client_name) ?? String(operationalClient?.client_name ?? 'Cliente sem nome'),
      clinic_name: emptyToNull(row.clinic_name),
      image_url: emptyToNull(row.image_url),
      image_urls: parseImageUrls(row.image_urls, row.image_url),
      status: emptyToNull(row.status) ?? 'PARA_SUBIR',
      created_by_user_id: profileIdByName(row.created_by_name),
      created_by_name: emptyToNull(row.created_by_name),
      completed_by_user_id: profileIdByName(row.completed_by_name),
      completed_by_name: emptyToNull(row.completed_by_name),
      completed_at: parseDate(row.completed_at),
      created_at: createdAt,
      updated_at: updatedAt,
      operational_clients: operationalClient ? clientLookup.get(operationalClient.id) : null,
    };
  });
}

const adCreatives = parseAdCreativesCsv(creativesCsv);

function buildCreativeCatalog(rows: PipelineClientRow[]) {
  const uniqueNames = Array.from(
    new Set(
      rows
        .map((row) => emptyToNull(String(row.criativo ?? '')))
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toUpperCase()),
    ),
  ).sort((left, right) => left.localeCompare(right));

  return uniqueNames.map((name, index) => ({
    id: `seed-catalog-${String(index + 1).padStart(4, '0')}-${slugify(name)}`,
    name,
    is_active: true,
    created_by_user_id: PROFILE_IDS.brayton,
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
  }));
}

function buildClientActivityTracking(rows: Array<Record<string, unknown>>) {
  const grouped = new Map<string, Record<string, unknown>>();

  rows.forEach((row, index) => {
    const clientId = String(row.client_id ?? '');
    const createdAt = parseDate(String(row.created_at ?? '')) ?? '2026-04-01T00:00:00.000Z';
    const createdDate = new Date(createdAt);
    const designerName = emptyToNull(String(row.created_by_name ?? '')) ?? 'Equipe';
    const month = createdDate.getUTCMonth() + 1;
    const week = Math.max(1, Math.ceil(createdDate.getUTCDate() / 7));
    const key = [clientId, createdDate.getUTCFullYear(), month, week, designerName].join(':');
    const existing = grouped.get(key);

    if (existing) {
      existing.artes_count = Number(existing.artes_count ?? 0) + 1;
      existing.updated_at = createdAt;
      return;
    }

    grouped.set(key, {
      id: `seed-activity-${String(index + 1).padStart(4, '0')}`,
      client_id: clientId,
      year: createdDate.getUTCFullYear(),
      month,
      week,
      artes_count: 1,
      designer_name: designerName,
      created_by_user_id: row.created_by_user_id ?? null,
      created_at: createdAt,
      updated_at: createdAt,
      operational_clients: clientLookup.get(clientId) ?? null,
    });
  });

  return Array.from(grouped.values());
}

const clientActivityTracking = buildClientActivityTracking(adCreatives);

const crmEvents = [
  { id: 'seed-event-vitoria-renewal', client_id: requireClientId('Vitoria Pegan'), user_id: PROFILE_IDS.isaque, event_type: 'RENOVACAO_MENSAL', title: 'Cliente renovado', description: 'Renovacao fechada sem desconto adicional.', sale_value: 3100, resolved_at: null, created_at: '2026-04-15T14:20:00.000Z', updated_at: '2026-04-15T14:20:00.000Z' },
  { id: 'seed-event-paula-activation', client_id: requireClientId('Paula Holz'), user_id: PROFILE_IDS.isaque, event_type: 'ATIVACAO', title: 'Cliente ativado', description: 'Conta de anuncios conectada e campanha no ar.', sale_value: null, resolved_at: null, created_at: '2026-04-15T18:06:00.000Z', updated_at: '2026-04-15T18:06:00.000Z' },
  { id: 'seed-event-rodrigo-meeting', client_id: requireClientId('RODRIGO/COSOF'), user_id: PROFILE_IDS.gustavo, event_type: 'REUNIAO_TRAFEGO', title: 'Alinhamento de oferta', description: 'Definida linha criativa com foco em consulta de avaliacao.', sale_value: null, resolved_at: null, created_at: '2026-04-16T15:10:00.000Z', updated_at: '2026-04-16T15:10:00.000Z' },
  { id: 'seed-event-daniela-sale', client_id: requireClientId('DANIELA MEURER'), user_id: PROFILE_IDS.gerson, event_type: 'VENDA_OPERACIONAL', title: 'Upgrade de pacote', description: 'Cliente aprovou escopo completo com reforco de atendimento.', sale_value: 3200, resolved_at: null, created_at: '2026-04-17T11:45:00.000Z', updated_at: '2026-04-17T11:45:00.000Z' },
];

const clientFiles = [
  { id: 'seed-file-daniela', client_id: requireClientId('DANIELA MEURER'), file_name: 'briefing-daniela-meurer.txt', file_url: createTextAsset('Briefing Daniela Meurer', 'Objetivo: captar procedimentos premium com foco em harmonizacao e botox.'), file_type: 'text/plain', file_size: 120, uploaded_by_user_id: PROFILE_IDS.victoria, created_at: '2026-04-17T10:20:00.000Z' },
  { id: 'seed-file-rodrigo', client_id: requireClientId('RODRIGO/COSOF'), file_name: 'oferta-rodrigo-cosof.txt', file_url: createTextAsset('Oferta Rodrigo / COSOF', 'Oferta validada: consulta + procedimento parcelado em 12x.'), file_type: 'text/plain', file_size: 98, uploaded_by_user_id: PROFILE_IDS.gustavo, created_at: '2026-04-16T16:50:00.000Z' },
  { id: 'seed-file-paula', client_id: requireClientId('Paula Holz'), file_name: 'guideline-paula-holz.txt', file_url: createTextAsset('Guideline Paula Holz', 'Campanha ativa de rejuvenescimento com CTA para avaliacao.'), file_type: 'text/plain', file_size: 92, uploaded_by_user_id: PROFILE_IDS.isaque, created_at: '2026-04-15T16:15:00.000Z' },
];

const clientStartFormResponses = [
  { id: 'seed-form-daniela', client_id: requireClientId('DANIELA MEURER'), instagram_login: '@danielameurer', facebook_login: 'daniela.meurer.ads', nome_empresa: 'Clinica Daniela Meurer', responsavel_projeto: 'Daniela Meurer', produtos_servicos: 'Harmonizacao facial, botox e preenchimento', publico_alvo: 'Mulheres de 28 a 55 anos', ticket_medio: 'R$ 1.800 a R$ 3.500', valor_meta_ads: 'R$ 120 por dia', submitted_by_user_id: PROFILE_IDS.victoria, created_at: '2026-04-17T10:10:00.000Z', updated_at: '2026-04-17T10:10:00.000Z' },
  { id: 'seed-form-rodrigo', client_id: requireClientId('RODRIGO/COSOF'), instagram_login: '@cosof.oficial', facebook_login: 'cosof.business', nome_empresa: 'COSOF', responsavel_projeto: 'Rodrigo', produtos_servicos: 'Procedimentos esteticos faciais', publico_alvo: 'Publico interessado em harmonizacao e lifting labial', ticket_medio: 'R$ 990 a R$ 2.400', valor_meta_ads: 'R$ 80 por dia', submitted_by_user_id: PROFILE_IDS.gustavo, created_at: '2026-04-13T12:15:00.000Z', updated_at: '2026-04-16T15:10:00.000Z' },
  { id: 'seed-form-paula', client_id: requireClientId('Paula Holz'), instagram_login: '@paulaholz.face', facebook_login: 'paula.holz.meta', nome_empresa: 'Paula Holz Rejuvenescimento', responsavel_projeto: 'Paula Holz', produtos_servicos: 'Rejuvenescimento facial, colo e maos', publico_alvo: 'Mulheres 35+', ticket_medio: 'R$ 1.500 a R$ 4.200', valor_meta_ads: 'R$ 150 por dia', submitted_by_user_id: PROFILE_IDS.isaque, created_at: '2026-04-15T12:30:00.000Z', updated_at: '2026-04-15T12:30:00.000Z' },
];

const profiles = [
  { id: PROFILE_IDS.isaque, email: 'isaquegreatsd@gmail.com', full_name: 'Isaque Soares', is_active: true, avatar_url: null, operational_role: 'ATENDENTE', commercial_role: null, team_id: 'equipe-7', is_admin: false },
  { id: PROFILE_IDS.gustavo, email: 'gugaliraclash@gmail.com', full_name: 'Gustavo Lira', is_active: true, avatar_url: null, operational_role: 'ATENDENTE', commercial_role: null, team_id: 'equipe-7', is_admin: false },
  { id: PROFILE_IDS.victoria, email: 'freitasviih00@gmail.com', full_name: 'Victoria Freitas', is_active: true, avatar_url: null, operational_role: 'ATENDENTE', commercial_role: null, team_id: 'equipe-7', is_admin: false },
  { id: PROFILE_IDS.gerson, email: 'gersonlopesgreat@gmail.com', full_name: 'Gerson Lopes', is_active: true, avatar_url: null, operational_role: 'ATENDENTE', commercial_role: null, team_id: 'equipe-7', is_admin: false },
  { id: PROFILE_IDS.tchaka, email: 'ocdremex@gmail.com', full_name: 'Matheus Tchaka', is_active: true, avatar_url: null, operational_role: 'ATENDENTE', commercial_role: null, team_id: 'equipe-7', is_admin: false },
  { id: PROFILE_IDS.kauan, email: 'kauananderson1919@gmail.com', full_name: 'Kauan Anderson', is_active: true, avatar_url: null, operational_role: 'ATENDENTE', commercial_role: null, team_id: 'equipe-7', is_admin: false },
  { id: PROFILE_IDS.amanda, email: 'amanda.operacional@great.local', full_name: 'Amanda Great', is_active: true, avatar_url: null, operational_role: 'EDITOR_VIDEO', commercial_role: null, team_id: 'equipe-7', is_admin: false },
  { id: PROFILE_IDS.taiwan, email: 'taiwan.operacional@great.local', full_name: 'Taiwan', is_active: true, avatar_url: null, operational_role: 'DESIGN', commercial_role: null, team_id: 'equipe-7', is_admin: false },
  { id: PROFILE_IDS.brayton, email: 'brayton.operacional@great.local', full_name: 'Brayton Maycon', is_active: true, avatar_url: null, operational_role: 'GESTOR', commercial_role: null, team_id: 'equipe-7', is_admin: false },
];

const creativeCatalog = buildCreativeCatalog(pipelineClients);

export const MOCK_OPERATIONAL_SEED_VERSION = 'operacional-pipeline-criativos-v3';

export const MOCK_OPERATIONAL_SEED = {
  profiles,
  pipeline_clients: pipelineClients,
  criativos: creativeCatalog,
  operational_clients: operationalClients,
  ad_creatives: adCreatives,
  crm_events: crmEvents,
  client_files: clientFiles,
  client_start_form_responses: clientStartFormResponses,
  client_activity_tracking: clientActivityTracking,
};
