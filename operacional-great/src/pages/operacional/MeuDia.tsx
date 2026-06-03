import { useState, useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Plus,
  Sun,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  Calendar,
  Video,
  Trash2,
  Target,
  Pencil,
  Loader2,
  RefreshCw,
  AlarmClock,
  Users,
  Eye,
  BarChart3,
  CheckCheck,
  UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserMultiSelect } from '@/components/operacional/UserMultiSelect';
import { useDeadlineNotifications } from '@/hooks/useDeadlineNotifications';
import { DeadlineAlarmAlert } from '@/components/notifications/DeadlineAlarmAlert';
import { getTaskTransferText } from '@/lib/taskTransfer';
import { getLocalDateString } from '@/lib/utils';
import { isLocalDataFallbackEnabled } from '@/lib/runtimeFlags';
import {
  appendOfflineItem,
  filterOfflineCollection,
  readOfflineCollection,
  removeOfflineItem,
  updateOfflineItem,
  writeOfflineCollection,
} from '@/lib/offlineStore';
interface MyDayItem {
  id: string;
  user_id?: string | null;
  assigned_to_user_id?: string | null;
  assigned_by_user_id?: string | null;
  title: string;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO';
  priority: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  source: 'WORKITEM' | 'WORK_ITEM' | 'MEETING' | 'MANUAL' | 'PERMANENT';
  source_id?: string;
  assignee_user_ids?: string[];
  origin_reporter_user_id?: string | null;
  origin_reporter_name?: string | null;
  deadline_time?: string | null;
  deadline_date?: string | null;
  completed_at?: string | null;
  date?: string;
  created_at?: string;
}

interface MyDayItemExclusion {
  id: string;
  user_id: string;
  item_date: string;
  source: MyDayItem['source'];
  source_id: string;
  title: string;
  created_by_user_id: string | null;
  created_at: string;
}

type AssignedActivitiesFilter = 'ALL' | 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO';

interface AssignedActivityItem extends MyDayItem {
  responsible_name: string;
  responsible_email: string | null;
  assigned_by_name: string;
}

const MY_DAY_OFFLINE_SCOPE = 'my-day-items';
const MY_DAY_EXCLUSIONS_SCOPE = 'my-day-item-exclusions';
const MY_DAY_REPORTED_OFFLINE_SCOPE = 'my-day-reported-items';

function getMyDayBucket(userId: string) {
  return userId;
}

function readMyDayOffline(userId: string) {
  return readOfflineCollection<MyDayItem>(MY_DAY_OFFLINE_SCOPE, getMyDayBucket(userId));
}

function upsertMyDayOffline(userId: string, item: MyDayItem) {
  appendOfflineItem(MY_DAY_OFFLINE_SCOPE, item, getMyDayBucket(userId));
}

function readMyDayExclusionsOffline(userId: string) {
  return readOfflineCollection<MyDayItemExclusion>(MY_DAY_EXCLUSIONS_SCOPE, getMyDayBucket(userId));
}

function addMyDayExclusionOffline(userId: string, exclusion: MyDayItemExclusion) {
  appendOfflineItem(MY_DAY_EXCLUSIONS_SCOPE, exclusion, getMyDayBucket(userId));
}

function readReportedMyDayOffline(userId: string) {
  return readOfflineCollection<MyDayItem>(MY_DAY_REPORTED_OFFLINE_SCOPE, getMyDayBucket(userId));
}

function upsertReportedMyDayOffline(userId: string, item: MyDayItem) {
  appendOfflineItem(MY_DAY_REPORTED_OFFLINE_SCOPE, item, getMyDayBucket(userId));
}

type TaskSource = 'MANUAL' | 'PERMANENT';

interface PermanentActivity {
  id: string;
  title: string;
  priority: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  deadline?: string;
  onlyMonday?: boolean;
  days?: number[]; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
}

const priorityColors: Record<string, string> = {
  'BAIXA': 'bg-surface-2 text-muted-foreground border-border',
  'MEDIA': 'bg-info/10 text-info border-info/20',
  'ALTA': 'bg-warning/10 text-warning border-warning/20',
  'URGENTE': 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusIcons = {
  'PENDENTE': Circle,
  'EM_ANDAMENTO': Clock,
  'CONCLUIDO': CheckCircle2,
};

const ASSIGNED_ACTIVITY_FILTER_LABELS: Record<AssignedActivitiesFilter, string> = {
  ALL: 'Todas',
  PENDENTE: 'Pendentes',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluídas',
};

const ASSIGNED_ACTIVITY_STATUS_LABELS: Record<MyDayItem['status'], string> = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluída',
};

// Permanent daily activities for traffic managers (GESTOR)
const GESTOR_PERMANENT_ACTIVITIES: PermanentActivity[] = [
  { id: 'perm-ativar-grupos', title: 'Ativar grupos – Ver e responder mensagens', priority: 'ALTA', deadline: '12:00' },
  { id: 'perm-conferir-grupo-clientes', title: 'Conferir grupo de clientes – Ver status geral / Identificar problemas', priority: 'ALTA', deadline: '09:00' },
  { id: 'perm-otimizar-campanhas', title: 'Otimizar campanhas – Ajustar anúncios / Pausar o que não performa', priority: 'ALTA', deadline: '15:00' },
  { id: 'perm-atualizar-sistema', title: 'Atualizar sistema/planilha – Atualizar status / Registrar ações', priority: 'ALTA', deadline: '17:00' },
];

// Permanent daily activities for Cleriston (Gestor de Onboarding)
const CLERISTON_USER_ID = '44c3f442-d2bd-4419-ae9c-cc92241c1ac3';
const GESTOR_ONBOARDING_PERMANENT_ACTIVITIES: PermanentActivity[] = [
  { id: 'perm-ver-novos-clientes', title: 'Ver novos clientes', priority: 'ALTA', deadline: '09:00' },
  { id: 'perm-agendar-reunioes', title: 'Agendar reuniões', priority: 'ALTA', deadline: '10:00' },
  { id: 'perm-atualizar-sistema-onb', title: 'Atualizar sistema – Marcar status e progresso', priority: 'ALTA', deadline: '17:00' },
];

// Permanent daily activities for Matheus (Equipe Design)
const MATHEUS_USER_ID = '6c17a6a3-bc92-4c0f-9781-efd559a20833';
const DESIGN_PERMANENT_ACTIVITIES: PermanentActivity[] = [
  { id: 'perm-ver-demandas', title: 'Ver demandas', priority: 'ALTA', deadline: '09:00' },
  { id: 'perm-produzir-criativos', title: 'Produzir criativos', priority: 'ALTA', deadline: '18:00' },
  { id: 'perm-ajustar-criativos', title: 'Ajustar criativos', priority: 'ALTA', deadline: '18:00' },
];

// Permanent daily activities for editor de vídeo
const EDITOR_VIDEO_PERMANENT_ACTIVITIES: PermanentActivity[] = [
  { id: 'perm-ver-demandas', title: 'Ver demandas', priority: 'ALTA', deadline: '09:00' },
  { id: 'perm-adicionar-criativos', title: 'Adicionar criativos', priority: 'ALTA', deadline: '12:00' },
  { id: 'perm-criar-roteiros', title: 'Criar roteiros', priority: 'ALTA', deadline: '18:00', onlyMonday: true },
  { id: 'perm-editar-videos', title: 'Editar vídeos', priority: 'ALTA', deadline: '18:00' },
];

// Permanent weekly activities for Gerson (Atendente)
const GERSON_USER_ID = '615ce33b-79f6-4aed-8be1-588bc7a6d878';
const GERSON_PERMANENT_ACTIVITIES: PermanentActivity[] = [
  // Segunda (1)
  { id: 'perm-gerson-seg-responder', title: 'RESPONDER TODOS ATÉ ÁS 11:00', priority: 'ALTA', deadline: '11:00', days: [1] },
  { id: 'perm-gerson-seg-recontato', title: 'RECONTATO ATÉ AS 15H', priority: 'ALTA', deadline: '15:00', days: [1] },
  { id: 'perm-gerson-seg-planilha', title: 'PLANILHA ÀS 16H', priority: 'ALTA', deadline: '16:00', days: [1] },
  { id: 'perm-gerson-seg-grupos', title: 'CONFERIR GRUPOS', priority: 'ALTA', deadline: '17:00', days: [1] },
  // Terça (2)
  { id: 'perm-gerson-ter-responder', title: 'RESPONDER TODOS ATÉ AS 11H', priority: 'ALTA', deadline: '11:00', days: [2] },
  { id: 'perm-gerson-ter-leads', title: 'SOLICITAR LEADS', priority: 'ALTA', deadline: '12:00', days: [2] },
  { id: 'perm-gerson-ter-relatorio', title: 'ENVIAR RELATORIO', priority: 'ALTA', deadline: '14:00', days: [2] },
  { id: 'perm-gerson-ter-recontato', title: 'RECONTATO COM CLIENTES SEM LEADS', priority: 'ALTA', deadline: '15:00', days: [2] },
  { id: 'perm-gerson-ter-planilha', title: 'PLANILHA', priority: 'ALTA', deadline: '16:00', days: [2] },
  { id: 'perm-gerson-ter-grupos', title: 'CONFERIR GRUPOS', priority: 'ALTA', deadline: '17:00', days: [2] },
  // Quarta (3)
  { id: 'perm-gerson-qua-responder', title: 'RESPONDER TODOS ATÉ ÁS 11:00', priority: 'ALTA', deadline: '11:00', days: [3] },
  { id: 'perm-gerson-qua-recontato', title: 'RECONTATO ATÉ AS 15H', priority: 'ALTA', deadline: '15:00', days: [3] },
  { id: 'perm-gerson-qua-ligacao', title: 'LIGAÇÃO', priority: 'ALTA', deadline: '15:00', days: [3] },
  { id: 'perm-gerson-qua-planilha', title: 'PLANILHA ÀS 16H', priority: 'ALTA', deadline: '16:00', days: [3] },
  { id: 'perm-gerson-qua-grupos', title: 'CONFERIR GRUPOS', priority: 'ALTA', deadline: '17:00', days: [3] },
  // Quinta (4)
  { id: 'perm-gerson-qui-responder', title: 'RESPONDER TODOS ATÉ ÁS 11:00', priority: 'ALTA', deadline: '11:00', days: [4] },
  { id: 'perm-gerson-qui-organizar', title: 'ORGANIZAR TODAS AS PLANILHAS E AGENDA DURANTE O DIA', priority: 'ALTA', deadline: '17:00', days: [4] },
  { id: 'perm-gerson-qui-feedback', title: 'MANDAR FEEDBACK DE CADA CLIENTE', priority: 'ALTA', deadline: '14:00', days: [4] },
  { id: 'perm-gerson-qui-planilha', title: 'PLANILHA ÀS 16H', priority: 'ALTA', deadline: '16:00', days: [4] },
  { id: 'perm-gerson-qui-grupos', title: 'CONFERIR GRUPOS', priority: 'ALTA', deadline: '17:00', days: [4] },
  // Sexta (5)
  { id: 'perm-gerson-sex-responder', title: 'RESPONDER TODOS ATÉ ÁS 11:00', priority: 'ALTA', deadline: '11:00', days: [5] },
  { id: 'perm-gerson-sex-recontato', title: 'RECONTATO ATÉ AS 15H', priority: 'ALTA', deadline: '15:00', days: [5] },
  { id: 'perm-gerson-sex-consultor', title: 'VERIFICAR TUDO DO CONSULTOR COMERCIAL', priority: 'ALTA', deadline: '15:00', days: [5] },
  { id: 'perm-gerson-sex-planilha', title: 'PLANILHA ÀS 16H', priority: 'ALTA', deadline: '16:00', days: [5] },
  { id: 'perm-gerson-sex-grupos', title: 'CONFERIR GRUPOS', priority: 'ALTA', deadline: '17:00', days: [5] },
];

// Map of user-specific routines (overrides role-based defaults)
const USER_SPECIFIC_ACTIVITIES: Record<string, PermanentActivity[]> = {
  [CLERISTON_USER_ID]: GESTOR_ONBOARDING_PERMANENT_ACTIVITIES,
  [MATHEUS_USER_ID]: DESIGN_PERMANENT_ACTIVITIES,
  [GERSON_USER_ID]: GERSON_PERMANENT_ACTIVITIES,
};

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeTaskText(value: string) {
  return normalizeName(value).trim().replace(/\s+/g, ' ');
}

function sanitizeDisplayEmail(email?: string | null) {
  if (!email) return null;
  const trimmed = email.trim();
  if (!trimmed) return null;
  const normalized = trimmed.toLowerCase();
  return normalized.includes('+tmp-') ? null : trimmed;
}

function dedupeMyDayItems(items: MyDayItem[]) {
  const deduped = new Map<string, MyDayItem>();

  for (const item of items) {
    const logicalKey = [
      item.user_id || '',
      item.date || '',
      item.source || '',
      item.source_id || '',
      item.title || '',
    ].join('|');

    deduped.set(logicalKey, item);
  }

  return Array.from(deduped.values());
}

function getMyDayItemKey(params: {
  userId: string;
  itemDate: string;
  source: MyDayItem['source'];
  sourceId?: string | null;
  title: string;
}) {
  return [
    params.userId,
    params.itemDate,
    params.source,
    params.sourceId || '',
    normalizeTaskText(params.title),
  ].join('|');
}

function shouldHideFromAssignmentList(profile: { full_name?: string; email?: string | null }) {
  const name = (profile.full_name || '').trim().toLowerCase();
  const email = (profile.email || '').trim().toLowerCase();

  return (
    name.includes('vania') ||
    name === 'ian clark' ||
    name.includes('karollyne') ||
    email === 'ianclark@gmail.com'
  );
}

function formatMyDayDateTime(dateValue?: string | null, timeValue?: string | null) {
  const parts: string[] = [];

  if (dateValue) {
    const [year, month, day] = dateValue.split('-');
    if (year && month && day) {
      parts.push(`${day}/${month}`);
    }
  }

  if (timeValue) {
    const [hours, minutes] = timeValue.split(':');
    if (hours && minutes) {
      parts.push(`${hours}:${minutes}`);
    }
  }

  return parts.join(' ').trim();
}

function formatMyDayCreatedAt(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shouldShowInMeuDiaAssignmentList(profile: { email?: string | null }) {
  const email = (profile.email || '').trim().toLowerCase();
  return email.length > 0 && !shouldHideFromAssignmentList({ email });
}

type SelectableUserRecord = {
  id: string;
  full_name: string;
  email: string | null;
  source: 'profile' | 'auth';
};

function dedupeSelectableUsers(users: SelectableUserRecord[]) {
  const normalizeUserKey = (value?: string | null) => (value || '').trim().toLowerCase();

  const deduped = users.reduce((acc, userRecord) => {
    const key = normalizeUserKey(userRecord.full_name) || userRecord.id;
    const existing = acc.get(key);

    if (!existing) {
      acc.set(key, userRecord);
      return acc;
    }

    const existingHasEmail = Boolean(normalizeUserKey(existing.email));
    const currentHasEmail = Boolean(normalizeUserKey(userRecord.email));
    const existingIsProfile = existing.source === 'profile';
    const currentIsProfile = userRecord.source === 'profile';

    if (!existingHasEmail && currentHasEmail) {
      acc.set(key, userRecord);
      return acc;
    }

    if (existingHasEmail === currentHasEmail && currentIsProfile && !existingIsProfile) {
      acc.set(key, userRecord);
    }

    return acc;
  }, new Map<string, SelectableUserRecord>());

  return Array.from(deduped.values()).sort((left, right) => left.full_name.localeCompare(right.full_name, 'pt-BR'));
}

function buildMyDayRows(params: {
  title: string;
  userIds: string[];
  date: string;
  priority: MyDayItem['priority'];
  source: MyDayItem['source'];
  sourceId: string | null;
  reporterUserId: string;
  reporterName?: string | null;
  deadlineDate?: string | null;
  deadlineTime?: string | null;
}) {
  return params.userIds.map((userId) => ({
    title: params.title,
    user_id: userId,
    assigned_to_user_id: userId,
    date: params.date,
    status: 'PENDENTE' as const,
    priority: params.priority,
    source: params.source,
    source_id: params.sourceId,
    origin_reporter_user_id: params.reporterUserId,
    assigned_by_user_id: params.reporterUserId,
    deadline_date: params.deadlineDate ?? null,
    deadline_time: params.deadlineTime ?? null,
    deadline_notified: false,
  }));
}

async function persistMyDayAssignments(params: {
  title: string;
  userIds: string[];
  date: string;
  priority: MyDayItem['priority'];
  source: MyDayItem['source'];
  sourceId: string | null;
  reporterUserId: string;
  reporterName?: string | null;
  deadlineDate?: string | null;
  deadlineTime?: string | null;
}) {
  const payload = buildMyDayRows(params);
  try {
    const { data, error } = await supabase.functions.invoke('sync-my-day-items', {
      body: {
        items: payload,
        reporter_user_id: params.reporterUserId,
      },
    });

    if (error) throw error;

    const rows = Array.isArray(data?.items) ? data.items : Array.isArray(data?.rows) ? data.rows : [];
    if (rows.length > 0) {
      return rows as Array<{
        id: string;
        title: string;
        status: MyDayItem['status'];
        priority: MyDayItem['priority'];
        source: MyDayItem['source'];
        source_id: string | null;
        user_id?: string | null;
      }>;
    }
  } catch (functionError) {
    console.warn('sync-my-day-items function failed, falling back to direct upsert:', functionError);
  }

  const { data, error } = await supabase
    .from('my_day_items')
    .upsert(payload, {
      onConflict: 'user_id,date,source,source_id,title',
    })
    .select();

  if (error) throw error;

  return (data || []) as Array<{
    id: string;
    title: string;
    status: MyDayItem['status'];
    priority: MyDayItem['priority'];
    source: MyDayItem['source'];
    source_id: string | null;
    user_id?: string | null;
  }>;
}

async function loadMyDayExclusions(targetUserId: string, today: string) {
  try {
    const { data, error } = await supabase
      .from('my_day_item_exclusions')
      .select('user_id, item_date, source, source_id, title, created_by_user_id, created_at')
      .eq('user_id', targetUserId)
      .eq('item_date', today);

    if (error) throw error;
    return (data || []) as MyDayItemExclusion[];
  } catch {
    return readMyDayExclusionsOffline(targetUserId).filter((item) => item.item_date === today);
  }
}

export default function MeuDia() {
  const { user, isAdmin, users } = useAuth();
  const allowLocalFallback = isLocalDataFallbackEnabled();
  const [items, setItems] = useState<MyDayItem[]>([]);
  const [assignedActivities, setAssignedActivities] = useState<AssignedActivityItem[]>([]);
  const [assignedActivitiesLoading, setAssignedActivitiesLoading] = useState(true);
  const [assignedActivitiesFilter, setAssignedActivitiesFilter] = useState<AssignedActivitiesFilter>('ALL');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemPriority, setNewItemPriority] = useState<'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE'>('MEDIA');
  const [newItemSource, setNewItemSource] = useState<TaskSource>('MANUAL');
  const [newItemDeadlineMode, setNewItemDeadlineMode] = useState<'SEM_PRAZO' | 'ESPECIFICO'>('SEM_PRAZO');
  const [newItemDeadline, setNewItemDeadline] = useState<string>('');
  const [newItemDeadlineDate, setNewItemDeadlineDate] = useState<string>('');
  const [newItemAssigneeIds, setNewItemAssigneeIds] = useState<string[]>([]);
  const [newItemAssignToOtherPerson, setNewItemAssignToOtherPerson] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const addItemLockRef = useRef(false);
  const [userProfile, setUserProfile] = useState<{ operational_role: string | null; team_id?: string | null } | null | undefined>(undefined);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // User filter state (for admins/coordinators)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<{ id: string; full_name: string; email?: string | null }[]>([]);
  
  // Edit dialog state
  const [editingItem, setEditingItem] = useState<MyDayItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE'>('MEDIA');
  const [editStatus, setEditStatus] = useState<'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO'>('PENDENTE');
  const [editDeadlineMode, setEditDeadlineMode] = useState<'SEM_PRAZO' | 'ESPECIFICO'>('SEM_PRAZO');
  const [editDeadline, setEditDeadline] = useState<string>('');
  const [editDeadlineDate, setEditDeadlineDate] = useState<string>('');
  
  // Delete confirmation state
  const [itemToDelete, setItemToDelete] = useState<MyDayItem | null>(null);
  const [assignedActivityToDelete, setAssignedActivityToDelete] = useState<AssignedActivityItem | null>(null);

  // Admin view toggle
  const [adminView, setAdminView] = useState<'dia' | 'panorama'>('dia');

  // Admin panorama state
  interface TeamPanorama {
    id: string;
    name: string;
    totalTasks: number;
    completedTasks: number;
    activeClients: number;
    members: string[];
  }
  const [panorama, setPanorama] = useState<TeamPanorama[]>([]);
  const [panoramaLoading, setPanoramaLoading] = useState(false);

  const {
    activeAlarms,
    isAlarmPlaying,
    stopAlarm,
    setCustomAlarmSound,
    clearCustomAlarmSound,
  } = useDeadlineNotifications();

  // Check if user is a traffic manager (GESTOR) or Coordinator
  const isGestor = userProfile?.operational_role === 'GESTOR';
  const isEditorVideo = userProfile?.operational_role === 'EDITOR_VIDEO';
  const canViewOtherUsers = true;
  const canManageOtherUsers = true;
  const selectedDayUserName = selectedUserId
    ? allUsers.find((u) => u.id === selectedUserId)?.full_name || 'Usuário'
    : 'Meu Dia';
  
  // The user whose "Meu Dia" we're viewing
  const viewingUserId = selectedUserId || user?.id;
  const isViewingOwnDay = !selectedUserId || selectedUserId === user?.id;
  const visibleUsers = allUsers;
  const assignableUsers = isAdmin ? visibleUsers : allUsers;

  const assignedActivitySummary = useMemo(() => {
    const totals = assignedActivities.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status === 'PENDENTE') acc.pending += 1;
        if (item.status === 'EM_ANDAMENTO') acc.inProgress += 1;
        if (item.status === 'CONCLUIDO') acc.completed += 1;
        return acc;
      },
      { total: 0, pending: 0, inProgress: 0, completed: 0 },
    );

    return totals;
  }, [assignedActivities]);

  const filteredAssignedActivities = useMemo(() => {
    return assignedActivities.filter((item) => {
      if (assignedActivitiesFilter === 'ALL') return true;
      return item.status === assignedActivitiesFilter;
    });
  }, [assignedActivities, assignedActivitiesFilter]);

  const openAddDialog = () => {
    setNewItemAssigneeIds([]);
    setNewItemAssignToOtherPerson(false);
    setNewItemDeadlineMode('SEM_PRAZO');
    setNewItemDeadline('');
    setNewItemDeadlineDate('');
    setIsAddDialogOpen(true);
  };

  const handleAssigneeSelectionChange = (value: string[]) => {
    setNewItemAssigneeIds(value);
    setNewItemAssignToOtherPerson(value.length > 0);
  };

  useEffect(() => {
    if (!isAdmin || !selectedUserId) return;
    const stillVisible = visibleUsers.some((member) => member.id === selectedUserId);
    if (!stillVisible) {
      setSelectedUserId(null);
    }
  }, [isAdmin, selectedUserId, visibleUsers]);

  // Fetch user profile to check role
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('operational_role, team_id')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;

        setUserProfile(data ?? { operational_role: null, team_id: null });
      } catch (error) {
        console.warn('Could not load current profile for Meu Dia:', error);
        setUserProfile({ operational_role: null, team_id: null });
      }
    };
    fetchProfile();
  }, [user]);
  
  // Load the selectable users directly from Supabase profiles so the list
  // matches what is actually registered in the database.
  useEffect(() => {
    let isMounted = true;

    const loadProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, is_active')
          .order('full_name', { ascending: true });

        if (error) {
          throw error;
        }

        const mergeUsers: SelectableUserRecord[] = [
          ...(data || [])
            .filter((profile: any) => profile.is_active !== false)
            .filter((profile: any) => !shouldHideFromAssignmentList(profile))
            .filter((profile: any) => shouldShowInMeuDiaAssignmentList(profile))
            .map((profile: any) => ({
              id: profile.id,
              full_name: profile.full_name || profile.email || 'Usuário',
              email: sanitizeDisplayEmail(profile.email),
              source: 'profile' as const,
            })),
          ...users
            .filter((member) => member.active)
            .filter((member) => !shouldHideFromAssignmentList({ full_name: member.name, email: member.email }))
            .filter((member) => shouldShowInMeuDiaAssignmentList({ email: member.email }))
            .map((member) => ({
              id: member.id,
              full_name: member.name,
              email: sanitizeDisplayEmail(member.email),
              source: 'auth' as const,
            })),
        ];

        const mappedUsers = dedupeSelectableUsers(mergeUsers);

        if (isMounted) {
          setAllUsers(mappedUsers);
        }
      } catch (error) {
        console.error('Erro ao carregar perfis para atribuição de tarefas:', error);

        if (!isMounted) return;

        setAllUsers(
          dedupeSelectableUsers(
            users
              .filter((member) => member.active)
              .filter((member) => !shouldHideFromAssignmentList({ full_name: member.name, email: member.email }))
              .filter((member) => shouldShowInMeuDiaAssignmentList({ email: member.email }))
              .map((member) => ({
                id: member.id,
                full_name: member.name,
                email: sanitizeDisplayEmail(member.email),
                source: 'auth' as const,
              })),
          ),
        );
      }
    };

    void loadProfiles();

    return () => {
      isMounted = false;
    };
  }, [users]);

  // Fetch panorama data (admin sees all teams, regular user sees only own team)
  useEffect(() => {
    if (userProfile === undefined) return;
    const fetchPanorama = async () => {
      if (!isAdmin) {
        setPanorama([]);
        setPanoramaLoading(false);
        return;
      }
      setPanoramaLoading(true);
      try {
        const DEFAULT_TEAMS = [
          { id: '0469e3aa-5b34-42e2-b89d-f412efaa27ba', name: 'Equipe 7' },
          { id: '38c9028d-856d-481e-95c9-bb2eb8b459f5', name: 'Tropa de Elite' },
        ];

        const { data: dbTeams } = await supabase.from('teams').select('id, name');
        const teams = (dbTeams && dbTeams.length > 0 ? dbTeams : DEFAULT_TEAMS) as { id: string; name: string }[];

        if (teams.length === 0) {
          setPanorama([]);
          return;
        }

        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const { data: allItems } = await supabase
          .from('my_day_items')
          .select('user_id, status')
          .eq('date', today);

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, team_id');

        const { data: clients } = await supabase
          .from('operational_clients')
          .select('team_id, status_operacional');

        const result: TeamPanorama[] = teams.map((team) => {
          const teamProfiles = (profiles || []).filter((p: any) => p.team_id === team.id);
          const memberIds = new Set(teamProfiles.map((p: any) => p.id));
          const teamItems = (allItems || []).filter((i: any) => memberIds.has(i.user_id));
          const activeClients = (clients || []).filter(
            (c: any) => c.team_id === team.id && c.status_operacional === 'ATIVO'
          ).length;

          return {
            id: team.id,
            name: team.name,
            totalTasks: teamItems.length,
            completedTasks: teamItems.filter((i: any) => i.status === 'CONCLUIDO').length,
            activeClients,
            members: teamProfiles.map((p: any) => p.full_name),
          };
        });

        setPanorama(result);
      } finally {
        setPanoramaLoading(false);
      }
    };
    fetchPanorama();
  }, [isAdmin, userProfile]);

  // Guard to prevent concurrent ensurePermanentActivities calls (use ref for reliable closure)
  const permanentEnsuredRef = useRef<Set<string>>(new Set());

  // Ensure permanent activities exist for today (GESTOR defaults only)
  const ensurePermanentActivities = async (targetUserId: string) => {
    if (!targetUserId) return;
    
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const cacheKey = `${targetUserId}_${today}`;
    
    // Skip if already ensured for this user+date combo
    if (permanentEnsuredRef.current.has(cacheKey)) return;

    // Mark immediately to block concurrent calls before any await
    permanentEnsuredRef.current.add(cacheKey);

      // Check if the TARGET user is a GESTOR or Editor de Vídeo
      let targetIsGestor = false;
      let targetIsEditorVideo = false;
      if (targetUserId === user?.id) {
        targetIsGestor = isGestor;
        targetIsEditorVideo = isEditorVideo;
      } else {
        const { data: targetProfile, error: targetProfileError } = await supabase
          .from('profiles')
          .select('operational_role')
          .eq('id', targetUserId)
        .maybeSingle();

        if (targetProfileError) {
          console.warn('Could not resolve target profile for permanent activities:', targetProfileError);
          targetIsGestor = false;
          targetIsEditorVideo = false;
        } else {
          targetIsGestor = targetProfile?.operational_role === 'GESTOR';
          targetIsEditorVideo = targetProfile?.operational_role === 'EDITOR_VIDEO';
        }
      }
      
      // Determine which activities to use:
      // 1. User-specific override (Cleriston, Matheus, etc.)
      // 2. Role-based default (GESTOR)
      // 3. Role-based default (EDITOR_VIDEO)
      // 4. None
      let activitiesToUse: typeof GESTOR_PERMANENT_ACTIVITIES | null = null;
      
      if (USER_SPECIFIC_ACTIVITIES[targetUserId]) {
        activitiesToUse = USER_SPECIFIC_ACTIVITIES[targetUserId];
      } else if (targetIsGestor) {
        activitiesToUse = GESTOR_PERMANENT_ACTIVITIES;
      } else if (targetIsEditorVideo) {
        activitiesToUse = EDITOR_VIDEO_PERMANENT_ACTIVITIES;
      }
    
    if (activitiesToUse) {
      const exclusions = await loadMyDayExclusions(targetUserId, today);
      const excludedTitles = new Set(exclusions.map((item) => normalizeTaskText(item.title)));

      // Check which PERMANENT tasks already exist for today
      const { data: existingToday } = await supabase
        .from('my_day_items')
        .select('title')
        .eq('user_id', targetUserId)
        .eq('date', today)
        .eq('source', 'PERMANENT');
      
      const existingTitles = new Set((existingToday || []).map(t => t.title));
      
      const dayOfWeek = new Date(today + 'T12:00:00').getDay(); // 0=Sun, 1=Mon
      
      for (const activity of activitiesToUse) {
        // Skip Monday-only tasks on other days (legacy support)
        if (activity.onlyMonday && dayOfWeek !== 1) continue;
        // Skip day-specific tasks on wrong days
        if (activity.days && !activity.days.includes(dayOfWeek)) continue;
        if (excludedTitles.has(normalizeTaskText(activity.title))) continue;
        
        if (!existingTitles.has(activity.title)) {
          await supabase
            .from('my_day_items')
            .upsert({
              title: activity.title,
              user_id: targetUserId,
              date: today,
              status: 'PENDENTE',
              priority: activity.priority,
              source: 'PERMANENT',
              deadline_time: activity.deadline,
              deadline_notified: false,
            }, { onConflict: 'user_id,title,date', ignoreDuplicates: true });
        }
      }
    }
  };

  const fetchAssignedActivities = async () => {
    if (!user) return;

    setAssignedActivitiesLoading(true);

    const targetReporterId = user.id;
    const responsibleById = new Map<string, string>(
      allUsers.map((member) => [member.id, member.full_name]),
    );
    const responsibleEmailById = new Map<string, string | null>(
      allUsers.map((member) => [member.id, member.email || null]),
    );

    try {
      const { data: directRows, error: directError } = await supabase
        .from('my_day_items')
        .select('id, user_id, assigned_to_user_id, assigned_by_user_id, title, status, priority, source, source_id, origin_reporter_user_id, origin_reporter_name, deadline_time, deadline_date, completed_at, date, created_at')
        .or(`origin_reporter_user_id.eq.${targetReporterId},assigned_by_user_id.eq.${targetReporterId}`)
        .neq('user_id', targetReporterId)
        .order('created_at', { ascending: false });

      if (directError) throw directError;

      const collected = new Map<string, AssignedActivityItem>();
      const profileLookupIds = new Set<string>();

      (directRows || []).forEach((row: any) => {
        const responsibleId = row.assigned_to_user_id || row.user_id || null;
        if (!responsibleId || responsibleId === targetReporterId) return;
        profileLookupIds.add(responsibleId);
        if (row.assigned_by_user_id) {
          profileLookupIds.add(row.assigned_by_user_id);
        }

        collected.set(row.id, {
          id: row.id,
          user_id: responsibleId,
          assigned_to_user_id: row.assigned_to_user_id || responsibleId,
          assigned_by_user_id: row.assigned_by_user_id || row.origin_reporter_user_id || targetReporterId,
          title: row.title,
          status: row.status,
          priority: row.priority,
          source: row.source,
          source_id: row.source_id || undefined,
          origin_reporter_user_id: row.origin_reporter_user_id || targetReporterId,
          origin_reporter_name: row.origin_reporter_name || user.name || user.email || null,
          deadline_time: row.deadline_time || null,
          deadline_date: row.deadline_date || null,
          completed_at: row.completed_at || null,
          date: row.date || null,
          created_at: row.created_at || null,
          responsible_name: responsibleById.get(responsibleId) || responsibleId,
          responsible_email: responsibleEmailById.get(responsibleId) || null,
          assigned_by_name: row.origin_reporter_name || user.name || user.email || 'Você',
        });
      });

      if (profileLookupIds.size > 0) {
        try {
          const idsToLookup = Array.from(profileLookupIds).filter((profileId) => !responsibleById.has(profileId));
          if (idsToLookup.length > 0) {
            const { data: lookupProfiles, error: lookupError } = await supabase
              .from('profiles')
              .select('id, full_name, email')
              .in('id', idsToLookup);

            if (lookupError) throw lookupError;

            (lookupProfiles || []).forEach((profile: { id: string; full_name: string | null; email: string | null }) => {
              responsibleById.set(profile.id, profile.full_name || profile.email || 'Usuário');
              responsibleEmailById.set(profile.id, profile.email || null);
            });
          }
        } catch (profileLookupError) {
          console.warn('Could not resolve assigned users for Meu Dia:', profileLookupError);
        }
      }

      try {
        const { data: reporterWorkItems, error: reporterWorkItemsError } = await supabase
          .from('work_items')
          .select('id, reporter_user_id')
          .eq('reporter_user_id', targetReporterId)
          .order('created_at', { ascending: false });

        if (reporterWorkItemsError) throw reporterWorkItemsError;

        const workItemIds = (reporterWorkItems || []).map((workItem: { id: string }) => workItem.id);

        if (workItemIds.length > 0) {
          const { data: linkedRows, error: linkedError } = await supabase
            .from('my_day_items')
            .select('id, user_id, assigned_to_user_id, assigned_by_user_id, title, status, priority, source, source_id, origin_reporter_user_id, origin_reporter_name, deadline_time, deadline_date, completed_at, date, created_at')
            .neq('user_id', targetReporterId)
            .in('source_id', workItemIds)
            .order('created_at', { ascending: false });

          if (linkedError) throw linkedError;

          (linkedRows || []).forEach((row: any) => {
            const responsibleId = row.assigned_to_user_id || row.user_id || null;
            if (!responsibleId || responsibleId === targetReporterId) return;
            profileLookupIds.add(responsibleId);
            if (row.assigned_by_user_id) {
              profileLookupIds.add(row.assigned_by_user_id);
            }

            if (!collected.has(row.id)) {
              collected.set(row.id, {
                id: row.id,
                user_id: responsibleId,
                assigned_to_user_id: row.assigned_to_user_id || responsibleId,
                assigned_by_user_id: row.assigned_by_user_id || row.origin_reporter_user_id || targetReporterId,
                title: row.title,
                status: row.status,
                priority: row.priority,
                source: row.source,
                source_id: row.source_id || undefined,
                origin_reporter_user_id: row.origin_reporter_user_id || targetReporterId,
                origin_reporter_name: row.origin_reporter_name || user.name || user.email || null,
                deadline_time: row.deadline_time || null,
                deadline_date: row.deadline_date || null,
                completed_at: row.completed_at || null,
                date: row.date || null,
                created_at: row.created_at || null,
                responsible_name: responsibleById.get(responsibleId) || responsibleId,
                responsible_email: responsibleEmailById.get(responsibleId) || null,
                assigned_by_name: row.origin_reporter_name || user.name || user.email || 'Você',
              });
            }
          });
        }
      } catch (linkedActivitiesError) {
        console.warn('Could not load linked activities for Meu Dia:', linkedActivitiesError);
      }

      const unresolvedProfileIds = Array.from(profileLookupIds).filter((profileId) => !responsibleById.has(profileId));
      if (unresolvedProfileIds.length > 0) {
        try {
          const { data: extraProfiles, error: extraProfilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', unresolvedProfileIds);

          if (extraProfilesError) throw extraProfilesError;

          (extraProfiles || []).forEach((profile: { id: string; full_name: string | null; email: string | null }) => {
            responsibleById.set(profile.id, profile.full_name || profile.email || 'Usuário');
            responsibleEmailById.set(profile.id, profile.email || null);
          });
        } catch (extraProfilesError) {
          console.warn('Could not load extra assigned user profiles for Meu Dia:', extraProfilesError);
        }
      }

      collected.forEach((activity) => {
        const responsibleId = activity.assigned_to_user_id || activity.user_id || null;
        if (responsibleId) {
          activity.responsible_name = responsibleById.get(responsibleId) || activity.responsible_name || responsibleId;
          activity.responsible_email = responsibleEmailById.get(responsibleId) || activity.responsible_email || null;
        }

        const assignedById = activity.assigned_by_user_id || activity.origin_reporter_user_id || null;
        if (assignedById) {
          activity.assigned_by_name = responsibleById.get(assignedById) || activity.assigned_by_name || 'Você';
        }
      });

      const remoteItems = Array.from(collected.values()).sort((left, right) => {
        const leftDate = left.created_at || left.date || '';
        const rightDate = right.created_at || right.date || '';
        return rightDate.localeCompare(leftDate);
      });

      if (allowLocalFallback) {
        const offlineItems = readReportedMyDayOffline(targetReporterId)
          .filter((item) => item.user_id && item.user_id !== targetReporterId)
          .map((item) => ({
            ...item,
            responsible_name: responsibleById.get(item.user_id || '') || item.user_id || 'Usuário',
            responsible_email: responsibleEmailById.get(item.user_id || '') || null,
            assigned_by_name: user.name || user.email || 'Você',
          })) as AssignedActivityItem[];

        setAssignedActivities(dedupeMyDayItems([...remoteItems, ...offlineItems]) as AssignedActivityItem[]);
      } else {
        setAssignedActivities(remoteItems);
      }
    } catch (error) {
      console.error('Error fetching assigned activities:', error);

      if (allowLocalFallback) {
        const targetReporterId = user.id;
        const responsibleById = new Map(
          allUsers.map((member) => [member.id, member.full_name]),
        );
        const offlineItems = readReportedMyDayOffline(targetReporterId)
          .filter((item) => item.user_id && item.user_id !== targetReporterId)
          .map((item) => ({
            ...item,
            responsible_name: responsibleById.get(item.user_id || '') || item.user_id || 'Usuário',
            responsible_email: responsibleEmailById.get(item.user_id || '') || null,
            assigned_by_name: user.name || user.email || 'Você',
          })) as AssignedActivityItem[];

        setAssignedActivities(dedupeMyDayItems(offlineItems) as AssignedActivityItem[]);
      } else {
        setAssignedActivities([]);
      }
    } finally {
      setAssignedActivitiesLoading(false);
    }
  };

  // Fetch items from database
  const fetchItems = async () => {
    if (!user) return;
    
    const targetUserId = viewingUserId || user.id;
    
    try {
      // Ensure permanent activities for the user being viewed
      const targetId = viewingUserId || user.id;
      try {
        await ensurePermanentActivities(targetId);
      } catch (permanentError) {
        console.warn('Permanent activities could not be ensured for this user:', permanentError);
      }
      
      // Use local date to avoid timezone issues
      const today = getLocalDateString();
      let data: MyDayItem[] = [];

      // Carry over: move uncompleted non-permanent tasks from previous days to today
      try {
        const { data: pendingOld, error: carryError } = await supabase
          .from('my_day_items')
          .select('id')
          .eq('user_id', targetUserId)
          .lt('date', today)
          .neq('status', 'CONCLUIDO')
          .neq('source', 'PERMANENT');

        if (carryError) throw carryError;

        if (pendingOld && pendingOld.length > 0) {
          const ids = pendingOld.map(i => i.id);
          const { error: carryUpdateError } = await supabase
            .from('my_day_items')
            .update({ date: today })
            .in('id', ids);
          if (carryUpdateError) throw carryUpdateError;
          console.log(`Carried over ${ids.length} pending tasks to today`);
        }
      } catch (carryError) {
        console.warn('Could not carry over pending tasks:', carryError);
      }

      // Clean up old PERMANENT tasks that were never completed
      // (they regenerate daily, so old copies are just bloat)
      try {
        const { error: cleanupError } = await supabase
          .from('my_day_items')
          .delete()
          .eq('user_id', targetUserId)
          .lt('date', today)
          .eq('source', 'PERMANENT')
          .neq('status', 'CONCLUIDO');
        if (cleanupError) throw cleanupError;
      } catch (cleanupError) {
        console.warn('Could not cleanup old permanent tasks:', cleanupError);
      }
      
      console.log('Fetching my_day_items for user:', targetUserId, 'date:', today);
      
      // Fetch today's tasks
      try {
        const { data: fetchedData, error } = await supabase
          .from('my_day_items')
          .select('*')
          .eq('user_id', targetUserId)
          .eq('date', today)
          .order('created_at', { ascending: true });

        if (error) throw error;
        data = (fetchedData || []) as MyDayItem[];
      } catch (itemsError) {
        console.warn('Could not fetch my_day_items from remote:', itemsError);
      }

      const exclusions = await loadMyDayExclusions(targetUserId, today);
      const exclusionKeys = new Set(
        exclusions.map((exclusion) =>
          getMyDayItemKey({
            userId: exclusion.user_id,
            itemDate: exclusion.item_date,
            source: exclusion.source,
            sourceId: exclusion.source_id,
            title: exclusion.title,
          }),
        ),
      );

      data = (data || []).filter(
        (item) =>
          !exclusionKeys.has(
            getMyDayItemKey({
              userId: item.user_id || targetUserId,
              itemDate: item.date || today,
              source: item.source,
              sourceId: item.source_id || '',
              title: item.title,
            }),
          ),
      );

      const workItemIds = Array.from(
        new Set(
          (data || [])
            .filter((item) => item.source === 'WORK_ITEM' || item.source === 'WORKITEM')
            .map((item) => item.source_id)
            .filter((sourceId): sourceId is string => !!sourceId),
        ),
      );

      const workItemMetaById = new Map<string, { reporter_user_id: string | null; assignee_user_ids: string[] }>();
      const reporterUserIds = new Set<string>();
      if (workItemIds.length > 0) {
        try {
          const { data: workItems, error: workItemsError } = await supabase
            .from('work_items')
            .select('id, reporter_user_id, assignee_user_id, tags')
            .in('id', workItemIds);

          if (workItemsError) throw workItemsError;

          (workItems || []).forEach((workItem: {
            id: string;
            reporter_user_id: string | null;
            assignee_user_id: string | null;
            tags: { assignee_user_ids?: unknown } | null;
          }) => {
            const fromTags = workItem.tags?.assignee_user_ids;
            const assigneeUserIds = Array.isArray(fromTags) && fromTags.length > 0
              ? fromTags.filter(Boolean).map(String)
              : (workItem.assignee_user_id ? [workItem.assignee_user_id] : []);

            workItemMetaById.set(workItem.id, {
              reporter_user_id: workItem.reporter_user_id || null,
              assignee_user_ids: assigneeUserIds,
            });

            if (workItem.reporter_user_id) {
              reporterUserIds.add(workItem.reporter_user_id);
            }
          });
        } catch (workItemsError) {
          console.warn('Could not load work item metadata for Meu Dia:', workItemsError);
        }
      }

      const reporterNameById = new Map<string, string>();
      if (reporterUserIds.size > 0) {
        try {
          const { data: reporterProfiles, error: reporterProfilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', Array.from(reporterUserIds));

          if (reporterProfilesError) throw reporterProfilesError;

          (reporterProfiles || []).forEach((profile: { id: string; full_name: string | null; email: string | null }) => {
            reporterNameById.set(
              profile.id,
              profile.full_name || profile.email || 'Usuário',
            );
          });
        } catch (reporterProfilesError) {
          console.warn('Could not load reporter profiles for Meu Dia:', reporterProfilesError);
        }
      }

      const todayItems = (data || []).map(item => {
        const isWorkItem = item.source === 'WORK_ITEM' || item.source === 'WORKITEM';
        const workItemMeta = isWorkItem && item.source_id ? workItemMetaById.get(item.source_id) : undefined;
        const parsedAssigneeIds = isWorkItem
          ? workItemMeta?.assignee_user_ids || []
          : (() => {
              if (!item.source_id) return [];
              try {
                const parsed = JSON.parse(item.source_id);
                return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
              } catch {
                return [];
              }
            })();

        return {
          id: item.id,
          user_id: item.user_id || null,
          assigned_to_user_id: item.assigned_to_user_id || item.user_id || null,
          assigned_by_user_id: item.assigned_by_user_id || (item as any).origin_reporter_user_id || null,
          title: item.title,
          status: item.status as MyDayItem['status'],
          priority: item.priority as MyDayItem['priority'],
          source: item.source as MyDayItem['source'],
          source_id: item.source_id || undefined,
          assignee_user_ids: parsedAssigneeIds,
          origin_reporter_user_id: (item as any).origin_reporter_user_id || workItemMeta?.reporter_user_id || null,
          origin_reporter_name: (item as any).origin_reporter_name || (
            workItemMeta?.reporter_user_id
              ? reporterNameById.get(workItemMeta.reporter_user_id) || null
              : null
          ),
          deadline_time: item.deadline_time || null,
          deadline_date: (item as any).deadline_date || null,
          completed_at: (item as any).completed_at || null,
          date: item.date,
        };
      });

      if (allowLocalFallback) {
        const offlineTodayItems = readMyDayOffline(targetUserId).filter((item) => item.date === today);
        if (todayItems.length > 0) {
          setItems(dedupeMyDayItems([...todayItems, ...offlineTodayItems]));
        } else {
          setItems(dedupeMyDayItems(offlineTodayItems));
        }
      } else {
        setItems(dedupeMyDayItems(todayItems));
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      if (allowLocalFallback) {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        setItems(readMyDayOffline(targetUserId).filter((item) => item.date === today));
        console.warn('Meu Dia loaded with fallback data only.');
      } else {
        setItems([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Reset permanent ensured flag when switching users (not needed with Set, but clear for new user)
  useEffect(() => {
    // No-op: ref-based Set handles multiple users naturally
  }, [viewingUserId]);

  useEffect(() => {
    if (userProfile !== undefined) {
      setIsLoading(true);
      fetchItems();
    }
  }, [user, userProfile, isGestor, viewingUserId]);

  useEffect(() => {
    if (!user) return;
    if (userProfile === undefined) return;
    void fetchAssignedActivities();
  }, [user, userProfile, allUsers]);

  useEffect(() => {
    if (!user) return;

    const targetUserId = viewingUserId || user.id;
    const channel = supabase
      .channel(`my-day-items-${targetUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'my_day_items',
          filter: `user_id=eq.${targetUserId}`,
        },
        () => {
          fetchItems();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, viewingUserId, userProfile, isGestor]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`my-day-assigned-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'my_day_items',
          filter: `origin_reporter_user_id=eq.${user.id}`,
        },
        () => {
          void fetchAssignedActivities();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userProfile, allUsers]);

  const handleAddItem = async () => {
    if (addItemLockRef.current) return;
    if (isSaving) return;
    if (!newItemTitle.trim()) {
      toast.error('Digite um título para a tarefa');
      return;
    }
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }
    
    setIsSaving(true);
    addItemLockRef.current = true;
    const today = getLocalDateString();
    try {
      const targetUserIds = Array.from(new Set(newItemAssigneeIds.filter(Boolean))).sort();
      const shouldAssignToOthers = newItemAssignToOtherPerson || targetUserIds.length > 0;
      if (shouldAssignToOthers && targetUserIds.length === 0) {
        toast.error('Selecione ao menos uma pessoa para atribuir');
        return;
      }
      const effectiveUserIds = shouldAssignToOthers
        ? targetUserIds
        : [viewingUserId || user.id];
      const myDayUserIds = shouldAssignToOthers
        ? targetUserIds
        : [viewingUserId || user.id];
      const hasSpecificDeadline = newItemDeadlineMode === 'ESPECIFICO' && (!!newItemDeadline || !!newItemDeadlineDate);
      let linkedWorkItemId: string | null = null;

      if (newItemSource === 'MANUAL') {
        try {
          const { data: workItem, error: workItemError } = await supabase
            .from('work_items')
            .insert({
              title: newItemTitle.trim(),
              description: null,
              priority: newItemPriority,
              status: 'TODO',
              assignee_user_id: effectiveUserIds[0] || null,
              reporter_user_id: user.id,
              type: 'TASK',
              due_date: hasSpecificDeadline && newItemDeadlineDate ? newItemDeadlineDate : null,
              tags: { assignee_user_ids: effectiveUserIds },
            })
            .select('id')
            .single();

          if (workItemError) throw workItemError;
          linkedWorkItemId = workItem.id;
        } catch (workItemError) {
          if (!allowLocalFallback) throw workItemError;
          const offlineWorkItem = {
            id: crypto.randomUUID(),
            title: newItemTitle.trim(),
            description: null,
            priority: newItemPriority,
            status: 'TODO',
            assignee_user_id: effectiveUserIds[0] || null,
            reporter_user_id: user.id,
            type: 'TASK',
            due_date: hasSpecificDeadline && newItemDeadlineDate ? newItemDeadlineDate : null,
            tags: { assignee_user_ids: effectiveUserIds },
            related_client_id: null,
            team_id: null,
            workspace_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            completed_at: null,
          };

          appendOfflineItem('work-items', offlineWorkItem);
          linkedWorkItemId = offlineWorkItem.id;
        }
      }

      const myDaySource = newItemSource === 'MANUAL' ? 'WORK_ITEM' : newItemSource;
      const sourceId = newItemSource === 'MANUAL' ? linkedWorkItemId : null;

      try {
        const insertedRows = await persistMyDayAssignments({
          title: newItemTitle.trim(),
          userIds: myDayUserIds,
          date: hasSpecificDeadline && newItemDeadlineDate ? newItemDeadlineDate : today,
          priority: newItemPriority,
          source: myDaySource,
          sourceId,
          reporterUserId: user.id,
          reporterName: user.name || user.email || null,
          deadlineDate: newItemDeadlineDate || null,
          deadlineTime: newItemDeadline || null,
        });

        if (insertedRows.length > 0) {
          const visibleUserId = viewingUserId || user.id;
          setItems((current) => {
            const nextItems = insertedRows
              .filter((row) => row.user_id === visibleUserId)
              .map((row) => ({
                id: row.id,
                user_id: row.user_id || null,
                title: row.title,
                status: row.status,
                priority: row.priority,
                source: row.source,
                source_id: row.source_id || undefined,
                assignee_user_ids: effectiveUserIds,
                origin_reporter_user_id: user.id,
                assigned_to_user_id: row.user_id || null,
                assigned_by_user_id: user.id,
                deadline_time: newItemDeadline || null,
                deadline_date: newItemDeadlineDate || null,
                completed_at: null,
                date: hasSpecificDeadline && newItemDeadlineDate ? newItemDeadlineDate : today,
              }));
            return dedupeMyDayItems([...current, ...nextItems]);
          });
        }
      } catch (myDayError) {
        if (!allowLocalFallback) throw myDayError;
        const offlineItems = myDayUserIds.map((targetUserId) => ({
          id: crypto.randomUUID(),
          user_id: targetUserId,
          title: newItemTitle.trim(),
          status: 'PENDENTE' as const,
          priority: newItemPriority,
          source: myDaySource,
          source_id: sourceId || crypto.randomUUID(),
          assignee_user_ids: effectiveUserIds,
          origin_reporter_user_id: user.id,
          assigned_to_user_id: targetUserId,
          assigned_by_user_id: user.id,
          deadline_time: newItemDeadline || null,
          deadline_date: newItemDeadlineDate || null,
          completed_at: null,
          date: hasSpecificDeadline && newItemDeadlineDate ? newItemDeadlineDate : today,
        }));
        offlineItems.forEach((offlineItem, index) => {
          appendOfflineItem(
            MY_DAY_OFFLINE_SCOPE,
            offlineItem,
            getMyDayBucket(myDayUserIds[index] || viewingUserId || user.id),
          );
          upsertReportedMyDayOffline(user.id, {
            ...offlineItem,
            responsible_name: allUsers.find((member) => member.id === offlineItem.user_id)?.full_name
              || offlineItem.user_id
              || 'Usuário',
            responsible_email: allUsers.find((member) => member.id === offlineItem.user_id)?.email || null,
            assigned_by_name: user.name || user.email || 'Você',
          });
        });
        setItems((current) => {
          const visibleUserId = viewingUserId || user.id;
          const visibleOfflineItems = offlineItems.filter((item) => item.user_id === visibleUserId);
          return dedupeMyDayItems([...current, ...visibleOfflineItems]);
        });
      }
      await fetchItems();
      void fetchAssignedActivities();
      setNewItemTitle('');
      setNewItemPriority('MEDIA');
      setNewItemSource('MANUAL');
      setNewItemAssignToOtherPerson(false);
      setNewItemDeadlineMode('SEM_PRAZO');
      setNewItemDeadline('');
      setNewItemDeadlineDate('');
      setNewItemAssigneeIds([]);
      setIsAddDialogOpen(false);
      toast.success(newItemSource === 'PERMANENT' ? 'Tarefa fixa adicionada!' : 'Item adicionado ao seu dia!');
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Erro ao adicionar item');
    } finally {
      addItemLockRef.current = false;
      setIsSaving(false);
    }
  };

  const handleQuickAdd = async () => {
    if (addItemLockRef.current) return;
    if (isSaving) return;
    if (!newItemTitle.trim()) {
      toast.error('Digite um título para a tarefa');
      return;
    }
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }
    
    setIsSaving(true);
    addItemLockRef.current = true;
    const today = getLocalDateString();
    try {
      const selectedAssigneeIds = Array.from(new Set(newItemAssigneeIds.filter(Boolean))).sort();
      const shouldAssignToOthers = newItemAssignToOtherPerson || selectedAssigneeIds.length > 0;
      if (shouldAssignToOthers && selectedAssigneeIds.length === 0) {
        toast.error('Selecione ao menos uma pessoa para atribuir');
        return;
      }
      const effectiveUserIds = shouldAssignToOthers
        ? selectedAssigneeIds
        : [viewingUserId || user.id];
      const myDayUserIds = shouldAssignToOthers
        ? selectedAssigneeIds
        : [viewingUserId || user.id];
      let linkedWorkItemId: string | null = null;

      try {
        const { data: workItem, error: workItemError } = await supabase
          .from('work_items')
          .insert({
            title: newItemTitle.trim(),
            description: null,
            priority: 'MEDIA',
            status: 'TODO',
            assignee_user_id: effectiveUserIds[0] || null,
            reporter_user_id: user.id,
            type: 'TASK',
            due_date: null,
            tags: { assignee_user_ids: effectiveUserIds },
          })
          .select('id')
          .single();

        if (workItemError) throw workItemError;
        linkedWorkItemId = workItem.id;
      } catch (workItemError) {
        if (!allowLocalFallback) throw workItemError;
        const offlineWorkItem = {
          id: crypto.randomUUID(),
          title: newItemTitle.trim(),
          description: null,
          priority: 'MEDIA',
          status: 'TODO',
          assignee_user_id: effectiveUserIds[0] || null,
          reporter_user_id: user.id,
          type: 'TASK',
          due_date: null,
          tags: { assignee_user_ids: effectiveUserIds },
          related_client_id: null,
          team_id: null,
          workspace_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          completed_at: null,
        };

        appendOfflineItem('work-items', offlineWorkItem);
        linkedWorkItemId = offlineWorkItem.id;
      }

      try {
        const insertedRows = await persistMyDayAssignments({
          title: newItemTitle.trim(),
          userIds: myDayUserIds,
          date: today,
          priority: 'MEDIA',
          source: 'WORK_ITEM',
          sourceId: linkedWorkItemId,
          reporterUserId: user.id,
          reporterName: user.name || user.email || null,
        });

        if (insertedRows.length > 0) {
          const visibleUserId = viewingUserId || user.id;
          setItems((current) => {
            const nextItems = insertedRows
              .filter((row) => row.user_id === visibleUserId)
              .map((row) => ({
                id: row.id,
                user_id: row.user_id || null,
                title: row.title,
                status: row.status,
                priority: row.priority,
                source: row.source,
                source_id: row.source_id || undefined,
                assignee_user_ids: effectiveUserIds,
                origin_reporter_user_id: user.id,
                assigned_to_user_id: row.user_id || null,
                assigned_by_user_id: user.id,
                date: today,
              }));
            return dedupeMyDayItems([...current, ...nextItems]);
          });
        }
      } catch (myDayError) {
        if (!allowLocalFallback) throw myDayError;
        const offlineItems = myDayUserIds.map((targetUserId) => ({
          id: crypto.randomUUID(),
          user_id: targetUserId,
          title: newItemTitle.trim(),
          status: 'PENDENTE' as const,
          priority: 'MEDIA' as const,
          source: 'WORK_ITEM' as const,
          source_id: linkedWorkItemId || crypto.randomUUID(),
          assignee_user_ids: effectiveUserIds,
          origin_reporter_user_id: user.id,
          assigned_to_user_id: targetUserId,
          assigned_by_user_id: user.id,
          deadline_time: null,
          deadline_date: null,
          completed_at: null,
          date: today,
        }));
        offlineItems.forEach((offlineItem, index) => {
          appendOfflineItem(
            MY_DAY_OFFLINE_SCOPE,
            offlineItem,
            getMyDayBucket(myDayUserIds[index] || viewingUserId || user.id),
          );
          upsertReportedMyDayOffline(user.id, {
            ...offlineItem,
            responsible_name: allUsers.find((member) => member.id === offlineItem.user_id)?.full_name
              || offlineItem.user_id
              || 'Usuário',
            responsible_email: allUsers.find((member) => member.id === offlineItem.user_id)?.email || null,
            assigned_by_name: user.name || user.email || 'Você',
          });
        });
        setItems((current) => {
          const visibleUserId = viewingUserId || user.id;
          const visibleOfflineItems = offlineItems.filter((item) => item.user_id === visibleUserId);
          return dedupeMyDayItems([...current, ...visibleOfflineItems]);
        });
      }
      await fetchItems();
      void fetchAssignedActivities();
      setNewItemTitle('');
      setNewItemAssignToOtherPerson(false);
      setNewItemAssigneeIds([]);
      toast.success('Item adicionado ao seu dia!');
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Erro ao adicionar item');
    } finally {
      addItemLockRef.current = false;
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const nextStatus = item.status === 'PENDENTE' ? 'CONCLUIDO' : 'PENDENTE';

    const completedAt = nextStatus === 'CONCLUIDO' ? new Date().toISOString() : null;

    // Optimistic update
    setItems(items.map(i => 
      i.id === id ? { ...i, status: nextStatus, completed_at: completedAt } : i
    ));

    try {
      try {
        const { error } = await supabase
          .from('my_day_items')
          .update({ status: nextStatus, completed_at: completedAt } as any)
          .eq('id', id);

        if (error) throw error;
      } catch (updateError) {
        if (allowLocalFallback) {
          updateOfflineItem<MyDayItem>(MY_DAY_OFFLINE_SCOPE, id, (offlineItem) => ({
            ...offlineItem,
            status: nextStatus,
            completed_at: completedAt,
          }), getMyDayBucket(viewingUserId || user.id));
        } else {
          throw updateError;
        }
      }

      if (nextStatus === 'CONCLUIDO') {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#E10600', '#ff4d4d', '#ffffff', '#ff9999'],
        });
      }

      // Log completion to activity_logs
      if (nextStatus === 'CONCLUIDO' && user) {
        const targetUserName = isViewingOwnDay 
          ? user.email 
      : visibleUsers.find(u => u.id === viewingUserId)?.full_name || 'Usuário';
        
        await supabase.from('activity_logs').insert({
          user_id: user.id,
          user_name: user.name || user.email || 'Usuário',
          user_email: user.email || '',
          action: 'UPDATE',
          entity: 'my_day_item',
          entity_id: id,
          details: `Tarefa concluída: "${item.title}"${!isViewingOwnDay ? ` (dia de ${targetUserName})` : ''}`,
        });
      }

      void fetchAssignedActivities();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
      // Revert on error
      setItems(items.map(i => 
        i.id === id ? { ...i, status: item.status } : i
      ));
    }
  };

  const handleRemoveItem = async (id: string) => {
    const itemToRemove = items.find(i => i.id === id);
    
    // If it's a permanent task, show confirmation dialog
    if (itemToRemove?.source === 'PERMANENT') {
      setItemToDelete(itemToRemove);
      return;
    }
    
    await executeRemoveItem(id);
  };

  const handleRemoveAssignedActivity = (item: AssignedActivityItem) => {
    setAssignedActivityToDelete(item);
  };

  const executeRemoveAssignedActivity = async (item: AssignedActivityItem) => {
    if (!user) return;

    const targetReporterId = user.id;
    const sourceId = item.source_id || null;
    const previousAssignedActivities = assignedActivities;

    const optimisticRemove = (current: AssignedActivityItem[]) => {
      if (sourceId) {
        return current.filter((activity) => activity.source_id !== sourceId);
      }

      return current.filter((activity) => activity.id !== item.id);
    };

    const removeLocalCopies = () => {
      const reporterBucket = getMyDayBucket(targetReporterId);
      const responsibleBucket = item.user_id ? getMyDayBucket(item.user_id) : null;

      if (sourceId) {
        filterOfflineCollection<MyDayItem>(
          MY_DAY_REPORTED_OFFLINE_SCOPE,
          (offlineItem) =>
            offlineItem.origin_reporter_user_id !== targetReporterId ||
            offlineItem.source_id !== sourceId,
          reporterBucket,
        );

        if (responsibleBucket) {
          filterOfflineCollection<MyDayItem>(
            MY_DAY_OFFLINE_SCOPE,
            (offlineItem) => offlineItem.source_id !== sourceId,
            responsibleBucket,
          );
        }

        removeOfflineItem<{ id: string }>('work-items', sourceId, 'global');
        return;
      }

      removeOfflineItem<MyDayItem>(MY_DAY_REPORTED_OFFLINE_SCOPE, item.id, reporterBucket);

      if (responsibleBucket) {
        removeOfflineItem<MyDayItem>(MY_DAY_OFFLINE_SCOPE, item.id, responsibleBucket);
      }
    };

    setAssignedActivities((current) => optimisticRemove(current));

    try {
      if (sourceId) {
        const { error: assignedDeleteError } = await supabase
          .from('my_day_items')
          .delete()
          .eq('origin_reporter_user_id', targetReporterId)
          .eq('source_id', sourceId);

        if (assignedDeleteError) throw assignedDeleteError;

        if (item.source === 'WORK_ITEM') {
          const { error: workItemDeleteError } = await supabase
            .from('work_items')
            .delete()
            .eq('id', sourceId)
            .eq('reporter_user_id', targetReporterId);

          if (workItemDeleteError) {
            console.warn('Could not delete related work item for assigned activity:', workItemDeleteError);
          }
        }
      } else {
        const { error } = await supabase
          .from('my_day_items')
          .delete()
          .eq('id', item.id)
          .eq('origin_reporter_user_id', targetReporterId);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error deleting assigned activity:', error);

      if (!allowLocalFallback) {
        setAssignedActivities(previousAssignedActivities);
        toast.error('Erro ao remover atividade atribuída');
        return;
      }

      console.warn('Remote delete failed for assigned activity; applying local fallback.');
    }

    if (allowLocalFallback) {
      removeLocalCopies();
    }

    void fetchItems();
    void fetchAssignedActivities();
    setAssignedActivityToDelete(null);
    toast.success('Atividade atribuída removida!');
  };

  const executeRemoveItem = async (id: string) => {
    const itemToRemove = items.find(i => i.id === id);
    const itemDate = itemToRemove?.date || getLocalDateString();
    const itemUserId = itemToRemove?.user_id || viewingUserId || user!.id;
    const exclusion: MyDayItemExclusion | null = itemToRemove
      ? {
          id: crypto.randomUUID(),
          user_id: itemUserId,
          item_date: itemDate,
          source: itemToRemove.source,
          source_id: itemToRemove.source_id || '',
          title: itemToRemove.title,
          created_by_user_id: user?.id ?? null,
          created_at: new Date().toISOString(),
        }
      : null;
    
    // Optimistic update
    setItems(items.filter(item => item.id !== id));
    setItemToDelete(null);

    try {
      if (exclusion) {
        const { error: exclusionError } = await supabase
          .from('my_day_item_exclusions')
          .upsert(exclusion, {
            onConflict: 'user_id,item_date,source,source_id,title',
          });

        if (exclusionError) throw exclusionError;

        if (allowLocalFallback) {
          addMyDayExclusionOffline(itemUserId, exclusion);
        }
      }

      try {
        const { error } = await supabase
          .from('my_day_items')
          .delete()
          .eq('id', id);

        if (error) throw error;
      } catch (deleteError) {
        if (allowLocalFallback) {
          removeOfflineItem<MyDayItem>(MY_DAY_OFFLINE_SCOPE, id, getMyDayBucket(viewingUserId || user!.id));
        } else {
          throw deleteError;
        }
      }
      toast.success('Item removido!');
      void fetchAssignedActivities();
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Erro ao remover item');
      // Revert on error
      if (itemToRemove) {
        setItems(prev => [...prev, itemToRemove]);
      }
    }
  };

  const handleEditItem = (item: MyDayItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditPriority(item.priority);
    setEditStatus(item.status);
    setEditDeadlineMode(item.deadline_time || item.deadline_date ? 'ESPECIFICO' : 'SEM_PRAZO');
    setEditDeadline(item.deadline_time || '');
    setEditDeadlineDate(item.deadline_date || '');
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editTitle.trim()) return;

    setIsSaving(true);
    try {
      const updateData: any = {
        title: editTitle.trim(),
        priority: editPriority,
        status: editStatus,
      };

      // Handle deadline update
      if (editDeadlineMode === 'ESPECIFICO') {
        updateData.deadline_time = editDeadline || null;
        if (editDeadline && editDeadline !== editingItem.deadline_time) {
          updateData.deadline_notified = false;
        }
        updateData.deadline_date = editDeadlineDate || null;
      } else {
        updateData.deadline_time = null;
        updateData.deadline_date = null;
      }

      try {
        const { error } = await supabase
          .from('my_day_items')
          .update(updateData)
          .eq('id', editingItem.id);

        if (error) throw error;
      } catch (updateError) {
        if (allowLocalFallback) {
          updateOfflineItem<MyDayItem>(MY_DAY_OFFLINE_SCOPE, editingItem.id, (item) => ({
            ...item,
            title: editTitle.trim(),
            priority: editPriority,
            status: editStatus,
            deadline_time: editDeadlineMode === 'ESPECIFICO' ? editDeadline || null : null,
            deadline_date: editDeadlineMode === 'ESPECIFICO' ? editDeadlineDate || null : null,
          }), getMyDayBucket(viewingUserId || user.id));
        } else {
          throw updateError;
        }
      }

      setItems(items.map(item => 
        item.id === editingItem.id 
          ? { ...item, title: editTitle.trim(), priority: editPriority, status: editStatus, deadline_time: editDeadlineMode === 'ESPECIFICO' ? editDeadline || null : null, deadline_date: editDeadlineMode === 'ESPECIFICO' ? editDeadlineDate || null : null }
          : item
      ));
      setEditDeadlineDate('');
      setEditingItem(null);
      setEditDeadline('');
      setEditDeadlineMode('SEM_PRAZO');
      toast.success('Item atualizado!');
      void fetchAssignedActivities();
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Erro ao atualizar item');
    } finally {
      setIsSaving(false);
    }
  };

  const visibleItems = dedupeMyDayItems(items);

  const pendingItems = visibleItems
    .filter(i => i.status !== 'CONCLUIDO')
    .sort((a, b) => {
      // PERMANENT tasks pinned to top
      const aIsPerm = a.source === 'PERMANENT' ? 0 : 1;
      const bIsPerm = b.source === 'PERMANENT' ? 0 : 1;
      return aIsPerm - bIsPerm;
    });
  const completedItems = visibleItems.filter(i => i.status === 'CONCLUIDO');

  const today = new Date().toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Admin panorama panel
  const PanoramaPanel = () => {
    const [period, setPeriod] = useState<'semanal' | 'mensal' | 'anual'>('mensal');

    const periodLabel = {
      semanal: 'esta semana',
      mensal: 'este mês',
      anual: 'este ano',
    }[period];

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-h1 text-foreground">{isAdmin ? 'Panorama das Equipes' : 'Panorama da Minha Equipe'}</h1>
              <p className="text-sm text-muted-foreground capitalize">Resultado {periodLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Period selector */}
            <div className="flex gap-1 bg-surface-2 rounded-lg p-1">
              {(['semanal', 'mensal', 'anual'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize',
                    period === p
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>

            {/* Back to Meu Dia */}
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setAdminView('dia')}>
              <Sun className="h-4 w-4" />
              Meu Dia
            </Button>
          </div>
        </div>

        {/* Cards */}
        {panoramaLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {panorama.map((team) => {
              const rate = team.totalTasks > 0
                ? Math.round((team.completedTasks / team.totalTasks) * 100)
                : 0;
              return (
                <div key={team.id} className="bg-card border border-border rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-foreground">{team.name}</h3>
                    <span className="text-2xl font-extrabold text-primary">{rate}%</span>
                  </div>

                  <Progress value={rate} className="h-2" />

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-surface-2 rounded-lg p-3">
                      <p className="text-xl font-bold text-foreground">{team.completedTasks}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Concluídas</p>
                    </div>
                    <div className="bg-surface-2 rounded-lg p-3">
                      <p className="text-xl font-bold text-foreground">{team.totalTasks - team.completedTasks}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Pendentes</p>
                    </div>
                    <div className="bg-surface-2 rounded-lg p-3">
                      <p className="text-xl font-bold text-success">{team.activeClients}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Clientes Ativos</p>
                    </div>
                  </div>

                  {team.members.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {team.members.map((m) => (
                        <span key={m} className="flex items-center gap-1 text-xs bg-surface-3 text-muted-foreground rounded-full px-2.5 py-1">
                          <UserCircle className="h-3 w-3" />
                          {m}
                        </span>
                      ))}
                    </div>
                  )}

                  {team.members.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhum membro cadastrado ainda</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Panorama early return (all users)
  if (isAdmin && adminView === 'panorama') {
    return (
      <div className="space-y-6 animate-in">
        <PanoramaPanel />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Deadline Alarm Alert */}
      <DeadlineAlarmAlert
        alarms={activeAlarms}
        isPlaying={isAlarmPlaying}
        onStopAlarm={stopAlarm}
        onSetCustomSound={setCustomAlarmSound}
        onClearCustomSound={clearCustomAlarmSound}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sun className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-h1 text-foreground">
                {isViewingOwnDay ? 'Meu Dia' : `Dia de ${selectedDayUserName}`}
              </h1>
              <p className="text-body text-muted-foreground capitalize">{today}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Panorama toggle */}
          {isAdmin && (
            <div className="flex gap-1 bg-surface-2 rounded-lg p-1">
              <Button
                size="sm"
                variant={adminView === 'dia' ? 'default' : 'ghost'}
                className="gap-1.5 h-8"
                onClick={() => setAdminView('dia')}
              >
                <Sun className="h-3.5 w-3.5" />
                Meu Dia
              </Button>
              <Button
                size="sm"
                variant={adminView === 'panorama' ? 'default' : 'ghost'}
                className="gap-1.5 h-8"
                onClick={() => setAdminView('panorama')}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Panorama
              </Button>
            </div>
          )}

            {/* Day filter for admins */}
          {canViewOtherUsers && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dia</span>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={selectedUserId || 'own'}
                  onValueChange={(v) => setSelectedUserId(v === 'own' ? null : v)}
                >
                  <SelectTrigger className="w-[240px] bg-surface-2">
                    <SelectValue placeholder="Selecionar dia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="own">
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Meu Dia
                      </span>
                    </SelectItem>
                    {visibleUsers.filter(u => u.id !== user?.id).map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-caption text-muted-foreground">
            <Target className="h-4 w-4" />
            <span>{completedItems.length}/{visibleItems.length} concluídas</span>
          </div>
        </div>
      </div>

      {/* Quick Add - Show when viewing own day OR when admin/coordinator viewing another user */}
      {(isViewingOwnDay || canManageOtherUsers) && (
        <div className="rounded-lg border border-border bg-card shadow-card p-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <Input
                placeholder="Adicionar item rápido..."
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                className="flex-1 bg-surface-2 border-border text-foreground placeholder:text-muted-foreground"
                disabled={isSaving}
              />
              <Button onClick={handleQuickAdd} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Adicionar
              </Button>
              <Button variant="outline" onClick={openAddDialog} disabled={isSaving}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tarefa Fixa
              </Button>
            </div>

            <div className="space-y-2 rounded-lg border border-border/60 bg-surface-1 p-3">
              <Label className="flex items-center gap-2 text-sm text-foreground">
                <Users className="h-4 w-4" />
                Atribuir a mais alguém?
              </Label>
              <Select
                value={newItemAssignToOtherPerson ? 'YES' : 'NO'}
                onValueChange={(value) => {
                  const assignToOtherPerson = value === 'YES';
                  setNewItemAssignToOtherPerson(assignToOtherPerson);
                  if (!assignToOtherPerson) {
                    setNewItemAssigneeIds([]);
                  }
                }}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Escolha uma opção" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="NO">Não</SelectItem>
                  <SelectItem value="YES">Sim</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Se marcar <span className="font-medium text-foreground">Sim</span>, aparece a lista para selecionar uma ou mais pessoas.
              </p>
              {newItemAssignToOtherPerson && (
                <UserMultiSelect
                  users={assignableUsers}
                  value={newItemAssigneeIds}
                  onChange={handleAssigneeSelectionChange}
                  placeholder="Selecionar pessoas"
                  label="Pessoas com esta atividade"
                  className="h-11"
                />
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* View-only banner when viewing another user */}
      {!isViewingOwnDay && (
        <div className="rounded-lg border border-info/30 bg-info/5 p-4 flex items-center gap-3">
          <Eye className="h-5 w-5 text-info" />
          <p className="text-body text-info">
            Visualizando o dia de <strong>{selectedDayUserName}</strong>
            {canManageOtherUsers ? ' — você pode adicionar e alterar tarefas' : ' (somente leitura)'}
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-grid">
        <div className="rounded-lg border border-border bg-card shadow-card p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-kpi-sm text-foreground">{pendingItems.length}</p>
            <p className="text-caption text-muted-foreground">Pendentes</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card shadow-card p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-kpi-sm text-foreground">{completedItems.length}</p>
            <p className="text-caption text-muted-foreground">Concluídas</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-card p-5 space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-h2 text-foreground">Atividades que você atribuiu</h2>
            <p className="text-caption text-muted-foreground">
              Acompanhe em tempo real as tarefas que você delegou para outras pessoas.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-caption text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{assignedActivitySummary.total}</span>
            </div>
            <div className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-caption text-muted-foreground">
              Pendentes: <span className="font-semibold text-warning">{assignedActivitySummary.pending}</span>
            </div>
            <div className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-caption text-muted-foreground">
              Em andamento: <span className="font-semibold text-info">{assignedActivitySummary.inProgress}</span>
            </div>
            <div className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-caption text-muted-foreground">
              Concluídas: <span className="font-semibold text-success">{assignedActivitySummary.completed}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(ASSIGNED_ACTIVITY_FILTER_LABELS) as AssignedActivitiesFilter[]).map((filter) => (
            <Button
              key={filter}
              type="button"
              size="sm"
              variant={assignedActivitiesFilter === filter ? 'default' : 'outline'}
              className={cn(
                'h-8 rounded-full',
                assignedActivitiesFilter !== filter && 'bg-surface-2 text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setAssignedActivitiesFilter(filter)}
            >
              {ASSIGNED_ACTIVITY_FILTER_LABELS[filter]}
            </Button>
          ))}
        </div>

        <div className="space-y-3">
          {assignedActivitiesLoading ? (
            <div className="rounded-lg border border-border bg-surface-2 p-6 text-center text-muted-foreground">
              Carregando atividades atribuídas...
            </div>
          ) : filteredAssignedActivities.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-surface-2/60 p-6 text-center text-muted-foreground">
              Nenhuma atividade atribuída encontrada.
            </div>
          ) : (
            filteredAssignedActivities.map((assignedItem) => (
              <AssignedActivityCard
                key={assignedItem.id}
                item={assignedItem}
                onRemove={handleRemoveAssignedActivity}
              />
            ))
          )}
        </div>
      </div>

      {/* Items List - Single Column */}
      <div className="rounded-lg border border-border bg-card shadow-card">
        <div className="p-card space-y-2">
          {visibleItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-caption">Nenhuma tarefa para hoje</p>
          ) : (
            [...pendingItems, ...completedItems].map((item) => (
              <ItemCard 
                key={item.id} 
                item={item} 
                users={allUsers}
                onToggle={handleToggleStatus} 
                onRemove={handleRemoveItem}
                onEdit={handleEditItem}
                readOnly={!isViewingOwnDay && !canManageOtherUsers}
              />
            ))
          )}
        </div>
      </div>

      {/* Add Task Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
            <DialogDescription>
              Adicione uma nova tarefa. Tarefas fixas aparecem automaticamente todos os dias.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-title">Título</Label>
              <Input
                id="new-title"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder="Título da tarefa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-priority">Prioridade</Label>
              <Select value={newItemPriority} onValueChange={(v) => setNewItemPriority(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BAIXA">Baixa</SelectItem>
                  <SelectItem value="MEDIA">Média</SelectItem>
                  <SelectItem value="ALTA">Alta</SelectItem>
                  <SelectItem value="URGENTE">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-source">Tipo</Label>
              <Select value={newItemSource} onValueChange={(v) => setNewItemSource(v as TaskSource)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Normal (apenas hoje)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="PERMANENT">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      <span>Fixa (repete diariamente)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {newItemSource === 'PERMANENT' && (
                <p className="text-xs text-muted-foreground">
                  Esta tarefa aparecerá automaticamente todos os dias.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Atribuir tarefa a mais alguém?
              </Label>
              <Select
                value={newItemAssignToOtherPerson ? 'YES' : 'NO'}
                onValueChange={(value) => {
                  const assignToOtherPerson = value === 'YES';
                  setNewItemAssignToOtherPerson(assignToOtherPerson);
                  if (!assignToOtherPerson) {
                    setNewItemAssigneeIds([]);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Escolha uma opção" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NO">Não</SelectItem>
                  <SelectItem value="YES">Sim</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Marque <span className="font-medium text-foreground">Sim</span> para atribuir a mais alguém.
              </p>
              {newItemAssignToOtherPerson && (
                <UserMultiSelect
                  users={assignableUsers}
                  value={newItemAssigneeIds}
                  onChange={handleAssigneeSelectionChange}
                  placeholder="Selecionar pessoas"
                  label="Pessoas com esta atividade"
                  className="h-11"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <AlarmClock className="h-4 w-4" />
                Prazo
              </Label>
              <Select
                value={newItemDeadlineMode}
                onValueChange={(value) => {
                  setNewItemDeadlineMode(value as 'SEM_PRAZO' | 'ESPECIFICO');
                  if (value === 'SEM_PRAZO') {
                    setNewItemDeadline('');
                    setNewItemDeadlineDate('');
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEM_PRAZO">Sem prazo</SelectItem>
                  <SelectItem value="ESPECIFICO">Prazo específico</SelectItem>
                </SelectContent>
              </Select>
              {newItemDeadlineMode === 'ESPECIFICO' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="new-deadline-date" className="text-xs text-muted-foreground">Data</Label>
                    <Input
                      id="new-deadline-date"
                      type="date"
                      value={newItemDeadlineDate}
                      onChange={(e) => setNewItemDeadlineDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-deadline" className="text-xs text-muted-foreground">Horário</Label>
                    <Input
                      id="new-deadline"
                      type="time"
                      value={newItemDeadline}
                      onChange={(e) => setNewItemDeadline(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  A tarefa será criada sem prazo fixo.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddItem} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Atividade</DialogTitle>
            <DialogDescription>
              Faça alterações na atividade selecionada.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Título</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Título da atividade"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-priority">Prioridade</Label>
              <Select value={editPriority} onValueChange={(v) => setEditPriority(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BAIXA">Baixa</SelectItem>
                  <SelectItem value="MEDIA">Média</SelectItem>
                  <SelectItem value="ALTA">Alta</SelectItem>
                  <SelectItem value="URGENTE">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-deadline" className="flex items-center gap-2">
                <AlarmClock className="h-4 w-4" />
                Prazo
              </Label>
              <Select
                value={editDeadlineMode}
                onValueChange={(value) => {
                  setEditDeadlineMode(value as 'SEM_PRAZO' | 'ESPECIFICO');
                  if (value === 'SEM_PRAZO') {
                    setEditDeadline('');
                    setEditDeadlineDate('');
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEM_PRAZO">Sem prazo</SelectItem>
                  <SelectItem value="ESPECIFICO">Prazo específico</SelectItem>
                </SelectContent>
              </Select>
              {editDeadlineMode === 'ESPECIFICO' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="edit-deadline-date" className="text-xs text-muted-foreground">Data</Label>
                    <Input
                      id="edit-deadline-date"
                      type="date"
                      value={editDeadlineDate}
                      onChange={(e) => setEditDeadlineDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-deadline" className="text-xs text-muted-foreground">Horário</Label>
                    <Input
                      id="edit-deadline"
                      type="time"
                      value={editDeadline}
                      onChange={(e) => setEditDeadline(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  A atividade ficará sem prazo fixo.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Permanent Task Confirmation */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa diária?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta é uma tarefa diária que se repete todos os dias. Ao excluí-la, ela não será mais recriada automaticamente.
              {itemToDelete && (
                <span className="block mt-2 font-medium text-foreground">
                  "{itemToDelete.title}"
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToDelete && executeRemoveItem(itemToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!assignedActivityToDelete}
        onOpenChange={(open) => !open && setAssignedActivityToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atividade atribuída?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação remove a atividade do seu acompanhamento e do dia de quem recebeu.
              {assignedActivityToDelete && (
                <span className="block mt-2 font-medium text-foreground">
                  "{assignedActivityToDelete.title}"
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                assignedActivityToDelete && executeRemoveAssignedActivity(assignedActivityToDelete)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface ItemCardProps {
  item: MyDayItem;
  users: { id: string; full_name: string }[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (item: MyDayItem) => void;
  readOnly?: boolean;
}

function ItemCard({ item, users, onToggle, onRemove, onEdit, readOnly = false }: ItemCardProps) {
  const StatusIcon = statusIcons[item.status as keyof typeof statusIcons] || Circle;
  const sourceIcons: Record<string, typeof Target> = {
    'WORKITEM': Target,
    'WORK_ITEM': Target,
    'MEETING': Video,
    'MANUAL': Calendar,
    'PERMANENT': RefreshCw,
  };
  const SourceIcon = sourceIcons[item.source] || Calendar;
  const isPermanent = item.source === 'PERMANENT';
  const hasDeadline = !!item.deadline_time || !!item.deadline_date;
  const assigneeNames = (item.assignee_user_ids || [])
    .map((assigneeId) => users.find((member) => member.id === assigneeId)?.full_name)
    .filter(Boolean) as string[];
  const transferText = getTaskTransferText({
    reporterUserId: item.origin_reporter_user_id,
    reporterName: item.origin_reporter_name,
    assigneeUserIds: item.assignee_user_ids,
    users,
  });

  // Check if this is an overdue task from a previous day
  const isOverdueFromPreviousDay = (() => {
    if (!item.date || item.status === 'CONCLUIDO') return false;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return item.date < today;
  })();
  // Format deadline for display
  const formatDeadline = () => {
    const parts: string[] = [];
    if (item.deadline_date) {
      const [y, m, d] = item.deadline_date.split('-');
      parts.push(`${d}/${m}`);
    }
    if (item.deadline_time) {
      const [hours, minutes] = item.deadline_time.split(':');
      parts.push(`${hours}:${minutes}`);
    }
    return parts.join(' ');
  };

  // Check if deadline is approaching (within 1 hour)
  const isDeadlineApproaching = () => {
    if (item.status === 'CONCLUIDO') return false;
    if (!item.deadline_time && !item.deadline_date) return false;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    // If deadline_date is set and it's not today, check date only
    if (item.deadline_date && item.deadline_date !== today) return false;
    if (!item.deadline_time) return false;
    const [hours, minutes] = item.deadline_time.split(':').map(Number);
    const deadlineInMinutes = hours * 60 + minutes;
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    const diff = deadlineInMinutes - currentTimeInMinutes;
    return diff > 0 && diff <= 60;
  };

  // Check if deadline is past
  const isDeadlinePast = () => {
    if (item.status === 'CONCLUIDO') return false;
    if (!item.deadline_time && !item.deadline_date) return false;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    // If deadline_date is in the past, it's overdue
    if (item.deadline_date && item.deadline_date < today) return true;
    // If deadline_date is in the future, not overdue
    if (item.deadline_date && item.deadline_date > today) return false;
    // Same day or no date — check time
    if (!item.deadline_time) return false;
    const [hours, minutes] = item.deadline_time.split(':').map(Number);
    const deadlineInMinutes = hours * 60 + minutes;
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    return currentTimeInMinutes > deadlineInMinutes;
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(item.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(item);
  };

  const deadlineApproaching = isDeadlineApproaching();
  const deadlinePast = isDeadlinePast();

  return (
    <div 
      className={cn(
        'p-3 rounded-lg border cursor-pointer transition-all group',
        item.status === 'CONCLUIDO' 
          ? 'bg-surface-2/50 border-border/50' 
          : isOverdueFromPreviousDay
            ? 'bg-destructive/5 border-destructive/30'
            : deadlinePast
              ? 'bg-destructive/5 border-destructive/30'
              : deadlineApproaching
                ? 'bg-warning/5 border-warning/30'
                : 'bg-surface-2 border-border hover:border-primary/30',
        readOnly && 'cursor-default'
      )}
      onClick={() => !readOnly && onToggle(item.id)}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'h-6 w-6 rounded-full flex items-center justify-center mt-0.5',
          item.status === 'CONCLUIDO' ? 'bg-success/10' : 
          item.status === 'EM_ANDAMENTO' ? 'bg-warning/10' : 'bg-surface-3'
        )}>
          <StatusIcon className={cn(
            'h-4 w-4',
            item.status === 'CONCLUIDO' ? 'text-success' : 
            item.status === 'EM_ANDAMENTO' ? 'text-warning' : 'text-muted-foreground'
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-body font-medium',
            item.status === 'CONCLUIDO' ? 'text-muted-foreground line-through' : 'text-foreground'
          )}>
            {item.title}
          </p>
          {transferText && (
            <p data-cy="my-day-transfer-text" className="mt-0.5 text-xs text-muted-foreground">
              {transferText}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <SourceIcon className={cn("h-3 w-3", isPermanent ? "text-primary" : "text-muted-foreground")} />
            {isPermanent && (
              <Badge variant="outline" className="text-caption bg-primary/10 text-primary border-primary/20">
                Diária
              </Badge>
            )}
            {assigneeNames.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {assigneeNames.map((name, index) => (
                  <Badge key={`${name}-${index}`} variant="outline" className="text-caption bg-primary/8 text-primary border-primary/20">
                    {name.split(' ')[0]}
                  </Badge>
                ))}
              </div>
            )}
            <Badge variant="outline" className={cn('text-caption', priorityColors[item.priority])}>
              {item.priority}
            </Badge>
            {hasDeadline ? (
              <Badge 
                variant="outline" 
                className={cn(
                  'text-caption flex items-center gap-1',
                  deadlinePast 
                    ? 'bg-destructive/10 text-destructive border-destructive/20'
                    : deadlineApproaching
                      ? 'bg-warning/10 text-warning border-warning/20'
                      : 'bg-info/10 text-info border-info/20'
                )}
              >
                <AlarmClock className="h-3 w-3" />
                {formatDeadline()}
                {deadlinePast && ' (atrasado)'}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-caption bg-surface-2 text-muted-foreground border-border">
                Sem prazo
              </Badge>
            )}
            {isOverdueFromPreviousDay && (
              <Badge variant="outline" className="text-caption bg-destructive/10 text-destructive border-destructive/20 flex items-center gap-1 animate-pulse">
                <AlertCircle className="h-3 w-3" />
                Tarefa atrasada do dia anterior
              </Badge>
            )}
            {item.status === 'CONCLUIDO' && item.completed_at && (
              <Badge variant="outline" className="text-caption bg-success/10 text-success border-success/20 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {new Date(item.completed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </Badge>
            )}
          </div>
        </div>
        {!readOnly && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleEdit}
              className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary"
              title="Editar item"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={handleRemove}
              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              title="Remover item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface AssignedActivityCardProps {
  item: AssignedActivityItem;
  onRemove: (item: AssignedActivityItem) => void;
}

function AssignedActivityCard({ item, onRemove }: AssignedActivityCardProps) {
  const StatusIcon = statusIcons[item.status as keyof typeof statusIcons] || Circle;
  const deadlineLabel = formatMyDayDateTime(item.deadline_date, item.deadline_time);
  const createdLabel = formatMyDayCreatedAt(item.created_at);
  const initials = item.responsible_name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <div className={cn(
      'rounded-xl border bg-surface-1/90 p-4 shadow-sm transition-all',
      item.status === 'CONCLUIDO'
        ? 'border-success/30'
        : item.status === 'EM_ANDAMENTO'
          ? 'border-warning/30'
          : 'border-border',
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className={cn(
            'h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold',
            item.status === 'CONCLUIDO'
              ? 'bg-success/10 text-success'
              : item.status === 'EM_ANDAMENTO'
                ? 'bg-warning/10 text-warning'
                : 'bg-primary/10 text-primary',
          )}>
            {initials || <Users className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <p className={cn(
              'text-body font-semibold text-foreground truncate',
              item.status === 'CONCLUIDO' && 'line-through text-muted-foreground',
            )}>
              {item.title}
            </p>
            <p className="text-caption text-muted-foreground">
              Responsável: <span className="font-medium text-foreground">{item.responsible_name}</span>
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Badge
            variant="outline"
            className={cn(
              'text-caption flex items-center gap-1',
              item.status === 'CONCLUIDO'
                ? 'bg-success/10 text-success border-success/20'
                : item.status === 'EM_ANDAMENTO'
                  ? 'bg-warning/10 text-warning border-warning/20'
                  : 'bg-info/10 text-info border-info/20',
            )}
          >
            <StatusIcon className="h-3 w-3" />
            {ASSIGNED_ACTIVITY_STATUS_LABELS[item.status] || 'Pendente'}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onRemove(item)}
            aria-label={`Excluir atividade ${item.title}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline" className={cn('text-caption', priorityColors[item.priority])}>
          {item.priority}
        </Badge>
        {deadlineLabel ? (
          <Badge variant="outline" className="text-caption bg-surface-2 text-muted-foreground border-border">
            <AlarmClock className="h-3 w-3 mr-1" />
            Prazo: {deadlineLabel}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-caption bg-surface-2 text-muted-foreground border-border">
            Sem prazo
          </Badge>
        )}
        {createdLabel && (
          <Badge variant="outline" className="text-caption bg-primary/5 text-primary border-primary/10">
            Criada em {createdLabel}
          </Badge>
        )}
        {item.status === 'CONCLUIDO' && item.completed_at && (
          <Badge variant="outline" className="text-caption bg-success/10 text-success border-success/20 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Concluída às {new Date(item.completed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </Badge>
        )}
      </div>
    </div>
  );
}

