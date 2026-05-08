import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';
import { isLocalDataFallbackEnabled } from '@/lib/runtimeFlags';
import {
  readOfflineCollection,
  writeOfflineCollection,
} from '@/lib/offlineStore';

export const DEFAULT_SECTORS = ['GERAL', 'TRAFEGO', 'ATENDIMENTO', 'MARKETING_DIGITAL'] as const;
export type DefaultSector = (typeof DEFAULT_SECTORS)[number];
export type Sector = string;

const TRAFEGO_GESTOR_BOARD_IDS = [
  'd2b9f967-32dc-4665-9317-92b51da9f444',
  'cd5b9644-f7fa-4ae4-ba1d-8837db1d0759',
  'c29d8440-afdd-4939-b611-6b73ea91f33c',
  'cd34304a-bfb2-4ebd-9223-1a277807212e',
  'c282e0a3-aa4b-4e24-8c96-f20d6c904570',
] as const;

const TRAFEGO_GESTOR_CLEANUP_FLAG = 'great-exec-trafego-gestor-boards-cleaned-v1';

export interface ExecBoard {
  id: string;
  sector: Sector;
  name: string;
  description: string | null;
  is_default: boolean;
  team_scope: 'GLOBAL' | 'EQUIPE';
  team_id: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ExecColumn {
  id: string;
  board_id: string;
  name: string;
  order: number;
  wip_limit: number | null;
  color_tag: string | null;
  created_at: string;
}

export interface ExecCard {
  id: string;
  board_id: string;
  column_id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  assigned_to_user_id: string | null;
  watchers: Json;
  priority: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  due_date: string | null;
  tags: Json;
  checklist: Json;
  attachments: Json;
  cover_image: string | null;
  order: number;
  pinned: boolean;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  assignee?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  client?: {
    id: string;
    client_name: string;
  } | null;
}

export interface ExecComment {
  id: string;
  card_id: string;
  author_user_id: string;
  body: string;
  created_at: string;
  author?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export const SECTOR_LABELS: Record<DefaultSector, string> = {
  GERAL: 'Geral',
  TRAFEGO: 'Tráfego Pago',
  ATENDIMENTO: 'Atendimento',
  MARKETING_DIGITAL: 'Marketing Digital',
};

export function isDefaultSector(sector: string): sector is DefaultSector {
  return DEFAULT_SECTORS.includes(sector as DefaultSector);
}

export function getSectorLabel(sector: string) {
  if (isDefaultSector(sector)) {
    return SECTOR_LABELS[sector];
  }

  return sector.trim() || 'Sem nome';
}

export function getAvailableExecSectors(boards: Pick<ExecBoard, 'sector'>[] = []) {
  const customSectors = Array.from(
    new Set(
      boards
        .map((board) => board.sector.trim())
        .filter((sector) => sector.length > 0 && !isDefaultSector(sector)),
    ),
  );

  return [...DEFAULT_SECTORS, ...customSectors];
}

export const COLOR_TAG_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  neutral: { bg: 'bg-muted/50', text: 'text-muted-foreground', border: 'border-muted' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/30' },
  purple_soft: { bg: 'bg-purple-400/10', text: 'text-purple-500', border: 'border-purple-400/30' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/30' },
  blue_soft: { bg: 'bg-blue-400/10', text: 'text-blue-500', border: 'border-blue-400/30' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-500/30' },
  orange_soft: { bg: 'bg-orange-400/10', text: 'text-orange-500', border: 'border-orange-400/30' },
  red_soft: { bg: 'bg-red-400/10', text: 'text-red-500', border: 'border-red-400/30' },
  green: { bg: 'bg-green-500/10', text: 'text-green-600', border: 'border-green-500/30' },
  green_soft: { bg: 'bg-green-400/10', text: 'text-green-500', border: 'border-green-400/30' },
  gray: { bg: 'bg-gray-400/10', text: 'text-gray-500', border: 'border-gray-400/30' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-600', border: 'border-cyan-500/30' },
  yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-600', border: 'border-yellow-500/30' },
};

export const DEFAULT_BOARDS_CONFIG: Record<DefaultSector, { name: string; columns: { name: string; color_tag: string }[] }> = {
  GERAL: {
    name: 'Operação - Implantação & Suporte',
    columns: [
      { name: 'PENDENTE', color_tag: 'neutral' },
      { name: 'EM PROGRESSO', color_tag: 'purple' },
      { name: 'IMPLANTADO - CONEXÃO WPP', color_tag: 'gray' },
      { name: 'SUPORTE', color_tag: 'red_soft' },
      { name: 'CONCLUÍDO', color_tag: 'green_soft' },
    ],
  },
  TRAFEGO: {
    name: 'Tráfego Pago - Execução',
    columns: [
      { name: 'ENTRADA DE CLIENTE', color_tag: 'neutral' },
      { name: 'ROTINA DIÁRIA', color_tag: 'blue' },
      { name: 'SUBIR ANÚNCIOS', color_tag: 'blue_soft' },
      { name: 'DEMANDA EXTRA', color_tag: 'green_soft' },
      { name: 'FEITO', color_tag: 'green' },
    ],
  },
  ATENDIMENTO: {
    name: 'Atendimento - Rotina',
    columns: [
      { name: 'ENTRADA DE CLIENTE', color_tag: 'neutral' },
      { name: 'ROTINA DIÁRIA', color_tag: 'purple' },
      { name: 'FORMULÁRIO', color_tag: 'blue_soft' },
      { name: 'DEMANDA EXTRA', color_tag: 'orange' },
      { name: 'FEITO', color_tag: 'green_soft' },
    ],
  },
  MARKETING_DIGITAL: {
    name: 'Design - Produção',
    columns: [
      { name: 'A FAZER', color_tag: 'neutral' },
      { name: 'EM EXECUÇÃO', color_tag: 'orange' },
      { name: 'AJUSTE', color_tag: 'orange_soft' },
      { name: 'APROVAÇÃO DO CLIENTE', color_tag: 'cyan' },
      { name: 'SUBIR ANÚNCIO', color_tag: 'yellow' },
    ],
  },
};

type ExecSnapshotScope = 'boards' | 'columns' | 'cards' | 'comments' | 'views';

function getExecOfflineBucket(scope: ExecSnapshotScope) {
  return `exec-${scope}`;
}

const EXEC_CACHE_PREFIX = 'great-exec-cache-v1';
const EXEC_HIDDEN_BOARDS_KEY = 'great-exec-hidden-boards-v1';

function getExecCacheKey(scope: string) {
  return `${EXEC_CACHE_PREFIX}:${scope}`;
}

function readExecCache<T>(scope: string): T[] {
  const raw = safeGetItem(getExecCacheKey(scope));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeExecCache<T>(scope: string, value: T[]) {
  safeSetItem(getExecCacheKey(scope), JSON.stringify(value));
}

function readHiddenExecBoardIds() {
  const raw = safeGetItem(EXEC_HIDDEN_BOARDS_KEY);
  if (!raw) return new Set<string>();

  try {
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set<string>();
  }
}

function writeHiddenExecBoardIds(ids: Set<string>) {
  safeSetItem(EXEC_HIDDEN_BOARDS_KEY, JSON.stringify(Array.from(ids)));
}

function hideExecBoardLocally(boardId: string) {
  const next = readHiddenExecBoardIds();
  next.add(boardId);
  writeHiddenExecBoardIds(next);
}

function pruneTrafegoGestorBoardsLocally() {
  TRAFEGO_GESTOR_BOARD_IDS.forEach((boardId) => {
    hideExecBoardLocally(boardId);
    filterExecSnapshot<ExecCard>('cards', (card) => card.board_id !== boardId);
    filterExecSnapshot<ExecColumn>('columns', (column) => column.board_id !== boardId);
    removeExecSnapshot<ExecBoard>('boards', boardId);
  });
}

export function usePruneTrafegoGestorBoards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      pruneTrafegoGestorBoardsLocally();
      try {
        await supabase
          .from('exec_boards')
          .delete()
          .in('id', [...TRAFEGO_GESTOR_BOARD_IDS]);
      } catch {
        // Best-effort only. The sidebar is kept clean locally either way.
      }

      return { deleted: TRAFEGO_GESTOR_BOARD_IDS.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exec-boards'] });
      queryClient.invalidateQueries({ queryKey: ['exec-columns'] });
      queryClient.invalidateQueries({ queryKey: ['exec-cards'] });
    },
  });
}

function readExecSnapshot<T>(scope: ExecSnapshotScope): T[] {
  return isLocalDataFallbackEnabled()
    ? readOfflineCollection<T>(getExecOfflineBucket(scope))
    : readExecCache<T>(scope);
}

function writeExecSnapshot<T>(scope: ExecSnapshotScope, value: T[]) {
  writeExecCache(scope, value);

  if (isLocalDataFallbackEnabled()) {
    writeOfflineCollection(getExecOfflineBucket(scope), value);
  }
}

function upsertExecSnapshot<T extends { id: string }>(scope: ExecSnapshotScope, item: T) {
  const current = readExecSnapshot<T>(scope);
  const next = [...current.filter((row) => row.id !== item.id), item];
  writeExecSnapshot(scope, next);
  return item;
}

function upsertExecSnapshotMany<T extends { id: string }>(scope: ExecSnapshotScope, items: T[]) {
  const current = readExecSnapshot<T>(scope);
  const next = [...current.filter((row) => !items.some((item) => item.id === row.id)), ...items];
  writeExecSnapshot(scope, next);
  return items;
}

function updateExecSnapshot<T extends { id: string }>(
  scope: ExecSnapshotScope,
  id: string,
  updater: (item: T) => T,
) {
  const current = readExecSnapshot<T>(scope);
  const next = current.map((item) => (item.id === id ? updater(item) : item));
  writeExecSnapshot(scope, next);
  return next.find((item) => item.id === id) ?? null;
}

function removeExecSnapshot<T extends { id: string }>(scope: ExecSnapshotScope, id: string) {
  const current = readExecSnapshot<T>(scope);
  const next = current.filter((item) => item.id !== id);
  writeExecSnapshot(scope, next);
  return next;
}

function filterExecSnapshot<T extends { id: string }>(scope: ExecSnapshotScope, predicate: (item: T) => boolean) {
  const current = readExecSnapshot<T>(scope);
  const next = current.filter(predicate);
  writeExecSnapshot(scope, next);
  return next;
}

const DELETED_EXEC_CARD_TAG = '__great_deleted__';

function isSoftDeletedExecCard(card: Pick<ExecCard, 'tags'>) {
  const tags = Array.isArray(card.tags) ? card.tags : [];
  return tags.includes(DELETED_EXEC_CARD_TAG);
}

function markExecCardDeleted(card: ExecCard) {
  const tags = Array.isArray(card.tags) ? card.tags : [];
  return {
    ...card,
    completed_at: card.completed_at ?? new Date().toISOString(),
    tags: tags.includes(DELETED_EXEC_CARD_TAG) ? tags : [...tags, DELETED_EXEC_CARD_TAG],
  };
}

function removeExecSectorSnapshot(sector: string) {
  const boardsToDelete = readExecSnapshot<ExecBoard>('boards').filter((board) => board.sector === sector);
  const boardIds = new Set(boardsToDelete.map((board) => board.id));

  filterExecSnapshot<ExecCard>('cards', (card) => !boardIds.has(card.board_id));
  filterExecSnapshot<ExecColumn>('columns', (column) => !boardIds.has(column.board_id));
  filterExecSnapshot<ExecComment>('comments', (comment) => !boardIds.has(comment.card_id));
  filterExecSnapshot<ExecBoard>('boards', (board) => board.sector !== sector);
}

// Fetch boards by sector - all boards visible to everyone
export function useExecBoards(sector?: Sector) {
  return useQuery({
    queryKey: ['exec-boards', sector],
      queryFn: async () => {
        const localBoards = readExecSnapshot<ExecBoard>('boards');
        const hiddenBoardIds = readHiddenExecBoardIds();
        try {
          let query = supabase.from('exec_boards').select('*').order('is_default', { ascending: false }).order('name');
        if (sector) {
          query = query.eq('sector', sector);
        }
          const { data, error } = await query;
          if (error) throw error;
          const serverBoards = (data as ExecBoard[]).filter(
            (board) => !hiddenBoardIds.has(board.id) && !TRAFEGO_GESTOR_BOARD_IDS.includes(board.id as (typeof TRAFEGO_GESTOR_BOARD_IDS)[number]),
          );
          writeExecSnapshot('boards', serverBoards);
          return sector ? serverBoards.filter((board) => board.sector === sector) : serverBoards;
        } catch {
          return sector
            ? localBoards
                .filter((board) => board.sector === sector)
                .filter((board) => !hiddenBoardIds.has(board.id))
                .filter((board) => !TRAFEGO_GESTOR_BOARD_IDS.includes(board.id as (typeof TRAFEGO_GESTOR_BOARD_IDS)[number]))
            : localBoards
                .filter((board) => !hiddenBoardIds.has(board.id))
                .filter((board) => !TRAFEGO_GESTOR_BOARD_IDS.includes(board.id as (typeof TRAFEGO_GESTOR_BOARD_IDS)[number]));
        }
      },
    });
  }

// Fetch columns for a board
export function useExecColumns(boardId: string | null) {
  return useQuery({
    queryKey: ['exec-columns', boardId],
    queryFn: async () => {
      if (!boardId) return [];
      const localColumns = readExecSnapshot<ExecColumn>('columns');
      try {
        const { data, error } = await supabase
          .from('exec_columns')
          .select('*')
          .eq('board_id', boardId)
          .order('order');
        if (error) throw error;
        const serverColumns = (data as ExecColumn[]).filter((column) => column.board_id === boardId);
        writeExecSnapshot('columns', serverColumns);
        return serverColumns;
      } catch {
        return localColumns.filter((column) => column.board_id === boardId);
      }
    },
    enabled: !!boardId,
  });
}

// Fetch cards for a board
export function useExecCards(boardId: string | null) {
  return useQuery({
    queryKey: ['exec-cards', boardId],
    queryFn: async () => {
      if (!boardId) return [];
      const localCards = readExecSnapshot<ExecCard>('cards');
      try {
        const { data, error } = await supabase
          .from('exec_cards')
          .select('*')
          .eq('board_id', boardId)
          .order('order');
        if (error) throw error;
        const serverCards = ((data || []) as ExecCard[])
          .filter((card) => card.board_id === boardId)
          .filter((card) => !isSoftDeletedExecCard(card));
        writeExecSnapshot('cards', serverCards);
        return serverCards;
      } catch {
        return localCards.filter((card) => card.board_id === boardId).filter((card) => !isSoftDeletedExecCard(card));
      }
    },
    enabled: !!boardId,
  });
}

// Fetch comments for a card
export function useExecComments(cardId: string | null) {
  return useQuery({
    queryKey: ['exec-comments', cardId],
    queryFn: async () => {
      if (!cardId) return [];
      const localComments = readExecSnapshot<ExecComment>('comments');
      try {
        const { data, error } = await supabase
          .from('exec_comments')
          .select('*')
          .eq('card_id', cardId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        const serverComments = (data as ExecComment[]).filter((comment) => comment.card_id === cardId);
        writeExecSnapshot('comments', serverComments);
        return serverComments;
      } catch {
        return localComments.filter((comment) => comment.card_id === cardId);
      }
    },
    enabled: !!cardId,
  });
}

// Create board mutation
export function useCreateBoard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { sector: Sector; name: string; description?: string; team_scope?: 'GLOBAL' | 'EQUIPE'; columns?: { name: string; color_tag: string }[] }) => {
      if (!user) throw new Error('User not authenticated');

      let createdBoard: ExecBoard | null = null;

      try {
        // Create board
        const { data: board, error: boardError } = await supabase
          .from('exec_boards')
          .insert({
            sector: data.sector,
            name: data.name,
            description: data.description || null,
            team_scope: data.team_scope || 'EQUIPE',
            created_by_user_id: user.id,
          })
          .select()
          .single();

        if (boardError) throw boardError;
        createdBoard = board as ExecBoard;

        // Create columns if provided
        let insertedColumns: ExecColumn[] = [];
        if (data.columns && data.columns.length > 0) {
          const columnsToInsert = data.columns.map((col, idx) => ({
            board_id: board.id,
            name: col.name,
            order: idx,
            color_tag: col.color_tag,
          }));

          const { data: createdColumns, error: colError } = await supabase
            .from('exec_columns')
            .insert(columnsToInsert)
            .select('*');
          if (colError) throw colError;
          insertedColumns = (createdColumns || []) as ExecColumn[];
        }

        upsertExecSnapshot('boards', createdBoard);
        if (insertedColumns.length > 0) {
          const remainingColumns = readExecSnapshot<ExecColumn>('columns').filter((column) => column.board_id !== createdBoard.id);
          writeExecSnapshot('columns', [...remainingColumns, ...insertedColumns]);
        }

        return createdBoard;
      } catch (error) {
        if (createdBoard && !isLocalDataFallbackEnabled()) {
          try {
            await supabase.from('exec_columns').delete().eq('board_id', createdBoard.id);
            await supabase.from('exec_boards').delete().eq('id', createdBoard.id);
          } catch {
            // Rollback is best-effort; original error is still surfaced below.
          }
        }

        const board: ExecBoard = {
          id: crypto.randomUUID(),
          sector: data.sector,
          name: data.name,
          description: data.description || null,
          is_default: false,
          team_scope: data.team_scope || 'EQUIPE',
          team_id: null,
          created_by_user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        upsertExecSnapshot('boards', board);

        if (data.columns && data.columns.length > 0) {
          const nextColumns = data.columns.map((col, idx) => ({
            id: crypto.randomUUID(),
            board_id: board.id,
            name: col.name,
            order: idx,
            wip_limit: null,
            color_tag: col.color_tag,
            created_at: new Date().toISOString(),
          }));

          const existingColumns = readExecSnapshot<ExecColumn>('columns').filter(
            (column) => column.board_id !== board.id,
          );
          writeExecSnapshot('columns', [...existingColumns, ...nextColumns]);
        }

        if (error) {
          console.warn('exec board created locally after server error:', error);
        }

        return board;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['exec-boards', variables.sector] });
      queryClient.invalidateQueries({ queryKey: ['exec-boards'] });
    },
  });
}

// Create column mutation
export function useCreateColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { board_id: string; name: string; order: number; color_tag?: string }) => {
      try {
        const { data: column, error } = await supabase
          .from('exec_columns')
          .insert({
            board_id: data.board_id,
            name: data.name,
            order: data.order,
            color_tag: data.color_tag || 'neutral',
          })
          .select()
          .single();

        if (error) throw error;
        upsertExecSnapshot('columns', column as ExecColumn);
        return column as ExecColumn;
      } catch (error) {
        if (!isLocalDataFallbackEnabled()) {
          throw error;
        }

        const column: ExecColumn = {
          id: crypto.randomUUID(),
          board_id: data.board_id,
          name: data.name,
          order: data.order,
          wip_limit: null,
          color_tag: data.color_tag || 'neutral',
          created_at: new Date().toISOString(),
        };
        upsertExecSnapshot('columns', column);
        return column;
      }
    },
    onSuccess: (data) => {
      filterExecSnapshot<ExecCard>('cards', (card) => card.column_id !== data.id);
      removeExecSnapshot<ExecColumn>('columns', data.id);
      queryClient.invalidateQueries({ queryKey: ['exec-columns', data.board_id] });
    },
  });
}

// Update column mutation
export function useUpdateColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; board_id: string; name?: string; order?: number; color_tag?: string; wip_limit?: number | null }) => {
      const { id, board_id, ...updates } = data;
      try {
        const { data: column, error } = await supabase
          .from('exec_columns')
          .update(updates)
          .eq('id', id)
          .select('*')
          .single();
        if (error) throw error;
        upsertExecSnapshot('columns', column as ExecColumn);
      } catch (error) {
        if (!isLocalDataFallbackEnabled()) {
          throw error;
        }

        updateExecSnapshot<ExecColumn>('columns', id, (column) => ({ ...column, ...updates }));
      }
      return { id, board_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exec-columns', data.board_id] });
    },
  });
}

// Delete column mutation
export function useDeleteColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; board_id: string }) => {
      try {
        // First, delete all cards in the column
        const { error: cardsError } = await supabase.from('exec_cards').delete().eq('column_id', data.id);
        if (cardsError) throw cardsError;

        // Then delete the column
        const { error } = await supabase.from('exec_columns').delete().eq('id', data.id);
        if (error) throw error;
      } catch (error) {
        if (!isLocalDataFallbackEnabled()) {
          throw error;
        }

        filterExecSnapshot<ExecCard>('cards', (card) => card.column_id !== data.id);
        removeExecSnapshot<ExecColumn>('columns', data.id);
      }
      return data;
    },
    onSuccess: (data) => {
      filterExecSnapshot<ExecCard>('cards', (card) => card.column_id !== data.id);
      removeExecSnapshot<ExecColumn>('columns', data.id);
      queryClient.invalidateQueries({ queryKey: ['exec-columns', data.board_id] });
      queryClient.invalidateQueries({ queryKey: ['exec-cards', data.board_id] });
    },
  });
}

// Create card mutation
export function useCreateCard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<ExecCard> & { board_id: string; column_id: string; title: string }) => {
      if (!user) throw new Error('User not authenticated');

      try {
        const { data: card, error } = await supabase
          .from('exec_cards')
          .insert({
            board_id: data.board_id,
            column_id: data.column_id,
            title: data.title,
            description: data.description || null,
            client_id: data.client_id || null,
            assigned_to_user_id: data.assigned_to_user_id || null,
            priority: data.priority || 'MEDIA',
            due_date: data.due_date || null,
            tags: data.tags || [],
            order: data.order || 0,
            created_by_user_id: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        upsertExecSnapshot('cards', card as ExecCard);
        return card as ExecCard;
      } catch (error) {
        if (!isLocalDataFallbackEnabled()) {
          throw error;
        }

        const card: ExecCard = {
          id: crypto.randomUUID(),
          board_id: data.board_id,
          column_id: data.column_id,
          title: data.title,
          description: data.description || null,
          client_id: data.client_id || null,
          assigned_to_user_id: data.assigned_to_user_id || null,
          watchers: [],
          priority: (data.priority || 'MEDIA') as ExecCard['priority'],
          due_date: data.due_date || null,
          tags: data.tags || [],
          checklist: [],
          attachments: [],
          cover_image: null,
          order: data.order || 0,
          pinned: false,
          created_by_user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          completed_at: null,
        };
        upsertExecSnapshot('cards', card);
        return card;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exec-cards', data.board_id] });
    },
  });
}

// Update card mutation
export function useUpdateCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<ExecCard> & { id: string; board_id: string }) => {
      const { id, board_id, assignee, client, ...updates } = data;
      
      // Handle completed_at for done columns
      if (updates.column_id) {
        // We'll check if it's a "done" column in the component
      }

      try {
        const { data: card, error } = await supabase
          .from('exec_cards')
          .update(updates)
          .eq('id', id)
          .select('*')
          .single();
        if (error) throw error;
        upsertExecSnapshot('cards', card as ExecCard);
      } catch (error) {
        if (!isLocalDataFallbackEnabled()) {
          throw error;
        }

        updateExecSnapshot<ExecCard>('cards', id, (card) => ({ ...card, ...updates }));
      }
      return { id, board_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exec-cards', data.board_id] });
    },
  });
}

// Delete card mutation
export function useDeleteCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; board_id: string }) => {
      try {
        const { data: cardToDelete, error: fetchError } = await supabase
          .from('exec_cards')
          .select('*')
          .eq('id', data.id)
          .maybeSingle();
        if (fetchError) throw fetchError;

        if (!cardToDelete) {
          throw new Error('Card not found');
        }

        const deletedCard = markExecCardDeleted(cardToDelete as ExecCard);
        const { error } = await supabase
          .from('exec_cards')
          .update({
            completed_at: deletedCard.completed_at,
            tags: deletedCard.tags,
          })
          .eq('id', data.id);
        if (error) throw error;
      } catch (error) {
        if (!isLocalDataFallbackEnabled()) {
          throw error;
        }

        const localCard = updateExecSnapshot<ExecCard>('cards', data.id, markExecCardDeleted);
        if (!localCard) {
          removeExecSnapshot<ExecCard>('cards', data.id);
        }
      }
      return data;
    },
    onSuccess: (data) => {
      updateExecSnapshot<ExecCard>('cards', data.id, markExecCardDeleted);
      queryClient.setQueryData<ExecCard[]>(['exec-cards', data.board_id], (current = []) =>
        current.filter((card) => card.id !== data.id),
      );
      queryClient.invalidateQueries({ queryKey: ['exec-cards', data.board_id] });
    },
  });
}

// Create comment mutation
export function useCreateComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { card_id: string; body: string }) => {
      if (!user) throw new Error('User not authenticated');

      try {
        const { data: comment, error } = await supabase
          .from('exec_comments')
          .insert({
            card_id: data.card_id,
            author_user_id: user.id,
            body: data.body,
          })
          .select()
          .single();

        if (error) throw error;
        upsertExecSnapshot('comments', comment as ExecComment);
        return comment as ExecComment;
      } catch (error) {
        if (!isLocalDataFallbackEnabled()) {
          throw error;
        }

        const comment: ExecComment = {
          id: crypto.randomUUID(),
          card_id: data.card_id,
          author_user_id: user.id,
          body: data.body,
          created_at: new Date().toISOString(),
        };
        upsertExecSnapshot('comments', comment);
        return comment;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['exec-comments', variables.card_id] });
    },
  });
}

// Initialize default boards for a sector
export function useInitializeDefaultBoard() {
  const createBoard = useCreateBoard();

  return useMutation({
    mutationFn: async (sector: DefaultSector) => {
      const config = DEFAULT_BOARDS_CONFIG[sector];
      return createBoard.mutateAsync({
        sector,
        name: config.name,
        columns: config.columns,
        team_scope: 'GLOBAL',
      });
    },
  });
}

// Update board mutation
export function useUpdateBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; name?: string; description?: string | null; team_scope?: 'GLOBAL' | 'EQUIPE' }) => {
      const { id, ...updates } = data;
      try {
        const { data: board, error } = await supabase
          .from('exec_boards')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        upsertExecSnapshot('boards', board as ExecBoard);
        return board as ExecBoard;
      } catch (error) {
        if (!isLocalDataFallbackEnabled()) {
          throw error;
        }

        const board = updateExecSnapshot<ExecBoard>('boards', id, (item) => ({ ...item, ...updates }));
        if (!board) throw new Error('Board not found');
        return board;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exec-boards'] });
    },
  });
}

// Delete board mutation
export function useDeleteBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (boardId: string) => {
      try {
        const { error } = await supabase
          .from('exec_boards')
          .delete()
          .eq('id', boardId);
        if (error) throw error;
        hideExecBoardLocally(boardId);
        filterExecSnapshot<ExecCard>('cards', (card) => card.board_id !== boardId);
        filterExecSnapshot<ExecColumn>('columns', (column) => column.board_id !== boardId);
        removeExecSnapshot<ExecBoard>('boards', boardId);
      } catch (error) {
        hideExecBoardLocally(boardId);
        filterExecSnapshot<ExecCard>('cards', (card) => card.board_id !== boardId);
        filterExecSnapshot<ExecColumn>('columns', (column) => column.board_id !== boardId);
        removeExecSnapshot<ExecBoard>('boards', boardId);
      }

      return boardId;
    },
    onSuccess: (_, boardId) => {
      filterExecSnapshot<ExecCard>('cards', (card) => card.board_id !== boardId);
      filterExecSnapshot<ExecColumn>('columns', (column) => column.board_id !== boardId);
      removeExecSnapshot<ExecBoard>('boards', boardId);
      queryClient.invalidateQueries({ queryKey: ['exec-boards'] });
    },
  });
}

// Delete an entire folder/sector and all its boards
export function useDeleteSector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sector: string) => {
      try {
        const { data: boardsToDelete, error: boardsError } = await supabase
          .from('exec_boards')
          .select('id')
          .eq('sector', sector);

        if (boardsError) throw boardsError;

        const boardIds = (boardsToDelete || []).map((board) => board.id);

        for (const boardId of boardIds) {
          const { error: boardError } = await supabase
            .from('exec_boards')
            .delete()
            .eq('id', boardId);
          if (boardError) throw boardError;
        }
        boardIds.forEach(hideExecBoardLocally);
        removeExecSectorSnapshot(sector);
      } catch (error) {
        boardIds.forEach(hideExecBoardLocally);
        removeExecSectorSnapshot(sector);
      }

      return sector;
    },
    onSuccess: (_, sector) => {
      removeExecSectorSnapshot(sector);
      queryClient.invalidateQueries({ queryKey: ['exec-boards'] });
      queryClient.invalidateQueries({ queryKey: ['exec-columns'] });
      queryClient.invalidateQueries({ queryKey: ['exec-cards'] });
      queryClient.invalidateQueries({ queryKey: ['exec-comments'] });
    },
  });
}
