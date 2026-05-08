import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateBoard } from '@/hooks/useExecData';
import { toast } from 'sonner';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (boardId: string, sector: string) => void;
}

const INITIAL_COLUMNS = [
  { name: 'A FAZER', color_tag: 'neutral' },
  { name: 'EM ANDAMENTO', color_tag: 'blue' },
  { name: 'CONCLUIDO', color_tag: 'green' },
];

export function CreateFolderDialog({ open, onOpenChange, onSuccess }: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState('');
  const [boardName, setBoardName] = useState('Quadro Principal');
  const [description, setDescription] = useState('');
  const [teamScope, setTeamScope] = useState<'GLOBAL' | 'EQUIPE'>('GLOBAL');

  const createBoard = useCreateBoard();

  const resetForm = () => {
    setFolderName('');
    setBoardName('Quadro Principal');
    setDescription('');
    setTeamScope('GLOBAL');
  };

  const handleCreate = async () => {
    const sector = folderName.trim();

    if (!sector) {
      toast.error('Nome da pasta e obrigatorio');
      return;
    }

    try {
      const board = await createBoard.mutateAsync({
        sector,
        name: boardName.trim() || 'Quadro Principal',
        description: description.trim() || undefined,
        team_scope: teamScope,
        columns: INITIAL_COLUMNS,
      });

      toast.success('Pasta criada com sucesso!');
      resetForm();
      onOpenChange(false);
      onSuccess?.(board.id, sector);
    } catch {
      toast.error('Erro ao criar pasta');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-cy="exec-create-folder-dialog">
        <DialogHeader>
          <DialogTitle>Nova Pasta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="folder-name">Nome da pasta</Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Ex: Tropa de Elite"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="board-name">Nome do quadro inicial</Label>
            <Input
              id="board-name"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              placeholder="Ex: Quadro Principal"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="folder-description">Descricao (opcional)</Label>
            <Textarea
              id="folder-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descricao da pasta..."
              className="mt-1.5 min-h-[60px] resize-none"
            />
          </div>

          <div>
            <Label>Escopo</Label>
            <Select value={teamScope} onValueChange={(value) => setTeamScope(value as 'GLOBAL' | 'EQUIPE')}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GLOBAL">Global</SelectItem>
                <SelectItem value="EQUIPE">Equipe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-dashed border-primary/20 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">
              A pasta sera criada junto com o primeiro quadro para que ela ja apareca na sidebar.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-cy="exec-create-folder-cancel">
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={createBoard.isPending} data-cy="exec-create-folder-submit">
            {createBoard.isPending ? 'Criando...' : 'Criar Pasta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
