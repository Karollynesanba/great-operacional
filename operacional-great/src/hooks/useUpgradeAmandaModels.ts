import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type ReadyModelRow = Database['public']['Tables']['ready_models']['Row'];
export type ReadyModelInsert = Database['public']['Tables']['ready_models']['Insert'];
export type ReadyModelUpdate = Database['public']['Tables']['ready_models']['Update'];
export type OperationalClientRow = Database['public']['Tables']['operational_clients']['Row'];
export type BrandProfileRow = Database['public']['Tables']['brand_profiles']['Row'];

export type ReadyModelWithLinks = ReadyModelRow & {
  operational_clients?: Pick<OperationalClientRow, 'id' | 'client_name' | 'clinic_name'> | null;
  brand_profiles?: Pick<BrandProfileRow, 'id' | 'display_name' | 'profile_type'> | null;
};

export function useReadyModels(filters: {
  clientId?: string;
  type?: string;
  category?: string;
  periodFrom?: string;
  periodTo?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['ready-models', filters],
    queryFn: async () => {
      let query = supabase
        .from('ready_models')
        .select('*, operational_clients(id, client_name, clinic_name), brand_profiles(id, display_name, profile_type)')
        .order('created_at', { ascending: false });

      if (filters.clientId && filters.clientId !== 'ALL') {
        query = query.eq('client_id', filters.clientId);
      }
      if (filters.type && filters.type !== 'ALL') {
        query = query.eq('model_type', filters.type);
      }
      if (filters.category && filters.category !== 'ALL') {
        query = query.eq('category', filters.category);
      }
      if (filters.periodFrom) {
        query = query.gte('reference_date', filters.periodFrom);
      }
      if (filters.periodTo) {
        query = query.lte('reference_date', filters.periodTo);
      }
      if (filters.search?.trim()) {
        const search = filters.search.trim();
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,content.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ReadyModelWithLinks[];
    },
  });
}

export function useReadyModelMutations() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('ready-models-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ready_models' }, () => {
        queryClient.invalidateQueries({ queryKey: ['ready-models'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const saveMutation = useMutation({
    mutationFn: async (payload: ReadyModelInsert & { id?: string }) => {
      if (payload.id) {
        const { error } = await supabase.from('ready_models').update(payload).eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ready_models').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ready-models'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ready_models').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ready-models'] });
    },
  });

  return { saveMutation, deleteMutation };
}
