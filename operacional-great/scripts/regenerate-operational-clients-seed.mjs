import fs from 'node:fs/promises';

const inputPath = 'C:/great-operacional/operacional-great/src/integrations/supabase/clientesOperacionais.csv';

function parseDelimitedLine(line, delimiter = ',') {
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

function parseCsv(content) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.replace(/\uFEFF/g, ''))
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return [];

  const headers = parseDelimitedLine(lines[0], ',');
  return lines.slice(1).map((line) => {
    const values = parseDelimitedLine(line, ',');
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {});
  });
}

function slugify(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0000-\u001F]/g, '')
    .trim()
    .toLowerCase()
    .replace(/^[~]+/, '')
    .replace(/[^\w\s/+-]/g, '')
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'cliente';
}

function parseDateOnly(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return '';

  const match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!match) return '';

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function mapStatus(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return 'ATIVO';
  if (normalized.includes('avaliacao') || normalized.includes('analise')) return 'EM_ATIVACAO';
  if (normalized.includes('ativo')) return 'ATIVO';
  if (normalized.includes('encerr')) return 'ENCERRADO';
  if (normalized.includes('paus')) return 'PAUSADO';
  return normalized.toUpperCase().replace(/\s+/g, '_');
}

function onboardingStageForStatus(status) {
  return status === 'EM_ATIVACAO' ? 'CONTRATO' : 'ATIVO';
}

function mapTier(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized || normalized === '-' || normalized === 'n/a' || normalized === 'na') return '';
  if (normalized.includes('popular')) return 'POPULAR';
  if (normalized.includes('premium')) return 'PREMIUM';
  return String(value ?? '').trim().toUpperCase();
}

function teamIdForName(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'equipe 7' || normalized === 'equipe-7') return '0469e3aa-5b34-42e2-b89d-f412efaa27ba';
  if (normalized === 'tropa de elite' || normalized === 'tropa-de-elite') return '38c9028d-856d-481e-95c9-bb2eb8b459f5';
  return '';
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

const headers = [
  'id',
  'client_name',
  'clinic_name',
  'plan',
  'pacote',
  'client_tier',
  'deal_value',
  'recharge_value',
  'has_recharge',
  'ad_account_name',
  'pagador_anuncio',
  'creative_source',
  'commercial_id',
  'status_operacional',
  'onboarding_stage',
  'stage_marketing',
  'stage_trafego',
  'stage_atendimento',
  'team_name',
  'team_id',
  'gestor',
  'atendente',
  'designer',
  'editor_video',
  'start_meeting_date',
  'onboarding_start_at',
  'onboarding_done_at',
  'activated_at',
  'renewal_due_date',
  'renewal_date',
  'renewal_status',
  'churn_date',
  'churn_status',
  'churn_reason',
  'nps_sent',
  'nps_answered',
  'created_at',
  'updated_at',
  'status_updated_at',
];

const raw = await fs.readFile(inputPath, 'utf8');
const rows = parseCsv(raw);

if (rows.length < 100) {
  throw new Error(`CSV source unexpectedly small: ${rows.length} rows`);
}

const outputRows = [headers.join(',')];

rows.forEach((row, index) => {
  const clientName = String(row.Cliente ?? '').trim() || `Cliente ${index + 1}`;
  const createdAt = parseDateOnly(row.Entrada);
  const status = mapStatus(row.Status);
  const teamName = String(row.Equipe ?? '').trim();
  const teamId = teamIdForName(teamName);

  const record = {
    id: `seed-operacional-${slugify(clientName)}-${String(index + 1).padStart(3, '0')}`,
    client_name: clientName,
    clinic_name: '',
    plan: 'MENSAL',
    pacote: String(row.Pacote ?? '').trim(),
    client_tier: mapTier(row.Tier),
    deal_value: '',
    recharge_value: '',
    has_recharge: 'false',
    ad_account_name: '',
    pagador_anuncio: 'CLIENTE',
    creative_source: 'Criativos Great',
    commercial_id: '',
    status_operacional: status,
    onboarding_stage: onboardingStageForStatus(status),
    stage_marketing: '',
    stage_trafego: '',
    stage_atendimento: '',
    team_name: teamName,
    team_id: teamId,
    gestor: '',
    atendente: '',
    designer: '',
    editor_video: '',
    start_meeting_date: '',
    onboarding_start_at: '',
    onboarding_done_at: '',
    activated_at: '',
    renewal_due_date: '',
    renewal_date: '',
    renewal_status: '',
    churn_date: '',
    churn_status: '',
    churn_reason: '',
    nps_sent: 'false',
    nps_answered: 'false',
    created_at: createdAt,
    updated_at: createdAt,
    status_updated_at: createdAt,
  };

  outputRows.push(headers.map((header) => csvEscape(record[header])).join(','));
});

await fs.writeFile(inputPath, `${outputRows.join('\n')}\n`, 'utf8');
console.log(`Rebuilt ${rows.length} operational clients into rich seed format.`);
