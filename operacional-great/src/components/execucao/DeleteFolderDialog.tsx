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
import { ExecBoard, getSectorLabel, useDeleteSector } from '@/hooks/useExecData';
import { toast } from 'sonner';

interface DeleteFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sector: string | null;
  boards: ExecBoard[];
  onDeleted?: (sector: string) => void;
}

export function DeleteFolderDialog({ open, onOpenChange, sector, boards, onDeleted }: DeleteFolderDialogProps) {
  const deleteSector = useDeleteSector();

  const sectorBoards = sector ? boards.filter((board) => board.sector === sector) : [];
  const boardCount = sectorBoards.length;

  const handleDelete = async () => {
    if (!sector) return;

    try {
      await deleteSector.mutateAsync(sector);
      toast.success('Pasta removida com sucesso!');
      onOpenChange(false);
      onDeleted?.(sector);
    } catch {
      toast.error('Erro ao remover pasta');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-cy="exec-delete-folder-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Remover Pasta</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja remover a pasta <strong>"{sector ? getSectorLabel(sector) : ''}"</strong>?
            <br />
            <br />
            Esta ação é irreversível e irá remover {boardCount} quadro(s), suas colunas e todos os cards.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-cy="exec-delete-folder-cancel">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteSector.isPending}
            data-cy="exec-delete-folder-confirm"
          >
            {deleteSector.isPending ? 'Removendo...' : 'Remover'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
