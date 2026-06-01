import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const inputPath = 'C:/Users/karol/Downloads/clientes_operacional.csv';
const outputPath = path.resolve('supabase/seed_operational_clients_from_csv.sql');

const TEAM_MAP = {
  'Equipe 7': '0469e3aa-5b34-42e2-b89d-f412efaa27ba',
  'Tropa de Elite': '38c9028d-856d-481e-95c9-bb2eb8b459f5',
};

const PLAN_MAP = {
  '30_DIAS': 'MENSAL',
  '90_DIAS': 'TRIMESTRAL',
  '90_MRR': 'TRIMESTRAL',
  '180_DIAS': 'SEMESTRAL',
  MENSAL: 'MENSAL',
  TRIMESTRAL: 'TRIMESTRAL',
  SEMESTRAL: 'SEMESTRAL',
};

function parseCsv(content) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.replace(/\uFEFF/g, ''))
    .filter((line) => line.trim().length > 0);

  if (!lines.length) return [];

  const parseLine = (line) => {
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

      if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
        continue;
      }

      current += char;
    }

    values.push(current);
    return values;
  };

  const headers = parseLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {});
  });
}

function emptyToNull(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed ? trimmed : null;
}

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlNumber(value) {
  const normalized = emptyToNull(value);
  if (!normalized) return 'null';
  const parsed = Number(normalized.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed.toFixed(2) : 'null';
}

function sqlBool(value) {
  const normalized = emptyToNull(value)?.toLowerCase();
  if (!normalized) return 'null';
  if (['t', 'true', '1', 'sim', 'yes'].includes(normalized)) return 'true';
  if (['f', 'false', '0', 'nao', 'não', 'no'].includes(normalized)) return 'false';
  return 'null';
}

function sqlDate(value) {
  const normalized = emptyToNull(value);
  if (!normalized) return 'null';
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return 'null';
  return `'${parsed.toISOString()}'::timestamptz`;
}

function generateStableUuid(row) {
  const source = [
    emptyToNull(row.client_name),
    emptyToNull(row.clinic_name),
    emptyToNull(row.created_at),
    emptyToNull(row.updated_at),
    emptyToNull(row.team),
  ]
    .filter(Boolean)
    .join('|')
    .trim() || crypto.randomUUID();

  const hex = crypto.createHash('sha1').update(source).digest('hex').slice(0, 32);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hex.slice(18, 20),
    hex.slice(20, 32),
  ].join('-');
}

function normalizePlan(value) {
  const normalized = emptyToNull(value)?.toUpperCase();
  if (!normalized) return 'null';
  return sqlString(PLAN_MAP[normalized] ?? null);
}

const csv = fs.readFileSync(inputPath, 'utf8');
const rows = parseCsv(csv);

const statements = [];
statements.push('-- Seed operational clients from clientes_operacional.csv');
statements.push("INSERT INTO public.teams (id, name) VALUES ('0469e3aa-5b34-42e2-b89d-f412efaa27ba', 'Equipe 7') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;");
statements.push("INSERT INTO public.teams (id, name) VALUES ('38c9028d-856d-481e-95c9-bb2eb8b459f5', 'Tropa de Elite') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;");

for (const row of rows) {
  const id = generateStableUuid(row);

  const teamName = emptyToNull(row.team);
  const teamId = teamName ? TEAM_MAP[teamName] ?? null : null;

  statements.push(`
INSERT INTO public.operational_clients (
  id,
  client_name,
  clinic_name,
  status_operacional,
  onboarding_stage,
  pacote,
  plan,
  deal_value,
  recharge_value,
  team_id,
  assigned_gestor_id,
  assigned_atendente_id,
  assigned_design_id,
  assigned_editor_video_id,
  client_tier,
  pagador_anuncio,
  ad_account_name,
  creative_source,
  stage_trafego,
  stage_atendimento,
  stage_marketing,
  start_meeting_date,
  activated_at,
  onboarding_start_at,
  onboarding_done_at,
  churn_status,
  churn_reason,
  churn_date,
  renewal_status,
  renewal_date,
  renewal_due_date,
  nps_sent,
  nps_answered,
  created_at,
  updated_at,
  status_updated_at
) VALUES (
  ${sqlString(id)},
  ${sqlString(emptyToNull(row.client_name))},
  ${sqlString(emptyToNull(row.clinic_name))},
  ${sqlString(emptyToNull(row.status_operacional) || 'ATIVO')},
  ${sqlString(emptyToNull(row.onboarding_stage) || 'ATIVO')},
  ${sqlString(emptyToNull(row.pacote))},
  ${normalizePlan(row.plan)},
  ${sqlNumber(row.deal_value)},
  ${sqlNumber(row.recharge_value)},
  ${sqlString(teamId)},
  null,
  null,
  null,
  null,
  ${sqlString(emptyToNull(row.client_tier))},
  ${sqlString(emptyToNull(row.pagador_anuncio))},
  ${sqlString(emptyToNull(row.ad_account_name))},
  ${sqlString(emptyToNull(row.creative_source))},
  ${sqlString(emptyToNull(row.stage_trafego) || 'NAO_INICIADO')},
  ${sqlString(emptyToNull(row.stage_atendimento) || 'NAO_INICIADO')},
  ${sqlString(emptyToNull(row.stage_marketing) || 'NAO_INICIADO')},
  ${sqlDate(row.start_meeting_date)},
  ${sqlDate(row.activated_at)},
  ${sqlDate(row.onboarding_start_at)},
  ${sqlDate(row.onboarding_done_at)},
  ${sqlString(emptyToNull(row.churn_status))},
  ${sqlString(emptyToNull(row.churn_reason))},
  ${sqlDate(row.churn_date)},
  ${sqlString(emptyToNull(row.renewal_status))},
  ${sqlDate(row.renewal_date)},
  ${sqlDate(row.renewal_due_date)},
  ${sqlBool(row.nps_sent)},
  ${sqlBool(row.nps_answered)},
  ${sqlDate(row.created_at)},
  ${sqlDate(row.updated_at)},
  ${sqlDate(row.updated_at)}
) ON CONFLICT (id) DO UPDATE SET
  client_name = EXCLUDED.client_name,
  clinic_name = EXCLUDED.clinic_name,
  status_operacional = EXCLUDED.status_operacional,
  onboarding_stage = EXCLUDED.onboarding_stage,
  pacote = EXCLUDED.pacote,
  plan = EXCLUDED.plan,
  deal_value = EXCLUDED.deal_value,
  recharge_value = EXCLUDED.recharge_value,
  team_id = EXCLUDED.team_id,
  assigned_gestor_id = EXCLUDED.assigned_gestor_id,
  assigned_atendente_id = EXCLUDED.assigned_atendente_id,
  assigned_design_id = EXCLUDED.assigned_design_id,
  assigned_editor_video_id = EXCLUDED.assigned_editor_video_id,
  client_tier = EXCLUDED.client_tier,
  pagador_anuncio = EXCLUDED.pagador_anuncio,
  ad_account_name = EXCLUDED.ad_account_name,
  creative_source = EXCLUDED.creative_source,
  stage_trafego = EXCLUDED.stage_trafego,
  stage_atendimento = EXCLUDED.stage_atendimento,
  stage_marketing = EXCLUDED.stage_marketing,
  start_meeting_date = EXCLUDED.start_meeting_date,
  activated_at = EXCLUDED.activated_at,
  onboarding_start_at = EXCLUDED.onboarding_start_at,
  onboarding_done_at = EXCLUDED.onboarding_done_at,
  churn_status = EXCLUDED.churn_status,
  churn_reason = EXCLUDED.churn_reason,
  churn_date = EXCLUDED.churn_date,
  renewal_status = EXCLUDED.renewal_status,
  renewal_date = EXCLUDED.renewal_date,
  renewal_due_date = EXCLUDED.renewal_due_date,
  nps_sent = EXCLUDED.nps_sent,
  nps_answered = EXCLUDED.nps_answered,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at,
  status_updated_at = EXCLUDED.status_updated_at;
`.trim());
}

fs.writeFileSync(outputPath, statements.join('\n\n') + '\n', 'utf8');
console.log(`Wrote ${rows.length} CSV rows to ${outputPath}`);
