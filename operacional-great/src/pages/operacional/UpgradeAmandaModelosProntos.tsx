import {
  ArrowRight,
  CalendarRange,
  ChevronRight,
  FileArchive,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Music4,
  PlayCircle,
  Search,
  SlidersHorizontal,
  Sparkles,
  Eye,
  Video,
  Upload,
  BookOpen,
  LayoutGrid,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const topStats = [
  {
    title: 'Roteiros Salvos',
    value: '128',
    subtitle: 'roteiros reutilizaveis',
    accent: 'bg-red-50 text-red-600',
    icon: FileText,
    cta: 'Ver Roteiros',
  },
  {
    title: 'Estruturas Salvas',
    value: '42',
    subtitle: 'estruturas prontas',
    accent: 'bg-purple-50 text-purple-600',
    icon: Sparkles,
    cta: 'Ver Estruturas',
  },
  {
    title: 'Materiais Salvos',
    value: '85',
    subtitle: 'arquivos reutilizaveis',
    accent: 'bg-emerald-50 text-emerald-600',
    icon: FileArchive,
    cta: 'Ver Materiais',
  },
  {
    title: 'Datas Comemorativas',
    value: '36',
    subtitle: 'campanhas prontas',
    accent: 'bg-orange-50 text-orange-500',
    icon: CalendarRange,
    cta: 'Ver Calendario',
  },
];

const tabs = [
  'Todos',
  'Roteiros',
  'Estruturas',
  'Materiais',
  'Datas Comemorativas',
  'Eventos Estrategicos',
  'Campanhas de Sucesso',
];

const mostUsed = [
  {
    title: '3 sinais de que seu implante pode estar com problemas',
    category: 'Roteiro',
    uses: 24,
    tone: 'from-slate-700 to-slate-900',
  },
  {
    title: 'Antes e Depois: transforme seu sorriso',
    category: 'Criativo',
    uses: 18,
    tone: 'from-emerald-700 to-emerald-900',
  },
  {
    title: 'Mito ou Verdade? Lente de contato dental',
    category: 'Estrutura',
    uses: 16,
    tone: 'from-zinc-700 to-black',
  },
  {
    title: 'Checklist pre-operatorio para implantes',
    category: 'Roteiro',
    uses: 15,
    tone: 'from-amber-700 to-orange-900',
  },
  {
    title: 'Bastidores do dia a dia na clinica',
    category: 'Criativo',
    uses: 12,
    tone: 'from-rose-700 to-pink-900',
  },
];

const campaignRows = [
  { day: '12', month: 'JUN', title: 'Dia dos Namorados', scripts: 8, creatives: 12, stories: 6, campaigns: 3 },
  { day: '20', month: 'JUN', title: 'Festas Juninas', scripts: 6, creatives: 10, stories: 4, campaigns: 2 },
  { day: '06', month: 'JUL', title: 'Ferias Escolares', scripts: 5, creatives: 8, stories: 4, campaigns: 2 },
  { day: '08', month: 'AGO', title: 'Dia dos Pais', scripts: 7, creatives: 11, stories: 5, campaigns: 3 },
  { day: '12', month: 'OUT', title: 'Dia das Criancas', scripts: 6, creatives: 9, stories: 4, campaigns: 2 },
  { day: '25', month: 'DEZ', title: 'Natal', scripts: 10, creatives: 15, stories: 6, campaigns: 4 },
];

const events = [
  { title: 'Copa do Mundo', description: 'Campanhas e ideias para o periodo da Copa.', items: 12, icon: Eye, tone: 'bg-violet-50 text-violet-600' },
  { title: 'Eleições', description: 'Conteudos estrategicos para periodo eleitoral.', items: 8, icon: Sparkles, tone: 'bg-slate-50 text-slate-600' },
  { title: 'Black Friday', description: 'Campanhas de promocao e ofertas especiais.', items: 10, icon: FileArchive, tone: 'bg-orange-50 text-orange-500' },
  { title: 'Outubro Rosa', description: 'Conteudos de conscientizacao e prevencao.', items: 9, icon: CalendarRange, tone: 'bg-pink-50 text-pink-600' },
  { title: 'Novembro Azul', description: 'Conteudos de conscientizacao e prevencao.', items: 9, icon: CalendarRange, tone: 'bg-blue-50 text-blue-600' },
];

const fileCategories = [
  { title: 'Logos', count: '18 arquivos', icon: ImageIcon, tone: 'bg-emerald-50 text-emerald-600' },
  { title: 'Artes', count: '36 arquivos', icon: Sparkles, tone: 'bg-pink-50 text-pink-600' },
  { title: 'Videos / Vinhetas', count: '22 arquivos', icon: Video, tone: 'bg-violet-50 text-violet-600' },
  { title: 'Trilhas Sonoras', count: '15 arquivos', icon: Music4, tone: 'bg-orange-50 text-orange-500' },
  { title: 'Templates', count: '28 arquivos', icon: LayoutGrid, tone: 'bg-blue-50 text-blue-600' },
  { title: 'Outros Arquivos', count: '40 arquivos', icon: FolderOpen, tone: 'bg-slate-50 text-slate-600' },
];

const typeCards = [
  { label: 'Todos', active: true },
  { label: 'Roteiros' },
  { label: 'Estruturas' },
  { label: 'Materiais' },
  { label: 'Datas Comemorativas' },
  { label: 'Eventos Estrategicos' },
  { label: 'Campanhas de Sucesso' },
];

export default function UpgradeAmandaModelosProntos() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[32px] border border-border/70 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-[-0.05em] text-foreground sm:text-4xl">Modelos Prontos</h1>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-red-50 text-red-600 shadow-sm">
              <FolderOpen className="h-5 w-5" />
            </span>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            Dados, roteiros, criativos e campanhas salvos para reutilizacao futura.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-2xl border-border/60 bg-white/85 shadow-sm">
            <PlayCircle className="mr-2 h-4 w-4" />
            Como funciona
          </Button>
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-border/60 bg-white/85 shadow-sm">
            <BookmarkIcon />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {topStats.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="rounded-[28px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${item.accent}`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-muted-foreground">{item.title}</p>
                    <div className="mt-1 text-4xl font-black tracking-[-0.05em] text-foreground">{item.value}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.subtitle}</p>
                    <Button variant="ghost" className="mt-4 h-auto p-0 text-sm text-red-600 hover:bg-transparent hover:text-red-500">
                      {item.cta}
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {typeCards.map((tab) => (
                <Button
                  key={tab.label}
                  variant={tab.active ? 'default' : 'outline'}
                  className={`rounded-full px-4 ${tab.active ? 'bg-red-600 text-white hover:bg-red-500' : 'border-border/60 bg-white/80 text-muted-foreground'}`}
                >
                  {tab.label}
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
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.25fr_0.9fr]">
        <Card className="rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Mais utilizados</h2>
                <p className="mt-1 text-sm text-muted-foreground">Conteudos com maior numero de reutilizacoes.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {mostUsed.map((item) => (
                <div key={item.title} className="flex items-center gap-3 rounded-[22px] border border-border/60 bg-white p-3 shadow-sm">
                  <div className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br ${item.tone}`}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.16),_transparent_55%)]" />
                    <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/30 text-white">
                      <PlayCircle className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">{item.title}</p>
                    <Badge className="mt-2 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] text-violet-700 shadow-none">
                      {item.category}
                    </Badge>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-white px-3 py-2 text-center">
                    <div className="text-xl font-black leading-none text-foreground">{item.uses}</div>
                    <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">usos</div>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="ghost" className="mt-5 h-auto p-0 text-red-600 hover:bg-transparent hover:text-red-500">
              Ver todos os mais utilizados
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Calendario de Campanhas</h2>
                <p className="mt-1 text-sm text-muted-foreground">Datas comemorativas e campanhas prontas para reutilizacao.</p>
              </div>
              <Button variant="ghost" className="rounded-2xl text-red-600 hover:bg-red-50 hover:text-red-600">
                Ver calendario completo
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {campaignRows.map((row) => (
                <div key={`${row.day}-${row.title}`} className="flex items-center gap-3 rounded-[22px] border border-border/60 bg-white p-3 shadow-sm">
                  <div className="flex min-w-[54px] flex-col items-center justify-center rounded-2xl border border-border/60 bg-surface-2/50 px-3 py-2">
                    <span className="text-2xl font-black leading-none text-foreground">{row.day}</span>
                    <span className="text-xs font-semibold text-red-600">{row.month}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{row.title}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2 py-1 text-red-600">
                        <FileText className="h-3.5 w-3.5" /> {row.scripts} roteiros
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-1 text-emerald-600">
                        <ImageIcon className="h-3.5 w-3.5" /> {row.creatives} criativos
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-orange-100 bg-orange-50 px-2 py-1 text-orange-600">
                        <BookOpen className="h-3.5 w-3.5" /> {row.stories} stories
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-blue-600">
                        <Sparkles className="h-3.5 w-3.5" /> {row.campaigns} campanhas
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>

            <Button variant="ghost" className="mt-5 h-auto p-0 text-red-600 hover:bg-transparent hover:text-red-500">
              Ver todas as datas
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Eventos Estrategicos</h2>
                <p className="mt-1 text-sm text-muted-foreground">Campanhas sazonais e ideias prontas para o calendario.</p>
              </div>
              <Button variant="ghost" className="rounded-2xl text-red-600 hover:bg-red-50 hover:text-red-600">
                Ver todos
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {events.map((event) => {
                const Icon = event.icon;
                return (
                  <div key={event.title} className="flex items-center gap-3 rounded-[22px] border border-border/60 bg-white p-3 shadow-sm">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${event.tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground">{event.title}</p>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    </div>
                    <div className="rounded-2xl bg-violet-50 px-3 py-2 text-center">
                      <div className="text-xl font-black leading-none text-foreground">{event.items}</div>
                      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">itens</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button variant="ghost" className="mt-5 h-auto p-0 text-red-600 hover:bg-transparent hover:text-red-500">
              Ver todos os eventos
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Biblioteca de Arquivos</h2>
                <p className="mt-1 text-sm text-muted-foreground">Categorias de materiais para abrir tudo de uma vez.</p>
              </div>
              <Button variant="ghost" className="rounded-2xl text-red-600 hover:bg-red-50 hover:text-red-600">
                Ver biblioteca completa
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {fileCategories.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.title}
                    className="rounded-[24px] border border-border/60 bg-surface-2/30 p-4 text-left transition hover:border-red-200 hover:bg-white hover:shadow-sm"
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <p className="mt-3 font-semibold text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.count}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Busca Global</h2>
                <p className="mt-1 text-sm text-muted-foreground">Localize nome, cliente, categoria, descricao ou responsavel.</p>
              </div>
              <Button variant="outline" className="rounded-2xl border-border/60 bg-white/80">
                <Upload className="mr-2 h-4 w-4" />
                Enviar arquivo
              </Button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar modelos, clientes, categorias..." className="h-12 rounded-2xl border-border/60 bg-white pl-9 shadow-none" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button variant="outline" className="justify-between rounded-2xl border-border/60 bg-white/80">
                  <span>Filtrar por cliente</span>
                  <span>⌄</span>
                </Button>
                <Button variant="outline" className="justify-between rounded-2xl border-border/60 bg-white/80">
                  <span>Filtrar por nicho</span>
                  <span>⌄</span>
                </Button>
                <Button variant="outline" className="justify-between rounded-2xl border-border/60 bg-white/80">
                  <span>Filtrar por responsavel</span>
                  <span>⌄</span>
                </Button>
                <Button variant="outline" className="justify-between rounded-2xl border-border/60 bg-white/80">
                  <span>Filtrar por tipo</span>
                  <span>⌄</span>
                </Button>
              </div>

              <div className="rounded-[24px] border border-dashed border-border/70 bg-surface-2/20 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    <FileArchive className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Upload de arquivos</p>
                    <p className="text-sm text-muted-foreground">
                      JPG, PNG, WEBP, GIF, SVG, MP4, MOV, PDF, DOCX, XLSX, PPTX, MP3, WAV e ZIP.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BookmarkIcon() {
  return <FolderOpen className="h-4 w-4" />;
}
