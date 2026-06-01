import { safeGetItem, safeSetItem } from './safeStorage';
import { isLocalDataFallbackEnabled } from './runtimeFlags';

const OFFLINE_PREFIX = 'great-offline-v1';
const MEETING_TOMBSTONE_SCOPE = 'meetings-deleted';

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

type MeetingLike = {
  id: string;
  title: string;
  datetime_start: string;
  datetime_end: string;
  agenda?: string | null;
  scope?: string | null;
  created_by_user_id?: string | null;
};

const LEGACY_MEETING_TITLES = new Set([
  'xxx',
  'xxxx',
  'tentar ajustar ainda mais o site',
  'reuniao teste',
  'reunião teste',
]);

function normalizeMeetingValue(value: string | null | undefined) {
  return (value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getMeetingSignature(meeting: MeetingLike) {
  return [
    normalizeMeetingValue(meeting.title),
    meeting.datetime_start || '',
    meeting.datetime_end || '',
    normalizeMeetingValue(meeting.scope),
    normalizeMeetingValue(meeting.agenda),
  ].join('|');
}

function isLegacyMeeting(meeting: MeetingLike) {
  const normalizedTitle = normalizeMeetingValue(meeting.title);
  return /^x{3,}$/i.test(meeting.title.trim()) || LEGACY_MEETING_TITLES.has(normalizedTitle);
}

function dedupeMeetings<T extends MeetingLike>(items: T[]) {
  const byId = new Map<string, T>();
  const bySignature = new Map<string, T>();

  for (const item of items) {
    if (!item?.id) continue;
    if (isLegacyMeeting(item)) continue;
    if (byId.has(item.id)) continue;

    const signature = getMeetingSignature(item);
    if (bySignature.has(signature)) continue;

    byId.set(item.id, item);
    bySignature.set(signature, item);
  }

  return Array.from(byId.values());
}

export function mergeMeetingCollections<T extends MeetingLike>(primary: T[], fallback: T[]) {
  return dedupeMeetings([...fallback, ...primary]);
}

export function upsertOfflineMeeting<T extends MeetingLike>(
  scope: string,
  meeting: T,
  previousMeeting?: Pick<MeetingLike, 'id' | 'title' | 'datetime_start' | 'datetime_end' | 'agenda' | 'scope' | 'created_by_user_id'> | null,
  bucket = 'global',
) {
  const current = readOfflineCollection<T>(scope, bucket);
  const idsToRemove = new Set<string>([meeting.id]);
  const signaturesToRemove = new Set<string>([getMeetingSignature(meeting)]);

  if (previousMeeting) {
    idsToRemove.add(previousMeeting.id);
    signaturesToRemove.add(getMeetingSignature(previousMeeting as MeetingLike));
  }

  const next = current.filter((row) => {
    if (isLegacyMeeting(row as MeetingLike)) return false;
    if (idsToRemove.has(row.id)) return false;
    return !signaturesToRemove.has(getMeetingSignature(row as MeetingLike));
  });

  next.push(meeting);
  writeOfflineCollection(scope, next, bucket);
  return meeting;
}

export function removeOfflineMeeting<T extends MeetingLike>(
  scope: string,
  meetingOrId: string | Pick<MeetingLike, 'id' | 'title' | 'datetime_start' | 'datetime_end' | 'agenda' | 'scope' | 'created_by_user_id'>,
  bucket = 'global',
) {
  const current = readOfflineCollection<T>(scope, bucket);
  const idsToRemove = new Set<string>([typeof meetingOrId === 'string' ? meetingOrId : meetingOrId.id]);
  const signaturesToRemove = new Set<string>();

  if (typeof meetingOrId !== 'string') {
    signaturesToRemove.add(getMeetingSignature(meetingOrId as MeetingLike));
  }

  const next = current.filter((row) => {
    if (idsToRemove.has(row.id)) return false;
    return signaturesToRemove.size === 0 ? true : !signaturesToRemove.has(getMeetingSignature(row as MeetingLike));
  });

  writeOfflineCollection(scope, next, bucket);
  return next;
}

export function readDeletedMeetingIds(bucket = 'global') {
  return readOfflineCollection<{ id: string }>(MEETING_TOMBSTONE_SCOPE, bucket)
    .map((item) => item.id)
    .filter(Boolean);
}

export function markMeetingDeletedLocally(
  meetingOrId: string | Pick<MeetingLike, 'id' | 'title' | 'datetime_start' | 'datetime_end' | 'agenda' | 'scope' | 'created_by_user_id'>,
  bucket = 'global',
) {
  const current = readOfflineCollection<{ id: string }>(MEETING_TOMBSTONE_SCOPE, bucket);
  const id = typeof meetingOrId === 'string' ? meetingOrId : meetingOrId.id;
  const next = [...current.filter((row) => row.id !== id), { id }];
  writeOfflineCollection(MEETING_TOMBSTONE_SCOPE, next, bucket);
  return next;
}

export function clearMeetingDeletionTombstone(id: string, bucket = 'global') {
  const current = readOfflineCollection<{ id: string }>(MEETING_TOMBSTONE_SCOPE, bucket);
  const next = current.filter((row) => row.id !== id);
  writeOfflineCollection(MEETING_TOMBSTONE_SCOPE, next, bucket);
  return next;
}

export function clearOfflineCollection(scope: string, bucket = 'global') {
  if (!isLocalDataFallbackEnabled()) {
    throw new Error('Local data fallback is disabled.');
  }
  writeOfflineCollection(scope, [], bucket);
}
