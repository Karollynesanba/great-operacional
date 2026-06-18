import { useMemo, useState, type ReactNode } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  MessageSquareText,
  Plus,
  ShieldAlert,
  Target,
  Users,
  Video,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type EvolutionBand = 'Alto Risco' | 'Necessita Acompanhamento' | 'Evoluindo';
type StatusTone = 'danger' | 'warning' | 'success';
type ContactType = 'Reunião' | 'Ligação' | 'WhatsApp' | 'Visita';
type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

type MeetingFormState = {
  clientId: string;
  contactType: ContactType;
  meetingDate: string;
  resultPerceived: 'Melhorou muito' | 'Melhorou' | 'Sem alteração' | 'Piorou' | 'Piorou muito';
  teamParticipation: 'Excelente' | 'Boa' | 'Regular' | 'Baixa' | 'Nenhuma';
  trainingApplication: 'Aplicou tudo' | 'Aplicou parcialmente' | 'Aplicou pouco' | 'Não aplicou';
  responsibleEngagement: 'Muito engajado' | 'Engajado' | 'Regular' | 'Pouco engajado' | 'Sem engajamento';
  actionsCompletion: '100% concluídas' | 'Maioria concluída' | 'Metade concluída' | 'Poucas concluídas' | 'Nenhuma concluída';
  indicatorsEvolution: 'Crescimento acima da meta' | 'Crescimento dentro da meta' | 'Estável' | 'Queda leve' | 'Queda forte';
  clientObjection: 'Falta de tempo' | 'Falta de orçamento' | 'Falta de prioridade' | 'Falta de confiança' | 'Sem retorno' | 'Lead frio' | 'Outro';
  urgentIntervention: 'Sim' | 'Não';
  nextStep: 'Novo treinamento' | 'Reunião de alinhamento' | 'Acompanhamento semanal' | 'Acompanhamento quinzenal' | 'Apenas monitoramento';
  combinedActions: string;
  pendingItems: string;
  nextValidation: string;
  contactChannel: 'WhatsApp' | 'Ligação' | 'Reunião presencial' | 'Google Meet';
  commercialHistory: string;
};

type CommercialClient = {
  id: string;
  name: string;
  evolution: EvolutionBand;
  status: string;
  resultLastAction: string;
  nextValidation: string;
  score: number;
  historyCommercial: string[];
  objections: string[];
  trainings: string[];
  combinedActions: string[];
  pendingItems: string[];
  lastActionSummary: string;
  lastContactType?: ContactType;
  lastContactDate?: string;
  nextStep?: string;
  contactChannel?: string;
};

const SCORE_MAP = {
  'Melhorou muito': 3,
  Melhorou: 2,
  'Sem alteração': 0,
  Piorou: -2,
  'Piorou muito': -3,
  Excelente: 3,
  Boa: 2,
  Regular: 0,
  Baixa: -2,
  Nenhuma: -3,
  'Aplicou tudo': 3,
  'Aplicou parcialmente': 1,
  'Aplicou pouco': -1,
  'Não aplicou': -3,
  'Muito engajado': 3,
  Engajado: 2,
  'Pouco engajado': -2,
  'Sem engajamento': -3,
  '100% concluídas': 3,
  'Maioria concluída': 2,
  'Metade concluída': 0,
  'Poucas concluídas': -2,
  'Nenhuma concluída': -3,
  'Crescimento acima da meta': 3,
  'Crescimento dentro da meta': 2,
  Estável: 0,
  'Queda leve': -2,
  'Queda forte': -3,
  'Falta de tempo': -1,
  'Falta de orçamento': -2,
  'Falta de prioridade': -1,
  'Falta de confiança': -1,
  'Sem retorno': -2,
  'Lead frio': -2,
  Outro: -1,
} as const;

const CONTACT_OPTIONS: ContactType[] = ['Reunião', 'Ligação', 'WhatsApp', 'Visita'];
const RESULT_OPTIONS = ['Melhorou muito', 'Melhorou', 'Sem alteração', 'Piorou', 'Piorou muito'] as const;
const TEAM_OPTIONS = ['Excelente', 'Boa', 'Regular', 'Baixa', 'Nenhuma'] as const;
const APPLICATION_OPTIONS = ['Aplicou tudo', 'Aplicou parcialmente', 'Aplicou pouco', 'Não aplicou'] as const;
const ENGAGEMENT_OPTIONS = ['Muito engajado', 'Engajado', 'Regular', 'Pouco engajado', 'Sem engajamento'] as const;
const ACTIONS_OPTIONS = ['100% concluídas', 'Maioria concluída', 'Metade concluída', 'Poucas concluídas', 'Nenhuma concluída'] as const;
const EVOLUTION_OPTIONS = ['Crescimento acima da meta', 'Crescimento dentro da meta', 'Estável', 'Queda leve', 'Queda forte'] as const;
const OBJECTION_OPTIONS = ['Falta de tempo', 'Falta de orçamento', 'Falta de prioridade', 'Falta de confiança', 'Sem retorno', 'Lead frio', 'Outro'] as const;
const URGENT_OPTIONS = ['Sim', 'Não'] as const;
const NEXT_STEP_OPTIONS = ['Novo treinamento', 'Reunião de alinhamento', 'Acompanhamento semanal', 'Acompanhamento quinzenal', 'Apenas monitoramento'] as const;
const CHANNEL_OPTIONS = ['WhatsApp', 'Ligação', 'Reunião presencial', 'Google Meet'] as const;

const baseNames = [
  'Clínica Aurora',
  'Studio Vita',
  'Instituto Bella',
  'Dra. Helena',
  'Vitta Saúde',
  'Espaço Sorrir',
  'Mente Plena',
  'Dra. Marina',
  'Odonto Prime',
  'Laser Center',
  'Clínica Essência',
  'Vitalis',
  'Sorriso +',
  'Beleza Real',
  'Instituto Vida',
  'Clínica Horizonte',
  'Pro Saúde',
  'Dra. Patrícia',
  'Bem Estar',
  'Clínica Íris',
];

function initialMeetingForm(clientId: string): MeetingFormState {
  const today = new Date().toISOString().slice(0, 10);
  return {
    clientId,
    contactType: 'Reunião',
    meetingDate: today,
    resultPerceived: 'Melhorou',
    teamParticipation: 'Boa',
    trainingApplication: 'Aplicou parcialmente',
    responsibleEngagement: 'Engajado',
    actionsCompletion: 'Maioria concluída',
    indicatorsEvolution: 'Crescimento dentro da meta',
    clientObjection: 'Falta de tempo',
    urgentIntervention: 'Não',
    nextStep: 'Acompanhamento semanal',
    combinedActions: '',
    pendingItems: '',
    nextValidation: today,
    contactChannel: 'WhatsApp',
    commercialHistory: '',
  };
}

function getStatusTone(evolution: EvolutionBand): StatusTone {
  if (evolution === 'Evoluindo') return 'success';
  if (evolution === 'Necessita Acompanhamento') return 'warning';
  return 'danger';
}

function getStatusBadgeClass(evolution: EvolutionBand) {
  if (evolution === 'Evoluindo') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (evolution === 'Necessita Acompanhamento') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
}

function getStatusLabel(evolution: EvolutionBand) {
  if (evolution === 'Evoluindo') return 'Acompanhado';
  if (evolution === 'Necessita Acompanhamento') return 'Em atenção';
  return 'Crítico';
}

function computeMeetingScore(form: MeetingFormState) {
  const total =
    SCORE_MAP[form.resultPerceived] +
    SCORE_MAP[form.teamParticipation] +
    SCORE_MAP[form.trainingApplication] +
    SCORE_MAP[form.responsibleEngagement] +
    SCORE_MAP[form.actionsCompletion] +
    SCORE_MAP[form.indicatorsEvolution] +
    SCORE_MAP[form.clientObjection] +
    (form.urgentIntervention === 'Sim' ? -3 : 0);

  return total;
}

function getEvolutionFromScore(score: number): EvolutionBand {
  if (score >= 8) return 'Evoluindo';
  if (score >= 2) return 'Necessita Acompanhamento';
  return 'Alto Risco';
}

function getMeetingSummary(form: MeetingFormState) {
  return `${form.contactType} em ${format(parseISO(form.meetingDate), 'dd/MM/yyyy', { locale: ptBR })} | ${form.resultPerceived} | Próximo passo: ${form.nextStep}`;
}

function splitLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildClient(index: number, evolution: EvolutionBand): CommercialClient {
  const name = `${baseNames[index % baseNames.length]} ${String(index + 1).padStart(2, '0')}`;
  const today = new Date();
  const nextValidation = format(addDays(today, (index % 15) + 3), 'yyyy-MM-dd');
  const historyDate = format(addDays(today, -(index % 14) - 1), 'dd/MM/yyyy');
  const baseHistory =
    evolution === 'Evoluindo'
      ? ['Treinamento absorvido com boa resposta da equipe.', 'Nova cadência semanal alinhada com o cliente.']
      : evolution === 'Necessita Acompanhamento'
        ? ['Reunião de alinhamento realizada.', 'Pontos de atenção reforçados com o responsável.']
        : ['Cliente com sinais de desorganização e pouca aderência.', 'Intervenção de rotina recomendada.'];

  const objections =
    evolution === 'Evoluindo'
      ? ['Falta de tempo', 'Outro']
      : evolution === 'Necessita Acompanhamento'
        ? ['Falta de acompanhamento', 'Falta de organização', 'Falta de equipe']
        : ['Falta de verba', 'Resistência à mudança', 'Falta de acompanhamento'];

  const trainings =
    evolution === 'Evoluindo'
      ? ['Treinamento de rotina comercial', 'Treinamento de acompanhamento de metas']
      : evolution === 'Necessita Acompanhamento'
        ? ['Treinamento de argumentação', 'Treinamento de follow-up']
        : ['Treinamento de retomada', 'Treinamento de urgência comercial'];

  const combinedActions =
    evolution === 'Evoluindo'
      ? ['Acompanhar KPIs semanalmente', 'Manter rotina combinada']
      : evolution === 'Necessita Acompanhamento'
        ? ['Agendar nova reunião de alinhamento', 'Monitorar evolução quinzenalmente']
        : ['Aplicar plano de reengajamento', 'Abrir revisão imediata'];

  const pendingItems =
    evolution === 'Evoluindo'
      ? ['Confirmar validação da próxima reunião']
      : evolution === 'Necessita Acompanhamento'
        ? ['Aguardar retorno do responsável']
        : ['Reenviar alinhamento comercial', 'Validar prioridade da operação'];

  return {
    id: `client-${evolution.replace(/\s+/g, '-').toLowerCase()}-${index}`,
    name,
    evolution,
    status: getStatusLabel(evolution),
    resultLastAction:
      evolution === 'Evoluindo'
        ? 'Treinamento aplicado com boa aderência'
        : evolution === 'Necessita Acompanhamento'
          ? 'Alinhamento realizado com pendências definidas'
          : 'Sinal de risco identificado na última ação',
    nextValidation,
    score: evolution === 'Evoluindo' ? 86 - (index % 8) : evolution === 'Necessita Acompanhamento' ? 61 - (index % 10) : 34 - (index % 9),
    historyCommercial: [
      `${historyDate} - ${baseHistory[0]}`,
      `${historyDate} - ${baseHistory[1]}`,
    ],
    objections,
    trainings,
    combinedActions,
    pendingItems,
    lastActionSummary:
      evolution === 'Evoluindo'
        ? 'Resultado positivo com evolução clara.'
        : evolution === 'Necessita Acompanhamento'
          ? 'Resultado moderado, com necessidade de continuidade.'
          : 'Resultado fraco, exigindo intervenção.',
    lastContactType: evolution === 'Evoluindo' ? 'WhatsApp' : evolution === 'Necessita Acompanhamento' ? 'Reunião' : 'Ligação',
    lastContactDate: historyDate,
    nextStep: evolution === 'Evoluindo' ? 'Acompanhamento semanal' : evolution === 'Necessita Acompanhamento' ? 'Reunião de alinhamento' : 'Novo treinamento',
    contactChannel: evolution === 'Evoluindo' ? 'WhatsApp' : evolution === 'Necessita Acompanhamento' ? 'Google Meet' : 'Ligação',
  };
}

function buildInitialClients() {
  return [
    ...Array.from({ length: 15 }, (_, index) => buildClient(index, 'Alto Risco')),
    ...Array.from({ length: 42 }, (_, index) => buildClient(index + 15, 'Necessita Acompanhamento')),
    ...Array.from({ length: 70 }, (_, index) => buildClient(index + 57, 'Evoluindo')),
  ];
}

function FieldSelect({
  label,
  value,
  onValueChange,
  children,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 rounded-2xl bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}

function DonutChart({ segments, total }: { segments: DonutSegment[]; total: number }) {
  const size = 360;
  const strokeWidth = 22;
  const radius = 126;
  const circumference = 2 * Math.PI * radius;
  const gap = 6;
  const usableLength = Math.max(circumference - gap * segments.length, 0);
  const safeTotal = total > 0 ? total : 1;

  let accumulated = 0;

  return (
    <div className="relative flex w-full items-center justify-center rounded-[24px] bg-slate-50 p-8">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="block h-full w-full max-w-[460px]"
        role="img"
        aria-label="Donut chart dos clientes acompanhados"
      >
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />

        <g transform="rotate(-90 50% 50%)">
          {segments.map((segment) => {
            const segmentLength = segment.value > 0 ? usableLength * (segment.value / safeTotal) : 0;
            const dashArray = `${segmentLength} ${circumference}`;
            const dashOffset = -accumulated;
            accumulated += segmentLength + gap;

            return (
              <circle
                key={segment.label}
                cx="50%"
                cy="50%"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
              />
            );
          })}
        </g>
      </svg>

      <div className="absolute flex flex-col items-center justify-center text-center">
        <p className="text-[56px] font-extrabold leading-none tracking-[-0.05em] text-foreground">{total}</p>
        <p className="mt-2 text-base font-medium text-muted-foreground">clientes acompanhados</p>
      </div>
    </div>
  );
}

export default function AcompanhamentoComercial() {
  const [clients, setClients] = useState<CommercialClient[]>(buildInitialClients);
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id ?? '');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<MeetingFormState>(initialMeetingForm(clients[0]?.id ?? ''));

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) || clients[0] || null,
    [clients, selectedClientId],
  );

  const counts = useMemo(() => {
    return {
      high: clients.filter((client) => client.evolution === 'Alto Risco').length,
      needFollowUp: clients.filter((client) => client.evolution === 'Necessita Acompanhamento').length,
      evolving: clients.filter((client) => client.evolution === 'Evoluindo').length,
    };
  }, [clients]);

  const donutSegments = [
    { label: 'Evoluindo', value: counts.evolving, color: '#22c55e' },
    { label: 'Necessita acompanhamento', value: counts.needFollowUp, color: '#f59e0b' },
    { label: 'Alto risco', value: counts.high, color: '#ef4444' },
  ];

  const funnelCards = [
    {
      title: 'Alto risco',
      description: 'Clientes que exigem atenção imediata.',
      value: counts.high,
      icon: AlertTriangle,
      iconClassName: 'bg-rose-100 text-rose-600',
      cardClassName: 'border-rose-200 bg-rose-50/80',
      valueClassName: 'text-rose-700',
    },
    {
      title: 'Necessita acomp.',
      description: 'Clientes que precisam de acompanhamento.',
      value: counts.needFollowUp,
      icon: Clock3,
      iconClassName: 'bg-amber-100 text-amber-600',
      cardClassName: 'border-amber-200 bg-amber-50/80',
      valueClassName: 'text-amber-700',
    },
    {
      title: 'Evoluindo',
      description: 'Clientes que estão evoluindo.',
      value: counts.evolving,
      icon: Target,
      iconClassName: 'bg-emerald-100 text-emerald-600',
      cardClassName: 'border-emerald-200 bg-emerald-50/80',
      valueClassName: 'text-emerald-700',
    },
  ] as const;

  const openDialog = () => {
    const clientId = selectedClient?.id ?? clients[0]?.id ?? '';
    setForm(initialMeetingForm(clientId));
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.clientId) {
      toast.error('Selecione um cliente.');
      return;
    }

    if (!form.commercialHistory.trim()) {
      toast.error('O histórico comercial é obrigatório.');
      return;
    }

    const score = computeMeetingScore(form);
    const evolution = getEvolutionFromScore(score);
    const summary = getMeetingSummary(form);
    const historyEntry = `${summary}\n${form.commercialHistory.trim()}`;
    const combinedActions = splitLines(form.combinedActions);
    const pendingItems = splitLines(form.pendingItems);

    setClients((current) =>
      current.map((client) => {
        if (client.id !== form.clientId) return client;
        return {
          ...client,
          evolution,
          status: getStatusLabel(evolution),
          resultLastAction: form.resultPerceived,
          nextValidation: form.nextValidation,
          historyCommercial: [historyEntry, ...client.historyCommercial],
          combinedActions: combinedActions.length > 0 ? combinedActions : client.combinedActions,
          pendingItems: pendingItems.length > 0 ? pendingItems : client.pendingItems,
          lastActionSummary: summary,
          lastContactType: form.contactType,
          lastContactDate: form.meetingDate,
          nextStep: form.nextStep,
          contactChannel: form.contactChannel,
        };
      }),
    );

    setSelectedClientId(form.clientId);
    setIsDialogOpen(false);
    toast.success('Reunião salva localmente.');
  };

  const selectedTabs = selectedClient ?? clients[0];

  return (
    <div className="mx-auto box-border max-w-[1440px] space-y-6 px-8 py-8">
      <div className="relative overflow-visible rounded-[32px] border border-border/70 bg-white/95 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(220,38,38,0.08),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(239,68,68,0.05),_transparent_22%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Badge className="w-fit rounded-full bg-red-50 px-3 py-1 text-red-700 shadow-none hover:bg-red-50">
              Acompanhamento Comercial
            </Badge>
            <div>
              <h1 className="text-3xl font-black tracking-[-0.05em] text-foreground sm:text-4xl">Acompanhamento Comercial</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Protótipo local com dados mockados, agenda de reuniões e cadastro do cliente em abas.
              </p>
            </div>
          </div>
          <Button className="rounded-2xl bg-red-600 text-white hover:bg-red-500" onClick={openDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar reunião / contato
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[420px_minmax(0,1.85fr)_440px]">
        <Card className="min-h-[720px] w-full min-w-0 overflow-visible rounded-[20px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)] box-border xl:min-w-[420px]">
          <CardHeader className="border-b border-slate-200/80 pb-4">
            <CardTitle className="text-[32px] font-bold tracking-[-0.04em] text-foreground">Clientes acompanhados</CardTitle>
            <CardDescription className="text-base leading-6">Distribuição atual do funil comercial.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-6">
            <div className="flex justify-center">
              <div className="w-full min-w-[420px] max-w-[100%]">
                <DonutChart segments={donutSegments} total={clients.length} />
              </div>
            </div>
            <div className="space-y-4">
              {funnelCards.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className={cn('grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 rounded-[20px] border px-6 py-5 shadow-sm', item.cardClassName)}>
                    <div className={cn('flex h-16 w-16 shrink-0 items-center justify-center rounded-full', item.iconClassName)}>
                      <Icon className="h-7 w-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[22px] font-semibold leading-tight text-foreground">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                    </div>
                    <div className={cn('shrink-0 whitespace-nowrap text-[48px] font-bold leading-none tracking-[-0.05em]', item.valueClassName)}>
                      {item.value}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[420px] w-full min-w-0 overflow-visible rounded-[20px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)] box-border">
            <CardHeader className="border-b border-slate-200/80 pb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">Lista de clientes</CardTitle>
                  <CardDescription>Selecione um cliente para ver o cadastro comercial completo.</CardDescription>
                </div>
                <Badge className="rounded-full bg-slate-100 text-slate-700">{clients.length} registros</Badge>
              </div>
            </CardHeader>
            <CardContent className="min-w-0 p-6">
              <ScrollArea className="h-[560px]">
                <div className="min-w-[960px]">
                  <div className="grid grid-cols-[minmax(220px,1.5fr)_minmax(160px,1fr)_minmax(130px,0.8fr)_minmax(210px,1.05fr)_minmax(150px,0.85fr)] border-b border-slate-200/80 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    <div>Cliente</div>
                    <div>Evolução do Cliente</div>
                    <div>Status</div>
                    <div>Resultado da Última Ação</div>
                    <div>Próxima Validação</div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {clients.map((client) => {
                      const active = client.id === selectedTabs?.id;
                      return (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => setSelectedClientId(client.id)}
                          className={cn(
                            'grid w-full grid-cols-[minmax(220px,1.5fr)_minmax(160px,1fr)_minmax(130px,0.8fr)_minmax(210px,1.05fr)_minmax(150px,0.85fr)] items-center px-5 py-5 text-left transition hover:bg-red-50/40',
                            active && 'bg-red-50/50',
                          )}
                        >
                          <div className="min-w-0 pr-4">
                            <p className="truncate font-semibold text-foreground">{client.name}</p>
                            <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              <MessageSquareText className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{client.lastActionSummary}</span>
                            </p>
                          </div>
                          <div className="pr-4">
                            <Badge className={cn('whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold', getStatusBadgeClass(client.evolution))}>
                              {client.evolution}
                            </Badge>
                          </div>
                          <div className="pr-4">
                            <Badge className="whitespace-nowrap rounded-full bg-slate-100 text-slate-700">{client.status}</Badge>
                          </div>
                          <div className="pr-4 text-sm leading-6 text-muted-foreground">{client.resultLastAction}</div>
                          <div className="text-sm font-medium whitespace-nowrap text-foreground">
                            {format(parseISO(client.nextValidation), 'dd/MM/yyyy', { locale: ptBR })}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="space-y-6 min-w-0">
            <Card className="min-h-[420px] w-full min-w-0 overflow-visible rounded-[20px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)] box-border">
              {selectedTabs ? (
                <>
                  <CardHeader className="border-b border-slate-200/80 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="text-xl">{selectedTabs.name}</CardTitle>
                        <CardDescription>{selectedTabs.lastActionSummary}</CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={cn('rounded-full border px-3 py-1 text-xs font-semibold', getStatusBadgeClass(selectedTabs.evolution))}>
                          {selectedTabs.evolution}
                        </Badge>
                        <Badge className="rounded-full bg-slate-100 text-slate-700">{selectedTabs.status}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-[20px] border border-border/60 bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Resultado da última ação</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">{selectedTabs.resultLastAction}</p>
                      </div>
                      <div className="rounded-[20px] border border-border/60 bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Próxima validação</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {format(parseISO(selectedTabs.nextValidation), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    <Tabs defaultValue="historico" className="space-y-4">
                      <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-1 sm:grid-cols-3">
                        <TabsTrigger value="historico" className="min-h-11 whitespace-normal rounded-2xl px-3 py-2 text-xs leading-4">
                          Histórico Comercial
                        </TabsTrigger>
                        <TabsTrigger value="objeccoes" className="min-h-11 whitespace-normal rounded-2xl px-3 py-2 text-xs leading-4">
                          Objeções Mais Frequentes
                        </TabsTrigger>
                        <TabsTrigger value="treinamentos" className="min-h-11 whitespace-normal rounded-2xl px-3 py-2 text-xs leading-4">
                          Treinamentos Realizados
                        </TabsTrigger>
                        <TabsTrigger value="acoes" className="min-h-11 whitespace-normal rounded-2xl px-3 py-2 text-xs leading-4">
                          Ações Combinadas
                        </TabsTrigger>
                        <TabsTrigger value="pendencias" className="min-h-11 whitespace-normal rounded-2xl px-3 py-2 text-xs leading-4">
                          Pendências em Aberto
                        </TabsTrigger>
                        <TabsTrigger value="validacao" className="min-h-11 whitespace-normal rounded-2xl px-3 py-2 text-xs leading-4">
                          Próxima Validação
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="historico" className="mt-0">
                        <ScrollArea className="h-[340px] rounded-[20px] border border-border/60 bg-slate-50 p-4">
                          <div className="space-y-3">
                            {selectedTabs.historyCommercial.map((item, index) => (
                              <div key={`${selectedTabs.id}-history-${index}`} className="rounded-[18px] border border-white/80 bg-white p-4 shadow-sm">
                                <p className="text-sm leading-6 text-foreground whitespace-pre-line">{item}</p>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </TabsContent>

                      <TabsContent value="objeccoes" className="mt-0">
                        <div className="rounded-[20px] border border-border/60 bg-slate-50 p-4">
                          <div className="flex flex-wrap gap-2">
                            {selectedTabs.objections.map((item) => (
                              <Badge key={item} className="rounded-full bg-white text-slate-700 shadow-sm">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="treinamentos" className="mt-0">
                        <div className="space-y-3">
                          {selectedTabs.trainings.map((item) => (
                            <div key={item} className="rounded-[20px] border border-border/60 bg-slate-50 p-4 text-sm font-medium text-foreground">
                              {item}
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="acoes" className="mt-0">
                        <div className="space-y-3">
                          {selectedTabs.combinedActions.map((item) => (
                            <div key={item} className="rounded-[20px] border border-border/60 bg-slate-50 p-4 text-sm font-medium text-foreground">
                              {item}
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="pendencias" className="mt-0">
                        <div className="space-y-3">
                          {selectedTabs.pendingItems.map((item) => (
                            <div key={item} className="rounded-[20px] border border-border/60 bg-slate-50 p-4 text-sm font-medium text-foreground">
                              {item}
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="validacao" className="mt-0">
                        <div className="rounded-[20px] border border-border/60 bg-slate-50 p-4">
                          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Próxima validação</p>
                          <p className="mt-1 text-2xl font-black text-foreground">
                            {format(parseISO(selectedTabs.nextValidation), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </>
              ) : null}
            </Card>

            <Card className="min-h-[240px] w-full min-w-0 overflow-visible rounded-[20px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)] box-border">
              <CardHeader className="border-b border-slate-200/80 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">Leitura rápida</CardTitle>
                    <CardDescription>Resumo do acompanhamento atual.</CardDescription>
                  </div>
                  <Badge className="rounded-full bg-red-50 text-red-700">Local</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                <div className="rounded-[20px] border border-border/60 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-foreground">A evolução do cliente será definida automaticamente pelo sistema com base nas respostas acima.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[20px] border border-border/60 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Alto Risco</p>
                    <p className="mt-1 text-2xl font-black text-foreground">{counts.high}</p>
                  </div>
                  <div className="rounded-[20px] border border-border/60 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Necessita Acompanhamento</p>
                    <p className="mt-1 text-2xl font-black text-foreground">{counts.needFollowUp}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Registrar reunião / contato</DialogTitle>
          </DialogHeader>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-4">
              <FieldSelect
                label="Cliente"
                value={form.clientId}
                onValueChange={(value) => setForm((current) => ({ ...current, clientId: value }))}
              >
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </FieldSelect>

              <FieldSelect
                label="Tipo de contato"
                value={form.contactType}
                onValueChange={(value) => setForm((current) => ({ ...current, contactType: value as ContactType }))}
              >
                {CONTACT_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </FieldSelect>

              <div className="space-y-2">
                <Label>Data da reunião</Label>
                <Input
                  type="date"
                  className="h-11 rounded-2xl bg-white"
                  value={form.meetingDate}
                  onChange={(event) => setForm((current) => ({ ...current, meetingDate: event.target.value }))}
                />
              </div>

              <div className="rounded-[20px] border border-dashed border-border/60 bg-slate-50 p-4 text-sm text-muted-foreground">
                A evolução do cliente será definida automaticamente pelo sistema com base nas respostas acima.
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FieldSelect
                  label="Resultado percebido após o treinamento"
                  value={form.resultPerceived}
                  onValueChange={(value) => setForm((current) => ({ ...current, resultPerceived: value as MeetingFormState['resultPerceived'] }))}
                >
                  {RESULT_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </FieldSelect>
                <FieldSelect
                  label="Participação da equipe"
                  value={form.teamParticipation}
                  onValueChange={(value) => setForm((current) => ({ ...current, teamParticipation: value as MeetingFormState['teamParticipation'] }))}
                >
                  {TEAM_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </FieldSelect>
                <FieldSelect
                  label="Aplicação do que foi treinado"
                  value={form.trainingApplication}
                  onValueChange={(value) => setForm((current) => ({ ...current, trainingApplication: value as MeetingFormState['trainingApplication'] }))}
                >
                  {APPLICATION_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </FieldSelect>
                <FieldSelect
                  label="Engajamento do responsável"
                  value={form.responsibleEngagement}
                  onValueChange={(value) => setForm((current) => ({ ...current, responsibleEngagement: value as MeetingFormState['responsibleEngagement'] }))}
                >
                  {ENGAGEMENT_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </FieldSelect>
                <FieldSelect
                  label="Cumprimento das ações combinadas"
                  value={form.actionsCompletion}
                  onValueChange={(value) => setForm((current) => ({ ...current, actionsCompletion: value as MeetingFormState['actionsCompletion'] }))}
                >
                  {ACTIONS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </FieldSelect>
                <FieldSelect
                  label="Evolução dos indicadores do cliente"
                  value={form.indicatorsEvolution}
                  onValueChange={(value) => setForm((current) => ({ ...current, indicatorsEvolution: value as MeetingFormState['indicatorsEvolution'] }))}
                >
                  {EVOLUTION_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </FieldSelect>
                <FieldSelect
                  label="Objeção principal do cliente"
                  value={form.clientObjection}
                  onValueChange={(value) => setForm((current) => ({ ...current, clientObjection: value as MeetingFormState['clientObjection'] }))}
                >
                  {OBJECTION_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </FieldSelect>
                <FieldSelect
                  label="Necessita intervenção urgente?"
                  value={form.urgentIntervention}
                  onValueChange={(value) => setForm((current) => ({ ...current, urgentIntervention: value as MeetingFormState['urgentIntervention'] }))}
                >
                  {URGENT_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </FieldSelect>
                <FieldSelect
                  label="Próximo passo recomendado"
                  value={form.nextStep}
                  onValueChange={(value) => setForm((current) => ({ ...current, nextStep: value as MeetingFormState['nextStep'] }))}
                >
                  {NEXT_STEP_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </FieldSelect>
                <FieldSelect
                  label="Canal de contato preferencial"
                  value={form.contactChannel}
                  onValueChange={(value) => setForm((current) => ({ ...current, contactChannel: value as MeetingFormState['contactChannel'] }))}
                >
                  {CHANNEL_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </FieldSelect>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Ações combinadas nesta reunião</Label>
                  <Textarea
                    className="min-h-28 rounded-2xl bg-white"
                    value={form.combinedActions}
                    onChange={(event) => setForm((current) => ({ ...current, combinedActions: event.target.value }))}
                    placeholder="Liste as ações combinadas na reunião."
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Pendências em aberto</Label>
                  <Textarea
                    className="min-h-28 rounded-2xl bg-white"
                    value={form.pendingItems}
                    onChange={(event) => setForm((current) => ({ ...current, pendingItems: event.target.value }))}
                    placeholder="Liste as pendências que continuam abertas."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Próxima validação</Label>
                  <Input
                    type="date"
                    className="h-11 rounded-2xl bg-white"
                    value={form.nextValidation}
                    onChange={(event) => setForm((current) => ({ ...current, nextValidation: event.target.value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm font-semibold text-foreground">Histórico comercial *</Label>
                  <Textarea
                    className="min-h-32 rounded-2xl bg-white"
                    value={form.commercialHistory}
                    onChange={(event) => setForm((current) => ({ ...current, commercialHistory: event.target.value }))}
                    placeholder="Descreva tudo que foi tratado na reunião com o cliente."
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-2xl" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button className="rounded-2xl bg-red-600 text-white hover:bg-red-500" onClick={handleSave}>
              Salvar reunião
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
  );
}
