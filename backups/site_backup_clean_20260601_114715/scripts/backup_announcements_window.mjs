import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function loadEnvFile(filePath) {
  return fs.readFile(filePath, 'utf8').then((content) => {
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatDateInFortaleza(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function shiftDate(dateString, days) {
  const base = new Date(`${dateString}T12:00:00-03:00`);
  base.setDate(base.getDate() + days);
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
}

function toIsoAtStartOfDay(dateString) {
  return `${dateString}T00:00:00-03:00`;
}

function toIsoAtEndExclusive(dateString) {
  return `${dateString}T00:00:00-03:00`;
}

function toCsv(rows) {
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row || {})))).sort();
  const escape = (value) => {
    const text = value == null ? '' : String(value);
    if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };

  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((key) => escape(row[key])).join(','));
  }
  return lines.join('\n');
}

await loadEnvFile(path.join(projectRoot, '.env.local'));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const tableName = process.argv[2] || 'announcements';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const today = formatDateInFortaleza(new Date());
const yesterday = shiftDate(today, -1);
const tomorrow = shiftDate(today, 1);
const startIso = toIsoAtStartOfDay(yesterday);
const endIso = toIsoAtEndExclusive(tomorrow);

const { data, error } = await supabase
  .from(tableName)
  .select('*')
  .gte('created_at', startIso)
  .lt('created_at', endIso)
  .order('created_at', { ascending: true });

if (error) {
  throw error;
}

const rows = Array.isArray(data) ? data : [];
const backupDir = path.join(projectRoot, 'backups');
await fs.mkdir(backupDir, { recursive: true });

const jsonPath = path.join(backupDir, `${tableName}_${yesterday}_to_${today}.json`);
const csvPath = path.join(backupDir, `${tableName}_${yesterday}_to_${today}.csv`);

await fs.writeFile(jsonPath, JSON.stringify({
  window: {
    timezone: 'America/Fortaleza',
    start: startIso,
    endExclusive: endIso,
  },
  table: tableName,
  count: rows.length,
  rows,
}, null, 2), 'utf8');

await fs.writeFile(csvPath, toCsv(rows), 'utf8');

console.log(JSON.stringify({
  ok: true,
  count: rows.length,
  jsonPath,
  csvPath,
}, null, 2));
