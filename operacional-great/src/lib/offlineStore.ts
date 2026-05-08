import { safeGetItem, safeSetItem } from './safeStorage';
import { isLocalDataFallbackEnabled } from './runtimeFlags';

const OFFLINE_PREFIX = 'great-offline-v1';

function storageKey(scope: string, bucket = 'global') {
  return `${OFFLINE_PREFIX}:${scope}:${bucket}`;
}

function readJson<T>(key: string): T[] {
  const raw = safeGetItem(key);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJson<T>(key: string, value: T[]) {
  safeSetItem(key, JSON.stringify(value));
}

export function readOfflineCollection<T>(scope: string, bucket = 'global'): T[] {
  return readJson<T>(storageKey(scope, bucket));
}

export function writeOfflineCollection<T>(scope: string, value: T[], bucket = 'global') {
  writeJson(storageKey(scope, bucket), value);
}

export function appendOfflineItem<T extends { id: string }>(scope: string, item: T, bucket = 'global') {
  const current = readOfflineCollection<T>(scope, bucket);
  const next = [...current.filter((row) => row.id !== item.id), item];
  writeOfflineCollection(scope, next, bucket);
  return item;
}

export function updateOfflineItem<T extends { id: string }>(
  scope: string,
  id: string,
  updater: (item: T) => T,
  bucket = 'global',
) {
  const current = readOfflineCollection<T>(scope, bucket);
  const next = current.map((item) => (item.id === id ? updater(item) : item));
  writeOfflineCollection(scope, next, bucket);
  return next.find((item) => item.id === id) ?? null;
}

export function removeOfflineItem<T extends { id: string }>(scope: string, id: string, bucket = 'global') {
  const current = readOfflineCollection<T>(scope, bucket);
  const next = current.filter((item) => item.id !== id);
  writeOfflineCollection(scope, next, bucket);
  return next;
}

export function upsertOfflineItem<T extends { id: string }>(scope: string, item: T, bucket = 'global') {
  const current = readOfflineCollection<T>(scope, bucket);
  const next = [...current.filter((row) => row.id !== item.id), item];
  writeOfflineCollection(scope, next, bucket);
  return item;
}

export function filterOfflineCollection<T>(scope: string, predicate: (item: T) => boolean, bucket = 'global') {
  const current = readOfflineCollection<T>(scope, bucket);
  const next = current.filter(predicate);
  writeOfflineCollection(scope, next, bucket);
  return next;
}

export function mergeOfflineCollections<T extends { id: string }>(primary: T[], fallback: T[]) {
  const merged = new Map<string, T>();
  [...fallback, ...primary].forEach((item) => {
    merged.set(item.id, item);
  });
  return Array.from(merged.values());
}

export function clearOfflineCollection(scope: string, bucket = 'global') {
  if (!isLocalDataFallbackEnabled()) {
    throw new Error('Local data fallback is disabled.');
  }
  writeOfflineCollection(scope, [], bucket);
}
