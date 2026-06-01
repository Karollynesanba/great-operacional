import fs from 'node:fs';

const sourcePath =
  'C:/great-operacional/backups/today-creatives-backup-2026-05-25T22-00-00/great_operational_clients_cache_v1.json';
const outputPath =
  'C:/great-operacional/operacional-great/src/integrations/supabase/clientesOperacionaisHoje.csv';

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const today = source.filter((item) => String(item.created_at ?? '').startsWith('2026-05-26'));

if (today.length === 0) {
  throw new Error('No records created on 2026-05-26 were found in the cache backup.');
}

const teamNameFor = (teamId) => {
  if (teamId === '38c9028d-856d-481e-95c9-bb2eb8b459f5') return 'Tropa de Elite';
  if (teamId === '0469e3aa-5b34-42e2-b89d-f412efaa27ba') return 'Equipe 7';
  return '';
};

const fields = [
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

const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

const csv = [
  fields.map(quote).join(','),
  ...today.map((record) =>
    fields
      .map((field) => {
        if (field === 'team_name') return quote(teamNameFor(record.team_id));
        if (field === 'has_recharge') return quote(Boolean(record.has_recharge));
        if (field === 'nps_sent' || field === 'nps_answered') return quote(Boolean(record[field]));
        return quote(record[field]);
      })
      .join(','),
  ),
].join('\r\n') + '\r\n';

fs.writeFileSync(outputPath, csv, 'utf8');

console.log(`Wrote ${today.length} record(s) to ${outputPath}`);
