import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { isMissingColumnError, omitKeys, runWithSchemaFallback } from '@/lib/supabaseSchemaFallback';

export type PerformanceStructureRow = Database['public']['Tables']['performance_structures']['Row'];
export type PerformanceStructureInsert = Database['public']['Tables']['performance_structures']['Insert'];
export type PerformanceStructureUpdate = Database['public']['Tables']['performance_structures']['Update'];

export function usePerformanceStructures(filters: {
  profileId?: string;
  type?: string;
  periodFrom?: string;
  periodTo?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['performance-structures', filters],
    queryFn: async () => {
      let query = supabase
        .from('performance_structures')
        .select('*, brand_profiles(id, display_name, profile_type), operational_clients(id, client_name, clinic_name)')
        .order('created_at', { ascending: false });

      if (filters.profileId && filters.profileId !== 'ALL') {
        query = query.or(`client_id.eq.${filters.profileId},profile_id.eq.${filters.profileId}`);
      }
      if (filters.type && filters.type !== 'ALL') {
        query = query.eq('structure_type', filters.type);
      }
      if (filters.periodFrom) {
        query = query.gte('reference_date', filters.periodFrom);
      }
      if (filters.periodTo) {
        query = query.lte('reference_date', filters.periodTo);
      }
      if (filters.search?.trim()) {
        const search = filters.search.trim();
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function usePerformanceStructureMutations() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('performance-structures-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'performance_structures' }, () => {
        queryClient.invalidateQueries({ queryKey: ['performance-structures'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const saveMutation = useMutation({
    mutationFn: async (payload: PerformanceStructureInsert & { id?: string }) => {
      const record = payload.id ? { ...payload, id: payload.id } : payload;
      await runWithSchemaFallback(
        [
          async () => {
            const { error } = await supabase.from('performance_structures').upsert(record, { onConflict: 'id' });
            if (error) throw error;
          },
          async () => {
            const { error } = await supabase.from('performance_structures').upsert(omitKeys(record, ['client_id']), { onConflict: 'id' });
            if (error) throw error;
          },
          async () => {
            const { error } = await supabase.from('performance_structures').upsert(omitKeys(record, ['profile_id']), { onConflict: 'id' });
            if (error) throw error;
          },
        ],
        (error) => isMissingColumnError(error, 'client_id') || isMissingColumnError(error, 'profile_id'),
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['performance-structures'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('performance_structures').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['performance-structures'] });
    },
  });

  return { saveMutation, deleteMutation };
}
