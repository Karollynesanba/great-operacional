import { Bookmark, ChevronLeft, ChevronRight, FileText, Filter, MoreVertical, PlayCircle, Search, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const clientOptions = ['Todos os clientes', 'Dr. João Silva', 'Dra. Camila Rocha', 'Dr. Lucas Ferreira'];
const monthOptions = ['Maio de 2025', 'Junho de 2025', 'Julho de 2025'];

const rows = [
  {
    title: 'Sinais de que seu implante pode estar com problemas',
    subtitle: 'Educar e gerar alerta',
    client: 'Dr. João Silva',
    specialty: 'Implantodontia',
    date: '22/05/2025',
    format: 'Reels',
    badge: 'bg-violet-100 text-violet-700',
  },
  {
    title: '3 mitos sobre lente de contato dental',
    subtitle: 'Quebrar objeções',
    client: 'Dra. Camila Rocha',
    specialty: 'Harmonização',
    date: '18/05/2025',
    format: 'Carrossel',
    badge: 'bg-blue-100 text-blue-700',
  },
  {
    title: 'Implante no mesmo dia: como funciona?',
    subtitle: 'Explicar processo',
    client: 'Dr. João Silva',
    specialty: 'Implantodontia',
    date: '15/05/2025',
    format: 'Vídeo Longo',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  {
    title: 'Cuidados após a lente de contato dental',
    subtitle: 'Pós-venda / cuidados',
    client: 'Dra. Camila Rocha',
    specialty: 'Harmonização',
    date: '10/05/2025',
    format: 'Reels',
    badge: 'bg-violet-100 text-violet-700',
  },
  {
    title: 'Quanto tempo dura um implante dentário?',
    subtitle: 'Educar e gerar confiança',
    client: 'Dr. João Silva',
    specialty: 'Implantodontia',
    date: '05/05/2025',
    format: 'Carrossel',
    badge: 'bg-blue-100 text-blue-700',
  },
  {
    title: 'Facetas ou lente de contato: qual escolher?',
    subtitle: 'Comparar e orientar',
    client: 'Dra. Camila Rocha',
    specialty: 'Harmonização',
    date: '02/05/2025',
    format: 'Vídeo Curto',
    badge: 'bg-orange-100 text-orange-700',
  },
];

export default function UpgradeAmandaRoteirosValidados() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[32px] border border-border/70 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-[-0.05em] text-foreground sm:text-4xl">Roteiros Validados</h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            Roteiros que já trouxeram resultados e foram validados. Use como referência para criar novos conteúdos de alta performance.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-2xl border-border/60 bg-white/85 shadow-sm">
            <PlayCircle className="mr-2 h-4 w-4" />
            Como funciona
          </Button>
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-border/60 bg-white/85 shadow-sm">
            <Bookmark className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <CardContent className="p-6">
          <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr_0.35fr_0.35fr] xl:items-end">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Filtrar por cliente</p>
              <Button variant="outline" className="h-12 w-full justify-between rounded-2xl border-border/60 bg-white px-4">
                <span className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                  Todos os clientes
                </span>
                <span>⌄</span>
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Filtrar por mês</p>
              <Button variant="outline" className="h-12 w-full justify-between rounded-2xl border-border/60 bg-white px-4">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Maio de 2025
                </span>
                <span>⌄</span>
              </Button>
            </div>

            <Button variant="outline" className="h-12 rounded-2xl border-border/60 bg-white px-4">
              <Filter className="mr-2 h-4 w-4" />
              Limpar filtros
            </Button>

            <Button className="h-12 rounded-2xl bg-red-600 px-5 text-white shadow-md shadow-red-500/20 hover:bg-red-500">
              <Filter className="mr-2 h-4 w-4" />
              Aplicar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <CardContent className="p-0">
          <div className="grid gap-4 border-b border-border/60 px-6 py-6 md:grid-cols-[1fr_auto] md:items-center">
            <div className="relative max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar roteiros..."
                className="h-12 rounded-2xl border-border/60 bg-white pl-9 shadow-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" className="rounded-2xl border-border/60 bg-white/80">
                <Filter className="mr-2 h-4 w-4" />
                Limpar filtros
              </Button>
              <Button className="rounded-2xl bg-red-600 text-white shadow-md shadow-red-500/20 hover:bg-red-500">
                <Filter className="mr-2 h-4 w-4" />
                Aplicar filtros
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[1140px]">
              <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.55fr_0.55fr_0.35fr] bg-surface-2/40 px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <div>Roteiro</div>
                <div>Cliente</div>
                <div>Data</div>
                <div>Formato</div>
                <div>Documento</div>
                <div>Ações</div>
              </div>

              <div className="divide-y divide-border/60 bg-white">
                {rows.map((row) => (
                  <div key={row.title} className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.55fr_0.55fr_0.35fr] items-center gap-4 px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 shadow-sm">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold leading-5 text-foreground">{row.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{row.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                        <UserRound className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{row.client}</p>
                        <p className="text-sm text-muted-foreground">{row.specialty}</p>
                      </div>
                    </div>

                    <div className="text-sm text-foreground">{row.date}</div>

                    <div>
                      <Badge className={`rounded-full px-3 py-1 text-xs shadow-none ${row.badge}`}>{row.format}</Badge>
                    </div>

                    <div>
                      <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-border/60 bg-white shadow-sm">
                        <FileText className="h-5 w-5 text-red-600" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl">
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/60 bg-surface-2/30 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Mostrando 1 a 6 de 24 roteiros</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-border/60 bg-white">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="h-10 rounded-2xl border-red-200 bg-red-50 text-red-600">1</Button>
              <Button variant="outline" className="h-10 rounded-2xl border-border/60 bg-white">2</Button>
              <Button variant="outline" className="h-10 rounded-2xl border-border/60 bg-white">3</Button>
              <Button variant="outline" className="h-10 rounded-2xl border-border/60 bg-white">4</Button>
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-border/60 bg-white">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
