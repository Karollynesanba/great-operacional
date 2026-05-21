import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Download,
  MessageSquare,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  Users,
  Workflow,
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
import { useOperationalClients, type OperationalClient } from '@/hooks/useCRMData';

type RiskBand = 'saudavel' | 'atencao' | 'risco' | 'critico';
type ClientStatus = 'monitorado' | 'atencao' | 'risco' | 'critico' | 'estabilizado';
type Sector = 'Trafego' | 'Criativos' | 'Atendimento' | 'Relacionamento' | 'Comercial';
type FilterOption = 'todos' | RiskBand;

type TimelineEvent = {
  date: string;
  title: string;
  detail: string;
  tone: 'neutral' | 'warning' | 'danger' | 'success';
};

type RiskClient = {
  id: string;
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
    engajamento: number;
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
};

const ACTION_MATRIX = [
  { problem: 'Tráfego caiu', action: 'Revisar campanhas', owner: 'Gestor de tráfego' },
  { problem: 'Atendimento caiu', action: 'Reunião comercial', owner: 'Time comercial' },
  { problem: 'Cliente sumiu', action: 'Acionar relacionamento', owner: 'CS / relacionamento' },
  { problem: 'Criativo saturou', action: 'Criar novos hooks', owner: 'Time criativo' },
  { problem: 'Conversão caiu', action: 'Auditoria de funil', owner: 'Operação / liderança' },
];

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
    score: 52,
    healthScore: {
      trafego: 92,
      criativos: 80,
      atendimento: 41,
      engajamento: 65,
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
    score: 61,
    healthScore: {
      trafego: 74,
      criativos: 66,
      atendimento: 69,
      engajamento: 58,
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
    score: 45,
    healthScore: {
      trafego: 63,
      criativos: 55,
      atendimento: 39,
      engajamento: 44,
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
    score: 58,
    healthScore: {
      trafego: 77,
      criativos: 71,
      atendimento: 52,
      engajamento: 61,
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
      { date: '2024-04-25', title: 'Diagnóstico inicial', detail: 'Conversão comercial abaixo da meta.', tone: 'danger' },
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
    score: 64,
    healthScore: {
      trafego: 79,
      criativos: 61,
      atendimento: 68,
      engajamento: 62,
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

  if (client.churn_status === 'CONFIRMED' || status === 'ENCERRADO') return 28;
  if (status === 'PAUSADO') return 39;
  if (status === 'ONBOARDING') return 58;
  if (status === 'NOVO_CLIENTE') return 63;
  if (stage === 'ATIVO' || status === 'ATIVO') return 72;
  return 55;
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
    name: client.client_name,
    initials,
    sector,
    responsible: teamName,
    team: teamName,
    status,
    riskBand,
    score,
    healthScore: {
      trafego: Math.max(0, Math.min(100, score + 10)),
      criativos: Math.max(0, Math.min(100, score + 5)),
      atendimento: Math.max(0, Math.min(100, score - 8)),
      engajamento: Math.max(0, Math.min(100, score - 3)),
      relacionamento: Math.max(0, Math.min(100, score - 12)),
    },
    activeSince: activeSince.slice(0, 10),
    complaintSince: complaintSince.slice(0, 10),
    activeFor: status === 'critico' ? 'Acompanhar imediatamente' : 'Acompanhamento preventivo',
    cancellationProbability,
    responseTime: status === 'critico' ? '48 min' : status === 'atencao' ? '24 min' : '16 min',
    bottleneck,
    bottleneckOwner: status === 'critico' ? 'Relacionamento' : 'Operação',
    alertSummary:
      status === 'critico'
        ? ['Risco elevado detectado no CRM', 'Cliente merece ação imediata']
        : ['Cliente selecionado do CRM', 'Monitoramento preventivo ativo'],
    metrics: [
      `Status atual: ${client.status_operacional}`,
      client.plan ? `Plano: ${client.plan}` : 'Plano não informado',
      teamName !== 'Sem equipe' ? `Equipe: ${teamName}` : 'Sem equipe vinculada',
    ],
    timeline: [
      {
        date: complaintSince.slice(0, 10),
        title: 'Cliente importado do CRM',
        detail: `Cliente selecionado a partir do cadastro operacional para monitoramento de crise.`,
        tone: status === 'critico' ? 'danger' : 'warning',
      },
    ],
    recommendedActions: [
      {
        problem: status === 'critico' ? 'Relacionamento caiu' : 'Monitoramento preventivo',
        action: status === 'critico' ? 'Acionar relacionamento' : 'Acompanhar sinais no CRM',
        owner: teamName || 'Operação',
      },
    ],
    notes: 'Cliente adicionado a partir do CRM para leitura preventiva de crise.',
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
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  if (score >= 40) return 'bg-rose-500';
  return 'bg-red-600';
}

function ringGradient(score: number) {
  const clamped = Math.max(0, Math.min(100, score));
  const color =
    clamped >= 80
      ? '#16a34a'
      : clamped >= 60
        ? '#f59e0b'
        : clamped >= 40
          ? '#f43f5e'
          : '#dc2626';

  return {
    background: `conic-gradient(${color} ${clamped}%, rgba(229,231,235,0.9) 0)`,
  };
}

function getAverageScore(clients: RiskClient[]) {
  if (clients.length === 0) return 0;
  return Math.round(clients.reduce((sum, client) => sum + client.score, 0) / clients.length);
}

function getRiskBandFromScore(score: number): RiskBand {
  if (score >= 80) return 'saudavel';
  if (score >= 60) return 'atencao';
  if (score >= 40) return 'risco';
  return 'critico';
}

export default function AlertaCrise() {
  const [clients, setClients] = useState<RiskClient[]>(INITIAL_CLIENTS);
  const [selectedClientId, setSelectedClientId] = useState(INITIAL_CLIENTS[0]?.id ?? '');
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
  const [newClient, setNewClient] = useState<NewClientForm>({
    name: '',
    sector: 'Trafego',
    responsible: '',
    team: 'Equipe 7',
    score: '58',
    riskBand: 'atencao',
    bottleneck: '',
    status: 'monitorado',
  });
  const [noteDraft, setNoteDraft] = useState('');

  const { data: crmClients = [], isLoading: crmClientsLoading } = useOperationalClients();
  const { data: teams = [] } = useQuery({
    queryKey: ['alerta-crise-teams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('id, name').order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

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

  const activeActions = useMemo(() => {
    return ACTION_MATRIX;
  }, []);

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
      .filter((client) => !clients.some((item) => item.id === client.id));
  }, [clients, crmClients, crmSearchTerm, crmStatusFilter, crmTeamFilter, teams]);

  const selectedCrmClient = crmFilteredClients.find((client) => client.id === selectedCrmClientId) ?? null;

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

    setClients((current) => [mappedClient, ...current.filter((client) => client.id !== mappedClient.id)]);
    setSelectedClientId(mappedClient.id);
    setNoteDraft(mappedClient.notes);
    setIsCrmPickerOpen(false);
    setCrmSearchTerm('');
    setCrmStatusFilter('todos');
    setCrmTeamFilter('todos');
    setSelectedCrmClientId('');
    toast.success('Cliente do CRM adicionado ao alerta de crise.');
  };

  const sectorBreakdown = useMemo(() => {
    const sectors: Sector[] = ['Trafego', 'Criativos', 'Atendimento', 'Relacionamento', 'Comercial'];
    return sectors.map((sector) => ({
      sector,
      count: clients.filter((client) => client.sector === sector).length,
    }));
  }, [clients]);

  const addClient = () => {
    const score = Number(newClient.score);

    if (!newClient.name.trim()) {
      toast.error('Informe o nome do cliente.');
      return;
    }

    if (Number.isNaN(score) || score < 0 || score > 100) {
      toast.error('O score precisa estar entre 0 e 100.');
      return;
    }

    const createdClient: RiskClient = {
      id: crypto.randomUUID(),
      name: newClient.name.trim(),
      initials: newClient.name
        .split(' ')
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'GC',
      sector: newClient.sector,
      responsible: newClient.responsible.trim() || 'Equipe',
      team: newClient.team.trim() || 'Equipe 7',
      status: newClient.status,
      riskBand: newClient.riskBand,
      score,
      healthScore: {
        trafego: Math.max(0, Math.min(100, score + 12)),
        criativos: Math.max(0, Math.min(100, score + 5)),
        atendimento: Math.max(0, Math.min(100, score - 7)),
        engajamento: Math.max(0, Math.min(100, score - 2)),
        relacionamento: Math.max(0, Math.min(100, score - 12)),
      },
      activeSince: new Date().toISOString().slice(0, 10),
      complaintSince: new Date().toISOString().slice(0, 10),
      activeFor: 'Novo acompanhamento',
      cancellationProbability: score <= 40 ? 88 : score <= 60 ? 62 : 28,
      responseTime: score <= 40 ? '46 min' : '18 min',
      bottleneck: newClient.bottleneck.trim() || 'Em monitoramento',
      bottleneckOwner: newClient.responsible.trim() || 'Operação',
      alertSummary: [newClient.bottleneck.trim() || 'Monitoramento ativo'],
      metrics: ['Cliente adicionado manualmente ao alerta', 'Acompanhamento preventivo ativo'],
      timeline: [
        {
          date: new Date().toISOString().slice(0, 10),
          title: 'Cliente adicionado ao monitoramento',
          detail: 'Entrada manual realizada pela equipe.',
          tone: 'success',
        },
      ],
      recommendedActions: [
        {
          problem: newClient.bottleneck.trim() || 'Monitoramento preventivo',
          action: 'Acompanhar diariamente',
          owner: newClient.responsible.trim() || 'Operação',
        },
      ],
      notes: 'Cliente incluído manualmente no sistema de crise.',
    };

    setClients((current) => [createdClient, ...current]);
    setSelectedClientId(createdClient.id);
    setNoteDraft(createdClient.notes);
    setIsAddOpen(false);
    setNewClient({
      name: '',
      sector: 'Trafego',
      responsible: '',
      team: 'Equipe 7',
      score: '58',
      riskBand: 'atencao',
      bottleneck: '',
      status: 'monitorado',
    });
    toast.success('Cliente adicionado ao sistema de alerta.');
  };

  const removeClient = (clientId: string) => {
    setClients((current) => current.filter((client) => client.id !== clientId));
    if (selectedClientId === clientId) {
      const remaining = clients.filter((client) => client.id !== clientId);
      setSelectedClientId(remaining[0]?.id ?? '');
      setNoteDraft(remaining[0]?.notes ?? '');
    }
    toast.success('Cliente removido do monitoramento.');
  };

  const updateClientStatus = (clientId: string, status: ClientStatus) => {
    setClients((current) =>
      current.map((client) => (client.id === clientId ? { ...client, status } : client)),
    );
    toast.success('Status atualizado.');
  };

  const saveNotes = () => {
    if (!selectedClient) return;

    setClients((current) =>
      current.map((client) =>
        client.id === selectedClient.id
          ? {
              ...client,
              notes: noteDraft,
              timeline: [
                {
                  date: new Date().toISOString().slice(0, 10),
                  title: 'Nova observação adicionada',
                  detail: noteDraft.trim() || 'Observação salva pela equipe.',
                  tone: 'neutral',
                },
                ...client.timeline,
              ],
            }
          : client,
      ),
    );
    toast.success('Observação salva.');
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
          { label: 'Saúde média geral', value: `${avgScore}/100`, icon: BarChart3, tone: 'text-foreground' },
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
                <button
                  key={client.id}
                  type="button"
                  onClick={() => setSelectedClientId(client.id)}
                  className={cn(
                    'min-w-[260px] rounded-[1.7rem] border bg-surface/90 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(225,6,0,0.08)]',
                    selectedClientId === client.id
                      ? 'border-rose-300 bg-white shadow-[0_18px_45px_rgba(225,6,0,0.1)]'
                      : 'border-border',
                  )}
                >
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
                      <p className="text-xs text-muted-foreground">Score de saúde</p>
                      <p className="mt-1 text-2xl font-black tracking-tight">{client.score}/100</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>Risco de cancelamento</p>
                      <p className="mt-1 text-base font-semibold text-foreground">{client.cancellationProbability}%</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-border/70 bg-white/90 shadow-[0_20px_60px_rgba(24,17,14,0.06)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Filtros de leitura</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajuste a visão por período, risco, setor, responsável e status.
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
                <SelectItem value="Amanda">Amanda</SelectItem>
                <SelectItem value="Brayton">Brayton</SelectItem>
                <SelectItem value="Gerson">Gerson</SelectItem>
                <SelectItem value="Matheus">Matheus</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
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
                Diagnóstico completo, linha do tempo e ações sugeridas.
              </p>
            </div>

            <Button variant="outline" className="rounded-2xl bg-white/80" onClick={() => selectedClient && removeClient(selectedClient.id)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Remover cliente
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
                      Cliente desde {format(new Date(selectedClient.activeSince), 'dd/MM/yyyy', { locale: ptBR })} • Ativo há {selectedClient.activeFor}
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
                      <SelectValue placeholder="Alterar status" />
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
                    Diagnóstico
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
                  <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                    <Card className="border-border/70 bg-surface shadow-sm">
                      <CardContent className="flex h-full flex-col justify-between p-5">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-muted-foreground">Score de saúde</p>
                          <Badge className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', getRiskTone(selectedClient.riskBand))}>
                            {selectedClient.score >= 80 ? 'Saúde boa' : selectedClient.score >= 60 ? 'Saúde atenção' : 'Saúde ruim'}
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
                                <p className="text-sm text-muted-foreground">/100</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex-1 space-y-3">
                            {Object.entries(selectedClient.healthScore).map(([key, value]) => (
                              <div key={key}>
                                <div className="mb-1 flex items-center justify-between text-sm">
                                  <span className="capitalize text-muted-foreground">{key}</span>
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
                  <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                    <Card className="border-border/70 bg-surface">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Onde está o gargalo</p>
                            <p className="mt-2 text-2xl font-black tracking-tight text-foreground">{selectedClient.bottleneck}</p>
                          </div>
                          <Target className="h-6 w-6 text-rose-500" />
                        </div>

                        <Separator className="my-4" />

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Setor responsável</span>
                            <span className="font-semibold text-foreground">{selectedClient.bottleneckOwner}</span>
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
                        <CardTitle className="text-base">Conclusão automática</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5">
                          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-700">
                            Leitura operacional
                          </p>
                          <p className="mt-3 text-base leading-7 text-rose-900">
                            O problema principal não está em tráfego. Os leads estão chegando, mas o gargalo está em {selectedClient.bottleneck.toLowerCase()}.
                          </p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          {selectedClient.metrics.map((metric) => (
                            <div key={metric} className="rounded-2xl border border-border bg-white p-4">
                              <p className="text-sm font-medium text-foreground">{metric}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="historico" className="mt-0">
                  <Card className="border-border/70 bg-surface">
                    <CardContent className="p-5">
                      <ScrollArea className="h-[320px] pr-4">
                        <div className="space-y-5">
                          {selectedClient.timeline.map((event, index) => (
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
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="acoes" className="mt-0">
                  <Card className="border-border/70 bg-surface">
                    <CardContent className="p-5">
                      <div className="overflow-hidden rounded-3xl border border-border bg-white">
                        <div className="grid grid-cols-3 border-b border-border bg-surface px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          <span>Problema</span>
                          <span>Ação</span>
                          <span>Responsável</span>
                        </div>
                        <div className="divide-y divide-border">
                          {selectedClient.recommendedActions.map((action) => (
                            <div key={`${action.problem}-${action.action}`} className="grid grid-cols-3 gap-3 px-4 py-4 text-sm">
                              <span className="font-medium text-foreground">{action.problem}</span>
                              <span className="text-muted-foreground">{action.action}</span>
                              <span className="text-muted-foreground">{action.owner}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        {activeActions.map((action) => (
                          <div key={action.problem} className="rounded-2xl border border-border bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-foreground">{action.problem}</p>
                                <p className="mt-1 text-sm text-muted-foreground">{action.owner}</p>
                              </div>
                              <Workflow className="h-5 w-5 text-rose-500" />
                            </div>
                            <p className="mt-3 text-sm font-medium text-rose-700">{action.action}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="notas" className="mt-0">
                  <Card className="border-border/70 bg-surface">
                    <CardContent className="space-y-4 p-5">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">Observações da equipe</Label>
                        <Textarea
                          value={noteDraft}
                          onChange={(event) => setNoteDraft(event.target.value)}
                          className="min-h-[170px] rounded-2xl bg-white"
                          placeholder="Registre aqui mudanças de comportamento, sinais de risco e próximas ações."
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <Button className="rounded-2xl" onClick={saveNotes}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Salvar observação
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-2xl"
                          onClick={() => setNoteDraft(selectedClient.notes)}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Restaurar
                        </Button>
                      </div>
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
              <CardTitle className="text-base">Sinais por setor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sectorBreakdown.map((item) => (
                <div key={item.sector}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{item.sector}</span>
                    <span className="text-muted-foreground">{item.count} clientes</span>
                  </div>
                  <Progress value={clients.length ? (item.count / clients.length) * 100 : 0} className="h-2 rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="card-hover border-border/70 bg-white/90 shadow-[0_20px_60px_rgba(24,17,14,0.06)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ações automáticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ACTION_MATRIX.map((item) => (
                <div key={item.problem} className="rounded-2xl border border-border bg-surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-foreground">{item.problem}</p>
                    <TrendingDown className="h-4 w-4 text-rose-500" />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.action}</p>
                  <p className="mt-1 text-xs font-medium text-rose-700">{item.owner}</p>
                </div>
              ))}
            </CardContent>
          </Card>

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
                    <SelectItem value="todos">Todos os status</SelectItem>
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
                              {client.clinic_name || 'Clínica não informada'} • {teamName} • {client.plan || 'Plano não informado'}
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
                      Score derivado: {deriveRiskScoreFromOperationalClient(selectedCrmClient)}/100
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
