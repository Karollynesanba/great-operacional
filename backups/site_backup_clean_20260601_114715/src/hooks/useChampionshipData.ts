import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isLocalDataFallbackEnabled } from '@/lib/runtimeFlags';
import { appendOfflineItem, readOfflineCollection, removeOfflineItem, writeOfflineCollection } from '@/lib/offlineStore';

export interface ChampionshipTeam {
  id: string;
  team_id: string;
  label: string;
  badge_color: string;
  total_points: number;
  renewals: number;
  losses: number;
  items_sold: number;
  previous_rank: number | null;
  current_rank: number;
  created_at: string;
  updated_at: string;
}

export interface ChampionshipEvent {
  id: string;
  team_id: string;
  event_type: 'RENEWAL' | 'LOSS' | 'ITEM_SOLD';
  points: number;
  description: string | null;
  item_label: string | null;
  client_name: string | null;
  created_by: string | null;
  created_at: string;
  creator_name?: string;
}

export interface ChampionshipMonthlyHistory {
  id: string;
  team_id: string;
  month: string;
  total_points: number;
  renewals: number;
  losses: number;
  items_sold: number;
  rank: number | null;
  created_at: string;
}

const CHAMPIONSHIP_OFFLINE_BUCKET = 'championship';

const DEFAULT_OFFLINE_TEAMS: ChampionshipTeam[] = [
  {
    id: 'offline-equipe-7',
    team_id: 'TIME_7',
    label: 'Equipe 7',
    badge_color: '#2563EB',
    total_points: 0,
    renewals: 0,
    losses: 0,
    items_sold: 0,
    previous_rank: null,
    current_rank: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'offline-tropa-de-elite',
    team_id: 'TROPA_DE_ELITE',
    label: 'Tropa de Elite',
    badge_color: '#DC2626',
    total_points: 0,
    renewals: 0,
    losses: 0,
    items_sold: 0,
    previous_rank: null,
    current_rank: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

function getOfflineTeams() {
  const storedTeams = readOfflineCollection<ChampionshipTeam>('championship_teams', CHAMPIONSHIP_OFFLINE_BUCKET);
  if (storedTeams.length > 0) return storedTeams;

  writeOfflineCollection('championship_teams', DEFAULT_OFFLINE_TEAMS, CHAMPIONSHIP_OFFLINE_BUCKET);
  return DEFAULT_OFFLINE_TEAMS;
}

function getOfflineEvents() {
  return readOfflineCollection<ChampionshipEvent>('championship_events', CHAMPIONSHIP_OFFLINE_BUCKET);
}

function writeOfflineTeams(teams: ChampionshipTeam[]) {
  writeOfflineCollection('championship_teams', teams, CHAMPIONSHIP_OFFLINE_BUCKET);
}

function normalizeChampionshipTeamId(value: string) {
  return value.trim().toUpperCase();
}

function applyChampionshipEventsToTeams(teams: ChampionshipTeam[], events: ChampionshipEvent[]) {
  const eventStats = new Map<string, { total_points: number; renewals: number; losses: number; items_sold: number }>();

  for (const event of events) {
    const key = normalizeChampionshipTeamId(event.team_id);
    const current = eventStats.get(key) ?? {
      total_points: 0,
      renewals: 0,
      losses: 0,
      items_sold: 0,
    };

    current.total_points += event.points;
    if (event.event_type === 'RENEWAL') {
      current.renewals += 1;
    } else if (event.event_type === 'LOSS') {
      current.losses += 1;
    } else if (event.event_type === 'ITEM_SOLD') {
      current.items_sold += 1;
    }

    eventStats.set(key, current);
  }

  return teams.map((team) => {
    const stats = eventStats.get(normalizeChampionshipTeamId(team.team_id));
    if (!stats) return team;

    return {
      ...team,
      total_points: stats.total_points,
      renewals: stats.renewals,
      losses: stats.losses,
      items_sold: stats.items_sold,
    };
  });
}

function rankChampionshipTeams(teams: ChampionshipTeam[]) {
  const sorted = [...teams].sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    if (b.items_sold !== a.items_sold) return b.items_sold - a.items_sold;
    if (b.renewals !== a.renewals) return b.renewals - a.renewals;
    if (a.losses !== b.losses) return a.losses - b.losses;
    if ((a.current_rank ?? Number.MAX_SAFE_INTEGER) !== (b.current_rank ?? Number.MAX_SAFE_INTEGER)) {
      return (a.current_rank ?? Number.MAX_SAFE_INTEGER) - (b.current_rank ?? Number.MAX_SAFE_INTEGER);
    }
    return a.label.localeCompare(b.label);
  });

  const now = new Date().toISOString();

  return sorted.map((team, index) => ({
    ...team,
    previous_rank: team.current_rank ?? null,
    current_rank: index + 1,
    updated_at: now,
  }));
}

function recalculateOfflineRanks(teams: ChampionshipTeam[]) {
  const sorted = [...teams].sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    if (b.items_sold !== a.items_sold) return b.items_sold - a.items_sold;
    if (b.renewals !== a.renewals) return b.renewals - a.renewals;
    if (a.losses !== b.losses) return a.losses - b.losses;
    return a.label.localeCompare(b.label);
  });

  const now = new Date().toISOString();

  return sorted.map((team, index) => ({
    ...team,
    previous_rank: team.current_rank ?? null,
    current_rank: index + 1,
    updated_at: now,
  }));
}

function updateOfflineTeamStats(teamId: string, eventType: ChampionshipEvent['event_type'], points: number, direction: 1 | -1) {
  const currentTeams = getOfflineTeams();
  const updatedTeams = currentTeams.map((team) => {
    if (team.team_id !== teamId) return team;

    const nextTeam: ChampionshipTeam = {
      ...team,
      total_points: team.total_points + points * direction,
      renewals: team.renewals,
      losses: team.losses,
      items_sold: team.items_sold,
    };

    if (eventType === 'RENEWAL') {
      nextTeam.renewals = Math.max(0, team.renewals + direction);
    } else if (eventType === 'LOSS') {
      nextTeam.losses = Math.max(0, team.losses + direction);
    } else if (eventType === 'ITEM_SOLD') {
      nextTeam.items_sold = Math.max(0, team.items_sold + direction);
    }

    return nextTeam;
  });

  const rankedTeams = recalculateOfflineRanks(updatedTeams);
  writeOfflineTeams(rankedTeams);
  return rankedTeams;
}

function createOfflineEvent(
  event: {
    team_id: string;
    event_type: ChampionshipEvent['event_type'];
    points: number;
    description?: string;
    item_label?: string;
    client_name?: string;
  },
  createdBy: string | null,
) {
  const offlineEvent: ChampionshipEvent = {
    id: crypto.randomUUID(),
    team_id: event.team_id,
    event_type: event.event_type,
    points: event.points,
    description: event.description ?? null,
    item_label: event.item_label ?? null,
    client_name: event.client_name ?? null,
    created_by: createdBy,
    created_at: new Date().toISOString(),
    creator_name: 'Usuário',
  };

  appendOfflineItem('championship_events', offlineEvent, CHAMPIONSHIP_OFFLINE_BUCKET);
  updateOfflineTeamStats(event.team_id, event.event_type, event.points, 1);
  return offlineEvent;
}

// Scoring rules
export const SCORING_RULES = {
  RENEWAL: { points: 3, label: 'Renovação' },
  LOSS: { points: -2, label: 'Perda de Cliente' },
  ITEM_SOLD: { points: 1, label: 'Item Vendido' },
} as const;

export const SELLABLE_ITEMS = [
  { label: 'Agenda', value: 'agenda' },
  { label: 'CRM', value: 'crm' },
  { label: 'Atriz', value: 'atriz' },
  { label: 'Social Selling', value: 'social_selling' },
  { label: 'IA', value: 'ia' },
  { label: 'ID Visual', value: 'id_visual' },
  { label: 'Story Vendedor', value: 'story_vendedor' },
  { label: 'Linktree', value: 'linktree' },
] as const;

export function useChampionshipTeams() {
  return useQuery({
    queryKey: ['championship-teams'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('championship_teams')
          .select('*')
          .order('current_rank', { ascending: true });

        if (error) throw error;
        const onlineTeams = data ?? [];
        const { data: onlineEvents, error: eventsError } = await supabase
          .from('championship_events')
          .select('*')
          .order('created_at', { ascending: false });

        if (eventsError) throw eventsError;

        const eventLedger = onlineEvents ?? [];
        const rankedTeams = rankChampionshipTeams(applyChampionshipEventsToTeams(onlineTeams, eventLedger));
        writeOfflineCollection('championship_teams', rankedTeams, CHAMPIONSHIP_OFFLINE_BUCKET);
        writeOfflineCollection('championship_events', eventLedger, CHAMPIONSHIP_OFFLINE_BUCKET);
        return rankedTeams;
      } catch {
        return getOfflineTeams().sort((a, b) => a.current_rank - b.current_rank);
      }
    },
  });
}

export function useChampionshipEvents(limit = 20) {
  return useQuery({
    queryKey: ['championship-events', limit],
    queryFn: async () => {
      try {
        const { data: events, error } = await supabase
          .from('championship_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;

        const creatorIds = [...new Set((events ?? []).map((event) => event.created_by).filter(Boolean))];
        let profilesMap: Record<string, string> = {};

        if (creatorIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', creatorIds);

          if (profiles) {
            profilesMap = Object.fromEntries(profiles.map((profile) => [profile.id, profile.full_name]));
          }
        }

        const onlineEvents = (events ?? []).map((event) => ({
          ...event,
          creator_name: event.created_by ? profilesMap[event.created_by] || 'Usuário' : 'Sistema',
        })) as ChampionshipEvent[];

        writeOfflineCollection('championship_events', onlineEvents, CHAMPIONSHIP_OFFLINE_BUCKET);
        return onlineEvents
          .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
          .slice(0, limit);
      } catch {
        return getOfflineEvents()
          .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
          .slice(0, limit);
      }
    },
  });
}

export function useChampionshipMonthlyHistory(teamId?: string) {
  return useQuery({
    queryKey: ['championship-monthly-history', teamId],
    queryFn: async () => {
      try {
        let query = supabase
          .from('championship_monthly_history')
          .select('*')
          .order('month', { ascending: true });

        if (teamId) {
          query = query.eq('team_id', teamId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as ChampionshipMonthlyHistory[];
      } catch {
        const offlineHistory = readOfflineCollection<ChampionshipMonthlyHistory>('championship_monthly_history', CHAMPIONSHIP_OFFLINE_BUCKET);
        return teamId ? offlineHistory.filter((history) => history.team_id === teamId) : offlineHistory;
      }
    },
  });
}

export function useCreateChampionshipEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (event: {
      team_id: string;
      event_type: 'RENEWAL' | 'LOSS' | 'ITEM_SOLD';
      points: number;
      description?: string;
      item_label?: string;
      client_name?: string;
    }) => {
      try {
        const { data: eventData, error: eventError } = await supabase
          .from('championship_events')
          .insert({
            ...event,
            created_by: user?.id,
          })
          .select()
          .single();

        if (eventError) throw eventError;
        return eventData as ChampionshipEvent;
      } catch (error) {
        if (!isLocalDataFallbackEnabled()) {
          console.error('Erro ao registrar evento do campeonato:', error);
          throw error;
        }

        const offlineEvent = createOfflineEvent(event, user?.id ?? null);
        return offlineEvent;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['championship-teams'] });
      queryClient.invalidateQueries({ queryKey: ['championship-events'] });
    },
  });
}

export function useDeleteChampionshipEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: ChampionshipEvent) => {
      try {
        const { error: deleteError } = await supabase
          .from('championship_events')
          .delete()
          .eq('id', event.id);

        if (deleteError) throw deleteError;
      } catch (error) {
        if (!isLocalDataFallbackEnabled()) {
          console.error('Erro ao remover evento do campeonato:', error);
          throw error;
        }

        removeOfflineItem<ChampionshipEvent>('championship_events', event.id, CHAMPIONSHIP_OFFLINE_BUCKET);
        updateOfflineTeamStats(event.team_id, event.event_type, event.points, -1);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['championship-teams'] });
      queryClient.invalidateQueries({ queryKey: ['championship-events'] });
    },
  });
}

function resetOfflineChampionshipTeams() {
  const teams = getOfflineTeams().map((team) => ({
    ...team,
    total_points: 0,
    renewals: 0,
    losses: 0,
    items_sold: 0,
    previous_rank: null,
    current_rank: team.label === 'Equipe 7' ? 1 : 2,
    updated_at: new Date().toISOString(),
  }));

  writeOfflineCollection('championship_teams', teams, CHAMPIONSHIP_OFFLINE_BUCKET);
}

export function useClearChampionshipEventsHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        const { data: events, error: fetchError } = await supabase
          .from('championship_events')
          .select('id');

        if (fetchError) throw fetchError;

        const eventIds = (events ?? []).map((event) => event.id);
        if (eventIds.length > 0) {
          const { error } = await supabase
          .from('championship_events')
            .delete()
            .in('id', eventIds);

          if (error) throw error;
        }
      } catch (error) {
        if (!isLocalDataFallbackEnabled()) {
          console.error('Erro ao limpar histórico do campeonato:', error);
          throw error;
        }

        writeOfflineCollection('championship_events', [], CHAMPIONSHIP_OFFLINE_BUCKET);
        resetOfflineChampionshipTeams();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['championship-teams'] });
      queryClient.invalidateQueries({ queryKey: ['championship-events'] });
    },
  });
}
