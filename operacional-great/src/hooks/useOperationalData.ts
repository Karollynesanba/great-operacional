import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getLocalDateString } from '@/lib/utils';
import { mergeOfflineCollections, readOfflineCollection, writeOfflineCollection } from '@/lib/offlineStore';

export interface WorkItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type: string;
  tags: any;
  due_date: string | null;
  assignee_user_id: string | null;
  reporter_user_id: string | null;
  related_client_id: string | null;
  team_id: string | null;
  workspace_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  assignee?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export interface Meeting {
  id: string;
  title: string;
  datetime_start: string;
  datetime_end: string;
  agenda: string | null;
  notes: string | null;
  participants: any;
  scope: string;
  team_id: string | null;
  created_by_user_id: string;
  recording_link: string | null;
  created_at: string;
}

const LEGACY_WORK_ITEM_TITLES = new Set([
  'xxxx',
  'xxx',
  'tarefinhaaa',
  'tentar ajustar ainda mais o site',
  'tarefa de demonstracao cypress',
  'tarefa futura cypress',
  'tarefa header cypress',
]);

const COMPLETED_WORK_ITEM_STATUSES = ['CONCLUIDO', 'DONE', 'COMPLETED', 'CANCELADO'] as const;

function normalizeWorkItemTitle(title: string) {
  return title
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isLegacyWorkItem(item: WorkItem) {
  const normalizedTitle = normalizeWorkItemTitle(item.title);
  return /^x{3,}$/i.test(item.title.trim()) || LEGACY_WORK_ITEM_TITLES.has(normalizedTitle);
}

function filterLegacyWorkItems(items: WorkItem[]) {
  return items.filter((item) => !isLegacyWorkItem(item));
}

function getWorkItemAssigneeIds(item: WorkItem) {
  const fromTags = item.tags?.assignee_user_ids;
  if (Array.isArray(fromTags) && fromTags.length > 0) {
    return fromTags.filter(Boolean).map(String);
  }
  return item.assignee_user_id ? [item.assignee_user_id] : [];
}

function getWorkItemSignature(item: WorkItem) {
  return [
    item.title.trim().toLowerCase(),
    item.due_date || '',
    item.status || '',
    item.reporter_user_id || '',
    getWorkItemAssigneeIds(item).sort().join(','),
  ].join('|');
}

function dedupeWorkItems(items: WorkItem[]) {
  const byId = new Map<string, WorkItem>();
  const bySignature = new Map<string, WorkItem>();

  for (const item of items) {
    if (!item?.id) continue;
    if (byId.has(item.id)) continue;

    const signature = getWorkItemSignature(item);
    if (bySignature.has(signature)) continue;

    byId.set(item.id, item);
    bySignature.set(signature, item);
  }

  return Array.from(byId.values());
}

function parseMeetingDate(value: string): Date | null {
  if (!value) return null;

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const fallback = new Date(normalized);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function useWorkItems() {
  return useQuery({
    queryKey: ['work-items'],
    queryFn: async () => {
      const cache = readOfflineCollection<WorkItem>('work-items');
      try {
        const { data, error } = await supabase
          .from('work_items')
          .select(`
            *,
            assignee:profiles!work_items_assignee_user_id_fkey(id, full_name, avatar_url)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        const serverItems = dedupeWorkItems(filterLegacyWorkItems((data as WorkItem[]) || []));
        writeOfflineCollection('work-items', serverItems);
        return serverItems;
      } catch {
        return dedupeWorkItems(filterLegacyWorkItems(cache));
      }
    },
  });
}

export function useUpcomingTasks(limit = 5) {
  return useQuery({
    queryKey: ['upcoming-tasks', limit],
    queryFn: async () => {
      const cache = readOfflineCollection<WorkItem>('work-items');
      try {
        const { data, error } = await supabase
          .from('work_items')
          .select(`
            *,
            assignee:profiles!work_items_assignee_user_id_fkey(id, full_name, avatar_url)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        const upcoming = dedupeWorkItems(filterLegacyWorkItems((data as WorkItem[]) || [])).filter((item) => !COMPLETED_WORK_ITEM_STATUSES.includes(item.status as (typeof COMPLETED_WORK_ITEM_STATUSES)[number]));
        writeOfflineCollection('work-items', dedupeWorkItems(filterLegacyWorkItems((data as WorkItem[]) || [])));

        return upcoming
          .sort((a, b) => {
            const aHasDueDate = !!a.due_date;
            const bHasDueDate = !!b.due_date;
            if (aHasDueDate !== bHasDueDate) return aHasDueDate ? -1 : 1;
            if (a.due_date && b.due_date && a.due_date !== b.due_date) {
              return a.due_date.localeCompare(b.due_date);
            }
            const priorityWeight: Record<string, number> = { URGENTE: 3, ALTA: 2, MEDIA: 1, BAIXA: 0 };
            return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
          })
          .slice(0, limit);
      } catch {
        return dedupeWorkItems(filterLegacyWorkItems(cache))
          .filter((item) => !COMPLETED_WORK_ITEM_STATUSES.includes(item.status as (typeof COMPLETED_WORK_ITEM_STATUSES)[number]))
          .sort((a, b) => {
            const aHasDueDate = !!a.due_date;
            const bHasDueDate = !!b.due_date;
            if (aHasDueDate !== bHasDueDate) return aHasDueDate ? -1 : 1;
            if (a.due_date && b.due_date && a.due_date !== b.due_date) {
              return a.due_date.localeCompare(b.due_date);
            }
            const priorityWeight: Record<string, number> = { URGENTE: 3, ALTA: 2, MEDIA: 1, BAIXA: 0 };
            return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
          })
          .slice(0, limit);
      }
    },
  });
}

export function useMeetings() {
  return useQuery({
    queryKey: ['meetings'],
    queryFn: async () => {
      const cache = readOfflineCollection<Meeting>('meetings');
      try {
        const { data, error } = await supabase
          .from('meetings')
          .select('*')
          .order('datetime_start', { ascending: true });

        if (error) throw error;
        const serverMeetings = (data as Meeting[]) || [];
        const mergedMeetings = mergeOfflineCollections(serverMeetings, cache);
        writeOfflineCollection('meetings', mergedMeetings);
        return mergedMeetings;
      } catch {
        return cache;
      }
    },
  });
}

export function useUpcomingMeetings(limit = 5) {
  return useQuery({
    queryKey: ['upcoming-meetings', limit],
    queryFn: async () => {
      const cache = readOfflineCollection<Meeting>('meetings');
      try {
        const { data, error } = await supabase
          .from('meetings')
          .select('*')
          .order('datetime_start', { ascending: true });

        if (error) throw error;

        const now = Date.now();
        const serverMeetings = (data as Meeting[]) || [];
        const mergedMeetings = mergeOfflineCollections(serverMeetings, cache);
        writeOfflineCollection('meetings', mergedMeetings);
        return mergedMeetings
        .filter((meeting) => {
          const meetingDate = parseMeetingDate(meeting.datetime_start);
          return meetingDate !== null && meetingDate.getTime() >= now;
        })
        .sort((a, b) => {
          const first = parseMeetingDate(a.datetime_start)?.getTime() ?? Number.MAX_SAFE_INTEGER;
          const second = parseMeetingDate(b.datetime_start)?.getTime() ?? Number.MAX_SAFE_INTEGER;
          return first - second;
        })
        .slice(0, limit);
      } catch {
        const now = Date.now();
        return cache
          .filter((meeting) => {
            const meetingDate = parseMeetingDate(meeting.datetime_start);
            return meetingDate !== null && meetingDate.getTime() >= now;
          })
          .sort((a, b) => {
            const first = parseMeetingDate(a.datetime_start)?.getTime() ?? Number.MAX_SAFE_INTEGER;
            const second = parseMeetingDate(b.datetime_start)?.getTime() ?? Number.MAX_SAFE_INTEGER;
            return first - second;
          })
          .slice(0, limit);
      }
    },
  });
}

export function useBlockedTasks() {
  return useQuery({
    queryKey: ['blocked-tasks'],
    queryFn: async () => {
      const cache = readOfflineCollection<WorkItem>('work-items');
      try {
        const { data, error } = await supabase
          .from('work_items')
          .select(`
            *,
            assignee:profiles!work_items_assignee_user_id_fkey(id, full_name, avatar_url)
          `)
          .eq('status', 'BLOQUEADO')
          .order('created_at', { ascending: false });

        if (error) throw error;
        const serverItems = dedupeWorkItems(filterLegacyWorkItems((data as WorkItem[]) || [])).filter(
          (item) => item.status === 'BLOQUEADO',
        );
        writeOfflineCollection('work-items', dedupeWorkItems(filterLegacyWorkItems((data as WorkItem[]) || [])));
        return serverItems;
      } catch {
        return dedupeWorkItems(filterLegacyWorkItems(cache)).filter((item) => item.status === 'BLOQUEADO');
      }
    },
  });
}

export function useOverdueTasks() {
  return useQuery({
    queryKey: ['overdue-tasks'],
    queryFn: async () => {
      const today = getLocalDateString();
      const cache = readOfflineCollection<WorkItem>('work-items');
      try {
        const { data, error } = await supabase
          .from('work_items')
          .select(`
            *,
            assignee:profiles!work_items_assignee_user_id_fkey(id, full_name, avatar_url)
          `)
          .lt('due_date', today)
          .in('status', ['BACKLOG', 'TODO', 'EM_ANDAMENTO'])
          .order('due_date', { ascending: true });

        if (error) throw error;
        const serverItems = dedupeWorkItems(filterLegacyWorkItems((data as WorkItem[]) || [])).filter(
          (item) =>
            !!item.due_date &&
            item.due_date < today &&
            ['BACKLOG', 'TODO', 'EM_ANDAMENTO'].includes(item.status),
        );
        writeOfflineCollection('work-items', dedupeWorkItems(filterLegacyWorkItems((data as WorkItem[]) || [])));
        return serverItems;
      } catch {
        return dedupeWorkItems(filterLegacyWorkItems(cache)).filter(
          (item) => !!item.due_date && item.due_date < today && ['BACKLOG', 'TODO', 'EM_ANDAMENTO'].includes(item.status),
        );
      }
    },
  });
}
