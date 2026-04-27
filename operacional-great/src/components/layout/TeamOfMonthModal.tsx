import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useUserPreference } from '@/hooks/useUserPreference';

interface TeamStat {
  teamName: string;
  count: number;
}

function isEndOfMonth(): boolean {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return today.getDate() === lastDay;
}

function getStorageKey(): string {
  const date = new Date();
  return `team_of_month_seen_${date.getFullYear()}_${date.getMonth()}`;
}

export function TeamOfMonthModal() {
  const { user, isAdmin } = useAuth();
  const [visible, setVisible] = useState(false);
  const [best, setBest] = useState<TeamStat | null>(null);
  const storageKey = getStorageKey();
  const { value: hasSeenThisMonth, setValue: setHasSeenThisMonth } = useUserPreference<boolean>(
    storageKey,
    false,
  );

  useEffect(() => {
    if (!user || isAdmin) return;
    if (typeof window !== 'undefined' && (window as Window & { Cypress?: unknown }).Cypress) return;
    if (!isEndOfMonth()) return;
    if (hasSeenThisMonth) return;

    async function load() {
      const { data: teams } = await supabase.from('teams').select('id, name');
      if (!teams || teams.length === 0) return;

      const { data: clients } = await supabase
        .from('operational_clients')
        .select('team_id')
        .eq('status_operacional', 'ATIVO');

      if (!clients || clients.length === 0) return;

      const counts: Record<string, number> = {};
      clients.forEach((client: any) => {
        if (client.team_id) counts[client.team_id] = (counts[client.team_id] || 0) + 1;
      });

      let bestId = '';
      let bestCount = 0;
      Object.entries(counts).forEach(([id, count]) => {
        if (count > bestCount) {
          bestCount = count;
          bestId = id;
        }
      });

      if (!bestId || bestCount === 0) return;

      const team = teams.find((item: any) => item.id === bestId);
      if (!team) return;

      setBest({ teamName: team.name, count: bestCount });
      setVisible(true);
    }

    void load();
  }, [hasSeenThisMonth, isAdmin, storageKey, user]);

  useEffect(() => {
    if (!visible) return;

    const fire = () => {
      confetti({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0 }, colors: ['#E10600', '#fff', '#ff9999'] });
      confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1 }, colors: ['#E10600', '#fff', '#ff9999'] });
    };

    fire();
    const t1 = setTimeout(fire, 800);
    const t2 = setTimeout(fire, 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [visible]);

  async function handleClose() {
    await setHasSeenThisMonth(true);
    setVisible(false);
  }

  if (!best) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 200 }}
            className="relative flex w-full max-w-xl flex-col items-center rounded-3xl border border-border bg-card px-12 py-14 text-center shadow-2xl mx-4"
          >
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <motion.div
              animate={{ rotate: [-8, 8, -8] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
              className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-warning/10"
            >
              <Trophy className="h-10 w-10 text-warning" />
            </motion.div>

            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
              Melhor equipe do mês
            </p>

            <motion.h1
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="mb-4 text-5xl font-extrabold leading-tight text-foreground"
            >
              {best.teamName}
            </motion.h1>

            <p className="mb-8 text-xl text-muted-foreground">
              Parabéns{' '}
              <span className="font-bold text-foreground">{best.teamName}</span>
              {' '}pelas{' '}
              <span className="font-bold text-primary">{best.count}</span>
              {' '}conquistas este mês! 🎉
            </p>

            <Button onClick={handleClose} size="lg" className="rounded-full px-10 text-base">
              Fechar
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
