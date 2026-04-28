import {
  ChampionshipEvent,
  ChampionshipTeam,
  useClearChampionshipEventsHistory,
  useDeleteChampionshipEvent,
} from '@/hooks/useChampionshipData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, UserMinus, ShoppingBag, Trash2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ChampionshipEventsLogProps {
  events: ChampionshipEvent[];
  teams: ChampionshipTeam[];
}

export function ChampionshipEventsLog({ events, teams }: ChampionshipEventsLogProps) {
  const { user, isAdmin } = useAuth();
  const deleteEventMutation = useDeleteChampionshipEvent();
  const clearHistoryMutation = useClearChampionshipEventsHistory();

  const isCoordinator = user?.role === 'COORDENADOR_RED' || user?.role === 'COORDENADOR_COMERCIAL';
  const canDelete = isAdmin || isCoordinator;

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'RENEWAL':
        return <RefreshCw className="h-4 w-4 text-green-600" />;
      case 'LOSS':
        return <UserMinus className="h-4 w-4 text-red-600" />;
      case 'ITEM_SOLD':
        return <ShoppingBag className="h-4 w-4 text-primary" />;
      default:
        return null;
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'RENEWAL':
        return 'Renovação';
      case 'LOSS':
        return 'Perda';
      case 'ITEM_SOLD':
        return 'Item Vendido';
      default:
        return type;
    }
  };

  const getTeam = (teamId: string) => teams.find((t) => t.team_id === teamId);

  const handleDelete = async (event: ChampionshipEvent) => {
    if (!confirm('Tem certeza que deseja remover este evento? Os pontos serão revertidos.')) {
      return;
    }

    try {
      await deleteEventMutation.mutateAsync(event);
      toast.success('Evento removido com sucesso');
    } catch (error) {
      toast.error('Erro ao remover evento');
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Tem certeza que deseja apagar todo o histórico de eventos?')) {
      return;
    }

    try {
      await clearHistoryMutation.mutateAsync();
      toast.success('Histórico de eventos apagado com sucesso');
    } catch (error) {
      toast.error('Erro ao apagar histórico de eventos');
    }
  };

  return (
    <Card className="border-border/60 bg-card/90 dark:border-white/10 dark:bg-slate-950/75">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Histórico de Eventos
          </CardTitle>
          {canDelete && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              data-cy="btn-limpar-historico-eventos"
              onClick={handleClearHistory}
              disabled={clearHistoryMutation.isPending}
            >
              Limpar histórico
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {events.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">Nenhum evento registrado ainda</div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => {
                const team = getTeam(event.team_id);

                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/50 dark:border-white/10 dark:hover:bg-white/5"
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        event.event_type === 'RENEWAL' && 'bg-green-100 dark:bg-green-950/50',
                        event.event_type === 'LOSS' && 'bg-red-100 dark:bg-red-950/50',
                        event.event_type === 'ITEM_SOLD' && 'bg-primary/10 dark:bg-primary/20'
                      )}
                    >
                      {getEventIcon(event.event_type)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {getEventLabel(event.event_type)}
                        </Badge>
                        {team && (
                          <Badge
                            variant="secondary"
                            style={{
                              backgroundColor: `${team.badge_color}20`,
                              color: team.badge_color,
                            }}
                          >
                            {team.label}
                          </Badge>
                        )}
                        <Badge variant={event.points > 0 ? 'default' : 'destructive'} className="text-xs">
                          {event.points > 0 ? '+' : ''}
                          {event.points} pts
                        </Badge>
                      </div>

                      {(event.client_name || event.item_label || event.description) && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {event.item_label && <span className="font-medium">{event.item_label}</span>}
                          {event.client_name && <span> • Cliente: {event.client_name}</span>}
                          {event.description && <span> • {event.description}</span>}
                        </p>
                      )}

                      <p className="mt-1 text-xs text-muted-foreground">
                        por {event.creator_name} • {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>

                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(event)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
