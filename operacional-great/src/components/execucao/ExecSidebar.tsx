import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, LayoutGrid, Folder, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DefaultSector,
  ExecBoard,
  getAvailableExecSectors,
  getSectorLabel,
  isDefaultSector,
  useExecBoards,
  useInitializeDefaultBoard,
} from '@/hooks/useExecData';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EditBoardDialog } from './EditBoardDialog';
import { DeleteBoardDialog } from './DeleteBoardDialog';
import { DeleteFolderDialog } from './DeleteFolderDialog';
import { CreateFolderDialog } from './CreateFolderDialog';
import { useAuth } from '@/contexts/AuthContext';

interface ExecSidebarProps {
  selectedSector: string;
  onSectorChange: (sector: string) => void;
  selectedBoardId: string | null;
  onBoardChange: (boardId: string) => void;
  onCreateBoard: () => void;
}

const SECTOR_COLORS: Record<string, string> = {
  GERAL: 'text-primary',
  TRAFEGO: 'text-red-500',
  ATENDIMENTO: 'text-rose-500',
  MARKETING_DIGITAL: 'text-orange-500',
};

function getSectorColor(sector: string) {
  return SECTOR_COLORS[sector] ?? 'text-muted-foreground';
}

export function ExecSidebar({
  selectedSector,
  onSectorChange,
  selectedBoardId,
  onBoardChange,
  onCreateBoard,
}: ExecSidebarProps) {
  const [expandedSectors, setExpandedSectors] = useState<Record<string, boolean>>({
    GERAL: true,
    TRAFEGO: true,
    ATENDIMENTO: true,
    MARKETING_DIGITAL: true,
  });
  const [editBoard, setEditBoard] = useState<ExecBoard | null>(null);
  const [deleteBoard, setDeleteBoard] = useState<ExecBoard | null>(null);
  const [deleteSector, setDeleteSector] = useState<string | null>(null);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);

  const { data: boards, isLoading } = useExecBoards();
  const initializeBoard = useInitializeDefaultBoard();
  const { user } = useAuth();

  const canManageBoards = !!user;

  const sectors = useMemo(() => getAvailableExecSectors(boards || []), [boards]);

  useEffect(() => {
    setExpandedSectors((current) => {
      const next = { ...current };

      sectors.forEach((sector) => {
        if (next[sector] === undefined) {
          next[sector] = true;
        }
      });

      return next;
    });
  }, [sectors]);

  const toggleSector = (sector: string) => {
    setExpandedSectors((prev) => ({ ...prev, [sector]: !prev[sector] }));
  };

  const handleSectorClick = (sector: string) => {
    onSectorChange(sector);
    if (!expandedSectors[sector]) {
      toggleSector(sector);
    }
  };

  const getBoardsBySector = (sector: string) => boards?.filter((board) => board.sector === sector) || [];

  const handleInitializeDefault = async (sector: DefaultSector) => {
    try {
      const board = await initializeBoard.mutateAsync(sector);
      onSectorChange(sector);
      onBoardChange(board.id);
      toast.success('Quadro padrao criado com sucesso!');
    } catch {
      toast.error('Erro ao criar quadro padrao');
    }
  };

  const handleBoardDeleted = () => {
    if (deleteBoard && selectedBoardId === deleteBoard.id) {
      const sectorBoards = getBoardsBySector(deleteBoard.sector);
      const remainingBoards = sectorBoards.filter((board) => board.id !== deleteBoard.id);
      if (remainingBoards.length > 0) {
        onBoardChange(remainingBoards[0].id);
      }
    }
    setDeleteBoard(null);
  };

  const handleSectorDeleted = (sector: string) => {
    const remainingSectors = sectors.filter((current) => current !== sector);
    const nextSector = remainingSectors[0] ?? 'GERAL';
    const nextBoard = getBoardsBySector(nextSector)[0];

    if (selectedSector === sector) {
      onSectorChange(nextSector);
      if (nextBoard) {
        onBoardChange(nextBoard.id);
      } else {
        onBoardChange('');
      }
    }

    setDeleteSector(null);
  };

  const handleFolderCreated = (boardId: string, sector: string) => {
    onSectorChange(sector);
    onBoardChange(boardId);
    setExpandedSectors((prev) => ({ ...prev, [sector]: true }));
  };

  return (
    <>
      <aside className="flex h-full w-64 min-w-[16rem] flex-col overflow-hidden border-r border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(255,246,246,0.96))] dark:bg-[linear-gradient(180deg,rgba(21,24,31,1),rgba(37,22,24,0.98))]">
        <div className="border-b border-primary/10 px-3 py-3">
          <h2 className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <LayoutGrid className="h-3.5 w-3.5 text-primary" />
            Execucoes
          </h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-1 pr-1">
          {sectors.map((sector) => {
            const sectorBoards = getBoardsBySector(sector);
            const isExpanded = expandedSectors[sector];
            const isSelected = selectedSector === sector;

            return (
              <div key={sector} className="mb-0.5 px-1.5">
                <div
                  className={cn(
                    'group flex w-full items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[12px] font-medium transition-colors',
                    'hover:bg-white hover:shadow-sm dark:hover:bg-white/5 dark:hover:shadow-none',
                    isSelected && 'bg-white text-foreground shadow-sm ring-1 ring-primary/10 dark:bg-white/5 dark:shadow-none',
                  )}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSector(sector);
                    }}
                    className="rounded-md p-0.5 hover:bg-primary/5"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSectorClick(sector)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                  >
                    <Folder className={cn('h-3.5 w-3.5', getSectorColor(sector))} />
                    <span className={cn('flex-1 truncate font-medium leading-none', getSectorColor(sector))}>
                      {getSectorLabel(sector)}
                    </span>
                  </button>
                  {canManageBoards && !isDefaultSector(sector) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 rounded-full text-destructive transition-colors hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteSector(sector);
                      }}
                      title="Excluir pasta"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {isExpanded && (
                  <div className="ml-4 mt-0.5">
                    {isLoading ? (
                      <div className="space-y-1 px-2">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-3/4" />
                      </div>
                    ) : sectorBoards.length === 0 ? (
                      <div className="px-2 py-1">
                        {isDefaultSector(sector) ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-full justify-start rounded-xl border border-dashed border-primary/20 bg-white px-2 text-[11px] hover:bg-primary/5 dark:bg-white/5 dark:hover:bg-primary/10"
                            onClick={() => handleInitializeDefault(sector)}
                            disabled={initializeBoard.isPending}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Criar quadro padrao
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-full justify-start rounded-xl border border-dashed border-primary/20 bg-white px-2 text-[11px] hover:bg-primary/5 dark:bg-white/5 dark:hover:bg-primary/10"
                            onClick={onCreateBoard}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Criar quadro
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {sectorBoards.map((board) => (
                          <div
                            key={board.id}
                            className={cn(
                              'group flex w-full items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[12px] transition-colors',
                              'hover:bg-white hover:shadow-sm dark:hover:bg-white/5 dark:hover:shadow-none',
                              selectedBoardId === board.id &&
                                'bg-primary/10 font-medium text-primary ring-1 ring-primary/10 dark:bg-primary/15',
                            )}
                          >
                            <button
                              onClick={() => {
                                onSectorChange(sector);
                                onBoardChange(board.id);
                              }}
                              className="flex flex-1 items-center gap-2 text-left"
                            >
                              <LayoutGrid className="h-3 w-3 shrink-0" />
                              <span className="truncate">{board.name}</span>
                              {board.is_default && (
                                <span className="text-[9px] text-muted-foreground">padrao</span>
                              )}
                            </button>

                            {canManageBoards && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem onClick={() => setEditBoard(board)}>
                                    <Pencil className="mr-2 h-3 w-3" />
                                    Editar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            {canManageBoards && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0 rounded-full text-destructive transition-colors hover:bg-destructive/10 hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteBoard(board);
                                }}
                                title="Excluir quadro"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-primary/10 p-3">
          <div className="grid gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-full justify-start rounded-xl border-primary/15 bg-white px-3 text-[11px] hover:bg-primary/5 dark:bg-white/5 dark:hover:bg-primary/10"
              onClick={onCreateBoard}
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              Novo Quadro
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-full justify-start rounded-xl border-primary/15 bg-white px-3 text-[11px] hover:bg-primary/5 dark:bg-white/5 dark:hover:bg-primary/10"
              onClick={() => setIsCreateFolderOpen(true)}
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              Nova Pasta
            </Button>
          </div>
        </div>
      </aside>

      <EditBoardDialog
        open={!!editBoard}
        onOpenChange={(open) => !open && setEditBoard(null)}
        board={editBoard}
      />

      <DeleteBoardDialog
        open={!!deleteBoard}
        onOpenChange={(open) => !open && setDeleteBoard(null)}
        board={deleteBoard}
        onDeleted={handleBoardDeleted}
      />

      <DeleteFolderDialog
        open={!!deleteSector}
        onOpenChange={(open) => !open && setDeleteSector(null)}
        sector={deleteSector}
        boards={boards || []}
        onDeleted={handleSectorDeleted}
      />

      <CreateFolderDialog
        open={isCreateFolderOpen}
        onOpenChange={setIsCreateFolderOpen}
        onSuccess={handleFolderCreated}
      />
    </>
  );
}
