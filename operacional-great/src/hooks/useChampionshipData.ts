import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { appendOfflineItem, mergeOfflineCollections, readOfflineCollection, removeOfflineItem, writeOfflineCollection } from '@/lib/offlineStore';

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
    team_id: 'equipe-7',
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
    team_id: 'tropa-de-elite',
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
  existingEvent?: ChampionshipEvent | null,
) {
  const offlineEvent: ChampionshipEvent = {
    id: existingEvent?.id ?? crypto.randomUUID(),
    team_id: event.team_id,
    event_type: event.event_type,
    points: event.points,
    description: event.description ?? null,
    item_label: event.item_label ?? null,
    client_name: event.client_name ?? null,
    created_by: createdBy,
    created_at: existingEvent?.created_at ?? new Date().toISOString(),
    creator_name: existingEvent?.creator_name ?? 'Usuário',
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
        const offlineTeams = getOfflineTeams();
        const existingTeamIds = new Set(onlineTeams.map((team) => team.team_id));
        const mergedTeams = [
          ...onlineTeams,
          ...offlineTeams.filter((team) => !existingTeamIds.has(team.team_id)),
        ];

        return mergedTeams.sort((a, b) => a.current_rank - b.current_rank);
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

        return mergeOfflineCollections(onlineEvents, getOfflineEvents())
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
      let createdEvent: ChampionshipEvent | null = null;

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
        createdEvent = eventData as ChampionshipEvent;

        const { data: team, error: teamError } = await supabase
          .from('championship_teams')
          .select('*')
          .eq('team_id', event.team_id)
          .single();

        if (teamError) throw teamError;

        const updates: Partial<ChampionshipTeam> = {
          total_points: team.total_points + event.points,
        };

        if (event.event_type === 'RENEWAL') {
          updates.renewals = team.renewals + 1;
        } else if (event.event_type === 'LOSS') {
          updates.losses = team.losses + 1;
        } else if (event.event_type === 'ITEM_SOLD') {
          updates.items_sold = team.items_sold + 1;
        }

        const { error: updateError } = await supabase
          .from('championship_teams')
          .update(updates)
          .eq('team_id', event.team_id);

        if (updateError) throw updateError;

        const { data: allTeams } = await supabase
          .from('championship_teams')
          .select('*')
          .order('total_points', { ascending: false });

        if (allTeams) {
          for (let i = 0; i < allTeams.length; i++) {
            await supabase
              .from('championship_teams')
              .update({
                previous_rank: allTeams[i].current_rank,
                current_rank: i + 1,
              })
              .eq('id', allTeams[i].id);
          }
        }

        return createdEvent;
      } catch {
        const offlineEvent = createOfflineEvent(event, user?.id ?? null, createdEvent);
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

        const { data: team, error: teamError } = await supabase
          .from('championship_teams')
          .select('*')
          .eq('team_id', event.team_id)
          .single();

        if (teamError) throw teamError;

        const updates: Partial<ChampionshipTeam> = {
          total_points: team.total_points - event.points,
        };

        if (event.event_type === 'RENEWAL') {
          updates.renewals = Math.max(0, team.renewals - 1);
        } else if (event.event_type === 'LOSS') {
          updates.losses = Math.max(0, team.losses - 1);
        } else if (event.event_type === 'ITEM_SOLD') {
          updates.items_sold = Math.max(0, team.items_sold - 1);
        }

        const { error: updateError } = await supabase
          .from('championship_teams')
          .update(updates)
          .eq('team_id', event.team_id);

        if (updateError) throw updateError;

        const { data: allTeams } = await supabase
          .from('championship_teams')
          .select('*')
          .order('total_points', { ascending: false });

        if (allTeams) {
          for (let i = 0; i < allTeams.length; i++) {
            await supabase
              .from('championship_teams')
              .update({
                previous_rank: allTeams[i].current_rank,
                current_rank: i + 1,
              })
              .eq('id', allTeams[i].id);
          }
        }
      } catch {
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
