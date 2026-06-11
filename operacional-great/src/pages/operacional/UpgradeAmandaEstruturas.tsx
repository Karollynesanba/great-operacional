import { MoreVertical, Filter, Eye, Bookmark, ChevronLeft, ChevronRight, Search, PlayCircle, Users, CalendarRange, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const tabs = ['Todos', 'Roteiros', 'Criativos', 'Hooks', 'Antes e Depois', 'Modelos de Conteúdo'];

const filters = [
  { label: 'Filtrar por cliente', value: 'Todos os clientes' },
  { label: 'Filtrar por período', value: 'Últimos 30 dias' },
];

const stats = [
  { label: 'Estruturas que performam', value: '47', helper: 'no período', icon: ArrowUpRight, tone: 'bg-rose-50 text-red-600', trend: '+18% vs período anterior' },
  { label: 'Visualizações totais', value: '128,6 mil', helper: 'no período', icon: Eye, tone: 'bg-violet-50 text-violet-600', trend: '+26% vs período anterior' },
  { label: 'Engajamento médio', value: '6,2%', helper: 'no período', icon: ArrowUpRight, tone: 'bg-emerald-50 text-emerald-600', trend: '+14% vs período anterior' },
  { label: 'Salvamentos', value: '3,1 mil', helper: 'no período', icon: Bookmark, tone: 'bg-orange-50 text-orange-500', trend: '+31% vs período anterior' },
];

const rows = [
  {
    title: '3 sinais de que seu implante pode estar com problemas',
    subtitle: 'Roteiro educativo',
    type: 'Roteiro',
    typeTone: 'bg-violet-100 text-violet-700',
    client: 'Dr. João Silva',
    specialty: 'Implantodontia',
    uses: '24 vezes',
    views: '32,1 mil',
    engagement: '7,8%',
    saves: '842',
  },
  {
    title: 'Antes e depois: transforme seu sorriso',
    subtitle: 'Criativo (Antes e Depois)',
    type: 'Criativo',
    typeTone: 'bg-emerald-100 text-emerald-700',
    client: 'Dra. Camila Rocha',
    specialty: 'Harmonização',
    uses: '18 vezes',
    views: '28,4 mil',
    engagement: '6,1%',
    saves: '721',
  },
  {
    title: 'Lente de contato dental: o que ninguém te conta',
    subtitle: 'Hook (Mito ou Verdade)',
    type: 'Hook',
    typeTone: 'bg-orange-100 text-orange-700',
    client: 'Dr. Lucas Ferreira',
    specialty: 'Ortodontia',
    uses: '16 vezes',
    views: '24,7 mil',
    engagement: '5,9%',
    saves: '612',
  },
  {
    title: 'Por dentro do procedimento de implante',
    subtitle: 'Roteiro (Bastidores/Processo)',
    type: 'Roteiro',
    typeTone: 'bg-violet-100 text-violet-700',
    client: 'Dr. Pedro Almeida',
    specialty: 'Clareamento Dental',
    uses: '14 vezes',
    views: '18,9 mil',
    engagement: '5,2%',
    saves: '498',
  },
  {
    title: 'Dor no dente pode ser algo mais sério',
    subtitle: 'Roteiro de Alerta',
    type: 'Roteiro',
    typeTone: 'bg-violet-100 text-violet-700',
    client: 'Dra. Juliana Martins',
    specialty: 'Harmonização Facial',
    uses: '12 vezes',
    views: '15,3 mil',
    engagement: '4,7%',
    saves: '412',
  },
];

export default function UpgradeAmandaEstruturas() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[32px] border border-border/70 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-[-0.05em] text-foreground sm:text-4xl">Estruturas que Performam</h1>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-red-50 text-red-600 shadow-sm">
              <ArrowUpRight className="h-5 w-5" />
            </span>
          </div>
          <p className="text-sm leading-6 text-muted-foreground sm:text-base">
            Roteiros, criativos e formatos que já trouxeram os melhores resultados.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-2xl border-border/60 bg-white/85 shadow-sm">
            <PlayCircle className="mr-2 h-4 w-4" />
            Como funciona
          </Button>
          <Button className="rounded-2xl bg-red-600 text-white shadow-md shadow-red-500/20 hover:bg-red-500">
            <span className="mr-2 text-lg leading-none">+</span>
            Nova estrutura
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card className="rounded-[28px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab, index) => (
                <Button
                  key={tab}
                  variant={index === 0 ? 'default' : 'ghost'}
                  className={`rounded-full px-4 ${
                    index === 0
                      ? 'bg-red-600 text-white hover:bg-red-500'
                      : 'bg-transparent text-foreground hover:bg-surface-2/70'
                  }`}
                >
                  {tab}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
          <Card className="rounded-[28px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Filtrar por cliente</p>
              <Button variant="outline" className="mt-3 h-12 w-full justify-between rounded-2xl border-border/60 bg-white/80">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Todos os clientes
                </span>
                <span>⌄</span>
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Filtrar por período</p>
              <Button variant="outline" className="mt-3 h-12 w-full justify-between rounded-2xl border-border/60 bg-white/80">
                <span className="flex items-center gap-2">
                  <CalendarRange className="h-4 w-4 text-muted-foreground" />
                  Últimos 30 dias
                </span>
                <span>⌄</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="rounded-[28px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${stat.tone}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <div className="mt-1 text-3xl font-black tracking-[-0.05em] text-foreground">{stat.value}</div>
                    <p className="text-sm text-muted-foreground">{stat.helper}</p>
                    <p className="mt-4 text-sm font-medium text-emerald-600">{stat.trend}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-[-0.04em] text-foreground">Estruturas de maior resultado</h2>
              <p className="mt-1 text-sm text-muted-foreground">Uma seleção das estruturas mais usadas e com melhor resposta no período.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" className="rounded-2xl border-border/60 bg-white/80">
                <Filter className="mr-2 h-4 w-4" />
                Limpar filtros
              </Button>
              <div className="relative min-w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar estrutura..." className="h-11 rounded-2xl border-border/60 bg-white pl-9 shadow-none" />
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[24px] border border-border/60">
            <div className="grid grid-cols-[1.4fr_0.55fr_0.9fr_0.45fr_0.6fr_0.55fr_0.45fr_0.35fr] bg-surface-2/40 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <div>Estrutura</div>
              <div>Tipo</div>
              <div>Cliente</div>
              <div>Uso</div>
              <div>Visualizações</div>
              <div>Engajamento</div>
              <div>Salvamentos</div>
              <div>Ações</div>
            </div>

            <div className="divide-y divide-border/60 bg-white">
              {rows.map((row, index) => (
                <div key={row.title} className="grid grid-cols-[1.4fr_0.55fr_0.9fr_0.45fr_0.6fr_0.55fr_0.45fr_0.35fr] items-center gap-4 px-4 py-4">
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 via-slate-500 to-slate-900 shadow-sm">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.16),_transparent_55%)]" />
                      <div className="absolute bottom-2 left-2 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Preview
                      </div>
                      <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/35 text-white">
                        <PlayCircle className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold leading-5 text-foreground">{row.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{row.subtitle}</p>
                    </div>
                  </div>

                  <div>
                    <Badge className={`rounded-full px-3 py-1 text-xs shadow-none ${row.typeTone}`}>{row.type}</Badge>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{row.client}</p>
                      <p className="text-sm text-muted-foreground">{row.specialty}</p>
                    </div>
                  </div>

                  <div className="text-sm font-medium text-foreground">{row.uses}</div>

                  <div>
                    <div className="text-sm font-semibold text-foreground">{row.views}</div>
                    <div className="mt-2 flex items-end gap-1">
                      {[12, 22, 17, 28, 14, 30, 19, 26].map((height, i) => (
                        <span
                          key={i}
                          className="w-1.5 rounded-full bg-emerald-600/70"
                          style={{ height: `${height}px` }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="text-sm font-semibold text-emerald-700">{row.engagement}</div>

                  <div className="text-sm font-semibold text-foreground">{row.saves}</div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-border/60 bg-white">
                      <Bookmark className="h-4 w-4 text-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-border/60 bg-surface-2/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">Mostrando 1 a 5 de 47 estruturas</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-2xl border-border/60 bg-white">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="h-9 rounded-2xl border-red-200 bg-red-50 text-red-600">1</Button>
                <Button variant="outline" className="h-9 rounded-2xl border-border/60 bg-white">2</Button>
                <Button variant="outline" className="h-9 rounded-2xl border-border/60 bg-white">3</Button>
                <span className="px-1 text-muted-foreground">…</span>
                <Button variant="outline" className="h-9 rounded-2xl border-border/60 bg-white">9</Button>
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-2xl border-border/60 bg-white">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
