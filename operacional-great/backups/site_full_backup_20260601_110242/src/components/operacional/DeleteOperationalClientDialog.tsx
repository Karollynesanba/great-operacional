import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OperationalClient, removeOperationalClientCache } from '@/hooks/useCRMData';
import { Loader2 } from 'lucide-react';

interface DeleteOperationalClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: OperationalClient | null;
  onSuccess?: () => void;
}

export function DeleteOperationalClientDialog({ 
  open, 
  onOpenChange, 
  client,
  onSuccess 
}: DeleteOperationalClientDialogProps) {
  const queryClient = useQueryClient();

  const toError = (value: unknown) => {
    if (value instanceof Error) return value;
    if (typeof value === 'string') return new Error(value);
    if (value && typeof value === 'object') {
      const candidate = value as {
        message?: unknown;
        details?: unknown;
        hint?: unknown;
        code?: unknown;
      };
      const parts = [candidate.message, candidate.details, candidate.hint, candidate.code]
        .filter((part): part is string => typeof part === 'string' && part.trim().length > 0);
      if (parts.length > 0) {
        return new Error(parts.join(' | '));
      }
      try {
        return new Error(JSON.stringify(value));
      } catch {
        return new Error('Falha desconhecida');
      }
    }
    return new Error('Falha desconhecida');
  };

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const rpcDelete = await supabase.rpc('delete_operational_client_cascade', {
        p_client_id: clientId,
      });

      if (rpcDelete.error) {
        console.warn('RPC delete failed for delete_operational_client_cascade:', rpcDelete.error);
        throw toError(rpcDelete.error);
      }
    },
    onSuccess: () => {
      if (client?.id) {
        removeOperationalClientCache(client.id);
      }
      queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
      toast.success('Cliente excluído com sucesso');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Error deleting client:', error);
      const normalizedError = toError(error);
      const message = normalizedError.message || 'Falha desconhecida';
      toast.error(`Erro ao excluir cliente: ${message}`);
    }
  });

  const handleDelete = () => {
    if (!client) return;
    deleteClientMutation.mutate(client.id);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir cliente permanentemente?</AlertDialogTitle>
          <AlertDialogDescription>
            Você está prestes a excluir <strong>{client?.client_name}</strong>
            {client?.clinic_name && ` (${client.clinic_name})`} do sistema.
            <br /><br />
            <strong className="text-destructive">Esta ação é irreversível.</strong> Todos os dados associados a este cliente serão removidos permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteClientMutation.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            disabled={deleteClientMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteClientMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir Cliente'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
