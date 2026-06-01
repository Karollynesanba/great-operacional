import { ChampionshipTeam, ChampionshipMonthlyHistory } from '@/hooks/useChampionshipData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, RefreshCw, UserMinus, ShoppingBag, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamChampionshipCardsProps {
  teams: ChampionshipTeam[];
  monthlyHistory?: ChampionshipMonthlyHistory[];
}

export function TeamChampionshipCards({ teams, monthlyHistory = [] }: TeamChampionshipCardsProps) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return null;
    }
  };

  const getTeamMonthlyEvolution = (teamId: string) => {
    const teamHistory = monthlyHistory.filter((h) => h.team_id === teamId);
    if (teamHistory.length < 2) return null;

    const lastTwo = teamHistory.slice(-2);
    return lastTwo[1].total_points - lastTwo[0].total_points;
  };

  const sortedTeams = [...teams].sort((a, b) => a.current_rank - b.current_rank);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {sortedTeams.map((team) => {
        const evolution = getTeamMonthlyEvolution(team.team_id);

        return (
          <Card
            key={team.id}
            className={cn(
              'relative overflow-hidden border-border/60 bg-card/90 transition-all hover:shadow-lg dark:border-white/10 dark:bg-slate-950/75',
              team.current_rank === 1 && 'ring-2 ring-yellow-400/50'
            )}
          >
            <div
              className="absolute inset-0 opacity-5"
              style={{
                background: `linear-gradient(135deg, ${team.badge_color} 0%, transparent 50%)`,
              }}
            />

            <CardHeader className="relative pb-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white shadow-md"
                    style={{ backgroundColor: team.badge_color }}
                  >
                    {team.label.charAt(0)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{team.label}</CardTitle>
                    <p className="text-sm text-muted-foreground">{team.current_rank}º lugar</p>
                  </div>
                </div>
                {getRankIcon(team.current_rank)}
              </div>
            </CardHeader>

            <CardContent className="relative space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3 dark:bg-white/5">
                <span className="text-sm font-medium text-muted-foreground">Pontos Totais</span>
                <Badge
                  variant="secondary"
                  className="px-4 py-1 text-lg font-bold"
                  style={{
                    backgroundColor: `${team.badge_color}20`,
                    color: team.badge_color,
                  }}
                >
                  {team.total_points}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center rounded-lg bg-green-50 p-3 dark:bg-green-950/30">
                  <RefreshCw className="mb-1 h-5 w-5 text-green-600" />
                  <span className="text-lg font-bold text-green-600">{team.renewals}</span>
                  <span className="text-xs text-muted-foreground">Renovações</span>
                </div>
                <div className="flex flex-col items-center rounded-lg bg-red-50 p-3 dark:bg-red-950/30">
                  <UserMinus className="mb-1 h-5 w-5 text-red-600" />
                  <span className="text-lg font-bold text-red-600">{team.losses}</span>
                  <span className="text-xs text-muted-foreground">Perdas</span>
                </div>
                <div className="flex flex-col items-center rounded-lg bg-primary/5 p-3 dark:bg-primary/10">
                  <ShoppingBag className="mb-1 h-5 w-5 text-primary" />
                  <span className="text-lg font-bold text-primary">{team.items_sold}</span>
                  <span className="text-xs text-muted-foreground">Itens</span>
                </div>
              </div>

              {evolution !== null && (
                <div className="flex items-center justify-between rounded-lg border border-border/60 p-2 dark:border-white/10">
                  <span className="text-sm text-muted-foreground">Evolução Mensal</span>
                  <div
                    className={cn(
                      'flex items-center gap-1 font-medium',
                      evolution > 0 ? 'text-green-600' : evolution < 0 ? 'text-red-600' : 'text-muted-foreground'
                    )}
                  >
                    {evolution > 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : evolution < 0 ? (
                      <TrendingDown className="h-4 w-4" />
                    ) : null}
                    <span>
                      {evolution > 0 ? '+' : ''}
                      {evolution} pts
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
