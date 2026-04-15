import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, LayoutGrid, BarChart3, History, Users } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuth } from '@/contexts/AuthContext';
import {
  useChampionshipTeams,
  useChampionshipEvents,
  useChampionshipMonthlyHistory,
} from '@/hooks/useChampionshipData';
import { ChampionshipRankingTable } from '@/components/championship/ChampionshipRankingTable';
import { TeamChampionshipCards } from '@/components/championship/TeamChampionshipCards';
import { PointsEvolutionChart, ItemsSoldBreakdown, RenewalVsLossChart } from '@/components/championship/ChampionshipCharts';
import { ChampionshipEventsLog } from '@/components/championship/ChampionshipEventsLog';
import { AddEventDialog } from '@/components/championship/AddEventDialog';
import { FallingConfetti } from '@/components/championship/FallingConfetti';
import { ChampionshipPodium } from '@/components/championship/ChampionshipPodium';
import { ChampionshipDashboard } from '@/components/championship/ChampionshipDashboard';
import confetti from 'canvas-confetti';

export default function ChampionsGreatLeague() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [lastLeaderId, setLastLeaderId] = useState<string | null>(null);
  const [rankingFilter, setRankingFilter] = useState<'all' | 'elite' | 'team7'>('all');

  const { data: teams = [], isLoading: teamsLoading } = useChampionshipTeams();
  const { data: events = [] } = useChampionshipEvents(50);
  const { data: monthlyHistory = [] } = useChampionshipMonthlyHistory();

  const isCoordinator = user?.role === 'COORDENADOR_RED' || user?.role === 'COORDENADOR_COMERCIAL';
  const canAddEvents = isAdmin || isCoordinator || ['GESTOR', 'ATENDENTE', 'DESIGN', 'EDITOR_VIDEO'].includes(user?.role || '');

  const filteredTeams = useMemo(() => {
    const normalize = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    if (rankingFilter === 'elite') {
      return teams.filter((team) => {
        const label = normalize(team.label);
        return label.includes('tropa de elite') || label.includes('elite');
      });
    }

    if (rankingFilter === 'team7') {
      return teams.filter((team) => {
        const label = normalize(team.label);
        return label.includes('equipe 7') || label.includes('team 7');
      });
    }

    return teams;
  }, [rankingFilter, teams]);

  useEffect(() => {
    if (teams.length > 0) {
      const currentLeader = teams.find((team) => team.current_rank === 1);
      if (currentLeader && lastLeaderId && currentLeader.team_id !== lastLeaderId) {
        triggerConfetti('low');
      }
      if (currentLeader) {
        setLastLeaderId(currentLeader.team_id);
      }
    }
  }, [teams, lastLeaderId]);

  const triggerConfetti = (intensity: 'low' | 'medium') => {
    const particleCount = intensity === 'low' ? 50 : 100;

    confetti({
      particleCount,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#2563EB', '#DC2626', '#16A34A', '#CA8A04'],
      disableForReducedMotion: true,
    });

    if (intensity === 'medium') {
      setTimeout(() => {
        confetti({
          particleCount: particleCount / 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#2563EB', '#DC2626', '#16A34A', '#CA8A04'],
        });
      }, 250);

      setTimeout(() => {
        confetti({
          particleCount: particleCount / 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#2563EB', '#DC2626', '#16A34A', '#CA8A04'],
        });
      }, 400);
    }
  };

  if (teamsLoading) {
    return (
      <div className="space-y-6 min-h-screen bg-background -m-6 p-6">
        <Skeleton className="h-16 w-64" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="relative -m-6 min-h-screen space-y-6 overflow-hidden bg-background p-6">
      <FallingConfetti count={50} />

      <motion.div
        className="pointer-events-none absolute top-4 left-4"
        animate={{ y: [0, -8, 0], rotate: [-12, -8, -12] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.div
          animate={{
            opacity: [0.15, 0.3, 0.15],
            filter: [
              'drop-shadow(0 0 8px rgba(234, 179, 8, 0.3))',
              'drop-shadow(0 0 20px rgba(234, 179, 8, 0.6))',
              'drop-shadow(0 0 8px rgba(234, 179, 8, 0.3))',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Trophy className="h-24 w-24 text-yellow-500" />
        </motion.div>
      </motion.div>

      <motion.div
        className="pointer-events-none absolute top-4 right-4"
        animate={{ y: [0, -6, 0], rotate: [12, 16, 12] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      >
        <motion.div
          animate={{
            opacity: [0.15, 0.3, 0.15],
            filter: [
              'drop-shadow(0 0 6px rgba(234, 179, 8, 0.3))',
              'drop-shadow(0 0 16px rgba(234, 179, 8, 0.6))',
              'drop-shadow(0 0 6px rgba(234, 179, 8, 0.3))',
            ],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        >
          <Trophy className="h-20 w-20 text-yellow-500" />
        </motion.div>
      </motion.div>

      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 dark:bg-yellow-950/50">
            <Trophy className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Champions Great League</h1>
            <p className="text-muted-foreground">O campeonato interno de performance das equipes</p>
          </div>
        </div>

        {canAddEvents && <AddEventDialog teams={teams} />}
      </div>

      <Card className="relative z-10 border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <CardContent className="py-4 text-center">
          <p className="text-lg font-medium text-foreground">
            Cada ponto importa. Cada cliente conta. Toda equipe compete.
          </p>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="relative z-10">
        <TabsList className="grid w-full max-w-2xl grid-cols-5">
          <TabsTrigger value="dashboard" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="ranking" className="gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Classificação</span>
          </TabsTrigger>
          <TabsTrigger value="teams" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Equipes</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Gráficos</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Eventos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <ChampionshipDashboard />
        </TabsContent>

        <TabsContent value="ranking" className="mt-6">
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-primary/10 bg-white/80 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Filtrar ranking por equipe</p>
              <p className="text-xs text-muted-foreground">
                Escolha entre todas as equipes, Tropa de Elite ou Equipe 7.
              </p>
            </div>
            <ToggleGroup
              type="single"
              value={rankingFilter}
              onValueChange={(value) => {
                if (value) setRankingFilter(value as 'all' | 'elite' | 'team7');
              }}
              className="flex flex-wrap justify-start rounded-xl bg-primary/5 p-1"
            >
              <ToggleGroupItem value="all" className="rounded-lg border-0 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                Todas as equipes
              </ToggleGroupItem>
              <ToggleGroupItem value="elite" className="rounded-lg border-0 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                Tropa de Elite
              </ToggleGroupItem>
              <ToggleGroupItem value="team7" className="rounded-lg border-0 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                Equipe 7
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <ChampionshipPodium teams={filteredTeams} />
          <ChampionshipRankingTable teams={filteredTeams} />
        </TabsContent>

        <TabsContent value="teams" className="mt-6">
          <TeamChampionshipCards teams={teams} monthlyHistory={monthlyHistory} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6 space-y-6">
          <PointsEvolutionChart teams={teams} monthlyHistory={monthlyHistory} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ItemsSoldBreakdown events={events} teams={teams} />
            <RenewalVsLossChart teams={teams} />
          </div>
        </TabsContent>

        <TabsContent value="events" className="mt-6">
          <ChampionshipEventsLog events={events} teams={teams} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
