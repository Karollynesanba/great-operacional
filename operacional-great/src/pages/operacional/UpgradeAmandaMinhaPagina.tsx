import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Layers3,
  LayoutGrid,
  Palette,
  Sparkles,
  FileText,
  Image as ImageIcon,
  PlayCircle,
  Rocket,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const shortcutCards = [
  {
    title: 'Identidade (paleta)',
    description: 'Sua identidade visual e as diretrizes que mantêm tudo consistente.',
    icon: Palette,
    accent: 'bg-rose-50 text-red-600',
  },
  {
    title: 'Roteiros validados',
    description: 'Roteiros testados e aprovados para diferentes objetivos e formatos.',
    icon: FileText,
    accent: 'bg-purple-50 text-purple-600',
  },
  {
    title: 'Calendário de gravação',
    description: 'Planeje e organize gravações, datas e publicações com clareza.',
    icon: CalendarDays,
    accent: 'bg-blue-50 text-blue-600',
  },
  {
    title: 'Estruturas que performam',
    description: 'Formatos e frameworks que já trouxeram os melhores resultados.',
    icon: Layers3,
    accent: 'bg-orange-50 text-orange-500',
  },
  {
    title: 'Modelos prontos',
    description: 'Templates prontos para acelerar a produção do time.',
    icon: Sparkles,
    accent: 'bg-pink-50 text-pink-600',
  },
];

const featuredStats = [
  { label: 'Roteiros', value: '24', subtitle: 'validados', tone: 'text-red-600' },
  { label: 'Gravações', value: '12', subtitle: 'agendadas', tone: 'text-blue-600' },
  { label: 'Publicações', value: '56', subtitle: 'este mês', tone: 'text-emerald-600' },
  { label: 'Desempenho', value: '4.8%', subtitle: 'taxa média', tone: 'text-orange-500' },
];

const nextItems = [
  { title: 'Vídeo - Implante Dentário', owner: 'Dr. João Silva', time: '09:00', tag: 'Roteiro', color: 'bg-amber-100 text-amber-600' },
  { title: 'Reels - Clareamento', owner: 'Dra. Maria Santos', time: '14:00', tag: 'Criativo', color: 'bg-emerald-100 text-emerald-600' },
  { title: 'Depoimento Paciente', owner: 'Dr. João Silva', time: '10:30', tag: 'Depoimento', color: 'bg-violet-100 text-violet-600' },
];

const recentActivities = [
  {
    title: 'Novo roteiro validado adicionado',
    description: '“Roteiro - Dor de Dente” foi salvo na biblioteca.',
    time: '2h atrás',
    icon: Sparkles,
    tone: 'bg-violet-50 text-violet-600',
  },
  {
    title: 'Criativo aprovado',
    description: '“Implante - Antes e Depois” foi aprovado no fluxo.',
    time: '4h atrás',
    icon: Rocket,
    tone: 'bg-emerald-50 text-emerald-600',
  },
  {
    title: 'Gravação agendada',
    description: 'Vídeo “Lentes de Contato Dental” agendado para 26/05.',
    time: '6h atrás',
    icon: CalendarDays,
    tone: 'bg-blue-50 text-blue-600',
  },
];

const filters = ['Todos', 'Identidade', 'Roteiros', 'Calendário', 'Estruturas', 'Modelos'];

export default function UpgradeAmandaMinhaPagina() {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[32px] border border-border/70 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(225,6,0,0.08),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.08),_transparent_24%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Badge className="w-fit rounded-full bg-red-50 px-3 py-1 text-red-600 shadow-none hover:bg-red-50">
              Upgrade de Amanda
            </Badge>
            <div>
              <h1 className="text-3xl font-black tracking-[-0.05em] text-foreground sm:text-4xl">Minha Página</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Um painel de inspiração com blocos bonitos, filtros elegantes e atalhos para as áreas da página
                pessoal. O foco aqui é parecer completo, premium e fácil de navegar.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="rounded-2xl border-border/60 bg-white/85 shadow-sm">
              <PlayCircle className="mr-2 h-4 w-4" />
              Como funciona
            </Button>
            <Button asChild className="rounded-2xl bg-red-600 text-white shadow-md shadow-red-500/20 hover:bg-red-500">
              <Link to="/operacional/upgrade-de-amanda/calendario-de-gravacao">
                Ir para calendário
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shortcutCards.map((card, index) => {
          const Icon = card.icon;
          const isWide = index === 2;
          return (
            <Card
              key={card.title}
              className={`overflow-hidden rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)] ${isWide ? 'xl:col-span-1 md:col-span-2' : ''}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${card.accent}`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold text-foreground">{card.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.description}</p>
                    <Button asChild variant="ghost" className="mt-4 h-auto p-0 text-red-600 hover:bg-transparent hover:text-red-500">
                      <Link
                          to={
                            index === 0
                              ? '/operacional/upgrade-de-amanda/identidade-paleta'
                            : index === 1
                              ? '/operacional/upgrade-de-amanda/roteiros-validados'
                              : index === 2
                                ? '/operacional/upgrade-de-amanda/calendario-de-gravacao'
                                : index === 3
                                  ? '/operacional/upgrade-de-amanda/estruturas-que-performam'
                                  : '/operacional/upgrade-de-amanda/modelos-prontos'
                        }
                      >
                        Ver {card.title.toLowerCase().replace(/\s+/g, ' ')}
                        <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="rounded-[30px] border border-border/70 bg-white/95 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter, index) => (
              <Button
                key={filter}
                variant={index === 0 ? 'default' : 'outline'}
                className={`rounded-full px-4 ${index === 0 ? 'bg-red-600 text-white hover:bg-red-500' : 'border-border/60 bg-white/80 text-muted-foreground'}`}
              >
                {filter}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full min-w-[260px] md:w-[280px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar modelos..."
                className="h-11 rounded-2xl border-border/60 bg-white pl-9 shadow-none"
              />
            </div>
            <Button variant="outline" className="h-11 rounded-2xl border-border/60 bg-white/80">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filtros
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <Card className="overflow-hidden rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Resumo da sua página</h2>
                <p className="mt-1 text-sm text-muted-foreground">KPIs bonitos e fáceis de ler, com o estilo Great.</p>
              </div>
              <Button variant="ghost" className="rounded-2xl text-red-600 hover:bg-red-50 hover:text-red-600">
                Ver calendário completo
              </Button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {featuredStats.map((item, index) => (
                <div key={item.label} className="rounded-[24px] border border-border/60 bg-surface-2/30 p-4">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <div className={`text-3xl font-black tracking-[-0.05em] ${item.tone}`}>{item.value}</div>
                    <span className="text-xs text-muted-foreground">{index === 0 ? 'validados' : item.subtitle}</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-red-500 via-orange-500 to-pink-500"
                      style={{ width: `${62 + index * 8}%` }}
                    />
                  </div>
                </div>
              ))}
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
              <Button variant="ghost" className="rounded-2xl text-red-600 hover:bg-red-50 hover:text-red-600">
                Ver todas
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {recentActivities.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex items-start gap-3 rounded-[22px] border border-border/60 bg-surface-2/30 p-4">
                    <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl ${item.tone}`}>
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

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Próximas gravações</h2>
                <p className="mt-1 text-sm text-muted-foreground">Lista estilizada com os conteúdos que já estão no pipeline.</p>
              </div>
              <Button variant="outline" className="rounded-2xl border-border/60 bg-white/80">
                Filtrar por equipe
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {nextItems.map((item, index) => (
                <div key={item.title} className="flex items-center gap-4 rounded-[24px] border border-border/60 bg-white p-4 shadow-sm">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface-2/60">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      <Badge className={`rounded-full ${item.color}`}>{item.tag}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.owner} • {item.time}
                    </p>
                  </div>

                  <Button variant="ghost" size="icon" className="rounded-full">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Biblioteca de arquivos</h2>
                <p className="mt-1 text-sm text-muted-foreground">Atalhos prontos para acelerar a produção.</p>
              </div>
              <Button variant="ghost" className="rounded-2xl text-red-600 hover:bg-red-50 hover:text-red-600">
                Ver biblioteca completa
              </Button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { title: 'Logos', count: '18', color: 'bg-emerald-50 text-emerald-600' },
                { title: 'Artes', count: '36', color: 'bg-pink-50 text-pink-600' },
                { title: 'Vídeos', count: '22', color: 'bg-violet-50 text-violet-600' },
                { title: 'Trilhas', count: '15', color: 'bg-orange-50 text-orange-500' },
                { title: 'Templates', count: '28', color: 'bg-blue-50 text-blue-600' },
                { title: 'Outros', count: '40', color: 'bg-slate-50 text-slate-600' },
              ].map((item) => (
                <div key={item.title} className="rounded-[22px] border border-border/60 bg-surface-2/30 p-4 text-center">
                  <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${item.color}`}>
                    <LayoutGrid className="h-6 w-6" />
                  </div>
                  <h3 className="mt-3 font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.count} arquivos</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
