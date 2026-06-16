import fs from 'node:fs';
import path from 'node:path';

const inputPath = 'C:/Users/karol/Downloads/crm_operacional_clientes.csv';
const outputPath = path.resolve('supabase/migrations/20260616120000_import_crm_operacional_clientes.sql');

const RAW_COLUMNS = [
  'id',
  'commercial_id',
  'client_name',
  'clinic_name',
  'plan',
  'deal_value',
  'creative_source',
  'team_id',
  'assigned_gestor_id',
  'assigned_atendente_id',
  'assigned_design_id',
  'assigned_editor_video_id',
  'status_operacional',
  'stage_trafego',
  'stage_atendimento',
  'stage_marketing',
  'onboarding_start_at',
  'onboarding_done_at',
  'created_at',
  'updated_at',
  'activated_at',
  'activated_by',
  'onboarding_stage',
  'briefing_completed_at',
  'churn_status',
  'churn_reason',
  'churn_responsible_team_id',
  'churn_date',
  'renewal_status',
  'renewal_date',
  'renewal_responsible_team_id',
  'renewal_due_date',
  'pagador_anuncio',
  'client_tier',
  'pacote',
  'ad_account_name',
  'has_recharge',
  'recharge_value',
  'start_meeting_date',
  'nps_sent',
  'nps_answered',
  'status_updated_at',
];

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

  if (!lines.length) return [];

  const headers = parseDelimitedLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = parseDelimitedLine(line);
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

function rawText(row, column) {
  return sqlString(emptyToNull(row[column]));
}

function boolExpr(rawColumn) {
  return [
    'CASE',
    `  WHEN lower(nullif(${rawColumn}, '')) IN ('t', 'true', '1', 'sim', 'yes') THEN true`,
    `  WHEN lower(nullif(${rawColumn}, '')) IN ('f', 'false', '0', 'nao', 'não', 'no') THEN false`,
    '  ELSE null',
    'END',
  ].join('\n');
}

function tsExpr(rawColumn) {
  return `nullif(${rawColumn}, '')::timestamptz`;
}

function uuidIfExists(rawColumn, relation) {
  return [
    'CASE',
    `  WHEN nullif(${rawColumn}, '') IS NOT NULL`,
    `   AND nullif(${rawColumn}, '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$'`,
    `   AND EXISTS (SELECT 1 FROM public.${relation} x WHERE x.id = nullif(${rawColumn}, '')::uuid)`,
    `  THEN nullif(${rawColumn}, '')::uuid`,
    '  ELSE null',
    'END',
  ].join('\n');
}

function uuidIfValid(rawColumn) {
  return [
    'CASE',
    `  WHEN nullif(${rawColumn}, '') IS NOT NULL`,
    `   AND nullif(${rawColumn}, '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$'`,
    `  THEN nullif(${rawColumn}, '')::uuid`,
    '  ELSE null',
    'END',
  ].join('\n');
}

const csv = parseCsv(fs.readFileSync(inputPath, 'utf8'));

const valueLines = csv.map((row, index) => {
  const values = RAW_COLUMNS.map((column) => rawText(row, column));
  return `  (${values.join(', ')})${index === csv.length - 1 ? '' : ','}`;
});

const sql = [
  '-- Import CRM operacional clients from CSV.',
  '-- Skips existing rows by primary key id and nulls invalid foreign keys.',
  '',
  'alter table public.operational_clients',
  '  drop constraint if exists operational_clients_plan_check;',
  '',
  'with raw_rows (',
  `  ${RAW_COLUMNS.join(',\n  ')}`,
  ') as (',
  '  values',
  ...valueLines,
  '),',
  'cleaned_rows as (',
  '  select',
  "    nullif(id, '')::uuid as id,",
  "    nullif(commercial_id, '') as commercial_id,",
  "    nullif(client_name, '') as client_name,",
  "    nullif(clinic_name, '') as clinic_name,",
  "    nullif(plan, '') as plan,",
  "    nullif(deal_value, '')::numeric as deal_value,",
  "    nullif(creative_source, '') as creative_source,",
  `    ${uuidIfExists('team_id', 'teams')} as team_id,`,
  `    ${uuidIfExists('assigned_gestor_id', 'profiles')} as assigned_gestor_id,`,
  `    ${uuidIfExists('assigned_atendente_id', 'profiles')} as assigned_atendente_id,`,
  `    ${uuidIfExists('assigned_design_id', 'profiles')} as assigned_design_id,`,
  `    ${uuidIfExists('assigned_editor_video_id', 'profiles')} as assigned_editor_video_id,`,
  "    nullif(status_operacional, '') as status_operacional,",
  "    nullif(stage_trafego, '') as stage_trafego,",
  "    nullif(stage_atendimento, '') as stage_atendimento,",
  "    nullif(stage_marketing, '') as stage_marketing,",
  `    ${tsExpr('onboarding_start_at')} as onboarding_start_at,`,
  `    ${tsExpr('onboarding_done_at')} as onboarding_done_at,`,
  `    ${tsExpr('created_at')} as created_at,`,
  `    ${tsExpr('updated_at')} as updated_at,`,
  `    ${tsExpr('activated_at')} as activated_at,`,
  `    ${uuidIfValid('activated_by')} as activated_by,`,
  "    nullif(onboarding_stage, '') as onboarding_stage,",
  `    ${tsExpr('briefing_completed_at')} as briefing_completed_at,`,
  "    nullif(churn_status, '') as churn_status,",
  "    nullif(churn_reason, '') as churn_reason,",
  `    ${uuidIfExists('churn_responsible_team_id', 'teams')} as churn_responsible_team_id,`,
  `    ${tsExpr('churn_date')} as churn_date,`,
  "    nullif(renewal_status, '') as renewal_status,",
  `    ${tsExpr('renewal_date')} as renewal_date,`,
  `    ${uuidIfExists('renewal_responsible_team_id', 'teams')} as renewal_responsible_team_id,`,
  `    ${tsExpr('renewal_due_date')} as renewal_due_date,`,
  "    nullif(pagador_anuncio, '') as pagador_anuncio,",
  "    nullif(client_tier, '') as client_tier,",
  "    nullif(pacote, '') as pacote,",
  "    nullif(ad_account_name, '') as ad_account_name,",
  `    ${boolExpr('has_recharge')} as has_recharge,`,
  "    nullif(recharge_value, '')::numeric as recharge_value,",
  `    ${tsExpr('start_meeting_date')} as start_meeting_date,`,
  `    ${boolExpr('nps_sent')} as nps_sent,`,
  `    ${boolExpr('nps_answered')} as nps_answered,`,
  `    ${tsExpr('status_updated_at')} as status_updated_at`,
  '  from raw_rows',
  ')',
  'insert into public.operational_clients (',
  '  id, commercial_id, client_name, clinic_name, plan, deal_value, creative_source, team_id, assigned_gestor_id, assigned_atendente_id, assigned_design_id, assigned_editor_video_id, status_operacional, stage_trafego, stage_atendimento, stage_marketing, onboarding_start_at, onboarding_done_at, created_at, updated_at, activated_at, activated_by, onboarding_stage, briefing_completed_at, churn_status, churn_reason, churn_responsible_team_id, churn_date, renewal_status, renewal_date, renewal_responsible_team_id, renewal_due_date, pagador_anuncio, client_tier, pacote, ad_account_name, has_recharge, recharge_value, start_meeting_date, nps_sent, nps_answered, status_updated_at',
  ')',
  'select',
  '  id, commercial_id, client_name, clinic_name, plan, deal_value, creative_source, team_id, assigned_gestor_id, assigned_atendente_id, assigned_design_id, assigned_editor_video_id, status_operacional, stage_trafego, stage_atendimento, stage_marketing, onboarding_start_at, onboarding_done_at, created_at, updated_at, activated_at, activated_by, onboarding_stage, briefing_completed_at, churn_status, churn_reason, churn_responsible_team_id, churn_date, renewal_status, renewal_date, renewal_responsible_team_id, renewal_due_date, pagador_anuncio, client_tier, pacote, ad_account_name, has_recharge, recharge_value, start_meeting_date, nps_sent, nps_answered, status_updated_at',
  'from cleaned_rows',
  'on conflict (id) do nothing;',
  '',
].join('\n');

fs.writeFileSync(outputPath, sql, 'utf8');
console.log(`Wrote ${csv.length} CSV rows to ${outputPath}`);
