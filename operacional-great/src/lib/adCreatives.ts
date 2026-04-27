import criativosCsv from '@/integrations/supabase/criativos.csv?raw';
import {
  appendOfflineItem,
  readOfflineCollection,
  removeOfflineItem,
  updateOfflineItem,
  writeOfflineCollection,
} from './offlineStore';

export interface AdCreativeRecord {
  id: string;
  client_id: string | null;
  client_name: string;
  image_url: string;
  image_urls: string[];
  status: 'PARA_SUBIR' | 'ATIVO';
  created_by_user_id: string;
  created_by_name: string;
  completed_by_user_id: string | null;
  completed_by_name: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type AdCreativeWithTeam = AdCreativeRecord & {
  team_id: string | null;
};

const AD_CREATIVES_BUCKET = 'ad-creatives';
let cachedSeedCreatives: AdCreativeWithTeam[] | null = null;

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  const source = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(cell);
      cell = '';
      continue;
    }

    if (char === '\n') {
      row.push(cell);
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      cell = '';
      continue;
    }

    if (char !== '\r') {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value.length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

function parseImageUrls(rawValue: string): string[] {
  const value = rawValue.trim();
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
    }
  } catch {
    // Fall back to a single URL below.
  }

  return [value];
}

function parseSeedCreatives(): AdCreativeWithTeam[] {
  if (cachedSeedCreatives) return cachedSeedCreatives;

  const [headerRow, ...dataRows] = parseCsvRows(criativosCsv);
  const headers = headerRow.map((header) => header.trim());

  const records = dataRows
    .map((cells) => {
      const entry = headers.reduce<Record<string, string>>((acc, header, index) => {
        acc[header] = (cells[index] ?? '').trim();
        return acc;
      }, {});

      if (!entry.id || !entry.client_name || !entry.image_url) {
        return null;
      }

      const imageUrls = parseImageUrls(entry.image_urls || entry.image_url);
      const now = new Date().toISOString();

      return {
        id: entry.id,
        client_id: null,
        client_name: entry.client_name,
        image_url: entry.image_url,
        image_urls: imageUrls.length > 0 ? imageUrls : [entry.image_url],
        status: entry.status === 'ATIVO' ? 'ATIVO' : 'PARA_SUBIR',
        created_by_user_id: '',
        created_by_name: entry.created_by_name || 'Sistema',
        completed_by_user_id: null,
        completed_by_name: entry.completed_by_name || null,
        completed_at: entry.completed_at || null,
        created_at: entry.created_at || now,
        updated_at: entry.updated_at || entry.created_at || now,
        team_id: null,
      } satisfies AdCreativeWithTeam;
    })
    .filter((item): item is AdCreativeWithTeam => item !== null)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  cachedSeedCreatives = records;
  return records;
}

export function getSeedAdCreatives(): AdCreativeWithTeam[] {
  return parseSeedCreatives();
}

export function getOfflineAdCreatives(): AdCreativeWithTeam[] {
  return readOfflineCollection<AdCreativeWithTeam>('ad-creatives', AD_CREATIVES_BUCKET);
}

export function mergeAdCreativeCollections(...collections: Array<AdCreativeWithTeam[]>) {
  const merged = new Map<string, AdCreativeWithTeam>();
  collections.flat().forEach((creative) => {
    merged.set(creative.id, creative);
  });
  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function appendOfflineAdCreative(item: AdCreativeWithTeam) {
  return appendOfflineItem<AdCreativeWithTeam>('ad-creatives', item, AD_CREATIVES_BUCKET);
}

export function updateOfflineAdCreative(
  id: string,
  updater: (creative: AdCreativeWithTeam) => AdCreativeWithTeam,
) {
  return updateOfflineItem<AdCreativeWithTeam>('ad-creatives', id, updater, AD_CREATIVES_BUCKET);
}

export function removeOfflineAdCreative(id: string) {
  return removeOfflineItem<AdCreativeWithTeam>('ad-creatives', id, AD_CREATIVES_BUCKET);
}

export function overwriteOfflineAdCreatives(creatives: AdCreativeWithTeam[]) {
  writeOfflineCollection('ad-creatives', creatives, AD_CREATIVES_BUCKET);
}
