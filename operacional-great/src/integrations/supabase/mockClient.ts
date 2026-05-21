// Mock Supabase client using localStorage as database
// Used when VITE_SUPABASE_PUBLISHABLE_KEY=mock_key
// or VITE_SUPABASE_ANON_KEY=mock_key
import { MOCK_OPERATIONAL_SEED, MOCK_OPERATIONAL_SEED_VERSION } from './mockOperationalData';

const DB_PREFIX = 'mock_db_';
const STORAGE_PREFIX = 'mock_storage_';
const SEED_VERSION_KEY = `${DB_PREFIX}seed_version`;
const AUTH_SESSION_KEY = `${DB_PREFIX}auth_session`;

function safeReadStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWriteStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures so the UI can still render in restricted browsers.
  }
}

function safeRemoveStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage failures so the UI can still render in restricted browsers.
  }
}

function getTable(table: string): any[] {
  const stored = safeReadStorage(`${DB_PREFIX}${table}`);
  return stored ? JSON.parse(stored) : [];
}

function saveTable(table: string, data: any[]): void {
  safeWriteStorage(`${DB_PREFIX}${table}`, JSON.stringify(data));
}

function replaceTable(table: string, rows: any[]): void {
  saveTable(table, rows);
}

function seedIfEmpty(table: string, rows: any[]): void {
  const existing = getTable(table);
  if (existing.length === 0) saveTable(table, rows);
}

function mergeSeedRows(table: string, rows: any[]): void {
  if (rows.length === 0) return;

  const existingRows = getTable(table);
  const mergedRows = new Map<string, any>();

  existingRows.forEach((row) => {
    const key = row?.id ?? `${table}-${JSON.stringify(row)}`;
    mergedRows.set(key, row);
  });

  rows.forEach((seedRow) => {
    const key = seedRow?.id ?? `${table}-${JSON.stringify(seedRow)}`;
    const existingRow = mergedRows.get(key);
    mergedRows.set(key, existingRow ? { ...seedRow, ...existingRow } : seedRow);
  });

  saveTable(table, Array.from(mergedRows.values()));
}

function pruneLegacyWorkItems() {
  const currentRows = getTable('work_items');
  if (currentRows.length === 0) return;

  const legacyTitleMatchers = [
    'xxxx',
    'xxx',
    'tarefinhaaa',
    'tentar ajustar ainda mais o site',
    'tarefa de demonstraÃ§Ã£o cypress',
    'tarefa futura cypress',
    'tarefa header cypress',
  ];

  const cleanedRows = currentRows.filter((row) => {
    const title = String(row?.title ?? '').trim().toLowerCase();
    if (!title) return false;
    return !legacyTitleMatchers.some((matcher) => title.includes(matcher));
  });

  if (cleanedRows.length !== currentRows.length) {
    saveTable('work_items', cleanedRows);
  }
}

function pruneLegacyChampionshipEvents() {
  const currentRows = getTable('championship_events');
  if (currentRows.length === 0) return;

  const legacyMatchers = [
    'seed-event',
    'xxx',
  ];

  const cleanedRows = currentRows.filter((row) => {
    const searchable = [
      row?.id,
      row?.event_type,
      row?.description,
      row?.item_label,
      row?.client_name,
      row?.creator_name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return !legacyMatchers.some((matcher) => searchable.includes(matcher));
  });

  if (cleanedRows.length !== currentRows.length) {
    saveTable('championship_events', cleanedRows);
  }
}

function normalizeAmandaProfileRole() {
  const profiles = getTable('profiles');
  if (profiles.length === 0) return;

  let changed = false;
  const normalizedProfiles = profiles.map((profile) => {
    if ((profile?.email || '').toLowerCase() !== 'amanda.operacional@great.local') {
      return profile;
    }

    changed = true;
    return {
      ...profile,
      full_name: 'Amanda Great',
      operational_role: 'EDITOR_VIDEO',
      is_admin: false,
    };
  });

  if (changed) {
    saveTable('profiles', normalizedProfiles);
  }
}

function ensureOperationalProfilePasswords() {
  const profiles = getTable('profiles');
  if (profiles.length === 0) return;

  const operationalEmails = new Set([
    'isaquegreatsd@gmail.com',
    'gugaliraclash@gmail.com',
    'gersonlopesgreat@gmail.com',
    'ocdremex@gmail.com',
    'kauananderson1919@gmail.com',
    'amanda.operacional@great.local',
    'braytonmaycon5@gmail.com',
  ]);

  let changed = false;
  const normalizedProfiles = profiles.map((profile) => {
    const email = String(profile?.email ?? '').trim().toLowerCase();

    if (operationalEmails.has(email) && profile.login_password !== 'Great2026!') {
      changed = true;
      return {
        ...profile,
        login_password: 'Great2026!',
      };
    }

    return profile;
  });

  if (changed) {
    saveTable('profiles', normalizedProfiles);
  }
}

function pruneLegacyProfiles() {
  const profiles = getTable('profiles');
  if (profiles.length === 0) return;

  const allowedEmails = new Set([
    'user@teste.com',
    'admin@teste.com',
    'brunogomestjf@gmail.com',
    'cledinhosport10@gmail.com',
    'josehebert103@gmail.com',
    'miguelfrancisco232490@gmail.com',
    'feliperangel.rego03@gmail.com',
    'pedroojuann1@gmail.com',
    'cadulucena6@gmail.com',
    'isaquegreatsd@gmail.com',
    'gugaliraclash@gmail.com',
    'gersonlopesgreat@gmail.com',
    'ocdremex@gmail.com',
    'kauananderson1919@gmail.com',
    'amanda.operacional@great.local',
    'braytonmaycon5@gmail.com',
  ]);
  const filteredProfiles = profiles.filter((profile) => {
    const email = String(profile?.email ?? '').trim().toLowerCase();
    return allowedEmails.has(email);
  });

  if (filteredProfiles.length !== profiles.length) {
    saveTable('profiles', filteredProfiles);
  }
}

function ensureOperationalProfiles() {
  mergeSeedRows('profiles', [
    { id: 'profile-isaque', full_name: 'Isaque Soares', email: 'isaquegreatsd@gmail.com', is_active: true, operational_role: 'ATENDENTE', login_password: 'Great2026!', created_at: new Date().toISOString() },
    { id: 'profile-gustavo', full_name: 'Gustavo Lira', email: 'gugaliraclash@gmail.com', is_active: true, operational_role: 'ATENDENTE', login_password: 'Great2026!', created_at: new Date().toISOString() },
    { id: 'profile-gerson', full_name: 'Gerson Lopes', email: 'gersonlopesgreat@gmail.com', is_active: true, operational_role: 'ATENDENTE', login_password: 'Great2026!', created_at: new Date().toISOString() },
    { id: 'profile-tchaka', full_name: 'Matheus Tchaka', email: 'ocdremex@gmail.com', is_active: true, operational_role: 'ATENDENTE', login_password: 'Great2026!', created_at: new Date().toISOString() },
    { id: 'profile-kauan', full_name: 'Kauan Anderson', email: 'kauananderson1919@gmail.com', is_active: true, operational_role: 'ATENDENTE', login_password: 'Great2026!', created_at: new Date().toISOString() },
    { id: 'profile-amanda', full_name: 'Amanda Great', email: 'amanda.operacional@great.local', is_active: true, operational_role: 'EDITOR_VIDEO', login_password: 'Great2026!', created_at: new Date().toISOString() },
    { id: 'profile-brayton', full_name: 'Brayton Maycon', email: 'braytonmaycon5@gmail.com', is_active: true, operational_role: 'GESTOR', login_password: 'Great2026!', created_at: new Date().toISOString() },
  ]);
}

function ensureCypressAuthProfiles() {
  mergeSeedRows('profiles', [
    {
      id: 'profile-admin-teste',
      full_name: 'Admin Teste',
      email: 'admin@teste.com',
      is_active: true,
      login_password: '123456',
      is_admin: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'profile-bruno-gomes',
      full_name: 'Bruno Gomes',
      email: 'brunogomestjf@gmail.com',
      is_active: true,
      login_password: '123456',
      is_admin: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'profile-cled',
      full_name: 'Cled',
      email: 'cledinhosport10@gmail.com',
      is_active: true,
      commercial_role: 'COORDENADOR_COMERCIAL',
      login_password: '123456',
      created_at: new Date().toISOString(),
    },
    {
      id: 'profile-hebert',
      full_name: 'Hebert',
      email: 'josehebert103@gmail.com',
      is_active: true,
      commercial_role: 'CLOSER',
      login_password: '123456',
      created_at: new Date().toISOString(),
    },
    {
      id: 'profile-miguel',
      full_name: 'Miguel',
      email: 'miguelfrancisco232490@gmail.com',
      is_active: true,
      commercial_role: 'SDR',
      login_password: '123456',
      created_at: new Date().toISOString(),
    },
    {
      id: 'profile-felipe',
      full_name: 'Felipe',
      email: 'feliperangel.rego03@gmail.com',
      is_active: true,
      commercial_role: 'SDR',
      login_password: '123456',
      created_at: new Date().toISOString(),
    },
    {
      id: 'profile-pedro-juan',
      full_name: 'Pedro Juan',
      email: 'pedroojuann1@gmail.com',
      is_active: true,
      commercial_role: 'CLOSER',
      login_password: '123456',
      created_at: new Date().toISOString(),
    },
    {
      id: 'profile-caetano',
      full_name: 'Caetano',
      email: 'cadulucena6@gmail.com',
      is_active: true,
      commercial_role: 'CLOSER',
      login_password: '123456',
      created_at: new Date().toISOString(),
    },
  ]);
}

function getStorageBucket(bucket: string): Record<string, string> {
  const stored = safeReadStorage(`${STORAGE_PREFIX}${bucket}`);
  return stored ? JSON.parse(stored) : {};
}

function saveStorageBucket(bucket: string, data: Record<string, string>): void {
  safeWriteStorage(`${STORAGE_PREFIX}${bucket}`, JSON.stringify(data));
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function createMockNotificationsForAnnouncement(announcement: any) {
  const profiles = getTable('profiles').filter((profile) => profile?.is_active !== false);
  if (profiles.length === 0) return;

  const notifications = getTable('notifications');
  const message =
    typeof announcement?.content === 'string'
      ? announcement.content.slice(0, 100) + (announcement.content.length > 100 ? '...' : '')
      : '';

  const generated = profiles.map((profile) => ({
    id: crypto.randomUUID(),
    user_id: profile.id,
    title: `📢 Novo Aviso: ${announcement?.title || 'Aviso'}`,
    message,
    type: 'announcement',
    read: false,
    related_entity: 'announcements',
    related_entity_id: announcement?.id || null,
    created_at: announcement?.created_at || new Date().toISOString(),
    updated_at: announcement?.created_at || new Date().toISOString(),
  }));

  saveTable('notifications', [...notifications, ...generated]);
}

function createMockNotificationsForMeeting(meeting: any) {
  const profiles = getTable('profiles').filter((profile) => profile?.is_active !== false);
  if (profiles.length === 0) return;

  const notifications = getTable('notifications');
  const meetingStart = meeting?.datetime_start ? new Date(meeting.datetime_start) : null;
  const formattedDate = meetingStart && !Number.isNaN(meetingStart.getTime())
    ? meetingStart.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : 'em breve';

  const generated = profiles.map((profile) => ({
    id: crypto.randomUUID(),
    user_id: profile.id,
    title: `📅 Nova reunião: ${meeting?.title || 'Reunião'}`,
    message: `Agendada para ${formattedDate}`,
    type: 'meeting',
    read: false,
    related_entity: 'meetings',
    related_entity_id: meeting?.id || null,
    created_at: meeting?.created_at || new Date().toISOString(),
    updated_at: meeting?.created_at || new Date().toISOString(),
  }));

  saveTable('notifications', [...notifications, ...generated]);
}

// Seed default data
function seedDefaultData() {
  seedIfEmpty('teams', [
    { id: 'equipe-7', name: 'Equipe 7', created_at: new Date().toISOString() },
    { id: 'tropa-de-elite', name: 'Tropa de Elite', created_at: new Date().toISOString() },
  ]);

  seedIfEmpty('exec_boards', [
    { id: 'board-geral-1', name: 'Quadro Principal', sector: 'GERAL', is_default: true, team_id: null, created_at: new Date().toISOString() },
    { id: 'board-atendimento-1', name: 'Quadro Atendimento', sector: 'ATENDIMENTO', is_default: true, team_id: null, created_at: new Date().toISOString() },
    { id: 'board-marketing-1', name: 'Quadro Marketing', sector: 'MARKETING_DIGITAL', is_default: true, team_id: null, created_at: new Date().toISOString() },
  ]);

  seedIfEmpty('exec_columns', [
    { id: 'col-1', name: 'A Fazer', board_id: 'board-geral-1', position: 0, color: '#6366f1', created_at: new Date().toISOString() },
    { id: 'col-2', name: 'Em Andamento', board_id: 'board-geral-1', position: 1, color: '#f59e0b', created_at: new Date().toISOString() },
    { id: 'col-3', name: 'ConcluÃ­do', board_id: 'board-geral-1', position: 2, color: '#10b981', created_at: new Date().toISOString() },
    { id: 'col-7', name: 'A Fazer', board_id: 'board-atendimento-1', position: 0, color: '#8b5cf6', created_at: new Date().toISOString() },
    { id: 'col-8', name: 'Em Andamento', board_id: 'board-atendimento-1', position: 1, color: '#f59e0b', created_at: new Date().toISOString() },
    { id: 'col-9', name: 'ConcluÃ­do', board_id: 'board-atendimento-1', position: 2, color: '#10b981', created_at: new Date().toISOString() },
    { id: 'col-10', name: 'A Fazer', board_id: 'board-marketing-1', position: 0, color: '#ec4899', created_at: new Date().toISOString() },
    { id: 'col-11', name: 'Em Andamento', board_id: 'board-marketing-1', position: 1, color: '#f59e0b', created_at: new Date().toISOString() },
    { id: 'col-12', name: 'ConcluÃ­do', board_id: 'board-marketing-1', position: 2, color: '#10b981', created_at: new Date().toISOString() },
  ]);

  mergeSeedRows('exec_boards', [
    {
      id: 'board-geral-1',
      description: 'Fluxo geral da operaÃ§Ã£o',
      team_scope: 'GLOBAL',
      team_id: null,
      created_by_user_id: 'test-admin-1',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'board-atendimento-1',
      description: 'Rotina do atendimento',
      team_scope: 'GLOBAL',
      team_id: null,
      created_by_user_id: 'test-admin-1',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'board-marketing-1',
      description: 'ProduÃ§Ã£o de criativos',
      team_scope: 'GLOBAL',
      team_id: null,
      created_by_user_id: 'test-admin-1',
      updated_at: new Date().toISOString(),
    },
  ]);

  mergeSeedRows('exec_columns', [
    { id: 'col-1', order: 0, wip_limit: null, color_tag: 'neutral' },
    { id: 'col-2', order: 1, wip_limit: null, color_tag: 'orange' },
    { id: 'col-3', order: 2, wip_limit: null, color_tag: 'green' },
    { id: 'col-7', order: 0, wip_limit: null, color_tag: 'purple' },
    { id: 'col-8', order: 1, wip_limit: null, color_tag: 'orange' },
    { id: 'col-9', order: 2, wip_limit: null, color_tag: 'green' },
    { id: 'col-10', order: 0, wip_limit: null, color_tag: 'neutral' },
    { id: 'col-11', order: 1, wip_limit: null, color_tag: 'orange' },
    { id: 'col-12', order: 2, wip_limit: null, color_tag: 'green' },
  ]);

  seedIfEmpty('exec_cards', [
    {
      id: 'card-geral-1',
      board_id: 'board-geral-1',
      column_id: 'col-1',
      title: 'Implantar painel principal',
      description: 'Acompanhamento geral da operaÃ§Ã£o',
      client_id: null,
      assigned_to_user_id: 'test-admin-1',
      watchers: [],
      priority: 'MEDIA',
      due_date: null,
      tags: ['Painel'],
      checklist: [],
      attachments: [],
      cover_image: null,
      order: 0,
      pinned: false,
      created_by_user_id: 'test-admin-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    },
  ]);

  seedIfEmpty('announcements', []);
  seedIfEmpty('notifications', []);
  seedIfEmpty('my_day_items', []);
  seedIfEmpty('work_items', []);
  pruneLegacyWorkItems();
  seedIfEmpty('pipeline_clients', []);
  seedIfEmpty('criativos', []);
  seedIfEmpty('operational_clients', []);
  seedIfEmpty('ad_creatives', []);
  seedIfEmpty('exec_cards', []);
  seedIfEmpty('meetings', []);
  seedIfEmpty('activity_logs', []);
  seedIfEmpty('profiles', [
    { id: 'test-user-1', full_name: 'Usuário Teste', email: 'user@teste.com', is_active: true, operational_role: null, created_at: new Date().toISOString() },
    { id: 'profile-isaque', full_name: 'Isaque Soares', email: 'isaquegreatsd@gmail.com', is_active: true, operational_role: 'ATENDENTE', login_password: 'Great2026!', created_at: new Date().toISOString() },
    { id: 'profile-gustavo', full_name: 'Gustavo Lira', email: 'gugaliraclash@gmail.com', is_active: true, operational_role: 'ATENDENTE', login_password: 'Great2026!', created_at: new Date().toISOString() },
    { id: 'profile-gerson', full_name: 'Gerson Lopes', email: 'gersonlopesgreat@gmail.com', is_active: true, operational_role: 'ATENDENTE', login_password: 'Great2026!', created_at: new Date().toISOString() },
    { id: 'profile-tchaka', full_name: 'Matheus Tchaka', email: 'ocdremex@gmail.com', is_active: true, operational_role: 'ATENDENTE', login_password: 'Great2026!', created_at: new Date().toISOString() },
    { id: 'profile-kauan', full_name: 'Kauan Anderson', email: 'kauananderson1919@gmail.com', is_active: true, operational_role: 'ATENDENTE', login_password: 'Great2026!', created_at: new Date().toISOString() },
    { id: 'profile-amanda', full_name: 'Amanda Great', email: 'amanda.operacional@great.local', is_active: true, operational_role: 'EDITOR_VIDEO', login_password: 'Great2026!', created_at: new Date().toISOString() },
    { id: 'profile-brayton', full_name: 'Brayton Maycon', email: 'braytonmaycon5@gmail.com', is_active: true, operational_role: 'GESTOR', login_password: 'Great2026!', created_at: new Date().toISOString() },
  ]);
  seedIfEmpty('study_categories', []);
  seedIfEmpty('study_resources', []);
  seedIfEmpty('crm_events', []);
  seedIfEmpty('client_activity_tracking', []);
  seedIfEmpty('championship_teams', [
    { id: 'champ-equipe-7', team_id: 'TIME_7', label: 'Equipe 7', badge_color: '#6366f1', total_points: 0, renewals: 0, losses: 0, items_sold: 0, previous_rank: null, current_rank: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'champ-tropa-elite', team_id: 'TROPA_DE_ELITE', label: 'Tropa de Elite', badge_color: '#f59e0b', total_points: 0, renewals: 0, losses: 0, items_sold: 0, previous_rank: null, current_rank: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ]);
  seedIfEmpty('championship_events', []);
  pruneLegacyChampionshipEvents();
  seedIfEmpty('championship_monthly_history', []);
  seedIfEmpty('client_files', []);
  seedIfEmpty('client_start_form_responses', []);

  const currentSeedVersion = safeReadStorage(SEED_VERSION_KEY);
  if (currentSeedVersion !== MOCK_OPERATIONAL_SEED_VERSION) {
    mergeSeedRows('profiles', MOCK_OPERATIONAL_SEED.profiles);
    seedIfEmpty('pipeline_clients', MOCK_OPERATIONAL_SEED.pipeline_clients);
    seedIfEmpty('criativos', MOCK_OPERATIONAL_SEED.criativos);
    replaceTable('operational_clients', MOCK_OPERATIONAL_SEED.operational_clients);
    seedIfEmpty('ad_creatives', MOCK_OPERATIONAL_SEED.ad_creatives);
    seedIfEmpty('crm_events', MOCK_OPERATIONAL_SEED.crm_events);
    seedIfEmpty('client_files', MOCK_OPERATIONAL_SEED.client_files);
    seedIfEmpty('client_start_form_responses', MOCK_OPERATIONAL_SEED.client_start_form_responses);
    seedIfEmpty('client_activity_tracking', MOCK_OPERATIONAL_SEED.client_activity_tracking);
    safeWriteStorage(SEED_VERSION_KEY, MOCK_OPERATIONAL_SEED_VERSION);
  }

  ensureOperationalProfiles();
  ensureCypressAuthProfiles();
  pruneLegacyProfiles();
  normalizeAmandaProfileRole();
  ensureOperationalProfilePasswords();
}

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

try {
  seedDefaultData();
} catch {
  // Ignore mock seeding failures when browser storage is blocked.
}

// Query Builder

type Operation = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

class MockQueryBuilder {
  private _table: string;
  private _filters: Array<(row: any) => boolean> = [];
  private _orderField: string | null = null;
  private _orderAsc = true;
  private _limitCount: number | null = null;
  private _isSingle = false;
  private _isMaybeSingle = false;
  private _operation: Operation = 'select';
  private _writeData: any = null;
  private _returnAfterWrite = false;
  private _notFilters: Array<(row: any) => boolean> = [];

  constructor(table: string) {
    this._table = table;
  }

  select(_columns?: string): this {
    if (this._operation !== 'select') {
      this._returnAfterWrite = true;
    }
    return this;
  }

  insert(data: any | any[]): this {
    this._operation = 'insert';
    this._writeData = data;
    return this;
  }

  update(data: any): this {
    this._operation = 'update';
    this._writeData = data;
    return this;
  }

  delete(): this {
    this._operation = 'delete';
    return this;
  }

  upsert(data: any | any[], _opts?: any): this {
    this._operation = 'upsert';
    this._writeData = data;
    return this;
  }

  eq(column: string, value: any): this {
    this._filters.push((row) => row[column] === value);
    return this;
  }

  neq(column: string, value: any): this {
    this._filters.push((row) => row[column] !== value);
    return this;
  }

  in(column: string, values: any[]): this {
    this._filters.push((row) => values.includes(row[column]));
    return this;
  }

  is(column: string, value: any): this {
    this._filters.push((row) =>
      value === null ? row[column] == null : row[column] === value
    );
    return this;
  }

  ilike(column: string, pattern: string): this {
    const regex = new RegExp(pattern.replace(/%/g, '.*'), 'i');
    this._filters.push((row) => row[column] != null && regex.test(row[column]));
    return this;
  }

  or(_query: string): this {
    // Simplified: ignore or-filters in mock (returns all)
    return this;
  }

  not(column: string, operator: string, value: any): this {
    if (operator === 'is') {
      this._filters.push((row) => row[column] != null);
    }
    return this;
  }

  gte(column: string, value: any): this {
    this._filters.push((row) => row[column] >= value);
    return this;
  }

  lte(column: string, value: any): this {
    this._filters.push((row) => row[column] <= value);
    return this;
  }

  lt(column: string, value: any): this {
    this._filters.push((row) => row[column] < value);
    return this;
  }

  gt(column: string, value: any): this {
    this._filters.push((row) => row[column] > value);
    return this;
  }

  filter(column: string, operator: string, value: any): this {
    switch (operator) {
      case 'eq':
        return this.eq(column, value);
      case 'neq':
        return this.neq(column, value);
      case 'like':
      case 'ilike':
        return this.ilike(column, value);
      case 'lt':
        return this.lt(column, value);
      case 'lte':
        return this.lte(column, value);
      case 'gt':
        return this.gt(column, value);
      case 'gte':
        return this.gte(column, value);
      default:
        return this;
    }
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this._orderField = column;
    this._orderAsc = options?.ascending !== false;
    return this;
  }

  limit(count: number): this {
    this._limitCount = count;
    return this;
  }

  range(_from: number, _to: number): this {
    return this;
  }

  single(): this {
    this._isSingle = true;
    return this;
  }

  maybeSingle(): this {
    this._isMaybeSingle = true;
    return this;
  }

  // Make it awaitable (thenable)
  then(
    resolve: (value: { data: any; error: any }) => any,
    reject?: (reason?: any) => any
  ): Promise<any> {
    return this._execute().then(resolve, reject);
  }

  private _applyFilters(data: any[]): any[] {
    return data.filter((row) => this._filters.every((f) => f(row)));
  }

  private _applyOrder(data: any[]): any[] {
    if (!this._orderField) return data;
    const field = this._orderField;
    return [...data].sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return this._orderAsc ? cmp : -cmp;
    });
  }

  private async _execute(): Promise<{ data: any; error: any }> {
    try {
      let tableData = getTable(this._table);

      if (this._operation === 'select') {
        let result = this._applyFilters(tableData);
        result = this._applyOrder(result);
        if (this._limitCount !== null) result = result.slice(0, this._limitCount);

        if (this._isSingle) {
          if (result.length === 0)
            return { data: null, error: { message: 'No rows found', code: 'PGRST116' } };
          return { data: result[0], error: null };
        }
        if (this._isMaybeSingle) {
          return { data: result[0] ?? null, error: null };
        }
        return { data: result, error: null };
      }

      if (this._operation === 'insert') {
        const items = Array.isArray(this._writeData) ? this._writeData : [this._writeData];
        const now = new Date().toISOString();
        const newItems = items.map((item: any) => ({
          id: crypto.randomUUID(),
          created_at: now,
          updated_at: now,
          ...item,
        }));
        saveTable(this._table, [...tableData, ...newItems]);

        if (this._table === 'announcements' && newItems.length > 0) {
          createMockNotificationsForAnnouncement(newItems[0]);
        }

        if (this._table === 'meetings' && newItems.length > 0) {
          createMockNotificationsForMeeting(newItems[0]);
        }

        if (this._returnAfterWrite) {
          return {
            data: this._isSingle ? newItems[0] : newItems,
            error: null,
          };
        }
        return { data: null, error: null };
      }

      if (this._operation === 'update') {
        const now = new Date().toISOString();
        const updated: any[] = [];
        const newData = tableData.map((row: any) => {
          if (this._filters.every((f) => f(row))) {
            const newRow = { ...row, ...this._writeData, updated_at: now };
            updated.push(newRow);
            return newRow;
          }
          return row;
        });
        saveTable(this._table, newData);

        if (this._returnAfterWrite) {
          return {
            data: this._isSingle ? updated[0] ?? null : updated,
            error: null,
          };
        }
        return { data: null, error: null };
      }

      if (this._operation === 'delete') {
        const toDelete = this._applyFilters(tableData);
        const ids = new Set(toDelete.map((r: any) => r.id));
        saveTable(this._table, tableData.filter((r: any) => !ids.has(r.id)));
        return { data: null, error: null };
      }

      if (this._operation === 'upsert') {
        const items = Array.isArray(this._writeData) ? this._writeData : [this._writeData];
        const now = new Date().toISOString();
        items.forEach((item: any) => {
          const idx = tableData.findIndex((r: any) => r.id === item.id);
          if (idx >= 0) {
            tableData[idx] = { ...tableData[idx], ...item, updated_at: now };
          } else {
            tableData.push({ id: crypto.randomUUID(), created_at: now, updated_at: now, ...item });
          }
        });
        saveTable(this._table, tableData);
        return { data: items, error: null };
      }

      return { data: null, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  }
}

// Mock Realtime Channel

class MockChannel {
  on(_event: string, _filter: any, _callback: any): this {
    return this;
  }
  subscribe(_callback?: any): this {
    return this;
  }
  unsubscribe(): void {}
}

class MockStorageBucket {
  constructor(private bucket: string) {}

  async upload(path: string, file: File | Blob | string) {
    const bucketData = getStorageBucket(this.bucket);
    const value =
      typeof file === 'string'
        ? file
        : file instanceof File
          ? await readFileAsDataUrl(file)
          : await file.text().catch(() => '');
    bucketData[path] = value;
    saveStorageBucket(this.bucket, bucketData);
    return { data: { path, fullPath: path }, error: null };
  }

  getPublicUrl(path: string) {
    const bucketData = getStorageBucket(this.bucket);
    return { data: { publicUrl: bucketData[path] || '' } };
  }

  async remove(paths: string[]) {
    const bucketData = getStorageBucket(this.bucket);
    paths.forEach((path) => {
      delete bucketData[path];
    });
    saveStorageBucket(this.bucket, bucketData);
    return { data: null, error: null };
  }
}

// Mock Client

export class MockSupabaseClient {
  from(table: string): MockQueryBuilder {
    return new MockQueryBuilder(table);
  }

  channel(_name: string): MockChannel {
    return new MockChannel();
  }

  removeChannel(_channel: any): void {}

  storage = {
    from: (bucket: string) => new MockStorageBucket(bucket),
  };

  functions = {
    invoke: async (name: string, payload?: any) => {
      const body = payload?.body ?? {};

      const upsertProfile = (nextProfile: any) => {
        const profiles = getTable('profiles');
        const normalizedEmail = String(nextProfile?.email ?? '').trim().toLowerCase();
        const profileId = String(nextProfile?.id ?? crypto.randomUUID());
        const existingIndex = profiles.findIndex((profile) => {
          const currentEmail = String(profile?.email ?? '').trim().toLowerCase();
          return profile?.id === profileId || (!!normalizedEmail && currentEmail === normalizedEmail);
        });

        const mergedProfile = existingIndex >= 0
          ? {
              ...profiles[existingIndex],
              ...nextProfile,
              id: profileId,
              email: normalizedEmail || profiles[existingIndex].email,
            }
          : {
              id: profileId,
              full_name: nextProfile?.full_name || nextProfile?.email || 'Usuário',
              email: normalizedEmail,
              avatar_url: null,
              is_active: nextProfile?.is_active ?? true,
              login_password: nextProfile?.login_password ?? nextProfile?.password ?? null,
              operational_role: nextProfile?.operational_role ?? null,
              commercial_role: nextProfile?.commercial_role ?? null,
              team_id: nextProfile?.team_id ?? null,
              is_admin: nextProfile?.is_admin ?? false,
              created_at: nextProfile?.created_at ?? new Date().toISOString(),
              updated_at: nextProfile?.updated_at ?? new Date().toISOString(),
            };

        const nextProfiles = existingIndex >= 0
          ? profiles.map((profile, index) => (index === existingIndex ? mergedProfile : profile))
          : [...profiles, mergedProfile];

        saveTable('profiles', nextProfiles);
        return mergedProfile;
      };

      if (name === 'study-ai-chat') {
        const messages = Array.isArray(body.messages) ? body.messages : [];
        const lastMessage = messages[messages.length - 1];
        const content =
          typeof lastMessage?.content === 'string'
            ? lastMessage.content
            : Array.isArray(lastMessage?.content)
              ? lastMessage.content
                  .map((item: any) => item?.text)
                  .filter(Boolean)
                  .join(' ')
              : 'Sem contexto';
        const modeLabel = body.mode === 'CATEGORY_FOCUS' ? 'foco na Ã¡rea' : 'modo geral';
        const categoryLabel = body.categoryName || 'Operacional';

        return {
          data: {
            message: `Resposta simulada (${modeLabel}) sobre ${categoryLabel}: ${content}`,
          },
          error: null,
        };
      }

      if (name === 'analyst-ai-chat') {
        return {
          data: {
            message: 'DiagnÃ³stico simulado: cenÃ¡rio recebido, causas mapeadas e prÃ³ximos passos sugeridos.',
          },
          error: null,
        };
      }

      if (name === 'support-ai-chat') {
        return {
          data: {
            message:
              'Resposta simulada da IA de Suporte: recebi seu pedido e posso auditar, otimizar ou estruturar o fluxo solicitado.',
          },
          error: null,
        };
      }

      if (name === 'bootstrap-auth-user') {
        const profile = upsertProfile({
          email: body.email,
          full_name: body.full_name,
          is_active: true,
          login_password: body.password,
          operational_role: body.operational_role ?? null,
          commercial_role: body.commercial_role ?? null,
          team_id: body.team_id ?? null,
          is_admin: body.is_admin ?? false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        return {
          data: { success: true, profile },
          error: null,
        };
      }

      if (name === 'create-user') {
        const profile = upsertProfile({
          email: body.email,
          full_name: body.full_name,
          is_active: true,
          login_password: body.password,
          operational_role: body.operational_role ?? null,
          commercial_role: body.commercial_role ?? null,
          team_id: body.team_id ?? null,
          is_admin: body.is_admin ?? false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        return {
          data: { success: true, user: { id: profile.id, email: profile.email } },
          error: null,
        };
      }

      if (name === 'update-user') {
        const profiles = getTable('profiles');
        const targetId = String(body.user_id ?? '');
        const nextProfiles = profiles.map((profile) => {
          if (profile.id !== targetId) return profile;
          return {
            ...profile,
            ...(body.email ? { email: String(body.email).trim().toLowerCase() } : {}),
            ...(body.password ? { login_password: body.password } : {}),
            updated_at: new Date().toISOString(),
          };
        });

        saveTable('profiles', nextProfiles);

        return {
          data: { success: true },
          error: null,
        };
      }

      if (name === 'delete-user') {
        const profiles = getTable('profiles');
        const targetId = String(body.user_id ?? '');
        saveTable('profiles', profiles.filter((profile) => profile.id !== targetId));
        const roles = getTable('user_roles');
        saveTable('user_roles', roles.filter((role) => role.user_id !== targetId));

        return {
          data: { success: true },
          error: null,
        };
      }

      if (name === 'sync-my-day-items') {
        const items = Array.isArray(body.items) ? body.items : [];
        const currentItems = getTable('my_day_items');
        const normalizedRows = items.map((item: any) => ({
          id: String(item.id ?? crypto.randomUUID()),
          user_id: String(item.user_id ?? ''),
          date: String(item.date ?? new Date().toISOString().slice(0, 10)),
          source: String(item.source ?? 'WORK_ITEM'),
          source_id: item.source_id ?? null,
          title: String(item.title ?? ''),
          status: String(item.status ?? 'PENDENTE'),
          priority: String(item.priority ?? 'MEDIA'),
          deadline_time: item.deadline_time ?? null,
          deadline_date: item.deadline_date ?? null,
          deadline_notified: item.deadline_notified ?? false,
          origin_reporter_user_id: item.origin_reporter_user_id ?? null,
          origin_reporter_name: item.origin_reporter_name ?? null,
          completed_at: item.completed_at ?? null,
          created_at: item.created_at ?? new Date().toISOString(),
          updated_at: item.updated_at ?? new Date().toISOString(),
        }));

        const merged = [...currentItems];
        normalizedRows.forEach((row) => {
          const index = merged.findIndex((existing) =>
            existing.user_id === row.user_id
            && String(existing.date ?? '') === row.date
            && String(existing.source ?? '') === row.source
            && String(existing.source_id ?? '') === String(row.source_id ?? '')
            && String(existing.title ?? '') === row.title,
          );

          if (index >= 0) {
            merged[index] = {
              ...merged[index],
              ...row,
              updated_at: new Date().toISOString(),
            };
          } else {
            merged.push(row);
          }
        });

        saveTable('my_day_items', merged);
        return {
          data: { items: normalizedRows },
          error: null,
        };
      }

      return {
        data: null,
        error: { message: 'Function unavailable in mock mode' },
      };
    },
  };

  rpc(name: string, args?: any) {
    if (name === 'delete_profile_cascade') {
      const profiles = getTable('profiles');
      const roles = getTable('user_roles');
      const targetId = String(args?.target_user_id ?? '');
      saveTable('profiles', profiles.filter((profile) => profile.id !== targetId));
      saveTable('user_roles', roles.filter((role) => role.user_id !== targetId));

      return Promise.resolve({ data: true, error: null });
    }

    return Promise.resolve({ data: null, error: { message: `RPC ${name} unavailable in mock mode` } });
  }

  auth = {
    getSession: async () => {
      const session = safeParseJson<{ user: { id: string; email: string | null; user_metadata?: Record<string, unknown> | null } }>(
        safeReadStorage(AUTH_SESSION_KEY),
      );
      return { data: { session }, error: null };
    },
    getUser: async () => {
      const rawUser = safeReadStorage('great_user');
      let user = null;
      if (rawUser) {
        try {
          user = JSON.parse(rawUser);
        } catch {
          user = null;
        }
      }
      return { data: { user }, error: null };
    },
    onAuthStateChange: (_event: any, _callback: any) => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const normalizedEmail = String(email ?? '').trim().toLowerCase();
      const profiles = getTable('profiles');
      const profile = profiles.find((row) => String(row?.email ?? '').trim().toLowerCase() === normalizedEmail);

      if (!profile || String(profile.login_password ?? '') !== String(password ?? '')) {
        return {
          data: null,
          error: { message: 'Invalid login credentials' },
        };
      }

      const session = {
        user: {
          id: profile.id,
          email: profile.email,
          user_metadata: {
            full_name: profile.full_name,
            name: profile.full_name,
          },
        },
      };

      safeWriteStorage(AUTH_SESSION_KEY, JSON.stringify(session));

      return { data: session, error: null };
    },
    signOut: async () => {
      safeRemoveStorage(AUTH_SESSION_KEY);
      safeRemoveStorage('great_user');
      return { error: null };
    },
  };
}

export const mockSupabase = new MockSupabaseClient();

