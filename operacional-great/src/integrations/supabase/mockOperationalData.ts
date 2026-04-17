import clientsCsv from './clientesOperacionais.csv?raw';

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

type OperationalCsvRow = Record<string, string>;

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
  MENSAL: 'MENSAL',
};

function parseCsvLine(line: string) {
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

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseNumber(value: string | null | undefined) {
  const normalized = emptyToNull(value);
  if (!normalized) return null;

  const parsed = Number(normalized.replace(',', '.'));
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

function parseDateOnly(value: string | null | undefined) {
  const iso = parseDate(value);
  return iso ? iso.slice(0, 10) : null;
}

function normalizeClientName(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizePlan(value: string | null | undefined) {
  const normalized = emptyToNull(value)?.toUpperCase();
  if (!normalized) return CLIENT_BASE.plan;
  return PLAN_MAP[normalized] ?? normalized;
}

function teamNameToId(teamName: string | null | undefined) {
  const normalized = emptyToNull(teamName)?.toLowerCase();
  if (normalized === 'tropa de elite') return 'tropa-de-elite';
  if (normalized === 'equipe 7') return 'equipe-7';
  return CLIENT_BASE.team_id;
}

function toDataUrl(contentType: string, content: string) {
  return `data:${contentType};charset=UTF-8,${encodeURIComponent(content)}`;
}

function createCreativeImage(title: string, accent: string, subtitle: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720"><defs><linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="60%" stop-color="${accent}"/><stop offset="100%" stop-color="#f8fafc"/></linearGradient></defs><rect width="1200" height="720" fill="url(#bg)"/><circle cx="1020" cy="120" r="120" fill="rgba(255,255,255,0.18)"/><circle cx="130" cy="610" r="170" fill="rgba(255,255,255,0.12)"/><rect x="70" y="72" width="220" height="38" rx="19" fill="#dc2626"/><text x="180" y="98" text-anchor="middle" font-size="24" font-family="Arial, sans-serif" fill="#ffffff">Great Assessoria</text><text x="70" y="290" font-size="82" font-family="Arial, sans-serif" font-weight="700" fill="#ffffff">${title}</text><text x="70" y="360" font-size="34" font-family="Arial, sans-serif" fill="#f8fafc">${subtitle}</text><rect x="70" y="420" width="320" height="74" rx="18" fill="#ffffff"/><text x="230" y="468" text-anchor="middle" font-size="34" font-family="Arial, sans-serif" font-weight="700" fill="#111827">Ver resultado real</text></svg>`;
  return toDataUrl('image/svg+xml', svg);
}

function createTextAsset(title: string, body: string) {
  return toDataUrl('text/plain', `${title}\n\n${body}`);
}

function client<T extends Record<string, unknown>>(data: T): typeof CLIENT_BASE & T {
  return { ...CLIENT_BASE, ...data };
}

function shouldReplaceClientRow(existingRow: OperationalCsvRow, candidateRow: OperationalCsvRow) {
  const getStatusScore = (row: OperationalCsvRow) => {
    const status = emptyToNull(row.status_operacional)?.toUpperCase();
    if (status === 'ATIVO') return 2;
    if (status === 'ONBOARDING') return 1;
    return 0;
  };

  const existingScore = getStatusScore(existingRow);
  const candidateScore = getStatusScore(candidateRow);
  if (candidateScore !== existingScore) return candidateScore > existingScore;

  const existingTimestamp = parseDate(existingRow.updated_at) ?? parseDate(existingRow.created_at) ?? '';
  const candidateTimestamp = parseDate(candidateRow.updated_at) ?? parseDate(candidateRow.created_at) ?? '';
  return candidateTimestamp > existingTimestamp;
}

function parseOperationalClientsCsv(csvContent: string) {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]);
  const dedupedRows = new Map<string, OperationalCsvRow>();

  lines.slice(1).forEach((line) => {
    const cells = parseCsvLine(line);
    const row = headers.reduce<OperationalCsvRow>((accumulator, header, index) => {
      accumulator[header] = cells[index] ?? '';
      return accumulator;
    }, {});

    const nameKey = normalizeClientName(row.client_name);
    if (!nameKey) return;

    const existingRow = dedupedRows.get(nameKey);
    if (!existingRow || shouldReplaceClientRow(existingRow, row)) {
      dedupedRows.set(nameKey, row);
    }
  });

  return Array.from(dedupedRows.values()).map((row) => {
    const createdAt = parseDate(row.created_at) ?? parseDate(row.updated_at) ?? '2026-04-01T00:00:00.000Z';
    const updatedAt = parseDate(row.updated_at) ?? createdAt;
    const teamId = teamNameToId(row.team_name);
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
      team_name: emptyToNull(row.team_name),
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

const operationalClients = parseOperationalClientsCsv(clientsCsv);

function requireClientId(clientName: string) {
  const clientEntry = operationalClients.find(
    (clientItem) => normalizeClientName(clientItem.client_name as string) === normalizeClientName(clientName),
  );

  if (!clientEntry) {
    throw new Error(`Cliente nao encontrado no CSV: ${clientName}`);
  }

  return String(clientEntry.id);
}

const CLIENT_IDS = {
  daniela: requireClientId('DANIELA MEURER'),
  institutoSandra: requireClientId('INSTITUTO SANDRA'),
  jessica: requireClientId('JESSICA SILVA'),
  rodrigo: requireClientId('RODRIGO/COSOF'),
  vitoria: requireClientId('Vitoria Pegan'),
  gabriela: requireClientId('Gabriela Montanhal'),
  paula: requireClientId('Paula Holz'),
  camila: requireClientId('Camila Slomp'),
  matheus: requireClientId('Matheus Mota'),
} as const;

const clientLookup = new Map(operationalClients.map((client) => [client.id, { id: client.id, client_name: client.client_name, clinic_name: client.clinic_name, team_id: client.team_id }]));

const assets = {
  gabriela1: createCreativeImage('Gabriela Montanhal', '#f97316', 'Campanha de harmonizacao facial'),
  gabriela2: createCreativeImage('Reels de conversao', '#fb7185', 'Oferta validada para publico premium'),
  rodrigo1: createCreativeImage('RODRIGO / COSOF', '#ef4444', '12x de R$ 198 para leads qualificados'),
  rodrigo2: createCreativeImage('Lifting Labial', '#f59e0b', 'Antes e depois com CTA de consulta'),
  paula1: createCreativeImage('Paula Holz', '#22c55e', 'Campanha ativa com foco em rejuvenescimento'),
  paula2: createCreativeImage('Oferta de abril', '#16a34a', 'Colo e maos com condicao especial'),
  camila1: createCreativeImage('Camila Slomp', '#0ea5e9', 'Criativo ativo de antes e depois'),
  camila2: createCreativeImage('Resultado real', '#38bdf8', 'Campanha de face e rejuvenescimento'),
  matheus1: createCreativeImage('Matheus Mota', '#6366f1', 'Anuncio educativo para autoridade'),
  jessica1: createCreativeImage('Jessica Silva', '#e11d48', 'Criativo de trafego para agenda'),
};

const adCreatives = [
  { id: 'seed-creative-gabriela', client_id: CLIENT_IDS.gabriela, client_name: 'Gabriela Montanhal', image_url: assets.gabriela1, image_urls: [assets.gabriela1, assets.gabriela2], status: 'PARA_SUBIR', created_by_user_id: PROFILE_IDS.amanda, created_by_name: 'Amanda', completed_by_user_id: null, completed_by_name: null, completed_at: null, created_at: '2026-04-16T17:41:00.000Z', updated_at: '2026-04-16T17:41:00.000Z', operational_clients: clientLookup.get(CLIENT_IDS.gabriela) },
  { id: 'seed-creative-rodrigo', client_id: CLIENT_IDS.rodrigo, client_name: 'RODRIGO/COSOF', image_url: assets.rodrigo1, image_urls: [assets.rodrigo1, assets.rodrigo2], status: 'PARA_SUBIR', created_by_user_id: PROFILE_IDS.tchaka, created_by_name: 'Tchaka', completed_by_user_id: null, completed_by_name: null, completed_at: null, created_at: '2026-04-16T17:04:00.000Z', updated_at: '2026-04-16T17:04:00.000Z', operational_clients: clientLookup.get(CLIENT_IDS.rodrigo) },
  { id: 'seed-creative-matheus', client_id: CLIENT_IDS.matheus, client_name: 'Matheus Mota', image_url: assets.matheus1, image_urls: [assets.matheus1], status: 'PARA_SUBIR', created_by_user_id: PROFILE_IDS.tchaka, created_by_name: 'Tchaka', completed_by_user_id: null, completed_by_name: null, completed_at: null, created_at: '2026-04-14T13:22:00.000Z', updated_at: '2026-04-14T13:22:00.000Z', operational_clients: clientLookup.get(CLIENT_IDS.matheus) },
  { id: 'seed-creative-jessica', client_id: CLIENT_IDS.jessica, client_name: 'JESSICA SILVA', image_url: assets.jessica1, image_urls: [assets.jessica1], status: 'PARA_SUBIR', created_by_user_id: PROFILE_IDS.taiwan, created_by_name: 'Taiwan', completed_by_user_id: null, completed_by_name: null, completed_at: null, created_at: '2026-04-13T18:05:00.000Z', updated_at: '2026-04-13T18:05:00.000Z', operational_clients: clientLookup.get(CLIENT_IDS.jessica) },
  { id: 'seed-creative-paula', client_id: CLIENT_IDS.paula, client_name: 'Paula Holz', image_url: assets.paula1, image_urls: [assets.paula1, assets.paula2], status: 'ATIVO', created_by_user_id: PROFILE_IDS.tchaka, created_by_name: 'Tchaka', completed_by_user_id: PROFILE_IDS.isaque, completed_by_name: 'Isaque', completed_at: '2026-04-15T18:06:00.000Z', created_at: '2026-04-15T15:59:00.000Z', updated_at: '2026-04-15T18:06:00.000Z', operational_clients: clientLookup.get(CLIENT_IDS.paula) },
  { id: 'seed-creative-camila', client_id: CLIENT_IDS.camila, client_name: 'Camila Slomp', image_url: assets.camila1, image_urls: [assets.camila1, assets.camila2], status: 'ATIVO', created_by_user_id: PROFILE_IDS.tchaka, created_by_name: 'Tchaka', completed_by_user_id: PROFILE_IDS.isaque, completed_by_name: 'Isaque', completed_at: '2026-04-15T14:02:00.000Z', created_at: '2026-04-15T12:43:00.000Z', updated_at: '2026-04-15T14:02:00.000Z', operational_clients: clientLookup.get(CLIENT_IDS.camila) },
];

const crmEvents = [
  { id: 'seed-event-vitoria-renewal', client_id: CLIENT_IDS.vitoria, user_id: PROFILE_IDS.isaque, event_type: 'RENOVACAO_MENSAL', title: 'Cliente renovado', description: 'Renovacao fechada sem desconto adicional.', sale_value: 3100, resolved_at: null, created_at: '2026-04-15T14:20:00.000Z', updated_at: '2026-04-15T14:20:00.000Z' },
  { id: 'seed-event-paula-activation', client_id: CLIENT_IDS.paula, user_id: PROFILE_IDS.isaque, event_type: 'ATIVACAO', title: 'Cliente ativado', description: 'Conta de anuncios conectada e campanha no ar.', sale_value: null, resolved_at: null, created_at: '2026-04-15T18:06:00.000Z', updated_at: '2026-04-15T18:06:00.000Z' },
  { id: 'seed-event-rodrigo-meeting', client_id: CLIENT_IDS.rodrigo, user_id: PROFILE_IDS.gustavo, event_type: 'REUNIAO_TRAFEGO', title: 'Alinhamento de oferta', description: 'Definida linha criativa com foco em consulta de avaliacao.', sale_value: null, resolved_at: null, created_at: '2026-04-16T15:10:00.000Z', updated_at: '2026-04-16T15:10:00.000Z' },
  { id: 'seed-event-daniela-sale', client_id: CLIENT_IDS.daniela, user_id: PROFILE_IDS.gerson, event_type: 'VENDA_OPERACIONAL', title: 'Upgrade de pacote', description: 'Cliente aprovou escopo completo com reforco de atendimento.', sale_value: 3200, resolved_at: null, created_at: '2026-04-17T11:45:00.000Z', updated_at: '2026-04-17T11:45:00.000Z' },
];

const clientFiles = [
  { id: 'seed-file-daniela', client_id: CLIENT_IDS.daniela, file_name: 'briefing-daniela-meurer.txt', file_url: createTextAsset('Briefing Daniela Meurer', 'Objetivo: captar procedimentos premium com foco em harmonizacao e botox.'), file_type: 'text/plain', file_size: 120, uploaded_by_user_id: PROFILE_IDS.victoria, created_at: '2026-04-17T10:20:00.000Z' },
  { id: 'seed-file-rodrigo', client_id: CLIENT_IDS.rodrigo, file_name: 'oferta-rodrigo-cosof.txt', file_url: createTextAsset('Oferta Rodrigo / COSOF', 'Oferta validada: consulta + procedimento parcelado em 12x.'), file_type: 'text/plain', file_size: 98, uploaded_by_user_id: PROFILE_IDS.gustavo, created_at: '2026-04-16T16:50:00.000Z' },
  { id: 'seed-file-paula', client_id: CLIENT_IDS.paula, file_name: 'guideline-paula-holz.txt', file_url: createTextAsset('Guideline Paula Holz', 'Campanha ativa de rejuvenescimento com CTA para avaliacao.'), file_type: 'text/plain', file_size: 92, uploaded_by_user_id: PROFILE_IDS.isaque, created_at: '2026-04-15T16:15:00.000Z' },
];

const clientStartFormResponses = [
  { id: 'seed-form-daniela', client_id: CLIENT_IDS.daniela, instagram_login: '@danielameurer', facebook_login: 'daniela.meurer.ads', nome_empresa: 'Clinica Daniela Meurer', responsavel_projeto: 'Daniela Meurer', produtos_servicos: 'Harmonizacao facial, botox e preenchimento', publico_alvo: 'Mulheres de 28 a 55 anos', ticket_medio: 'R$ 1.800 a R$ 3.500', valor_meta_ads: 'R$ 120 por dia', submitted_by_user_id: PROFILE_IDS.victoria, created_at: '2026-04-17T10:10:00.000Z', updated_at: '2026-04-17T10:10:00.000Z' },
  { id: 'seed-form-rodrigo', client_id: CLIENT_IDS.rodrigo, instagram_login: '@cosof.oficial', facebook_login: 'cosof.business', nome_empresa: 'COSOF', responsavel_projeto: 'Rodrigo', produtos_servicos: 'Procedimentos esteticos faciais', publico_alvo: 'Publico interessado em harmonizacao e lifting labial', ticket_medio: 'R$ 990 a R$ 2.400', valor_meta_ads: 'R$ 80 por dia', submitted_by_user_id: PROFILE_IDS.gustavo, created_at: '2026-04-13T12:15:00.000Z', updated_at: '2026-04-16T15:10:00.000Z' },
  { id: 'seed-form-paula', client_id: CLIENT_IDS.paula, instagram_login: '@paulaholz.face', facebook_login: 'paula.holz.meta', nome_empresa: 'Paula Holz Rejuvenescimento', responsavel_projeto: 'Paula Holz', produtos_servicos: 'Rejuvenescimento facial, colo e maos', publico_alvo: 'Mulheres 35+', ticket_medio: 'R$ 1.500 a R$ 4.200', valor_meta_ads: 'R$ 150 por dia', submitted_by_user_id: PROFILE_IDS.isaque, created_at: '2026-04-15T12:30:00.000Z', updated_at: '2026-04-15T12:30:00.000Z' },
];

const clientActivityTracking = [
  { id: 'seed-activity-gabriela', client_id: CLIENT_IDS.gabriela, year: 2026, month: 4, week: 3, artes_count: 2, designer_name: 'Amanda', created_by_user_id: PROFILE_IDS.amanda, created_at: '2026-04-16T17:41:00.000Z', updated_at: '2026-04-16T17:41:00.000Z', operational_clients: clientLookup.get(CLIENT_IDS.gabriela) },
  { id: 'seed-activity-rodrigo', client_id: CLIENT_IDS.rodrigo, year: 2026, month: 4, week: 3, artes_count: 2, designer_name: 'Matheus', created_by_user_id: PROFILE_IDS.tchaka, created_at: '2026-04-16T17:04:00.000Z', updated_at: '2026-04-16T17:04:00.000Z', operational_clients: clientLookup.get(CLIENT_IDS.rodrigo) },
  { id: 'seed-activity-paula', client_id: CLIENT_IDS.paula, year: 2026, month: 4, week: 3, artes_count: 3, designer_name: 'Matheus', created_by_user_id: PROFILE_IDS.tchaka, created_at: '2026-04-15T15:59:00.000Z', updated_at: '2026-04-15T15:59:00.000Z', operational_clients: clientLookup.get(CLIENT_IDS.paula) },
  { id: 'seed-activity-jessica', client_id: CLIENT_IDS.jessica, year: 2026, month: 4, week: 2, artes_count: 1, designer_name: 'Taiwan', created_by_user_id: PROFILE_IDS.taiwan, created_at: '2026-04-13T18:05:00.000Z', updated_at: '2026-04-13T18:05:00.000Z', operational_clients: clientLookup.get(CLIENT_IDS.jessica) },
];

const profiles = [
  { id: PROFILE_IDS.isaque, email: 'isaquegreatsd@gmail.com', full_name: 'Isaque Soares', is_active: true, avatar_url: null, operational_role: 'ATENDENTE', commercial_role: null, team_id: 'equipe-7' },
  { id: PROFILE_IDS.gustavo, email: 'gugaliraclash@gmail.com', full_name: 'Gustavo Lira', is_active: true, avatar_url: null, operational_role: 'ATENDENTE', commercial_role: null, team_id: 'equipe-7' },
  { id: PROFILE_IDS.victoria, email: 'freitasviih00@gmail.com', full_name: 'Victoria Freitas', is_active: true, avatar_url: null, operational_role: 'ATENDENTE', commercial_role: null, team_id: 'equipe-7' },
  { id: PROFILE_IDS.gerson, email: 'gersonlopesgreat@gmail.com', full_name: 'Gerson Lopes', is_active: true, avatar_url: null, operational_role: 'ATENDENTE', commercial_role: null, team_id: 'equipe-7' },
  { id: PROFILE_IDS.tchaka, email: 'ocdremex@gmail.com', full_name: 'Matheus Tchaka', is_active: true, avatar_url: null, operational_role: 'ATENDENTE', commercial_role: null, team_id: 'equipe-7' },
  { id: PROFILE_IDS.kauan, email: 'kauananderson1919@gmail.com', full_name: 'Kauan Anderson', is_active: true, avatar_url: null, operational_role: 'ATENDENTE', commercial_role: null, team_id: 'equipe-7' },
  { id: PROFILE_IDS.amanda, email: 'amanda.operacional@great.local', full_name: 'Amanda', is_active: true, avatar_url: null, operational_role: 'DESIGN', commercial_role: null, team_id: 'equipe-7' },
  { id: PROFILE_IDS.taiwan, email: 'taiwan.operacional@great.local', full_name: 'Taiwan', is_active: true, avatar_url: null, operational_role: 'DESIGN', commercial_role: null, team_id: 'equipe-7' },
  { id: PROFILE_IDS.brayton, email: 'brayton.operacional@great.local', full_name: 'Brayton Maycon', is_active: true, avatar_url: null, operational_role: 'GESTOR', commercial_role: null, team_id: 'equipe-7' },
];

export const MOCK_OPERATIONAL_SEED_VERSION = 'operacional-clientes-csv-v2';

export const MOCK_OPERATIONAL_SEED = {
  profiles,
  operational_clients: operationalClients,
  ad_creatives: adCreatives,
  crm_events: crmEvents,
  client_files: clientFiles,
  client_start_form_responses: clientStartFormResponses,
  client_activity_tracking: clientActivityTracking,
};
