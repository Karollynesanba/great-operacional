import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';
import {
  appendOfflineItem,
  filterOfflineCollection,
  mergeOfflineCollections,
  readOfflineCollection,
  removeOfflineItem,
  updateOfflineItem,
  writeOfflineCollection,
} from '@/lib/offlineStore';

export const DEFAULT_SECTORS = ['GERAL', 'TRAFEGO', 'ATENDIMENTO', 'MARKETING_DIGITAL'] as const;
export type DefaultSector = (typeof DEFAULT_SECTORS)[number];
export type Sector = string;

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

function getExecOfflineBucket(scope: 'boards' | 'columns' | 'cards' | 'comments' | 'views') {
  return `exec-${scope}`;
}

// Fetch boards by sector - all boards visible to everyone
export function useExecBoards(sector?: Sector) {
  return useQuery({
    queryKey: ['exec-boards', sector],
    queryFn: async () => {
      const localBoards = readOfflineCollection<ExecBoard>(getExecOfflineBucket('boards'));
      try {
        let query = supabase.from('exec_boards').select('*').order('is_default', { ascending: false }).order('name');
        if (sector) {
          query = query.eq('sector', sector);
        }
        const { data, error } = await query;
        if (error) throw error;
        const merged = mergeOfflineCollections(data as ExecBoard[], localBoards);
        return sector ? merged.filter((board) => board.sector === sector) : merged;
      } catch {
        return sector ? localBoards.filter((board) => board.sector === sector) : localBoards;
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
      const localColumns = readOfflineCollection<ExecColumn>(getExecOfflineBucket('columns'));
      try {
        const { data, error } = await supabase
          .from('exec_columns')
          .select('*')
          .eq('board_id', boardId)
          .order('order');
        if (error) throw error;
        return mergeOfflineCollections(data as ExecColumn[], localColumns).filter((column) => column.board_id === boardId);
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
      const localCards = readOfflineCollection<ExecCard>(getExecOfflineBucket('cards'));
      try {
        const { data, error } = await supabase
          .from('exec_cards')
          .select('*')
          .eq('board_id', boardId)
          .order('order');
        if (error) throw error;
        return mergeOfflineCollections((data || []) as ExecCard[], localCards).filter((card) => card.board_id === boardId);
      } catch {
        return localCards.filter((card) => card.board_id === boardId);
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
      const localComments = readOfflineCollection<ExecComment>(getExecOfflineBucket('comments'));
      try {
        const { data, error } = await supabase
          .from('exec_comments')
          .select('*')
          .eq('card_id', cardId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        return mergeOfflineCollections(data as ExecComment[], localComments).filter((comment) => comment.card_id === cardId);
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

        // Create columns if provided
        if (data.columns && data.columns.length > 0) {
          const columnsToInsert = data.columns.map((col, idx) => ({
            board_id: board.id,
            name: col.name,
            order: idx,
            color_tag: col.color_tag,
          }));

          const { error: colError } = await supabase.from('exec_columns').insert(columnsToInsert);
          if (colError) throw colError;
        }

        return board as ExecBoard;
      } catch {
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

        appendOfflineItem(getExecOfflineBucket('boards'), board);

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

          const existingColumns = readOfflineCollection<ExecColumn>(getExecOfflineBucket('columns')).filter(
            (column) => column.board_id !== board.id,
          );
          writeOfflineCollection(getExecOfflineBucket('columns'), [...existingColumns, ...nextColumns]);
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
        return column as ExecColumn;
      } catch {
        const column: ExecColumn = {
          id: crypto.randomUUID(),
          board_id: data.board_id,
          name: data.name,
          order: data.order,
          wip_limit: null,
          color_tag: data.color_tag || 'neutral',
          created_at: new Date().toISOString(),
        };
        appendOfflineItem(getExecOfflineBucket('columns'), column);
        return column;
      }
    },
    onSuccess: (data) => {
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
        const { error } = await supabase.from('exec_columns').update(updates).eq('id', id);
        if (error) throw error;
      } catch {
        updateOfflineItem<ExecColumn>(getExecOfflineBucket('columns'), id, (column) => ({ ...column, ...updates }));
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
      } catch {
        filterOfflineCollection<ExecCard>(getExecOfflineBucket('cards'), (card) => card.column_id !== data.id);
        removeOfflineItem<ExecColumn>(getExecOfflineBucket('columns'), data.id);
      }
      return data;
    },
    onSuccess: (data) => {
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
        return card as ExecCard;
      } catch {
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
        appendOfflineItem(getExecOfflineBucket('cards'), card);
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
        const { error } = await supabase.from('exec_cards').update(updates).eq('id', id);
        if (error) throw error;
      } catch {
        updateOfflineItem<ExecCard>(getExecOfflineBucket('cards'), id, (card) => ({ ...card, ...updates }));
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
        const { error } = await supabase.from('exec_cards').delete().eq('id', data.id);
        if (error) throw error;
      } catch {
        removeOfflineItem<ExecCard>(getExecOfflineBucket('cards'), data.id);
      }
      return data;
    },
    onSuccess: (data) => {
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
        return comment as ExecComment;
      } catch {
        const comment: ExecComment = {
          id: crypto.randomUUID(),
          card_id: data.card_id,
          author_user_id: user.id,
          body: data.body,
          created_at: new Date().toISOString(),
        };
        appendOfflineItem(getExecOfflineBucket('comments'), comment);
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
        return board as ExecBoard;
      } catch {
        const board = updateOfflineItem<ExecBoard>(getExecOfflineBucket('boards'), id, (item) => ({ ...item, ...updates }));
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
        // Delete all cards in the board first
        const { error: cardsError } = await supabase
          .from('exec_cards')
          .delete()
          .eq('board_id', boardId);
        if (cardsError) throw cardsError;

        // Delete all columns in the board
        const { error: colsError } = await supabase
          .from('exec_columns')
          .delete()
          .eq('board_id', boardId);
        if (colsError) throw colsError;

        // Delete the board
        const { error } = await supabase
          .from('exec_boards')
          .delete()
          .eq('id', boardId);
        if (error) throw error;
      } catch {
        filterOfflineCollection<ExecCard>(getExecOfflineBucket('cards'), (card) => card.board_id !== boardId);
        filterOfflineCollection<ExecColumn>(getExecOfflineBucket('columns'), (column) => column.board_id !== boardId);
        removeOfflineItem<ExecBoard>(getExecOfflineBucket('boards'), boardId);
      }

      return boardId;
    },
    onSuccess: () => {
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
          const { data: cardsToDelete, error: cardIdsError } = await supabase
            .from('exec_cards')
            .select('id')
            .eq('board_id', boardId);
          if (cardIdsError) throw cardIdsError;

          const cardIds = (cardsToDelete || []).map((card) => card.id);

          if (cardIds.length > 0) {
            const { error: commentsError } = await supabase
              .from('exec_comments')
              .delete()
              .in('card_id', cardIds);
            if (commentsError) throw commentsError;
          }

          const { error: cardsError } = await supabase
            .from('exec_cards')
            .delete()
            .eq('board_id', boardId);
          if (cardsError) throw cardsError;

          const { error: colsError } = await supabase
            .from('exec_columns')
            .delete()
            .eq('board_id', boardId);
          if (colsError) throw colsError;

          const { error: boardError } = await supabase
            .from('exec_boards')
            .delete()
            .eq('id', boardId);
          if (boardError) throw boardError;
        }
      } catch {
        const boardsToDelete = readOfflineCollection<ExecBoard>(getExecOfflineBucket('boards')).filter(
          (board) => board.sector === sector,
        );
        const boardIds = new Set(boardsToDelete.map((board) => board.id));

        filterOfflineCollection<ExecCard>(getExecOfflineBucket('cards'), (card) => !boardIds.has(card.board_id));
        filterOfflineCollection<ExecColumn>(getExecOfflineBucket('columns'), (column) => !boardIds.has(column.board_id));
        filterOfflineCollection<ExecComment>(getExecOfflineBucket('comments'), (comment) => !boardIds.has(comment.card_id));
        filterOfflineCollection<ExecBoard>(getExecOfflineBucket('boards'), (board) => board.sector !== sector);
      }

      return sector;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exec-boards'] });
      queryClient.invalidateQueries({ queryKey: ['exec-columns'] });
      queryClient.invalidateQueries({ queryKey: ['exec-cards'] });
      queryClient.invalidateQueries({ queryKey: ['exec-comments'] });
    },
  });
}
