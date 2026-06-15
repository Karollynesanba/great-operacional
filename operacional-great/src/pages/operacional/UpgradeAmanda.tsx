import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarRange,
  FolderOpen,
  LayoutGrid,
  PlayCircle,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

// Alias local para evitar falha de runtime se o módulo ficar preso em uma versão antiga do navegador.
const Bookmark = FolderOpen;

const modules = [
  {
    title: 'Minha Página',
    description: 'Identidade, roteiros validados, calendário de gravação, estruturas e modelos em um só lugar.',
    href: '/operacional/upgrade-de-amanda/minha-pagina',
    icon: LayoutGrid,
    accent: 'from-rose-500/15 to-red-500/10',
    iconColor: 'text-red-600',
  },
  {
    title: 'Calendário de Gravação',
    description: 'Agenda visual com compromissos, próximos lembretes e acompanhamento de gravações.',
    href: '/operacional/upgrade-de-amanda/calendario-de-gravacao',
    icon: CalendarRange,
    accent: 'from-blue-500/15 to-sky-500/10',
    iconColor: 'text-blue-600',
  },
  {
    title: 'Estruturas que Performam',
    description: 'Biblioteca de roteiros, criativos e formatos com os melhores resultados.',
    href: '/operacional/upgrade-de-amanda/estruturas-que-performam',
    icon: TrendingUp,
    accent: 'from-emerald-500/15 to-lime-500/10',
    iconColor: 'text-emerald-600',
  },
  {
    title: 'Modelos Prontos',
    description: 'Biblioteca inteligente para guardar e reutilizar materiais estratégicos.',
    href: '/operacional/upgrade-de-amanda/modelos-prontos',
    icon: FolderOpen,
    accent: 'from-orange-500/15 to-amber-500/10',
    iconColor: 'text-orange-500',
  },
];

const kpis = [
  { label: 'Módulos ativos', value: '4', note: 'em expansão', icon: Sparkles, tone: 'text-red-600', bg: 'bg-red-50' },
  { label: 'Gravações', value: '12', note: 'agendadas este mês', icon: CalendarRange, tone: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Estruturas', value: '47', note: 'com performance alta', icon: BarChart3, tone: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Modelos prontos', value: '128', note: 'para reutilização', icon: Bookmark, tone: 'text-orange-500', bg: 'bg-orange-50' },
];

const activityFeed = [
  {
    title: 'Nova estrutura adicionada',
    description: '"Implante - Antes e Depois" foi salva na biblioteca.',
    time: 'há 2h',
  },
  {
    title: 'Roteiro validado',
    description: 'O roteiro "Dor de Dente" recebeu aprovação final.',
    time: 'há 4h',
  },
  {
    title: 'Calendário atualizado',
    description: 'Uma nova gravação foi agendada para a próxima semana.',
    time: 'há 6h',
  },
];

export default function UpgradeAmanda() {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[32px] border border-border/70 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(225,6,0,0.08),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.08),_transparent_24%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Badge className="w-fit rounded-full bg-red-50 px-3 py-1 text-red-600 shadow-none hover:bg-red-50">
              Upgrade de Amanda
            </Badge>
            <div>
              <h1 className="text-3xl font-black tracking-[-0.05em] text-foreground sm:text-4xl">Upgrade de Amanda</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Um agrupador visual para as novas áreas inspiradas no protótipo. A ideia aqui é deixar a
                experiência mais bonita, mais clara e mais completa sem perder o padrão vermelho da Great.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="rounded-2xl border-border/60 bg-white/85 shadow-sm">
              <Link to="/operacional/upgrade-de-amanda/minha-pagina">
                <PlayCircle className="mr-2 h-4 w-4" />
                Como usar
              </Link>
            </Button>
            <Button asChild className="rounded-2xl bg-red-600 text-white shadow-md shadow-red-500/20 hover:bg-red-500">
              <Link to="/operacional/upgrade-de-amanda/minha-pagina">
                Explorar agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="overflow-hidden rounded-[28px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                    <div className="mt-2 text-3xl font-black tracking-[-0.05em] text-foreground">{item.value}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.bg} ${item.tone}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Card
              key={module.href}
              className={`overflow-hidden rounded-[30px] border-border/70 bg-gradient-to-br ${module.accent} shadow-[0_20px_60px_rgba(15,23,42,0.06)]`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/90 ${module.iconColor} shadow-sm`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold text-foreground">{module.title}</h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{module.description}</p>
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <Button asChild className="rounded-2xl bg-red-600 text-white shadow-md shadow-red-500/20 hover:bg-red-500">
                        <Link to={module.href}>
                          Abrir página
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <Badge variant="outline" className="rounded-full border-border/60 bg-white/80 px-3 py-1 text-xs text-muted-foreground">
                        Nova seção
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Resumo da sua página</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Um panorama rapido do que existe dentro do upgrade, com foco em producao e reutilizacao.
                </p>
              </div>
              <Button asChild variant="outline" className="rounded-2xl border-border/60 bg-white/80">
                <Link to="/operacional/upgrade-de-amanda/minha-pagina">Ver tudo</Link>
              </Button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Roteiros', value: '24', sub: 'validados' },
                { label: 'Gravações', value: '12', sub: 'agendadas' },
                { label: 'Publicações', value: '56', sub: 'este mês' },
                { label: 'Engajamento', value: '4.8%', sub: 'taxa média' },
              ].map((item, index) => {
                const tone = ['bg-red-50 text-red-600', 'bg-blue-50 text-blue-600', 'bg-emerald-50 text-emerald-600', 'bg-orange-50 text-orange-500'][index];
                return (
                  <div key={item.label} className="rounded-[24px] border border-border/60 bg-surface-2/30 p-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}>
                      <Activity className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{item.label}</p>
                    <div className="mt-1 text-2xl font-black tracking-[-0.05em] text-foreground">{item.value}</div>
                    <p className="text-xs text-muted-foreground">{item.sub}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Atividades recentes</h2>
                <p className="mt-1 text-sm text-muted-foreground">Atualizações e entregas do ecossistema Amanda.</p>
              </div>
              <Button asChild variant="ghost" className="rounded-2xl text-red-600 hover:bg-red-50 hover:text-red-600">
                <Link to="/operacional/execucao/atividades">Ver todas</Link>
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {activityFeed.map((item) => {
                const Icon = Sparkles;
                return (
                  <div key={item.title} className="flex items-start gap-3 rounded-[22px] border border-border/60 bg-surface-2/30 p-4">
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                        <span className="text-xs text-muted-foreground">{item.time}</span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
