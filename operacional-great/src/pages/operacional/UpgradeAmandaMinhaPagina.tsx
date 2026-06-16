import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CalendarDays,
  Layers3,
  Palette,
  Sparkles,
  FileText,
  PlayCircle,
  FolderOpen,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

type ValidatedScriptRow = Pick<
  Database['public']['Tables']['validated_scripts']['Row'],
  'id' | 'title' | 'created_at'
>;
type CalendarRecordingRow = Pick<
  Database['public']['Tables']['calendar_recordings']['Row'],
  'id' | 'recording_date' | 'recording_time' | 'recording_type' | 'location' | 'status' | 'created_at'
>;
type CalendarRecordingWithClient = CalendarRecordingRow & {
  operational_clients?: Pick<Database['public']['Tables']['operational_clients']['Row'], 'id' | 'client_name' | 'clinic_name'> | null;
};
type PerformanceStructureRow = Pick<
  Database['public']['Tables']['performance_structures']['Row'],
  'id' | 'title' | 'structure_type' | 'created_at'
>;
type BrandFileRow = Pick<Database['public']['Tables']['brand_files']['Row'], 'id' | 'file_name' | 'file_type' | 'created_at'>;

const shortcutCards = [
  {
    title: 'Identidade (paleta)',
    description: 'Sua identidade visual e as diretrizes que mantêm tudo consistente.',
    href: '/operacional/upgrade-de-amanda/identidade-paleta',
    icon: Palette,
    accent: 'bg-rose-50 text-red-600',
  },
  {
    title: 'Roteiros validados',
    description: 'Roteiros salvos, revisados e prontos para uso no time.',
    href: '/operacional/upgrade-de-amanda/roteiros-validados',
    icon: FileText,
    accent: 'bg-purple-50 text-purple-600',
  },
  {
    title: 'Calendário de gravação',
    description: 'Planeje gravações com datas, clientes e status reais.',
    href: '/operacional/upgrade-de-amanda/calendario-de-gravacao',
    icon: CalendarDays,
    accent: 'bg-blue-50 text-blue-600',
  },
  {
    title: 'Estruturas que performam',
    description: 'Formatos e frameworks cadastrados na área de conteúdo.',
    href: '/operacional/upgrade-de-amanda/estruturas-que-performam',
    icon: Layers3,
    accent: 'bg-orange-50 text-orange-500',
  },
  {
    title: 'Modelos prontos',
    description: 'Materiais reaproveitáveis salvos no banco.',
    href: '/operacional/upgrade-de-amanda/modelos-prontos',
    icon: Sparkles,
    accent: 'bg-pink-50 text-pink-600',
  },
];

function formatRelativeDate(value: string) {
  return formatDistanceToNow(new Date(value), { addSuffix: true, locale: ptBR });
}

function getClientLabel(client?: CalendarRecordingWithClient['operational_clients'] | null) {
  if (!client) return 'Sem cliente';
  return client.clinic_name ? `${client.client_name} - ${client.clinic_name}` : client.client_name;
}

function getFileTypeLabel(type: string) {
  switch (type) {
    case 'logo':
      return 'Logos';
    case 'manual':
      return 'Manuais';
    case 'reference':
      return 'Referências';
    default:
      return 'Outros';
  }
}

export default function UpgradeAmandaMinhaPagina() {
  const { data, isLoading } = useQuery({
    queryKey: ['upgrade-amanda-minha-pagina'],
    queryFn: async () => {
      const [scriptsResult, recordingsResult, structuresResult, filesResult] = await Promise.all([
        supabase
          .from('validated_scripts')
          .select('id, title, created_at')
          .order('created_at', { ascending: false })
          .limit(25),
        supabase
          .from('calendar_recordings')
          .select('id, recording_date, recording_time, recording_type, location, status, created_at, operational_clients(id, client_name, clinic_name)')
          .order('recording_date', { ascending: true })
          .order('recording_time', { ascending: true })
          .limit(25),
        supabase
          .from('performance_structures')
          .select('id, title, structure_type, created_at')
          .order('created_at', { ascending: false })
          .limit(25),
        supabase
          .from('brand_files')
          .select('id, file_name, file_type, created_at')
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      const errors = [scriptsResult.error, recordingsResult.error, structuresResult.error, filesResult.error].filter(Boolean);
      if (errors.length > 0) {
        throw errors[0];
      }

      return {
        scripts: (scriptsResult.data || []) as ValidatedScriptRow[],
        recordings: (recordingsResult.data || []) as CalendarRecordingWithClient[],
        structures: (structuresResult.data || []) as PerformanceStructureRow[],
        files: (filesResult.data || []) as BrandFileRow[],
      };
    },
  });

  const summaryCards = useMemo(() => {
    const scripts = data?.scripts.length ?? 0;
    const recordings = data?.recordings.length ?? 0;
    const structures = data?.structures.length ?? 0;
    const files = data?.files.length ?? 0;

    return [
      { label: 'Roteiros validados', value: scripts, subtitle: 'salvos no Supabase', tone: 'text-red-600' },
      { label: 'Gravações cadastradas', value: recordings, subtitle: 'com cliente e data', tone: 'text-blue-600' },
      { label: 'Estruturas salvas', value: structures, subtitle: 'organizadas por uso', tone: 'text-emerald-600' },
      { label: 'Arquivos na biblioteca', value: files, subtitle: 'logotipos e materiais', tone: 'text-orange-500' },
    ];
  }, [data]);

  const recentActivities = useMemo(() => {
    const items = [
      ...(data?.scripts || []).slice(0, 2).map((item) => ({
        title: 'Roteiro salvo',
        description: item.title,
        time: item.created_at,
        icon: Sparkles,
        tone: 'bg-violet-50 text-violet-600',
      })),
      ...(data?.recordings || []).slice(0, 2).map((item) => ({
        title: 'Gravação cadastrada',
        description: `${getClientLabel(item.operational_clients)} • ${item.recording_type}`,
        time: item.created_at,
        icon: CalendarDays,
        tone: 'bg-blue-50 text-blue-600',
      })),
      ...(data?.structures || []).slice(0, 2).map((item) => ({
        title: 'Estrutura salva',
        description: item.title,
        time: item.created_at,
        icon: Layers3,
        tone: 'bg-emerald-50 text-emerald-600',
      })),
    ];

    return items
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 3);
  }, [data]);

  const upcomingRecordings = useMemo(() => {
    return (data?.recordings || [])
      .filter((item) => item.status !== 'CANCELADA')
      .slice(0, 3);
  }, [data]);

  const fileTypeCards = useMemo(() => {
    const counts = new Map<string, number>();
    for (const file of data?.files || []) {
      counts.set(file.file_type, (counts.get(file.file_type) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([type, count]) => ({ type, count, label: getFileTypeLabel(type) }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  return (
    <div className="space-y-6" data-cy="upgrade-amanda-minha-pagina">
      <div className="relative overflow-hidden rounded-[32px] border border-border/70 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(225,6,0,0.08),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.08),_transparent_24%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Badge className="w-fit rounded-full bg-red-50 px-3 py-1 text-red-600 shadow-none hover:bg-red-50">
              Evolução Audiovisual
            </Badge>
            <div>
              <h1 className="text-3xl font-black tracking-[-0.05em] text-foreground sm:text-4xl">Minha Página</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Painel alimentado por dados reais do Supabase. Se não houver cadastro, a tela mostra estado vazio em vez de inventar informação.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="rounded-2xl border-border/60 bg-white/85 shadow-sm">
              <Link to="/operacional/upgrade-de-amanda/home">
                <PlayCircle className="mr-2 h-4 w-4" />
                Como funciona
              </Link>
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
              data-cy={`shortcut-card-${card.href.split('/').pop()}`}
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
                      <Link to={card.href}>
                        Ver {card.title.toLowerCase()}
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

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <Card className="overflow-hidden rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]" data-cy="my-page-summary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Resumo da sua página</h2>
                <p className="mt-1 text-sm text-muted-foreground">Contagens reais da base atual.</p>
              </div>
              <Button asChild variant="outline" className="rounded-2xl border-border/60 bg-white/80">
                <Link to="/operacional/upgrade-de-amanda/calendario-de-gravacao">Ver calendário completo</Link>
              </Button>
            </div>

            {isLoading ? (
              <div className="mt-5 rounded-[24px] border border-dashed border-border/60 bg-surface-2/20 p-6 text-sm text-muted-foreground">
                Carregando dados reais do Supabase...
              </div>
            ) : (
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((item, index) => (
                  <div
                    key={item.label}
                    data-cy={`summary-card-${index}`}
                    className="rounded-[24px] border border-border/60 bg-surface-2/30 p-4"
                  >
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <div className="mt-2 flex items-end justify-between gap-2">
                      <div
                        data-cy={`summary-value-${index}`}
                        className={`text-3xl font-black tracking-[-0.05em] ${item.tone}`}
                      >
                        {item.value}
                      </div>
                      <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-red-500 via-orange-500 to-pink-500"
                        style={{ width: `${40 + index * 14}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]" data-cy="my-page-recent-activities">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Atividades recentes</h2>
                <p className="mt-1 text-sm text-muted-foreground">Últimos registros reais salvos na base.</p>
              </div>
              <Button asChild variant="ghost" className="rounded-2xl text-red-600 hover:bg-red-50 hover:text-red-600">
                <Link to="/operacional/execucao/atividades">Ver todas</Link>
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {isLoading ? (
                <div className="rounded-[22px] border border-dashed border-border/60 bg-surface-2/20 p-5 text-sm text-muted-foreground">
                  Carregando atividades...
                </div>
              ) : recentActivities.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-border/60 bg-surface-2/20 p-5 text-sm text-muted-foreground">
                  Nenhuma atividade real foi encontrada ainda.
                </div>
              ) : (
                recentActivities.map((item) => {
                  const Icon = item.icon;
                  return (
                <div
                  key={`${item.title}-${item.description}`}
                  data-cy="recent-activity-item"
                  className="flex items-start gap-3 rounded-[22px] border border-border/60 bg-surface-2/30 p-4"
                >
                      <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl ${item.tone}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-semibold text-foreground">{item.title}</h3>
                          <span className="text-xs text-muted-foreground">{formatRelativeDate(item.time)}</span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]" data-cy="my-page-upcoming-recordings">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Próximas gravações</h2>
                <p className="mt-1 text-sm text-muted-foreground">Dados reais da agenda do Supabase.</p>
              </div>
              <Button asChild variant="outline" className="rounded-2xl border-border/60 bg-white/80">
                <Link to="/operacional/execucao/acompanhamento-clientes">Filtrar por equipe</Link>
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {isLoading ? (
                <div className="rounded-[22px] border border-dashed border-border/60 bg-surface-2/20 p-5 text-sm text-muted-foreground">
                  Carregando gravações...
                </div>
              ) : upcomingRecordings.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-border/60 bg-surface-2/20 p-5 text-sm text-muted-foreground">
                  Nenhuma gravação cadastrada ainda.
                </div>
              ) : (
                upcomingRecordings.map((item) => (
                  <div
                    key={item.id}
                    data-cy="upcoming-recording-item"
                    className="flex items-center gap-4 rounded-[24px] border border-border/60 bg-white p-4 shadow-sm"
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface-2/60">
                      <CalendarDays className="h-6 w-6 text-muted-foreground" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">
                          {getClientLabel(item.operational_clients)}
                        </h3>
                        <Badge className="rounded-full bg-amber-100 text-amber-700">{item.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.recording_type} • {item.recording_time} • {item.location}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(`${item.recording_date}T00:00:00`).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    <Button asChild variant="ghost" size="icon" className="rounded-full">
                      <Link to="/operacional/upgrade-de-amanda/calendario-de-gravacao">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]" data-cy="my-page-file-library">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Biblioteca de arquivos</h2>
                <p className="mt-1 text-sm text-muted-foreground">Categorias reais da biblioteca atual.</p>
              </div>
              <Button asChild variant="ghost" className="rounded-2xl text-red-600 hover:bg-red-50 hover:text-red-600">
                <Link to="/operacional/area-estudo/conteudos">Ver biblioteca completa</Link>
              </Button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {isLoading ? (
                <div className="col-span-2 rounded-[22px] border border-dashed border-border/60 bg-surface-2/20 p-5 text-sm text-muted-foreground sm:col-span-3">
                  Carregando biblioteca...
                </div>
              ) : fileTypeCards.length === 0 ? (
                <div className="col-span-2 rounded-[22px] border border-dashed border-border/60 bg-surface-2/20 p-5 text-sm text-muted-foreground sm:col-span-3">
                  Nenhum arquivo cadastrado ainda.
                </div>
              ) : (
                fileTypeCards.map((item) => (
                  <div
                    key={item.type}
                    data-cy="file-type-item"
                    className="rounded-[22px] border border-border/60 bg-surface-2/30 p-4 text-center"
                  >
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <FolderOpen className="h-6 w-6" />
                    </div>
                    <h3 className="mt-3 font-semibold text-foreground">{item.label}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.count} arquivo(s)</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
