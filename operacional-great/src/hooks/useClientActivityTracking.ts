import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ClientActivityTracking {
  id: string;
  client_id: string;
  year: number;
  month: number;
  week: number;
  artes_count: number;
  designer_name: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientActivityWithClient extends ClientActivityTracking {
  client_name: string;
  clinic_name: string | null;
}

// List of available designers
export const DESIGNERS = ['Amanda', 'Matheus', 'Andre'] as const;
export type DesignerName = typeof DESIGNERS[number];

export function useClientActivityTracking(year: number, month: number, designerName?: string | null) {
  return useQuery({
    queryKey: ['client-activity-tracking', year, month, designerName],
    queryFn: async () => {
      let query = supabase
        .from('client_activity_tracking')
        .select(`
          *,
          operational_clients!inner(client_name, clinic_name)
        `)
        .eq('year', year)
        .eq('month', month);

      if (designerName) {
        query = query.eq('designer_name', designerName);
      }

      const { data, error } = await query.order('week', { ascending: true });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        ...item,
        client_name: item.operational_clients.client_name,
        clinic_name: item.operational_clients.clinic_name,
      })) as ClientActivityWithClient[];
    },
  });
}

export function useUpsertClientActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      client_id,
      year,
      month,
      week,
      artes_count,
      designer_name,
    }: {
      client_id: string;
      year: number;
      month: number;
      week: number;
      artes_count: number;
      designer_name: string | null;
    }) => {
      const { data: userData } = await supabase.auth.getUser();

      let query = supabase
        .from('client_activity_tracking')
        .select('id')
        .eq('client_id', client_id)
        .eq('year', year)
        .eq('month', month)
        .eq('week', week);

      if (designer_name === null) {
        query = query.is('designer_name', null);
      } else {
        query = query.eq('designer_name', designer_name);
      }

      const { data: existing, error: lookupError } = await query.maybeSingle();
      if (lookupError) throw lookupError;

      const payload = {
        client_id,
        year,
        month,
        week,
        artes_count,
        designer_name,
        created_by_user_id: userData?.user?.id,
      };

      if (existing?.id) {
        const { data, error } = await supabase
          .from('client_activity_tracking')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from('client_activity_tracking')
        .insert(payload)
        .select()
        .single();

      if (!error) return data;

      const uniqueViolation = typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505';
      if (!uniqueViolation) throw error;

      const { data: fallbackExisting, error: fallbackLookupError } = await supabase
        .from('client_activity_tracking')
        .select('id')
        .eq('client_id', client_id)
        .eq('year', year)
        .eq('month', month)
        .eq('week', week)
        .maybeSingle();

      if (fallbackLookupError) throw fallbackLookupError;
      if (!fallbackExisting?.id) throw error;

      const { data: fallbackData, error: fallbackUpdateError } = await supabase
        .from('client_activity_tracking')
        .update(payload)
        .eq('id', fallbackExisting.id)
        .select()
        .single();

      if (fallbackUpdateError) throw fallbackUpdateError;
      return fallbackData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-activity-tracking'] });
      toast({
        title: 'Salvo!',
        description: 'Quantidade de artes atualizada com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error upserting activity:', error);
      const message = error instanceof Error ? error.message : 'Não foi possível salvar os dados.';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteClientActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('client_activity_tracking')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-activity-tracking'] });
    },
  });
}

export function useOperationalClientsForTracking() {
  return useQuery({
    queryKey: ['operational-clients-for-tracking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_clients')
        .select('id, client_name, clinic_name')
        .order('client_name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

// Hook to get activity totals for all designers in a given month/year
export function useDesignersTotals(year: number, month: number) {
  return useQuery({
    queryKey: ['designers-totals', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_activity_tracking')
        .select('designer_name, artes_count, week')
        .eq('year', year)
        .eq('month', month);

      if (error) throw error;

      // Group by designer
      const designerTotals: Record<string, { total: number; weeks: Record<number, number> }> = {};
      
      DESIGNERS.forEach(designer => {
        designerTotals[designer] = { total: 0, weeks: { 1: 0, 2: 0, 3: 0, 4: 0 } };
      });

      (data || []).forEach((item) => {
        if (item.designer_name && designerTotals[item.designer_name]) {
          designerTotals[item.designer_name].total += item.artes_count || 0;
          designerTotals[item.designer_name].weeks[item.week] = 
            (designerTotals[item.designer_name].weeks[item.week] || 0) + (item.artes_count || 0);
        }
      });

      return designerTotals;
    },
  });
}
