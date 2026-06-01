import { motion } from 'framer-motion';
import { Trophy, Medal } from 'lucide-react';
import { ChampionshipTeam } from '@/hooks/useChampionshipData';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import confetti from 'canvas-confetti';

interface ChampionshipPodiumProps {
  teams: ChampionshipTeam[];
}

export function ChampionshipPodium({ teams }: ChampionshipPodiumProps) {
  const sortedTeams = [...teams].sort((a, b) => (a.current_rank || 99) - (b.current_rank || 99));
  const top3 = sortedTeams.slice(0, 3);
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  if (podiumOrder.length < 2) {
    return null;
  }

  const triggerChampionConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.5, x: 0.5 },
      colors: ['#FFD700', '#FFA500', '#FFEC8B', '#F0E68C', '#DAA520'],
      disableForReducedMotion: true,
    });

    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0.3, y: 0.5 },
        colors: ['#FFD700', '#FFA500', '#FFEC8B', '#2563EB', '#DC2626'],
      });
    }, 150);

    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 0.7, y: 0.5 },
        colors: ['#FFD700', '#FFA500', '#FFEC8B', '#2563EB', '#DC2626'],
      });
    }, 300);

    setTimeout(() => {
      confetti({
        particleCount: 30,
        angle: 270,
        spread: 100,
        origin: { x: 0.5, y: 0 },
        colors: ['#FFD700', '#FFFFFF', '#FFA500'],
        gravity: 0.8,
      });
    }, 450);
  };

  const getPodiumHeight = (rank: number) => {
    switch (rank) {
      case 1:
        return 'h-32';
      case 2:
        return 'h-24';
      case 3:
        return 'h-16';
      default:
        return 'h-16';
    }
  };

  const getPodiumDelay = (rank: number) => {
    switch (rank) {
      case 1:
        return 0.4;
      case 2:
        return 0.2;
      case 3:
        return 0.6;
      default:
        return 0.6;
    }
  };

  const getMedalBg = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-b from-yellow-400 to-yellow-600';
      case 2:
        return 'bg-gradient-to-b from-gray-300 to-gray-500';
      case 3:
        return 'bg-gradient-to-b from-amber-500 to-amber-700';
      default:
        return 'bg-gray-400';
    }
  };

  const getPodiumBg = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-t from-yellow-600 via-yellow-500 to-yellow-400';
      case 2:
        return 'bg-gradient-to-t from-gray-500 via-gray-400 to-gray-300';
      case 3:
        return 'bg-gradient-to-t from-amber-700 via-amber-600 to-amber-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <TooltipProvider>
      <div className="mb-8">
        <div className="flex items-end justify-center gap-2 py-8 sm:gap-4">
          {podiumOrder.map((team, index) => {
            if (!team) return null;
            const rank = team.current_rank || (index === 1 ? 1 : index === 0 ? 2 : 3);

            const podiumContent = (
              <motion.div
                key={team.team_id}
                className={`flex flex-col items-center ${rank === 1 ? 'cursor-pointer' : ''}`}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: getPodiumDelay(rank),
                  ease: 'easeOut',
                }}
                onClick={rank === 1 ? triggerChampionConfetti : undefined}
                whileHover={rank === 1 ? { scale: 1.05 } : {}}
                whileTap={rank === 1 ? { scale: 0.98 } : {}}
              >
                <motion.div
                  className="mb-3 flex flex-col items-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    duration: 0.4,
                    delay: getPodiumDelay(rank) + 0.3,
                    type: 'spring',
                    stiffness: 200,
                  }}
                >
                  <motion.div
                    className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full ${getMedalBg(rank)} shadow-lg sm:h-12 sm:w-12`}
                    animate={
                      rank === 1
                        ? {
                            boxShadow: [
                              '0 0 10px rgba(234, 179, 8, 0.4)',
                              '0 0 25px rgba(234, 179, 8, 0.7)',
                              '0 0 10px rgba(234, 179, 8, 0.4)',
                            ],
                          }
                        : {}
                    }
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {rank === 1 ? (
                      <Trophy className="h-5 w-5 text-white sm:h-6 sm:w-6" />
                    ) : (
                      <Medal className="h-5 w-5 text-white sm:h-6 sm:w-6" />
                    )}
                  </motion.div>

                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-background text-sm font-bold text-white shadow-xl sm:h-14 sm:w-14 sm:text-base"
                    style={{ backgroundColor: team.badge_color }}
                  >
                    {team.label.substring(0, 2).toUpperCase()}
                  </div>

                  <p className="mt-2 max-w-[80px] truncate text-center text-xs font-semibold text-foreground sm:max-w-[100px] sm:text-sm">
                    {team.label}
                  </p>

                  <motion.p
                    className="text-lg font-bold text-foreground sm:text-xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: getPodiumDelay(rank) + 0.5 }}
                  >
                    {team.total_points}
                    <span className="ml-1 text-xs text-muted-foreground">pts</span>
                  </motion.p>
                </motion.div>

                <motion.div
                  className={`flex ${getPodiumHeight(rank)} w-20 items-start justify-center rounded-t-lg ${getPodiumBg(rank)} pt-3 shadow-lg sm:w-28`}
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  transition={{
                    duration: 0.5,
                    delay: getPodiumDelay(rank),
                    ease: 'easeOut',
                  }}
                >
                  <span className="text-2xl font-black text-white/90 sm:text-3xl">{rank}º</span>
                </motion.div>
              </motion.div>
            );

            if (rank === 1) {
              return (
                <Tooltip key={team.team_id}>
                  <TooltipTrigger asChild>{podiumContent}</TooltipTrigger>
                  <TooltipContent side="top" className="border-yellow-600 bg-yellow-500 text-white">
                    <p className="font-medium">🎉 Clique para celebrar!</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return podiumContent;
          })}
        </div>

        <motion.div
          className="mx-auto max-w-md rounded-full bg-gradient-to-r from-transparent via-muted to-transparent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        />
      </div>
    </TooltipProvider>
  );
}
