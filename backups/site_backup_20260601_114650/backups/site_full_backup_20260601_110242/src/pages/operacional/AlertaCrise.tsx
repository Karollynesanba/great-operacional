import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CircleAlert,
  Clock3,
  Download,
  MessageSquare,
  Plus,
  PencilLine,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOperationalClients, type OperationalClient } from '@/hooks/useCRMData';

type RiskBand = 'saudavel' | 'atencao' | 'risco' | 'critico';
type ClientStatus = 'monitorado' | 'atencao' | 'risco' | 'critico' | 'estabilizado';
type Sector = 'Trafego' | 'Criativos' | 'Atendimento' | 'Relacionamento' | 'Comercial';
type FilterOption = 'todos' | RiskBand;
type ClientEditorSection = 'overview' | 'diagnostic' | 'history' | 'actions' | 'notes';

type TimelineEvent = {
  date: string;
  title: string;
  detail: string;
  tone: 'neutral' | 'warning' | 'danger' | 'success';
};

type RiskClient = {
  id: string;
  sourceOperationalClientId?: string | null;
  name: string;
  logoUrl?: string;
  initials: string;
  sector: Sector;
  responsible: string;
  team: string;
  status: ClientStatus;
  riskBand: RiskBand;
  score: number;
  healthScore: {
    trafego: number;
    criativos: number;
    atendimento: number;
    satisfacaoCliente: number;
    relacionamento: number;
  };
  activeSince: string;
  complaintSince: string;
  activeFor: string;
  cancellationProbability: number;
  responseTime: string;
  bottleneck: string;
  bottleneckOwner: string;
  alertSummary: string[];
  metrics: string[];
  timeline: TimelineEvent[];
  recommendedActions: { problem: string; action: string; owner: string }[];
  notes: string;
};

type NewClientForm = {
  name: string;
  sector: Sector;
  responsible: string;
  team: string;
  score: string;
  riskBand: RiskBand;
  bottleneck: string;
  status: ClientStatus;
  activeSince: string;
  complaintSince: string;
  activeFor: string;
  cancellationProbability: string;
  responseTime: string;
  bottleneckOwner: string;
  healthTrafego: string;
  healthCriativos: string;
  healthAtendimento: string;
  healthSatisfacaoCliente: string;
  healthRelacionamento: string;
  alertSummaryText: string;
  metricsText: string;
  timelineText: string;
  recommendedActionsText: string;
  notes: string;
  };

function getClientEditorTitle(section: ClientEditorSection, isEditing: boolean) {
  const action = isEditing ? 'Editar' : 'Adicionar';
  if (section === 'overview') return `${action} visão geral`;
  if (section === 'diagnostic') return `${action} plano de ação`;
  if (section === 'history') return `${action} histórico`;
  if (section === 'actions') return `${action} ações`;
  return `${action} notas`;
}

function getClientEditorDescription(section: ClientEditorSection) {
  if (section === 'overview') return 'Preencha os dados principais do cliente em crise.';
  if (section === 'diagnostic') return 'Organize o gargalo, responsáveis e o plano de ação.';
  if (section === 'history') return 'Registre a linha do tempo com fatos importantes.';
  if (section === 'actions') return 'Defina os próximos passos e responsáveis.';
  return 'Escreva observações internas da equipe.';
}

const CRISIS_SCORE_MAX = 5;

const HEALTH_METRIC_LABELS: Record<string, string> = {
  trafego: 'Tráfego',
  criativos: 'Criativos',
  atendimento: 'Atendimento',
  satisfacaoCliente: 'Satisfação do cliente',
  relacionamento: 'Relacionamento',
};

function clampCrisisScore(score: number) {
  if (Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(CRISIS_SCORE_MAX, Math.round(score)));
}

function normalizeLegacyCrisisScore(score: number) {
  if (!Number.isFinite(score)) return 0;
  if (score <= CRISIS_SCORE_MAX) return clampCrisisScore(score);
  return clampCrisisScore((score / 100) * CRISIS_SCORE_MAX);
}

function getScoreLabelFromValue(score: number) {
  const normalized = normalizeLegacyCrisisScore(score);
  if (normalized >= 4) return 'Bom';
  if (normalized >= 2) return 'Médio';
  return 'Ruim';
}

function getScoreToneFromValue(score: number) {
  const normalized = normalizeLegacyCrisisScore(score);
  if (normalized >= 4) return 'bg-emerald-500';
  if (normalized >= 2) return 'bg-amber-500';
  return 'bg-rose-500';
}

function getScoreBorderToneFromValue(score: number) {
  const normalized = normalizeLegacyCrisisScore(score);
  if (normalized >= 4) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (normalized >= 2) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
}

function buildDefaultClientForm(): NewClientForm {
  const today = new Date().toISOString().slice(0, 10);
  return {
    name: '',
    sector: 'Trafego',
    responsible: '',
    team: 'Equipe 7',
    score: '3',
    riskBand: 'atencao',
    bottleneck: '',
    status: 'monitorado',
    activeSince: today,
    complaintSince: today,
    activeFor: '',
    cancellationProbability: '0',
    responseTime: '',
    bottleneckOwner: '',
    healthTrafego: '0',
    healthCriativos: '0',
    healthAtendimento: '0',
    healthSatisfacaoCliente: '0',
    healthRelacionamento: '0',
    alertSummaryText: '',
    metricsText: '',
    timelineText: '',
    recommendedActionsText: '',
    notes: '',
  };
}

function buildClientFormFromRiskClient(client?: RiskClient | null): NewClientForm {
  if (!client) {
    return buildDefaultClientForm();
  }

  return {
    name: client.name,
    sector: client.sector,
    responsible: client.responsible,
    team: client.team,
    score: String(normalizeLegacyCrisisScore(client.score)),
    riskBand: client.riskBand,
    bottleneck: client.bottleneck,
    status: client.status,
    activeSince: client.activeSince,
    complaintSince: client.complaintSince,
    activeFor: client.activeFor,
    cancellationProbability: String(client.cancellationProbability),
    responseTime: client.responseTime,
    bottleneckOwner: client.bottleneckOwner,
    healthTrafego: String(client.healthScore.trafego),
    healthCriativos: String(client.healthScore.criativos),
    healthAtendimento: String(client.healthScore.atendimento),
    healthSatisfacaoCliente: String(client.healthScore.satisfacaoCliente),
    healthRelacionamento: String(client.healthScore.relacionamento),
    alertSummaryText: client.alertSummary.join('\n'),
    metricsText: client.metrics.join('\n'),
    timelineText: client.timeline
      .map((event) => `${event.date} | ${event.title} | ${event.detail} | ${event.tone}`)
      .join('\n'),
    recommendedActionsText: client.recommendedActions
      .map((action) => `${action.problem} | ${action.action} | ${action.owner}`)
      .join('\n'),
    notes: client.notes,
  };
}

type CrisisAlertClientRow = {
  id: string;
  client_id: string;
  status: string | null;
  crisis_score: number | null;
  cancellation_risk: number | null;
  bottleneck_area: string | null;
  symptoms: string[] | null;
  notes: string | null;
  action_plan: string | null;
  responsible_user_id: string | null;
  complaint_started_at: string | null;
  avg_response_time_minutes: number | null;
  history: TimelineEvent[] | null;
  metadata: {
    client_name?: string;
    sector?: Sector;
    team_name?: string;
    responsible_name?: string;
    bottleneck_owner?: string;
    active_since?: string;
    active_for?: string;
    response_time?: string;
    health_score?: {
      trafego: number;
      criativos: number;
      atendimento: number;
      satisfacaoCliente?: number;
      relacionamento?: number;
    };
    metrics?: string[];
    recommended_actions?: { problem: string; action: string; owner: string }[];
    initials?: string;
    logo_url?: string | null;
    risk_band?: RiskBand;
  } | null;
  created_at?: string | null;
  updated_at?: string | null;
};


const INITIAL_CLIENTS: RiskClient[] = [
  {
    id: 'dra-ana',
    name: 'Dra. Ana',
    initials: 'DA',
    sector: 'Atendimento',
    responsible: 'Brayton',
    team: 'Tropa de Elite',
    status: 'critico',
    riskBand: 'critico',
    score: 1,
    healthScore: {
      trafego: 92,
      criativos: 80,
      atendimento: 41,
      satisfacaoCliente: 65,
      relacionamento: 30,
    },
    activeSince: '2023-05-12',
    complaintSince: '2024-04-15',
    activeFor: '8 meses e 12 dias',
    cancellationProbability: 85,
    responseTime: '48 min',
    bottleneck: 'Atendimento e comercial',
    bottleneckOwner: 'Time comercial',
    alertSummary: ['Resposta lenta no WhatsApp', 'Conversão abaixo da média', 'Cliente pouco engajado'],
    metrics: ['Leads bons', 'CPL saudável', 'Agendamentos abaixo do esperado'],
    timeline: [
      { date: '2024-04-15', title: 'Cliente passou a reclamar', detail: 'Atraso nas respostas e queda na conversão.', tone: 'danger' },
      { date: '2024-04-20', title: 'Auditoria parcial', detail: 'Identificado gargalo em resposta comercial.', tone: 'warning' },
      { date: '2024-04-28', title: 'Ação preventiva', detail: 'Reunião com comercial e relacionamento agendada.', tone: 'neutral' },
    ],
    recommendedActions: [
      { problem: 'Atendimento caiu', action: 'Reunião comercial', owner: 'Time comercial' },
      { problem: 'Conversão caiu', action: 'Auditoria de funil', owner: 'Liderança operacional' },
      { problem: 'Cliente sumiu', action: 'Acionar relacionamento', owner: 'CS' },
    ],
    notes: 'Cliente demonstrando impaciência com o prazo de resposta. Prioridade alta para o time comercial.',
  },
  {
    id: 'clinica-vital',
    name: 'Clínica Vital',
    initials: 'CV',
    sector: 'Trafego',
    responsible: 'Amanda',
    team: 'Equipe 7',
    status: 'atencao',
    riskBand: 'atencao',
    score: 3,
    healthScore: {
      trafego: 74,
      criativos: 66,
      atendimento: 69,
      satisfacaoCliente: 58,
      relacionamento: 60,
    },
    activeSince: '2023-08-01',
    complaintSince: '2024-04-08',
    activeFor: '11 meses e 1 dia',
    cancellationProbability: 55,
    responseTime: '19 min',
    bottleneck: 'Criativos',
    bottleneckOwner: 'Time criativo',
    alertSummary: ['CTR em queda', 'Frequência subindo', 'Criativos saturando'],
    metrics: ['Leads estáveis', 'CPL controlado', 'Frequência acima do ideal'],
    timeline: [
      { date: '2024-04-08', title: 'Sinal de atenção', detail: 'Queda no CTR da principal campanha.', tone: 'warning' },
      { date: '2024-04-17', title: 'Nova peça enviada', detail: 'Variação de criativo aprovada.', tone: 'neutral' },
      { date: '2024-04-24', title: 'Persistência do padrão', detail: 'Frequência continua elevada.', tone: 'warning' },
    ],
    recommendedActions: [
      { problem: 'Criativo saturou', action: 'Criar novos hooks', owner: 'Time criativo' },
      { problem: 'Tráfego caiu', action: 'Revisar campanhas', owner: 'Gestor de tráfego' },
    ],
    notes: 'Precisa de novos ângulos de anúncio para estabilizar a entrega.',
  },
  {
    id: 'studio-fit',
    name: 'Studio Fit',
    initials: 'SF',
    sector: 'Relacionamento',
    responsible: 'Gerson',
    team: 'Tropa de Elite',
    status: 'risco',
    riskBand: 'risco',
    score: 2,
    healthScore: {
      trafego: 63,
      criativos: 55,
      atendimento: 39,
      satisfacaoCliente: 44,
      relacionamento: 38,
    },
    activeSince: '2023-10-18',
    complaintSince: '2024-04-02',
    activeFor: '6 meses e 4 dias',
    cancellationProbability: 72,
    responseTime: '31 min',
    bottleneck: 'Relacionamento',
    bottleneckOwner: 'CS',
    alertSummary: ['Cliente sumiu', 'Aprovações atrasadas', 'Participação baixa nas reuniões'],
    metrics: ['Leads bons', 'Baixa interação', 'Aprovação lenta'],
    timeline: [
      { date: '2024-04-02', title: 'Redução de contato', detail: 'Cliente diminuiu presença no grupo.', tone: 'warning' },
      { date: '2024-04-14', title: 'Aprovação travada', detail: 'Peças aguardando retorno há 4 dias.', tone: 'danger' },
      { date: '2024-04-22', title: 'Follow-up feito', detail: 'Relacionamento acionado para tentativa de reengajamento.', tone: 'success' },
    ],
    recommendedActions: [
      { problem: 'Cliente sumiu', action: 'Acionar relacionamento', owner: 'CS' },
      { problem: 'Atendimento caiu', action: 'Reunião comercial', owner: 'Comercial' },
    ],
    notes: 'Alta chance de cancelamento se o contato não for retomado rapidamente.',
  },
  {
    id: 'instituto-verve',
    name: 'Instituto Verve',
    initials: 'IV',
    sector: 'Comercial',
    responsible: 'Matheus',
    team: 'Equipe 7',
    status: 'monitorado',
    riskBand: 'atencao',
    score: 3,
    healthScore: {
      trafego: 77,
      criativos: 71,
      atendimento: 52,
      satisfacaoCliente: 61,
      relacionamento: 50,
    },
    activeSince: '2023-12-05',
    complaintSince: '2024-04-19',
    activeFor: '4 meses e 29 dias',
    cancellationProbability: 44,
    responseTime: '22 min',
    bottleneck: 'Comercial',
    bottleneckOwner: 'Time comercial',
    alertSummary: ['Leads bons', 'Agendamentos irregulares', 'Conversão abaixo do esperado'],
    metrics: ['Volume saudável', 'Funil travando no fechamento', 'Need follow-up'],
    timeline: [
      { date: '2024-04-19', title: 'Sinal de alerta', detail: 'Leads com boa qualidade, mas poucos agendamentos.', tone: 'warning' },
      { date: '2024-04-25', title: 'Plano de ação inicial', detail: 'Conversão comercial abaixo da meta.', tone: 'danger' },
      { date: '2024-04-30', title: 'Ação definida', detail: 'Agendada revisão de abordagem com comercial.', tone: 'neutral' },
    ],
    recommendedActions: [
      { problem: 'Conversão caiu', action: 'Auditoria de funil', owner: 'Liderança' },
      { problem: 'Atendimento caiu', action: 'Reunião comercial', owner: 'Time comercial' },
    ],
    notes: 'Necessita revisão do fluxo de atendimento e cadência de follow-up.',
  },
  {
    id: 'clinica-bem-estar',
    name: 'Clinica Bem Estar',
    initials: 'BE',
    sector: 'Criativos',
    responsible: 'Amanda',
    team: 'Equipe 7',
    status: 'estabilizado',
    riskBand: 'saudavel',
    score: 4,
    healthScore: {
      trafego: 79,
      criativos: 61,
      atendimento: 68,
      satisfacaoCliente: 62,
      relacionamento: 57,
    },
    activeSince: '2023-09-11',
    complaintSince: '2024-03-26',
    activeFor: '7 meses e 8 dias',
    cancellationProbability: 24,
    responseTime: '14 min',
    bottleneck: 'Criativos',
    bottleneckOwner: 'Time criativo',
    alertSummary: ['CTR estabilizado', 'Novos hooks em teste'],
    metrics: ['Leads em alta', 'Aprovação mais rápida', 'Boa interação'],
    timeline: [
      { date: '2024-03-26', title: 'Oscilação pontual', detail: 'Queda pequena no CTR sem impacto crítico.', tone: 'warning' },
      { date: '2024-04-10', title: 'Ajuste aplicado', detail: 'Novos criativos liberados.', tone: 'success' },
      { date: '2024-04-23', title: 'Estabilidade', detail: 'Sinais retornando para a faixa saudável.', tone: 'success' },
    ],
    recommendedActions: [
      { problem: 'Criativo saturou', action: 'Criar novos hooks', owner: 'Criativo' },
    ],
    notes: 'Cliente estabilizado, mas monitoramento segue ativo para prevenção.',
  },
];

function getTeamName(teamId: string | null | undefined, teams: { id: string; name: string }[]) {
  return teams.find((team) => team.id === teamId)?.name || 'Sem equipe';
}

function deriveSectorFromOperationalClient(client: OperationalClient): Sector {
  const text = `${client.pacote ?? ''} ${client.plan ?? ''} ${client.creative_source ?? ''}`.toLowerCase();

  if (text.includes('criativo') || text.includes('design') || text.includes('artes')) return 'Criativos';
  if (text.includes('atendimento') || text.includes('whatsapp')) return 'Atendimento';
  if (text.includes('comercial')) return 'Comercial';
  if (text.includes('relacionamento') || text.includes('cs')) return 'Relacionamento';
  return 'Trafego';
}

function deriveRiskScoreFromOperationalClient(client: OperationalClient) {
  const status = (client.status_operacional ?? '').toUpperCase();
  const stage = (client.onboarding_stage ?? '').toUpperCase();

  if (client.churn_status === 'CONFIRMED' || status === 'ENCERRADO') return 0;
  if (status === 'PAUSADO') return 1;
  if (status === 'ONBOARDING') return 2;
  if (status === 'NOVO_CLIENTE') return 2;
  if (stage === 'ATIVO' || status === 'ATIVO') return 4;
  return 3;
}

function buildRiskClientFromOperationalClient(client: OperationalClient, teamName: string): RiskClient {
  const score = deriveRiskScoreFromOperationalClient(client);
  const riskBand = getRiskBandFromScore(score);
  const initials =
    client.client_name
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'GC';
  const complaintSince =
    client.status_updated_at || client.churn_date || client.activated_at || client.created_at;
  const activeSince = client.activated_at || client.created_at;
  const sector = deriveSectorFromOperationalClient(client);
  const status = ((): ClientStatus => {
    const normalized = (client.status_operacional ?? '').toUpperCase();
    if (normalized === 'ATIVO') return 'monitorado';
    if (normalized === 'PAUSADO') return 'atencao';
    if (normalized === 'ENCERRADO' || client.churn_status === 'CONFIRMED') return 'critico';
    if (normalized === 'ONBOARDING' || normalized === 'NOVO_CLIENTE') return 'atencao';
    return 'monitorado';
  })();

  const bottleneck =
    status === 'critico'
      ? 'Relacionamento e retenção'
      : status === 'atencao'
        ? 'Atendimento e follow-up'
        : 'Monitoramento CRM';

  const cancellationProbability =
    riskBand === 'critico' ? 88 : riskBand === 'risco' ? 74 : riskBand === 'atencao' ? 52 : 26;

  return {
    id: client.id,
    sourceOperationalClientId: client.id,
    name: client.client_name,
    initials,
    sector,
    responsible: teamName,
    team: teamName,
    status,
    riskBand,
    score,
    healthScore: {
      trafego: Math.max(0, Math.min(100, score * 20 + 10)),
      criativos: Math.max(0, Math.min(100, score * 20 + 5)),
      atendimento: Math.max(0, Math.min(100, score * 20 - 8)),
      satisfacaoCliente: Math.max(0, Math.min(100, score * 20 - 3)),
      relacionamento: Math.max(0, Math.min(100, score * 20 - 12)),
    },
    activeSince: activeSince.slice(0, 10),
    complaintSince: complaintSince.slice(0, 10),
    activeFor: '',
    cancellationProbability,
    responseTime: '',
    bottleneck: '',
    bottleneckOwner: '',
    alertSummary: [],
    metrics: [],
    timeline: [],
    recommendedActions: [],
    notes: '',
  };
}

function getRiskLabel(riskBand: RiskBand) {
  if (riskBand === 'saudavel') return 'Saudável';
  if (riskBand === 'atencao') return 'Atenção';
  if (riskBand === 'risco') return 'Alto risco';
  return 'Risco crítico';
}

function getRiskTone(riskBand: RiskBand) {
  if (riskBand === 'saudavel') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (riskBand === 'atencao') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (riskBand === 'risco') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-red-50 text-red-700 border-red-200';
}

function getScoreTone(score: number) {
  const normalized = normalizeLegacyCrisisScore(score);
  if (normalized >= 4) return 'bg-emerald-500';
  if (normalized >= 2) return 'bg-amber-500';
  return 'bg-red-600';
}

function ringGradient(score: number) {
  const clamped = normalizeLegacyCrisisScore(score);
  const percentage = (clamped / CRISIS_SCORE_MAX) * 100;
  const color =
    clamped >= 4
      ? '#16a34a'
      : clamped >= 2
        ? '#f59e0b'
        : clamped >= 1
          ? '#f43f5e'
          : '#dc2626';

  return {
    background: `conic-gradient(${color} ${percentage}%, rgba(229,231,235,0.9) 0)`,
  };
}

function getAverageScore(clients: RiskClient[]) {
  if (clients.length === 0) return 0;
  return Math.round(clients.reduce((sum, client) => sum + client.score, 0) / clients.length);
}

function getRiskBandFromScore(score: number): RiskBand {
  const normalized = normalizeLegacyCrisisScore(score);
  if (normalized >= 4) return 'saudavel';
  if (normalized >= 3) return 'atencao';
  if (normalized >= 2) return 'risco';
  return 'critico';
}

const crisisDb = supabase as any;

function normalizeCrisisStringList(value: string[] | null | undefined) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeCrisisTimeline(value: TimelineEvent[] | null | undefined) {
  return Array.isArray(value) ? value.filter((item): item is TimelineEvent => !!item?.date && !!item?.title) : [];
}

function normalizeHistoryEvents(value: unknown): TimelineEvent[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is TimelineEvent => {
    if (!item || typeof item !== 'object') return false;
    const event = item as Partial<TimelineEvent>;
    return Boolean(event.date && event.title && event.detail);
  });
}

function normalizeActions(value: unknown): { problem: string; action: string; owner: string }[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is { problem: string; action: string; owner: string } => {
    if (!item || typeof item !== 'object') return false;
    const action = item as Partial<{ problem: string; action: string; owner: string }>;
    return Boolean(action.problem && action.action && action.owner);
  });
}

function normalizeActionPlanLines(value: string | null | undefined) {
  if (!value) return [];

  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeHealthScore(value: unknown): {
  trafego: number;
  criativos: number;
  atendimento: number;
  satisfacaoCliente: number;
  relacionamento: number;
} {
  const fallback = { trafego: 0, criativos: 0, atendimento: 0, satisfacaoCliente: 0, relacionamento: 0 };
  if (!value || typeof value !== 'object') return fallback;

  const raw = value as Partial<typeof fallback>;
  return {
    trafego: Number(raw.trafego ?? 0),
    criativos: Number(raw.criativos ?? 0),
    atendimento: Number(raw.atendimento ?? 0),
    satisfacaoCliente: Number(raw.satisfacaoCliente ?? 0),
    relacionamento: Number(raw.relacionamento ?? 0),
  };
}

function normalizeCrisisMetadata(value: CrisisAlertClientRow['metadata']) {
  return value ?? {};
}

function parseMinutesFromResponseTime(responseTime: string | null | undefined) {
  const match = (responseTime ?? '').match(/(\d+)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatMinutes(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return '';
  return `${minutes} min`;
}

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function resolveProfileIdByName(
  value: string | null | undefined,
  profiles: { id: string; full_name: string }[],
) {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!normalized) return null;

  const exact = profiles.find((profile) => profile.full_name.trim().toLowerCase() === normalized);
  if (exact) return exact.id;

  const firstToken = normalized.split(' ')[0];
  const partial = profiles.find((profile) => profile.full_name.trim().toLowerCase().includes(firstToken));
  return partial?.id ?? null;
}

function mapRiskClientToCrisisRow(
  client: RiskClient,
  profiles: { id: string; full_name: string }[],
): Partial<CrisisAlertClientRow> & Pick<CrisisAlertClientRow, 'client_id' | 'status' | 'crisis_score' | 'cancellation_risk'> {
  const responsibleUserId = resolveProfileIdByName(client.responsible, profiles);
  return {
    client_id: client.sourceOperationalClientId ?? client.id,
    status: client.status,
    crisis_score: clampCrisisScore(client.score) || 1,
    cancellation_risk: Math.max(0, Math.min(100, Math.round(client.cancellationProbability))),
    bottleneck_area: client.bottleneck.trim() || null,
    symptoms: normalizeCrisisStringList(client.alertSummary),
    notes: client.notes.trim() || null,
    action_plan: normalizeActionPlanLines(client.metrics.join('\n')).join('\n') || null,
    responsible_user_id: responsibleUserId,
    complaint_started_at: client.complaintSince || null,
    avg_response_time_minutes: parseMinutesFromResponseTime(client.responseTime),
    history: normalizeHistoryEvents(client.timeline),
    metadata: {
      client_name: client.name,
      sector: client.sector,
      team_name: client.team,
      responsible_name: client.responsible,
      bottleneck_owner: client.bottleneckOwner,
      active_since: client.activeSince,
      active_for: client.activeFor,
      response_time: client.responseTime,
      health_score: client.healthScore,
      metrics: normalizeCrisisStringList(client.metrics),
      recommended_actions: client.recommendedActions,
      initials: client.initials,
      logo_url: client.logoUrl ?? null,
      risk_band: client.riskBand,
    },
  };
}

function mapCrisisRowToRiskClient(
  row: CrisisAlertClientRow,
  crmClient: OperationalClient | null,
  teamName: string,
  responsibleName: string,
): RiskClient {
  const metadata = normalizeCrisisMetadata(row.metadata);
  const score = normalizeLegacyCrisisScore(row.crisis_score ?? 3);
  const healthScore = normalizeHealthScore(metadata.health_score);
  const derivedSector = metadata.sector ?? (crmClient ? deriveSectorFromOperationalClient(crmClient) : 'Trafego');
  const name = crmClient?.client_name || metadata.client_name || row.client_id;
  const initials =
    metadata.initials ||
    name
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') ||
    'GC';
  const complaintSince = row.complaint_started_at ?? metadata.active_since ?? row.created_at ?? new Date().toISOString();
  const activeSince = metadata.active_since ?? crmClient?.created_at ?? row.created_at ?? complaintSince;
  const responseTime = row.avg_response_time_minutes ? formatMinutes(row.avg_response_time_minutes) : metadata.response_time ?? '';
  const bottleneck = row.bottleneck_area ?? metadata.bottleneck_owner ?? '';
  const recommendedActions = normalizeActions(metadata.recommended_actions ?? parseActionPlanText(row.action_plan));

  return {
    id: row.id,
    sourceOperationalClientId: row.client_id,
    name,
    logoUrl: metadata.logo_url ?? undefined,
    initials,
    sector: derivedSector,
    responsible: responsibleName || metadata.responsible_name || teamName,
    team: teamName,
    status: (row.status as ClientStatus) ?? 'monitorado',
    riskBand: metadata.risk_band ?? getRiskBandFromScore(score),
    score,
    healthScore: {
      trafego: healthScore.trafego || Math.max(0, Math.min(100, score * 20 + 12)),
      criativos: healthScore.criativos || Math.max(0, Math.min(100, score * 20 + 5)),
      atendimento: healthScore.atendimento || Math.max(0, Math.min(100, score * 20 - 7)),
      satisfacaoCliente: healthScore.satisfacaoCliente || Math.max(0, Math.min(100, score * 20 - 2)),
      relacionamento: healthScore.relacionamento || Math.max(0, Math.min(100, score * 20 - 12)),
    },
    activeSince: (activeSince ?? new Date().toISOString()).slice(0, 10),
    complaintSince: (complaintSince ?? new Date().toISOString()).slice(0, 10),
    activeFor: metadata.active_for ?? '',
    cancellationProbability: row.cancellation_risk ?? 0,
    responseTime,
    bottleneck,
    bottleneckOwner: metadata.bottleneck_owner ?? responsibleName ?? teamName,
    alertSummary: normalizeCrisisStringList(row.symptoms),
    metrics: normalizeCrisisStringList(metadata.metrics).length > 0 ? normalizeCrisisStringList(metadata.metrics) : normalizeActionPlanLines(row.action_plan),
    timeline: normalizeHistoryEvents(row.history),
    recommendedActions,
    notes: row.notes ?? '',
  };
}

function parseActionPlanText(actionPlan: string | null | undefined) {
  if (!actionPlan) return [];

  return actionPlan
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [problem, action, owner] = line.split('|').map((part) => part.trim());
      return {
        problem: problem || 'Ponto de atenção',
        action: action || 'Acompanhar',
        owner: owner || 'Operação',
      };
    });
}

function buildClientFromForm(form: NewClientForm, existingClient?: RiskClient | null): RiskClient {
  const score = Math.max(1, Math.min(5, Number(form.score) || 1));
  const cancellationProbability = Number(form.cancellationProbability);
  const now = new Date().toISOString().slice(0, 10);
  const name = form.name.trim();
  const parsedHealth = {
    trafego: Number(form.healthTrafego),
    criativos: Number(form.healthCriativos),
    atendimento: Number(form.healthAtendimento),
    satisfacaoCliente: Number(form.healthSatisfacaoCliente),
    relacionamento: Number(form.healthRelacionamento),
  };
  const hasValidHealth = Object.values(parsedHealth).every((value) => !Number.isNaN(value));
  const alertSummary = form.alertSummaryText.split('\n').map((item) => item.trim()).filter(Boolean);
  const metrics = form.metricsText.split('\n').map((item) => item.trim()).filter(Boolean);
  const timeline = form.timelineText
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((line) => {
      const [date, title, detail, tone] = line.split("|").map((part) => part.trim());
      return {
        date: date || now,
        title: title || "Atualização",
        detail: detail || "Detalhe não informado.",
        tone: (tone as TimelineEvent["tone"]) || "neutral",
      };
    });
  const recommendedActions = form.recommendedActionsText
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((line) => {
      const [problem, action, owner] = line.split("|").map((part) => part.trim());
      return {
        problem: problem || "Ponto de atenção",
        action: action || "Acompanhar",
        owner: owner || form.responsible.trim() || "Operação",
      };
    });

  return {
    id: existingClient?.id ?? crypto.randomUUID(),
    sourceOperationalClientId: existingClient?.sourceOperationalClientId ?? null,
    name,
    initials:
      name
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || existingClient?.initials || "GC",
    logoUrl: existingClient?.logoUrl,
    sector: form.sector,
    responsible: form.responsible.trim() || existingClient?.responsible || "Equipe",
    team: form.team.trim() || existingClient?.team || "Equipe 7",
    status: form.status,
    riskBand: form.riskBand,
    score,
    healthScore: hasValidHealth
      ? {
          trafego: Math.max(0, Math.min(100, parsedHealth.trafego)),
          criativos: Math.max(0, Math.min(100, parsedHealth.criativos)),
          atendimento: Math.max(0, Math.min(100, parsedHealth.atendimento)),
          satisfacaoCliente: Math.max(0, Math.min(100, parsedHealth.satisfacaoCliente)),
          relacionamento: Math.max(0, Math.min(100, parsedHealth.relacionamento)),
        }
      : {
          trafego: Math.max(0, Math.min(100, score * 20 + 12)),
          criativos: Math.max(0, Math.min(100, score * 20 + 5)),
          atendimento: Math.max(0, Math.min(100, score * 20 - 7)),
          satisfacaoCliente: Math.max(0, Math.min(100, score * 20 - 2)),
          relacionamento: Math.max(0, Math.min(100, score * 20 - 12)),
        },
    activeSince: form.activeSince || existingClient?.activeSince || now,
    complaintSince: form.complaintSince || existingClient?.complaintSince || now,
    activeFor: form.activeFor.trim(),
    cancellationProbability: Number.isNaN(cancellationProbability)
      ? score <= 1
        ? 88
        : score <= 3
          ? 62
          : 28
        : Math.max(0, Math.min(100, cancellationProbability)),
    responseTime: form.responseTime.trim(),
    bottleneck: form.bottleneck.trim(),
    bottleneckOwner: form.bottleneckOwner.trim() || form.responsible.trim(),
    alertSummary,
    metrics,
    timeline,
    recommendedActions,
    notes: form.notes.trim(),
  };
}
export default function AlertaCrise() {
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState('');
  const [periodFilter, setPeriodFilter] = useState('30d');
  const [riskFilter, setRiskFilter] = useState<FilterOption>('todos');
  const [sectorFilter, setSectorFilter] = useState('todos');
  const [responsibleFilter, setResponsibleFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCrmPickerOpen, setIsCrmPickerOpen] = useState(false);
  const [crmSearchTerm, setCrmSearchTerm] = useState('');
  const [crmStatusFilter, setCrmStatusFilter] = useState<'todos' | string>('todos');
  const [crmTeamFilter, setCrmTeamFilter] = useState('todos');
  const [selectedCrmClientId, setSelectedCrmClientId] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<ClientEditorSection>('overview');
  const [newClient, setNewClient] = useState<NewClientForm>(buildDefaultClientForm());
  const [noteDraft, setNoteDraft] = useState('');

  const { data: crmClients = [], isLoading: crmClientsLoading } = useOperationalClients();
  const { data: crisisAlertRows } = useQuery({
    queryKey: ['alerta-crise-clients'],
    queryFn: async () => {
      const { data, error } = await crisisDb
        .from('crisis_alert_clients')
        .select('*')
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as CrisisAlertClientRow[];
    },
  });
  const { data: teams = [] } = useQuery({
    queryKey: ['alerta-crise-teams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('id, name').order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ['alerta-crise-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, avatar_url').order('full_name');
      if (error) throw error;
      return data as { id: string; full_name: string; avatar_url: string | null }[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('crisis-alert-clients-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crisis_alert_clients' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['alerta-crise-clients'] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const crmClientMap = useMemo(
    () => new Map(crmClients.map((client) => [client.id, client])),
    [crmClients],
  );
  const profileMapById = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile.full_name])),
    [profiles],
  );

  const clients = useMemo(() => {
    return (crisisAlertRows ?? []).map((row) => {
      const crmClient = crmClientMap.get(row.client_id) ?? null;
      const teamName = getTeamName(crmClient?.team_id ?? null, teams);
      const metadata = normalizeCrisisMetadata(row.metadata);
      const responsibleName =
        (row.responsible_user_id ? profileMapById.get(row.responsible_user_id) : null) ||
        metadata.responsible_name ||
        teamName;

      return mapCrisisRowToRiskClient(row, crmClient, teamName, responsibleName);
    });
  }, [crisisAlertRows, crmClientMap, profileMapById, teams]);

  useEffect(() => {
    if (clients.length === 0) {
      setSelectedClientId('');
      return;
    }

    setSelectedClientId((current) => {
      if (clients.some((client) => client.id === current)) {
        return current;
      }
      return clients[0]?.id ?? '';
    });
  }, [clients]);

  const periodLabel =
    periodFilter === '7d' ? 'Últimos 7 dias' : periodFilter === '30d' ? 'Últimos 30 dias' : 'Últimos 90 dias';

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const byRisk = riskFilter === 'todos' || client.riskBand === riskFilter;
      const bySector = sectorFilter === 'todos' || client.sector === sectorFilter;
      const byResponsible = responsibleFilter === 'todos' || client.responsible === responsibleFilter;
      const byStatus = statusFilter === 'todos' || client.status === statusFilter;
      const bySearch =
        !searchTerm.trim() ||
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.bottleneck.toLowerCase().includes(searchTerm.toLowerCase());

      return byRisk && bySector && byResponsible && byStatus && bySearch;
    });
  }, [clients, riskFilter, sectorFilter, responsibleFilter, searchTerm, statusFilter]);

  useEffect(() => {
    if (filteredClients.length === 0) {
      setSelectedClientId('');
      return;
    }

    const stillVisible = filteredClients.some((client) => client.id === selectedClientId);
    if (!stillVisible) {
      setSelectedClientId(filteredClients[0].id);
      setNoteDraft(filteredClients[0].notes);
    }
  }, [filteredClients, selectedClientId]);

  const selectedClient = filteredClients.find((client) => client.id === selectedClientId) ?? null;

  useEffect(() => {
    if (selectedClient) {
      setNoteDraft(selectedClient.notes);
    }
  }, [selectedClient?.id]);

  const monitored = clients.length;
  const yellowRisk = clients.filter((client) => client.riskBand === 'atencao').length;
  const redRisk = clients.filter((client) => client.riskBand === 'risco' || client.riskBand === 'critico').length;
  const avgScore = getAverageScore(clients);
  const predictedCancellations = clients.filter((client) => client.cancellationProbability >= 65).length;
  const responsibleOptions = useMemo(() => {
    const names = new Set<string>();
    profiles.forEach((profile) => {
      if (profile.full_name.trim()) {
        names.add(profile.full_name.trim());
      }
    });
    clients.forEach((client) => {
      if (client.responsible.trim()) {
        names.add(client.responsible.trim());
      }
    });
    return [...names].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [clients, profiles]);

  const crmFilteredClients = useMemo(() => {
    return crmClients
      .filter((client) => {
        const teamName = getTeamName(client.team_id, teams);
        const search = crmSearchTerm.trim().toLowerCase();
        const matchesSearch =
          !search ||
          client.client_name.toLowerCase().includes(search) ||
          (client.clinic_name?.toLowerCase().includes(search) ?? false) ||
          (client.plan?.toLowerCase().includes(search) ?? false);
        const matchesStatus =
          crmStatusFilter === 'todos' || (client.status_operacional ?? '').toLowerCase() === crmStatusFilter;
        const matchesTeam = crmTeamFilter === 'todos' || teamName === crmTeamFilter;
        return matchesSearch && matchesStatus && matchesTeam;
      })
      .filter((client) => !clients.some((item) => item.sourceOperationalClientId === client.id));
  }, [clients, crmClients, crmSearchTerm, crmStatusFilter, crmTeamFilter, teams]);

  const selectedCrmClient = crmFilteredClients.find((client) => client.id === selectedCrmClientId) ?? null;

  const saveClientMutation = useMutation({
    mutationFn: async (client: RiskClient) => {
      if (!client.sourceOperationalClientId) {
        throw new Error('Selecione um cliente do CRM antes de salvar o alerta.');
      }

      const payload = mapRiskClientToCrisisRow(client, profiles);
      const { data, error } = await crisisDb
        .from('crisis_alert_clients')
        .upsert(payload, { onConflict: 'client_id' })
        .select('*')
        .single();

      if (error) throw error;
      return data as CrisisAlertClientRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerta-crise-clients'] });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (client: RiskClient) => {
      const identifiers = [client.id, client.sourceOperationalClientId].filter(isUuid);
      if (identifiers.length === 0) {
        throw new Error('Não foi possível identificar o registro para remoção.');
      }

      let deleted = false;
      for (const identifier of identifiers) {
        const byAlertId = await crisisDb.from('crisis_alert_clients').delete().eq('id', identifier);
        if (byAlertId.error) {
          console.error('Erro ao remover por id do alerta:', byAlertId.error);
        } else if (!deleted) {
          deleted = true;
        }

        const byClientId = await crisisDb.from('crisis_alert_clients').delete().eq('client_id', identifier);
        if (byClientId.error) {
          console.error('Erro ao remover por client_id:', byClientId.error);
        } else if (!deleted) {
          deleted = true;
        }

        if (deleted) return identifier;
      }

      throw new Error('Não foi possível remover o cliente do alerta de crise.');
    },
    onSuccess: (_deletedIdentifier, deletedClient) => {
      if (selectedClientId === deletedClient.id || selectedClient?.sourceOperationalClientId === deletedClient.sourceOperationalClientId) {
        setSelectedClientId('');
        setNoteDraft('');
      }
      queryClient.invalidateQueries({ queryKey: ['alerta-crise-clients'] });
    },
  });

  const openAddClientForm = (section: ClientEditorSection = 'overview') => {
    setEditingClientId(null);
    setEditingSection(section);
    setNewClient(buildDefaultClientForm());
    setNoteDraft('');
    setIsAddOpen(true);
  };

  const openEditClientForm = (client: RiskClient, section: ClientEditorSection = 'overview') => {
    setEditingClientId(client.id);
    setEditingSection(section);
    setNewClient(buildClientFormFromRiskClient(client));
    setNoteDraft(client.notes);
    setIsAddOpen(true);
  };

  const closeClientForm = () => {
    setIsAddOpen(false);
    setEditingClientId(null);
    setEditingSection('overview');
    setNewClient(buildDefaultClientForm());
    setNoteDraft('');
  };

  useEffect(() => {
    if (!isCrmPickerOpen) return;

    if (crmFilteredClients.length === 0) {
      setSelectedCrmClientId('');
      return;
    }

    const stillVisible = crmFilteredClients.some((client) => client.id === selectedCrmClientId);
    if (!stillVisible) {
      setSelectedCrmClientId(crmFilteredClients[0].id);
    }
  }, [crmFilteredClients, isCrmPickerOpen, selectedCrmClientId]);

  const addClientFromCRM = () => {
    if (!selectedCrmClient) {
      toast.error('Selecione um cliente do CRM.');
      return;
    }

    const teamName = getTeamName(selectedCrmClient.team_id, teams);
    const mappedClient = buildRiskClientFromOperationalClient(selectedCrmClient, teamName);

    setIsCrmPickerOpen(false);
    setCrmSearchTerm('');
    setCrmStatusFilter('todos');
    setCrmTeamFilter('todos');
    setSelectedCrmClientId('');
    void saveClientMutation
      .mutateAsync(mappedClient)
      .then((savedRow) => {
        setSelectedClientId(savedRow.id);
        setNoteDraft(mappedClient.notes);
        toast.success('Cliente do CRM adicionado ao alerta de crise.');
      })
      .catch((error) => {
        console.error(error);
        toast.error('Não foi possível salvar o cliente do CRM no alerta de crise.');
      });
  };

  const sectorBreakdown = useMemo(() => {
    const sectors: Sector[] = ['Trafego', 'Criativos', 'Atendimento', 'Relacionamento', 'Comercial'];
    return sectors.map((sector) => ({
      sector,
      count: clients.filter((client) => client.sector === sector).length,
    }));
  }, [clients]);

  const saveClient = () => {
    if (!editingClientId) {
      toast.error('Use "Selecionar cliente do CRM" para adicionar um novo alerta.');
      return;
    }

    const existingClient = editingClientId ? clients.find((client) => client.id === editingClientId) ?? null : null;
    if (!existingClient) {
      toast.error('Cliente de alerta não encontrado.');
      return;
    }
    const nextClient = buildClientFromForm(newClient, existingClient);

    if (existingClient?.sourceOperationalClientId) {
      nextClient.sourceOperationalClientId = existingClient.sourceOperationalClientId;
    }

    void saveClientMutation
      .mutateAsync(nextClient)
      .then(() => {
        setSelectedClientId(nextClient.id);
        setNoteDraft(nextClient.notes);
        closeClientForm();
        toast.success('Cliente atualizado no alerta de crise.');
      })
      .catch((error) => {
        console.error(error);
        toast.error('Não foi possível salvar o cliente no alerta de crise.');
      });
  };

  const removeClient = (client: RiskClient) => {
    void deleteClientMutation
      .mutateAsync(client)
      .then(() => toast.success('Cliente removido do monitoramento.'))
      .catch((error) => {
        console.error('Falha ao remover cliente do alerta de crise:', error);
        toast.error('Não foi possível remover o cliente do alerta de crise.');
      });
  };

  const updateClientStatus = (clientId: string, status: ClientStatus) => {
    const targetClient = clients.find((client) => client.id === clientId);
    if (!targetClient) return;

    const nextClient = { ...targetClient, status };

    void saveClientMutation
      .mutateAsync(nextClient)
      .then(() => toast.success('Estado atualizado.'))
      .catch((error) => {
        console.error(error);
        toast.error('Não foi possível atualizar o estado.');
      });
  };

  const saveNotes = () => {
    if (!selectedClient) return;

    const nextClient: RiskClient = {
      ...selectedClient,
      notes: noteDraft.trim(),
      timeline: [
        {
          date: new Date().toISOString().slice(0, 10),
          title: 'Nova observação adicionada',
          detail: noteDraft.trim() || 'Observação salva pela equipe.',
          tone: 'neutral',
        },
        ...selectedClient.timeline,
      ],
    };

    void saveClientMutation
      .mutateAsync(nextClient)
      .then(() => {
        setNoteDraft(nextClient.notes);
        toast.success('Observação salva.');
      })
      .catch((error) => {
        console.error(error);
        toast.error('Não foi possível salvar a observação.');
      });
  };

  return (
    <div className="relative isolate space-y-6 overflow-hidden">
      <div className="pointer-events-none absolute -left-16 top-0 h-72 w-72 rounded-full bg-rose-400/10 blur-3xl" />
      <div className="pointer-events-none absolute right-8 top-28 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-red-500/5 blur-3xl" />

      <section className="great-panel relative overflow-hidden p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(225,6,0,0.08),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(225,6,0,0.05),transparent_28%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700 shadow-sm">
              <ShieldAlert className="h-3.5 w-3.5" />
              Sistema de Alerta de Crise
            </div>
            <h1 className="text-3xl font-black tracking-[-0.05em] text-foreground md:text-5xl">
              Monitoramento preventivo da saúde do cliente
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              Um CRM de saúde operacional para prever risco, identificar gargalos e acionar ações antes do cancelamento acontecer.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-white/85 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-[0_10px_24px_rgba(24,17,14,0.04)]">
              <CalendarClock className="h-3.5 w-3.5 text-rose-500" />
              Janela ativa: {periodLabel}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="h-11 w-[220px] rounded-2xl bg-white/85">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="h-11 rounded-2xl bg-white/80" onClick={() => setIsCrmPickerOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Selecionar cliente do CRM
            </Button>

            <Button variant="outline" className="h-11 rounded-2xl bg-white/80" onClick={() => setIsCrmPickerOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar cliente do CRM
            </Button>

            <Button className="h-11 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90">
              <Download className="mr-2 h-4 w-4" />
              Exportar alerta
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Clientes monitorados', value: monitored, icon: Users, tone: 'text-foreground' },
          { label: 'Risco amarelo', value: yellowRisk, icon: CircleAlert, tone: 'text-amber-600' },
          { label: 'Risco vermelho', value: redRisk, icon: AlertTriangle, tone: 'text-rose-600' },
          { label: 'Saúde média geral', value: getScoreLabelFromValue(avgScore), icon: BarChart3, tone: 'text-foreground' },
          { label: 'Cancelamentos previstos', value: predictedCancellations, icon: TrendingDown, tone: 'text-rose-600' },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <Card
              key={item.label}
              className="card-hover relative overflow-hidden border-border/70 bg-white/90 shadow-[0_16px_40px_rgba(24,17,14,0.05)]"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 via-rose-300 to-amber-300" />
              <CardContent className="flex items-center justify-between p-5">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                  <p className={cn('text-3xl font-black tracking-tight', item.tone)}>{item.value}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-50 to-white text-rose-600 shadow-inner">
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="card-hover border-border/70 bg-white/90 shadow-[0_20px_60px_rgba(24,17,14,0.06)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-lg">Clientes em risco</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Leitura rápida dos clientes com maior chance de crise.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-rose-500" />
              Classificação automática por saúde
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedClientId(client.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedClientId(client.id);
                    }
                  }}
                  className={cn(
                    'relative min-w-[260px] rounded-[1.7rem] border bg-surface/90 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(225,6,0,0.08)]',
                    selectedClientId === client.id
                      ? 'border-rose-300 bg-white shadow-[0_18px_45px_rgba(225,6,0,0.1)]'
                      : 'border-border',
                  )}
                >
                  <div className="absolute right-3 top-3 flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded-full border border-border bg-white p-1.5 text-muted-foreground transition-colors hover:border-rose-300 hover:text-rose-600"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditClientForm(client, 'overview');
                      }}
                      aria-label={`Editar ${client.name}`}
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-border bg-white p-1.5 text-muted-foreground transition-colors hover:border-rose-300 hover:text-rose-600"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeClient(client);
                      }}
                      aria-label={`Remover ${client.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border border-border">
                        <AvatarImage src={client.logoUrl} />
                        <AvatarFallback className="bg-rose-100 text-sm font-bold text-rose-700">
                          {client.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground">{client.name}</p>
                        <p className="text-xs text-muted-foreground">{client.sector}</p>
                      </div>
                    </div>
                    <Badge className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', getRiskTone(client.riskBand))}>
                      {getRiskLabel(client.riskBand)}
                    </Badge>
                  </div>

                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Score da crise</p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-2xl font-black tracking-tight">{client.score}/5</p>
                        <span className={cn('h-2.5 w-2.5 rounded-full', getScoreToneFromValue(client.score))} />
                        <Badge className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold', getScoreBorderToneFromValue(client.score))}>
                          {getScoreLabelFromValue(client.score)}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>Risco de cancelamento</p>
                      <p className="mt-1 text-base font-semibold text-foreground">{client.cancellationProbability}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-border/70 bg-white/90 shadow-[0_20px_60px_rgba(24,17,14,0.06)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Filtros de leitura</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajuste a visão por período, risco, setor, responsável e estado.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar cliente ou gargalo"
                className="h-11 rounded-2xl pl-10"
              />
            </div>

            <Select value={riskFilter} onValueChange={(value) => setRiskFilter(value as FilterOption)}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue placeholder="Risco" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os riscos</SelectItem>
                <SelectItem value="saudavel">Saudável</SelectItem>
                <SelectItem value="atencao">Atenção</SelectItem>
                <SelectItem value="risco">Alto risco</SelectItem>
                <SelectItem value="critico">Crítico</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue placeholder="Setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os setores</SelectItem>
                <SelectItem value="Trafego">Tráfego</SelectItem>
                <SelectItem value="Criativos">Criativos</SelectItem>
                <SelectItem value="Atendimento">Atendimento</SelectItem>
                <SelectItem value="Relacionamento">Relacionamento</SelectItem>
                <SelectItem value="Comercial">Comercial</SelectItem>
              </SelectContent>
            </Select>

            <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os responsáveis</SelectItem>
                {responsibleOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os estados</SelectItem>
                <SelectItem value="monitorado">Monitorado</SelectItem>
                <SelectItem value="atencao">Atenção</SelectItem>
                <SelectItem value="risco">Risco</SelectItem>
                <SelectItem value="critico">Crítico</SelectItem>
                <SelectItem value="estabilizado">Estabilizado</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="card-hover border-border/70 bg-white/90 shadow-[0_20px_60px_rgba(24,17,14,0.06)]">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-lg">Painel detalhado do cliente</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Plano de ação, linha do tempo e ações sugeridas.
              </p>
            </div>

            <Button variant="outline" className="rounded-2xl bg-white/80" onClick={() => selectedClient && removeClient(selectedClient)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Remover cliente
            </Button>
            <Button variant="outline" className="rounded-2xl bg-white/80" onClick={() => selectedClient && openEditClientForm(selectedClient, 'overview')}>
              <PencilLine className="mr-2 h-4 w-4" />
              Editar visão geral
            </Button>
          </CardHeader>

          {selectedClient ? (
            <CardContent className="space-y-5">
              <div className="flex flex-col gap-4 rounded-[1.8rem] border border-border/70 bg-gradient-to-r from-white via-white to-rose-50/40 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border border-border">
                    <AvatarImage src={selectedClient.logoUrl} />
                    <AvatarFallback className="bg-rose-100 text-base font-bold text-rose-700">
                      {selectedClient.initials}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-black tracking-[-0.04em] text-foreground">{selectedClient.name}</h2>
                      <Badge className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', getRiskTone(selectedClient.riskBand))}>
                        {getRiskLabel(selectedClient.riskBand)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Cliente desde {format(new Date(selectedClient.activeSince), 'dd/MM/yyyy', { locale: ptBR })}  •  Ativo há {selectedClient.activeFor}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Passou a reclamar em {format(new Date(selectedClient.complaintSince), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={selectedClient.status}
                    onValueChange={(value) => updateClientStatus(selectedClient.id, value as ClientStatus)}
                  >
                    <SelectTrigger className="h-10 w-[200px] rounded-2xl">
                      <SelectValue placeholder="Alterar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monitorado">Monitorado</SelectItem>
                      <SelectItem value="atencao">Atenção</SelectItem>
                      <SelectItem value="risco">Risco</SelectItem>
                      <SelectItem value="critico">Crítico</SelectItem>
                      <SelectItem value="estabilizado">Estabilizado</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" className="rounded-2xl">
                    Ver cliente completo <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="visao-geral" className="space-y-4">
                <TabsList className="grid h-auto w-full grid-cols-5 rounded-2xl bg-surface p-1 shadow-inner">
                  <TabsTrigger value="visao-geral" className="rounded-2xl">
                    Visão geral
                  </TabsTrigger>
                  <TabsTrigger value="diagnostico" className="rounded-2xl">
                    Plano de ação
                  </TabsTrigger>
                  <TabsTrigger value="historico" className="rounded-2xl">
                    Histórico
                  </TabsTrigger>
                  <TabsTrigger value="acoes" className="rounded-2xl">
                    Ações
                  </TabsTrigger>
                  <TabsTrigger value="notas" className="rounded-2xl">
                    Notas
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="visao-geral" className="mt-0 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Visão geral</p>
                      <p className="text-xs text-muted-foreground">Clique na caneta para preencher os dados deste bloco.</p>
                    </div>
                      <Button variant="outline" size="sm" className="rounded-2xl" onClick={() => selectedClient && openEditClientForm(selectedClient, 'overview')}>
                        <PencilLine className="mr-2 h-4 w-4" />
                        Editar visão geral
                      </Button>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                    <Card className="border-border/70 bg-surface shadow-sm">
                      <CardContent className="flex h-full flex-col justify-between p-5">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-muted-foreground">Score da crise</p>
                          <Badge className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', getScoreBorderToneFromValue(selectedClient.score))}>
                            {getScoreLabelFromValue(selectedClient.score)}
                          </Badge>
                        </div>
                        <div className="mt-6 flex items-center gap-6">
                          <div
                            className="relative flex h-44 w-44 items-center justify-center rounded-full shadow-[inset_0_0_0_8px_rgba(255,255,255,0.6)]"
                            style={ringGradient(selectedClient.score)}
                          >
                            <div className="flex h-[9.5rem] w-[9.5rem] items-center justify-center rounded-full bg-white shadow-[0_20px_40px_rgba(24,17,14,0.08)]">
                              <div className="text-center">
                                <p className="text-4xl font-black tracking-tight">{selectedClient.score}</p>
                                <p className="text-sm text-muted-foreground">/5</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex-1 space-y-3">
                            {Object.entries(selectedClient.healthScore).map(([key, value]) => (
                              <div key={key}>
                                <div className="mb-1 flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">{HEALTH_METRIC_LABELS[key] ?? key}</span>
                                  <span className="font-semibold text-foreground">{value}</span>
                                </div>
                                <Progress value={value} className="h-2 rounded-full" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid gap-4">
                      <Card className="border-border/70 bg-surface shadow-sm">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                                <MessageSquare className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Reclamações e sinais de alerta</p>
                                <p className="mt-1 text-base font-bold text-foreground">
                                  Cliente passou a reclamar em
                                </p>
                              </div>
                            </div>

                            <div className="rounded-2xl border border-rose-200 bg-white px-3 py-2 text-right shadow-sm">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-600">
                                Início da reclamação
                              </p>
                              <p className="mt-1 text-sm font-bold text-foreground">
                                {format(new Date(selectedClient.complaintSince), 'dd/MM/yyyy', { locale: ptBR })}
                              </p>
                            </div>
                          </div>

                          <Separator className="my-4" />

                          <div className="space-y-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                Principais sintomas
                              </p>
                              {selectedClient.alertSummary.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {selectedClient.alertSummary.map((alert) => (
                                    <span
                                      key={alert}
                                      className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 shadow-[0_6px_16px_rgba(225,6,0,0.06)]"
                                    >
                                      {alert}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="mt-2 rounded-2xl border border-dashed border-border bg-white p-4 text-sm text-muted-foreground">
                                  Sem sintomas cadastrados. Clique na caneta para adicionar os dados.
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-border/70 bg-surface">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Risco de cancelamento</p>
                            <Badge className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', selectedClient.cancellationProbability >= 65 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>
                              {selectedClient.cancellationProbability >= 65 ? 'Alto risco' : 'Em monitoramento'}
                            </Badge>
                          </div>
                          <div className="mt-5 flex items-end justify-between">
                            <div>
                              <p className="text-4xl font-black tracking-tight text-foreground">{selectedClient.cancellationProbability}%</p>
                              <p className="mt-1 text-sm text-muted-foreground">Próximos 30 dias</p>
                            </div>
                            <div className="rounded-2xl bg-white px-4 py-2 shadow-sm">
                              <p className="text-xs text-muted-foreground">Tempo de resposta WhatsApp</p>
                              <p className="font-semibold text-foreground">{selectedClient.responseTime}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="diagnostico" className="mt-0 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Plano de ação</p>
                      <p className="text-xs text-muted-foreground">Atualize gargalo, responsáveis e leitura operacional.</p>
                    </div>
                      <Button variant="outline" size="sm" className="rounded-2xl" onClick={() => selectedClient && openEditClientForm(selectedClient, 'diagnostic')}>
                        <PencilLine className="mr-2 h-4 w-4" />
                        Editar plano de ação
                      </Button>
                  </div>
                  <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                    <Card className="border-border/70 bg-surface">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Onde está o ponto de atenção</p>
                            <p className="mt-2 text-2xl font-black tracking-tight text-foreground">
                              {selectedClient.bottleneck || 'Sem gargalo informado'}
                            </p>
                          </div>
                          <Target className="h-6 w-6 text-rose-500" />
                        </div>

                        <Separator className="my-4" />

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Setor responsável</span>
                            <span className="font-semibold text-foreground">{selectedClient.bottleneckOwner || 'Sem responsável'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Equipe</span>
                            <span className="font-semibold text-foreground">{selectedClient.team}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Desde quando o cliente passou a reclamar</span>
                            <span className="font-semibold text-foreground">
                              {format(new Date(selectedClient.complaintSince), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-border/70 bg-surface">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Plano de ação sugerido</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5">
                          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-700">
                            Leitura operacional
                          </p>
                          <p className="mt-3 text-base leading-7 text-rose-900">
                            O problema principal não está em tráfego. Os leads estão chegando, mas o gargalo está em {selectedClient.bottleneck ? selectedClient.bottleneck.toLowerCase() : 'análise manual'}.
                          </p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          {selectedClient.metrics.length > 0 ? (
                            selectedClient.metrics.map((metric) => (
                              <div key={metric} className="rounded-2xl border border-border bg-white p-4">
                                <p className="text-sm font-medium text-foreground">{metric}</p>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-2xl border border-dashed border-border bg-white p-4 text-sm text-muted-foreground md:col-span-2">
                              Sem plano de ação cadastrado. Clique na caneta para preencher os dados.
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="historico" className="mt-0">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Histórico</p>
                      <p className="text-xs text-muted-foreground">Registre a linha do tempo do cliente aqui.</p>
                    </div>
                      <Button variant="outline" size="sm" className="rounded-2xl" onClick={() => selectedClient && openEditClientForm(selectedClient, 'history')}>
                        <PencilLine className="mr-2 h-4 w-4" />
                        Editar histórico
                      </Button>
                  </div>
                  <Card className="border-border/70 bg-surface">
                    <CardContent className="p-5">
                      <ScrollArea className="h-[320px] pr-4">
                        <div className="space-y-5">
                          {selectedClient.timeline.length > 0 ? (
                            selectedClient.timeline.map((event, index) => (
                              <div key={`${event.date}-${event.title}`} className="relative pl-6">
                                {index < selectedClient.timeline.length - 1 ? (
                                  <div className="absolute left-2.5 top-3 h-full w-px bg-border" />
                                ) : null}
                                <div className="absolute left-0 top-2.5 h-5 w-5 rounded-full border-4 border-surface bg-primary" />
                                <div className="rounded-2xl border border-border bg-white p-4">
                                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="font-semibold text-foreground">{event.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(event.date), 'dd/MM/yyyy', { locale: ptBR })}
                                    </p>
                                  </div>
                                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{event.detail}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-2xl border border-dashed border-border bg-white p-4 text-sm text-muted-foreground">
                              Sem histórico registrado. Clique na caneta para adicionar os eventos.
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="acoes" className="mt-0">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Ações</p>
                      <p className="text-xs text-muted-foreground">Cadastre os próximos passos e responsáveis.</p>
                    </div>
                      <Button variant="outline" size="sm" className="rounded-2xl" onClick={() => selectedClient && openEditClientForm(selectedClient, 'actions')}>
                        <PencilLine className="mr-2 h-4 w-4" />
                        Editar ações
                      </Button>
                  </div>
                  <Card className="border-border/70 bg-surface">
                    <CardContent className="p-5">
                      <div className="overflow-hidden rounded-3xl border border-border bg-white">
                        <div className="grid grid-cols-3 border-b border-border bg-surface px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          <span>Problema</span>
                          <span>Ação</span>
                          <span>Responsável</span>
                        </div>
                        <div className="divide-y divide-border">
                          {selectedClient.recommendedActions.length > 0 ? (
                            selectedClient.recommendedActions.map((action) => (
                              <div key={`${action.problem}-${action.action}`} className="grid grid-cols-3 gap-3 px-4 py-4 text-sm">
                                <span className="font-medium text-foreground">{action.problem}</span>
                                <span className="text-muted-foreground">{action.action}</span>
                                <span className="text-muted-foreground">{action.owner}</span>
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-6 text-sm text-muted-foreground">
                              Nenhuma ação cadastrada. Clique na caneta para adicionar os próximos passos.
                            </div>
                          )}
                        </div>
                      </div>

                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="notas" className="mt-0">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Notas</p>
                      <p className="text-xs text-muted-foreground">Registre observações internas da equipe.</p>
                    </div>
                      <Button variant="outline" size="sm" className="rounded-2xl" onClick={() => selectedClient && openEditClientForm(selectedClient, 'notes')}>
                        <PencilLine className="mr-2 h-4 w-4" />
                        Editar notas
                      </Button>
                    </div>
                    <Card className="border-border/70 bg-surface">
                      <CardContent className="space-y-4 p-5">
                        {selectedClient.notes ? (
                          <div className="rounded-3xl border border-border bg-white p-4">
                            <p className="text-sm leading-6 text-foreground">{selectedClient.notes}</p>
                          </div>
                        ) : (
                          <div className="rounded-3xl border border-dashed border-border bg-white p-4 text-sm text-muted-foreground">
                            Nenhuma observação registrada. Clique na caneta para adicionar notas.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
              </Tabs>
            </CardContent>
          ) : (
            <CardContent className="pb-6">
              <div className="rounded-[1.8rem] border border-dashed border-border bg-surface p-8 text-center">
                <p className="text-lg font-semibold text-foreground">Nenhum cliente encontrado com os filtros atuais.</p>
                <p className="mt-2 text-sm text-muted-foreground">Tente ampliar a busca ou limpar os filtros para voltar a visualizar os clientes monitorados.</p>
              </div>
            </CardContent>
          )}
        </Card>

        <div className="space-y-6">
        <Card className="card-hover border-border/70 bg-white/90 shadow-[0_20px_60px_rgba(24,17,14,0.06)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Leitura rápida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <Clock3 className="h-5 w-5 text-rose-500" />
              <div>
                <p className="font-semibold text-foreground">Resposta média</p>
                <p className="text-sm text-muted-foreground">Quanto mais alta, maior o risco comercial na janela de {periodLabel.toLowerCase()}.</p>
              </div>
            </div>
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
                <RefreshCw className="h-5 w-5 text-rose-500" />
                <div>
                  <p className="font-semibold text-foreground">Monitoramento contínuo</p>
                  <p className="text-sm text-muted-foreground">O sistema acompanha comportamento, operação e relacionamento.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
                <Target className="h-5 w-5 text-rose-500" />
                <div>
                  <p className="font-semibold text-foreground">Gargalo identificado</p>
                  <p className="text-sm text-muted-foreground">Mostra claramente qual área está causando o problema.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Dialog open={isAddOpen} onOpenChange={(open) => (open ? setIsAddOpen(true) : closeClientForm())}>
        <DialogContent className="sm:max-w-3xl rounded-[1.8rem] border-border bg-white shadow-[0_30px_90px_rgba(24,17,14,0.18)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingClientId ? 'Editar cliente em crise' : 'Adicionar cliente em crise'}
            </DialogTitle>
            <DialogDescription>
              {editingClientId
                ? 'Atualize os dados do cliente sem alterar o cadastro do CRM.'
                : 'Inclua um cliente manualmente no painel de crise para monitoramento da operação.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {editingSection === 'overview' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Nome do cliente *</Label>
                  <Input
                    value={newClient.name}
                    onChange={(event) => setNewClient((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Ex.: Clínica Verve"
                    className="rounded-2xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Score da crise</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    step={1}
                    value={newClient.score}
                    onChange={(event) => setNewClient((current) => ({ ...current, score: event.target.value }))}
                    className="rounded-2xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Risco</Label>
                  <Select
                    value={newClient.riskBand}
                    onValueChange={(value) => setNewClient((current) => ({ ...current, riskBand: value as RiskBand }))}
                  >
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="saudavel">Saudável</SelectItem>
                      <SelectItem value="atencao">Atenção</SelectItem>
                      <SelectItem value="risco">Risco</SelectItem>
                      <SelectItem value="critico">Crítico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cliente desde</Label>
                  <Input
                    type="date"
                    value={newClient.activeSince}
                    onChange={(event) => setNewClient((current) => ({ ...current, activeSince: event.target.value }))}
                    className="rounded-2xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Passou a reclamar em</Label>
                  <Input
                    type="date"
                    value={newClient.complaintSince}
                    onChange={(event) => setNewClient((current) => ({ ...current, complaintSince: event.target.value }))}
                    className="rounded-2xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tempo de acompanhamento</Label>
                  <Input
                    value={newClient.activeFor}
                    onChange={(event) => setNewClient((current) => ({ ...current, activeFor: event.target.value }))}
                    placeholder="Ex.: 8 meses e 12 dias"
                    className="rounded-2xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Probabilidade de cancelamento (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={newClient.cancellationProbability}
                    onChange={(event) =>
                      setNewClient((current) => ({ ...current, cancellationProbability: event.target.value }))
                    }
                    className="rounded-2xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tempo de resposta WhatsApp</Label>
                  <Input
                    value={newClient.responseTime}
                    onChange={(event) => setNewClient((current) => ({ ...current, responseTime: event.target.value }))}
                    placeholder="Ex.: 16 min"
                    className="rounded-2xl"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Indicadores de saúde e satisfação</Label>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={newClient.healthTrafego}
                      onChange={(event) =>
                        setNewClient((current) => ({ ...current, healthTrafego: event.target.value }))
                      }
                      placeholder="Tráfego"
                      className="rounded-2xl"
                    />
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={newClient.healthCriativos}
                      onChange={(event) =>
                        setNewClient((current) => ({ ...current, healthCriativos: event.target.value }))
                      }
                      placeholder="Criativos"
                      className="rounded-2xl"
                    />
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={newClient.healthAtendimento}
                      onChange={(event) =>
                        setNewClient((current) => ({ ...current, healthAtendimento: event.target.value }))
                      }
                      placeholder="Atendimento"
                      className="rounded-2xl"
                    />
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={newClient.healthSatisfacaoCliente}
                      onChange={(event) =>
                        setNewClient((current) => ({ ...current, healthSatisfacaoCliente: event.target.value }))
                      }
                      placeholder="Satisfação"
                      className="rounded-2xl"
                    />
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={newClient.healthRelacionamento}
                      onChange={(event) =>
                        setNewClient((current) => ({ ...current, healthRelacionamento: event.target.value }))
                      }
                      placeholder="Relacionamento"
                      className="rounded-2xl"
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Visão geral</Label>
                  <Textarea
                    value={newClient.alertSummaryText}
                    onChange={(event) =>
                      setNewClient((current) => ({ ...current, alertSummaryText: event.target.value }))
                    }
                    placeholder="Uma linha por item"
                    className="min-h-[110px] rounded-2xl bg-white"
                  />
                </div>
              </div>
            ) : null}

            {editingSection === 'diagnostic' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Segmento</Label>
                  <Select
                    value={newClient.sector}
                    onValueChange={(value) => setNewClient((current) => ({ ...current, sector: value as Sector }))}
                  >
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Trafego">Tráfego</SelectItem>
                      <SelectItem value="Criativos">Criativos</SelectItem>
                      <SelectItem value="Atendimento">Atendimento</SelectItem>
                      <SelectItem value="Relacionamento">Relacionamento</SelectItem>
                      <SelectItem value="Comercial">Comercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Input
                    value={newClient.responsible}
                    onChange={(event) => setNewClient((current) => ({ ...current, responsible: event.target.value }))}
                    placeholder="Ex.: Amanda"
                    className="rounded-2xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Equipe</Label>
                  <Input
                    value={newClient.team}
                    onChange={(event) => setNewClient((current) => ({ ...current, team: event.target.value }))}
                    placeholder="Ex.: Equipe 7"
                    className="rounded-2xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Responsável pelo gargalo</Label>
                  <Input
                    value={newClient.bottleneckOwner}
                    onChange={(event) =>
                      setNewClient((current) => ({ ...current, bottleneckOwner: event.target.value }))
                    }
                    placeholder="Ex.: Time comercial"
                    className="rounded-2xl"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Onde está o gargalo</Label>
                  <Textarea
                    value={newClient.bottleneck}
                    onChange={(event) => setNewClient((current) => ({ ...current, bottleneck: event.target.value }))}
                    placeholder="Descreva o principal ponto de atenção."
                    className="min-h-[110px] rounded-2xl bg-white"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Plano de ação</Label>
                  <Textarea
                    value={newClient.metricsText}
                    onChange={(event) => setNewClient((current) => ({ ...current, metricsText: event.target.value }))}
                    placeholder="Uma linha por item, de preferência personalizada pelo plano do cliente"
                    className="min-h-[130px] rounded-2xl bg-white"
                  />
                </div>
              </div>
            ) : null}

            {editingSection === 'history' ? (
              <div className="space-y-2">
                <Label>Histórico</Label>
                <Textarea
                  value={newClient.timelineText}
                  onChange={(event) => setNewClient((current) => ({ ...current, timelineText: event.target.value }))}
                  placeholder="Formato: data | título | detalhe | tom"
                  className="min-h-[220px] rounded-2xl bg-white"
                />
              </div>
            ) : null}

            {editingSection === 'actions' ? (
              <div className="space-y-2">
                <Label>Ações sugeridas</Label>
                <Textarea
                  value={newClient.recommendedActionsText}
                  onChange={(event) =>
                    setNewClient((current) => ({ ...current, recommendedActionsText: event.target.value }))
                  }
                  placeholder="Formato: problema | ação | responsável"
                  className="min-h-[220px] rounded-2xl bg-white"
                />
              </div>
            ) : null}

            {editingSection === 'notes' ? (
              <div className="space-y-2">
                <Label>Observações da equipe</Label>
                <Textarea
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder="Registre observações internas, contexto e próximos passos."
                  className="min-h-[220px] rounded-2xl bg-white"
                />
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-2xl" onClick={closeClientForm}>
              Cancelar
            </Button>
            <Button className="rounded-2xl" onClick={editingSection === 'notes' ? saveNotes : saveClient}>
              <Plus className="mr-2 h-4 w-4" />
              {editingSection === 'overview'
                ? editingClientId
                  ? 'Salvar visão geral'
                  : 'Adicionar cliente'
                : editingSection === 'diagnostic'
                  ? 'Salvar plano de ação'
                  : editingSection === 'history'
                    ? 'Salvar histórico'
                    : editingSection === 'actions'
                      ? 'Salvar ações'
                      : 'Salvar notas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCrmPickerOpen} onOpenChange={setIsCrmPickerOpen}>
        <DialogContent className="sm:max-w-5xl rounded-[1.8rem] border-border bg-white shadow-[0_30px_90px_rgba(24,17,14,0.18)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Selecionar cliente do CRM</DialogTitle>
            <DialogDescription>
              Busque clientes já cadastrados no CRM e traga o registro real para o painel de crise.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Buscar no CRM</Label>
                <Input
                  value={crmSearchTerm}
                  onChange={(event) => setCrmSearchTerm(event.target.value)}
                  placeholder="Nome, clínica ou plano"
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Status do CRM</Label>
                <Select value={crmStatusFilter} onValueChange={setCrmStatusFilter}>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                <SelectItem value="todos">Todos os estados</SelectItem>
                    <SelectItem value="novo_cliente">Novo cliente</SelectItem>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="pausado">Pausado</SelectItem>
                    <SelectItem value="encerrado">Encerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Equipe</Label>
                <Select value={crmTeamFilter} onValueChange={setCrmTeamFilter}>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas as equipes</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.name}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-3xl border border-border bg-surface p-4 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Como funciona</p>
                <p className="mt-2 leading-6">
                  O módulo só puxa clientes já existentes no CRM. Você filtra, escolhe o cliente e ele entra no painel de crise com dados derivados do cadastro real.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Clientes do CRM</p>
                  <p className="text-xs text-muted-foreground">
                    {crmFilteredClients.length} resultado(s) disponível(is)
                  </p>
                </div>
                {crmClientsLoading ? <p className="text-xs text-muted-foreground">Carregando...</p> : null}
              </div>

              <ScrollArea className="h-[420px] rounded-3xl border border-border bg-surface p-2">
                <div className="space-y-2 p-1">
                  {crmFilteredClients.length === 0 ? (
                    <div className="flex h-40 items-center justify-center rounded-3xl border border-dashed border-border bg-white text-sm text-muted-foreground">
                      Nenhum cliente encontrado com esse filtro.
                    </div>
                  ) : (
                    crmFilteredClients.map((client) => {
                      const teamName = getTeamName(client.team_id, teams);
                      const isSelected = client.id === selectedCrmClientId;

                      return (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => setSelectedCrmClientId(client.id)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-3xl border px-4 py-3 text-left transition-all hover:border-rose-300 hover:bg-white',
                            isSelected ? 'border-rose-300 bg-white shadow-sm' : 'border-border bg-surface',
                          )}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">{client.client_name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {client.clinic_name || 'Clínica não informada'}  •  {teamName}  •  {client.plan || 'Plano não informado'}
                            </p>
                          </div>
                          <div className="ml-4 text-right">
                            <Badge className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', getRiskTone(getRiskBandFromScore(deriveRiskScoreFromOperationalClient(client))))}>
                              {client.status_operacional || 'CRM'}
                            </Badge>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {client.activated_at ? `Ativo desde ${format(new Date(client.activated_at), 'dd/MM/yyyy', { locale: ptBR })}` : 'Sem ativação registrada'}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>

              {selectedCrmClient ? (
                <div className="rounded-3xl border border-border bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{selectedCrmClient.client_name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Será incluído no painel como cliente de crise com base no cadastro do CRM.
                      </p>
                    </div>
                    <Badge className="rounded-full border border-rose-200 bg-rose-50 text-rose-700">
                      Score derivado: {deriveRiskScoreFromOperationalClient(selectedCrmClient)}/5
                    </Badge>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-2xl" onClick={() => setIsCrmPickerOpen(false)}>
              Cancelar
            </Button>
            <Button className="rounded-2xl" onClick={addClientFromCRM} disabled={!selectedCrmClient}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar ao painel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}




