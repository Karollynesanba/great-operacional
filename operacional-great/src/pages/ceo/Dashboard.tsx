import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CEOGoalsProgress } from '@/components/ceo/CEOGoalsProgress';
import { EditAllSDRGoalsDialog } from '@/components/comercial/EditAllSDRGoalsDialog';
import { BarChart3, CalendarDays, Target } from 'lucide-react';

export default function GoalsDashboard() {
  const [sdrDialogOpen, setSdrDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[32px] border border-border/70 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(225,6,0,0.08),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.08),_transparent_24%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Badge className="w-fit rounded-full bg-red-50 px-3 py-1 text-red-600 shadow-none hover:bg-red-50">
              Metas
            </Badge>
            <div>
              <h1 className="text-3xl font-black tracking-[-0.05em] text-foreground sm:text-4xl">
                Painel de Metas
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                As metas comerciais agora usam rota real, persistem no Supabase e se atualizam em
                outros navegadores e usuarios com a mesma base.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="rounded-2xl border-border/60 bg-white/85 shadow-sm"
              onClick={() => setSdrDialogOpen(true)}
            >
              <Target className="mr-2 h-4 w-4" />
              Metas dos SDRs
            </Button>
            <Button
              className="rounded-2xl bg-red-600 text-white shadow-md shadow-red-500/20 hover:bg-red-500"
              onClick={() => setSdrDialogOpen(true)}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Ajustar metas
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: 'Receita do mes',
            description: 'Meta comercial com upsert no banco e leitura em tempo real.',
            icon: BarChart3,
          },
          {
            title: 'Agendamentos fechados',
            description: 'Metas por SDR sincronizadas entre usuarios.',
            icon: CalendarDays,
          },
          {
            title: 'Historico',
            description: 'As alteracoes ficam no Supabase, nao apenas no navegador.',
            icon: Target,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="overflow-hidden rounded-[28px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-foreground">{item.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CEOGoalsProgress />

      <EditAllSDRGoalsDialog open={sdrDialogOpen} onOpenChange={setSdrDialogOpen} />
    </div>
  );
}
