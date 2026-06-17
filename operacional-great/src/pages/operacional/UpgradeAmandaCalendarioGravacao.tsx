import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarDays,
  CalendarRange,
  Clock3,
  Edit3,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  Video,
  Users,
} from 'lucide-react';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { resolveBrandProfileIdForClient } from '@/lib/upgradeAmandaClientLink';
import { isMissingColumnError, omitKeys, runWithSchemaFallback } from '@/lib/supabaseSchemaFallback';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type BrandProfileRow = Database['public']['Tables']['brand_profiles']['Row'];
type OperationalClientRow = Database['public']['Tables']['operational_clients']['Row'];
type CalendarRecordingRow = Database['public']['Tables']['calendar_recordings']['Row'];

type CalendarRecordingWithLinks = CalendarRecordingRow & {
  operational_clients?: Pick<OperationalClientRow, 'id' | 'client_name' | 'clinic_name'> | null;
  brand_profiles?: Pick<BrandProfileRow, 'id' | 'display_name' | 'profile_type'> | null;
};

type RecordingFormState = {
  client_id: string;
  recording_date: string;
  recording_time: string;
  location: string;
  status: string;
  recording_type: string;
  observations: string;
};

const STATUS_OPTIONS = ['AGENDADA', 'CONFIRMADA', 'GRAVADA', 'REAGENDADA', 'CANCELADA'];

const initialFormState = (): RecordingFormState => ({
  client_id: '',
  recording_date: '',
  recording_time: '',
  location: '',
  status: 'AGENDADA',
  recording_type: '',
  observations: '',
});

function getStatusTone(status: string) {
  switch (status) {
    case 'GRAVADA':
      return 'bg-emerald-50 text-emerald-700';
    case 'CONFIRMADA':
      return 'bg-blue-50 text-blue-700';
    case 'REAGENDADA':
      return 'bg-amber-50 text-amber-700';
    case 'CANCELADA':
      return 'bg-rose-50 text-rose-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function getEventTone(status: string) {
  switch (status) {
    case 'GRAVADA':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'CONFIRMADA':
      return 'border-blue-200 bg-blue-50 text-blue-800';
    case 'REAGENDADA':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'CANCELADA':
      return 'border-rose-200 bg-rose-50 text-rose-800';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

function getEventDotTone(status: string) {
  switch (status) {
    case 'GRAVADA':
      return 'bg-emerald-500';
    case 'CONFIRMADA':
      return 'bg-blue-600';
    case 'REAGENDADA':
      return 'bg-amber-500';
    case 'CANCELADA':
      return 'bg-rose-500';
    default:
      return 'bg-slate-400';
  }
}

function getRecordingClientLabel(recording: {
  operational_clients?: Pick<OperationalClientRow, 'client_name' | 'clinic_name'> | null;
  brand_profiles?: Pick<BrandProfileRow, 'display_name'> | null;
}) {
  if (recording.operational_clients) {
    return recording.operational_clients.clinic_name
      ? `${recording.operational_clients.client_name} - ${recording.operational_clients.clinic_name}`
      : recording.operational_clients.client_name;
  }

  return recording.brand_profiles?.display_name || 'Sem cliente';
}

export default function UpgradeAmandaCalendarioGravacao() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedDay, setSelectedDay] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'todos' | 'mes' | 'semana' | 'lista'>('mes');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [detailsMenuOpen, setDetailsMenuOpen] = useState(false);
  const [editingRecording, setEditingRecording] = useState<CalendarRecordingWithLinks | null>(null);
  const [viewRecording, setViewRecording] = useState<CalendarRecordingWithLinks | null>(null);
  const [deleteRecording, setDeleteRecording] = useState<CalendarRecordingWithLinks | null>(null);
  const [form, setForm] = useState<RecordingFormState>(initialFormState());

  const monthDate = parseISO(`${selectedMonth}-01`);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const monthLabel = format(monthDate, "MMMM 'de' yyyy", { locale: ptBR });
  const calendarDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(monthStart, { weekStartsOn: 0 }),
        end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
      }),
    [monthEnd, monthStart],
  );

  const { data: clients = [] } = useQuery({
    queryKey: ['operational-clients-calendar'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_clients')
        .select('id, client_name, clinic_name, status_operacional')
        .order('client_name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: recordings = [], isLoading } = useQuery({
    queryKey: ['calendar-recordings', selectedMonth],
    queryFn: async () => {
      const buildQuery = (includeOperationalClients: boolean) =>
        supabase
          .from('calendar_recordings')
          .select(includeOperationalClients ? '*, operational_clients(id, client_name, clinic_name), brand_profiles(id, display_name, profile_type)' : '*, brand_profiles(id, display_name, profile_type)')
          .gte('recording_date', format(monthStart, 'yyyy-MM-dd'))
          .lte('recording_date', format(monthEnd, 'yyyy-MM-dd'))
          .order('recording_date', { ascending: true })
          .order('recording_time', { ascending: true });

      const { data, error } = await buildQuery(true);
      if (!error) return (data || []) as CalendarRecordingWithLinks[];
      if (!isMissingColumnError(error, 'client_id')) throw error;

      const fallback = await buildQuery(false);
      if (fallback.error) throw fallback.error;
      return (fallback.data || []) as CalendarRecordingWithLinks[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('upgrade-amanda-calendar-recordings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_recordings' }, () => {
        queryClient.invalidateQueries({ queryKey: ['calendar-recordings'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useEffect(() => {
    if (!dialogOpen) return;
    if (editingRecording) return;
    if (!form.client_id && clients[0]) {
      setForm((current) => ({ ...current, client_id: clients[0].id }));
    }
  }, [dialogOpen, editingRecording, form.client_id, clients]);

  const filteredRecordings = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    return recordings.filter((recording) => {
      const matchesStatus = statusFilter === 'ALL' || recording.status === statusFilter;
      const profileName = recording.operational_clients?.client_name || recording.brand_profiles?.display_name || '';
      const matchesSearch =
        !searchValue ||
        profileName.toLowerCase().includes(searchValue) ||
        recording.location.toLowerCase().includes(searchValue) ||
        recording.recording_type.toLowerCase().includes(searchValue) ||
        (recording.observations || '').toLowerCase().includes(searchValue);

      return matchesStatus && matchesSearch;
    });
  }, [recordings, search, statusFilter]);

  const stats = useMemo(() => {
    const total = recordings.length;
    const finished = recordings.filter((item) => item.status === 'GRAVADA').length;
    const rescheduled = recordings.filter((item) => item.status === 'REAGENDADA').length;
    const canceled = recordings.filter((item) => item.status === 'CANCELADA').length;
    const cutoff = subDays(new Date(), 30);
    const returnClients = new Set(
      recordings
        .filter((item) => item.status === 'GRAVADA' && parseISO(item.recording_date) <= cutoff)
        .map((item) => item.client_id || item.profile_id || item.id),
    ).size;

    return { total, finished, rescheduled, canceled, returnClients };
  }, [recordings]);

  const reminders = useMemo(() => {
    const cutoff = subDays(new Date(), 30);
    const grouped = new Map<string, { id: string; label: string; date: string }>();

    recordings
      .filter((item) => item.status === 'GRAVADA' && parseISO(item.recording_date) <= cutoff)
      .forEach((item) => {
        const key = item.client_id || item.profile_id || item.id;
        const entry = {
          id: item.id,
          label: getRecordingClientLabel(item),
          date: item.recording_date,
        };
        const current = grouped.get(key);
        if (!current || current.date < entry.date) {
          grouped.set(key, entry);
        }
      });

    return Array.from(grouped.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [recordings]);

  const recordingsByDay = useMemo(() => {
    return filteredRecordings.reduce<Record<string, CalendarRecordingWithLinks[]>>((accumulator, recording) => {
      const bucket = accumulator[recording.recording_date] || [];
      bucket.push(recording);
      accumulator[recording.recording_date] = bucket;
      return accumulator;
    }, {});
  }, [filteredRecordings]);

  const selectedDayRecordings = recordingsByDay[selectedDay] || [];
  const selectedRecording = useMemo(() => {
    if (selectedRecordingId) {
      return filteredRecordings.find((item) => item.id === selectedRecordingId) || null;
    }
    return selectedDayRecordings[0] || null;
  }, [filteredRecordings, selectedDayRecordings, selectedRecordingId]);

  const saveMutation = useMutation({
    mutationFn: async (payload: RecordingFormState & { id?: string }) => {
      console.log('[calendar-recordings] submit payload', payload);
      const selectedClient = clients.find((client) => client.id === payload.client_id) || null;
      const linkedProfileId = selectedClient ? await resolveBrandProfileIdForClient(selectedClient) : null;

      if (!linkedProfileId) {
        throw new Error('Não foi possível vincular o cliente selecionado a um perfil da identidade.');
      }

      const record = {
        client_id: payload.client_id,
        profile_id: linkedProfileId,
        recording_date: payload.recording_date,
        recording_time: payload.recording_time,
        location: payload.location.trim(),
        status: payload.status,
        recording_type: payload.recording_type.trim(),
        observations: payload.observations.trim() || null,
      };
      console.log('[calendar-recordings] record to save', record);

      await runWithSchemaFallback(
        [
          async () => {
            const { error } = await supabase.from('calendar_recordings').upsert(payload.id ? { ...record, id: payload.id } : record, { onConflict: 'id' });
            if (error) throw error;
          },
          async () => {
            const { error } = await supabase.from('calendar_recordings').upsert(payload.id ? { ...omitKeys(record, ['client_id']), id: payload.id } : omitKeys(record, ['client_id']), { onConflict: 'id' });
            if (error) throw error;
          },
          async () => {
            const { error } = await supabase.from('calendar_recordings').upsert(payload.id ? { ...omitKeys(record, ['profile_id']), id: payload.id } : omitKeys(record, ['profile_id']), { onConflict: 'id' });
            if (error) throw error;
          },
        ],
        (error) => isMissingColumnError(error, 'client_id') || isMissingColumnError(error, 'profile_id'),
      );
    },
    onSuccess: () => {
      toast.success(editingRecording ? 'Gravação atualizada com sucesso.' : 'Gravação criada com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['calendar-recordings'] });
      setDialogOpen(false);
      setEditingRecording(null);
      setForm(initialFormState());
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar a gravação.';
      console.error('Erro ao salvar gravação:', error);
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('calendar_recordings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Gravação excluída.');
      queryClient.invalidateQueries({ queryKey: ['calendar-recordings'] });
      setDeleteRecording(null);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Não foi possível excluir a gravação.';
      toast.error(message);
    },
  });

  const openCreateDialog = () => {
    setEditingRecording(null);
    setForm({
      ...initialFormState(),
      client_id: clients[0]?.id || '',
      recording_date: format(new Date(), 'yyyy-MM-dd'),
    });
    setDialogOpen(true);
  };

  const openEditDialog = (recording: CalendarRecordingWithLinks) => {
    setEditingRecording(recording);
    setForm({
      client_id: recording.client_id || '',
      recording_date: recording.recording_date,
      recording_time: recording.recording_time,
      location: recording.location,
      status: recording.status,
      recording_type: recording.recording_type,
      observations: recording.observations || '',
    });
    setDialogOpen(true);
  };

  const submitForm = async () => {
    try {
      if (!form.client_id || !form.recording_date || !form.recording_time || !form.location.trim() || !form.recording_type.trim()) {
        toast.error('Preencha os campos obrigatórios: cliente/doutor, data, horário, local e tipo de gravação.');
        return;
      }

      const conflict = recordings.find((item) => {
        if (editingRecording?.id === item.id) return false;
        return item.client_id === form.client_id && item.recording_date === form.recording_date && item.recording_time === form.recording_time;
      });

      if (conflict) {
        const conflictClient = conflict.operational_clients
          ? (conflict.operational_clients.clinic_name
              ? `${conflict.operational_clients.client_name} - ${conflict.operational_clients.clinic_name}`
              : conflict.operational_clients.client_name)
          : conflict.brand_profiles?.display_name || 'este cliente';
        toast.error(`Já existe uma gravação para ${conflictClient} nesse horário.`);
        return;
      }

      await saveMutation.mutateAsync({ ...form, id: editingRecording?.id });
    } catch (error) {
      console.error('Erro ao submeter gravação:', error);
    }
  };

  const changeMonth = (delta: number) => {
    const nextMonth = addMonths(monthDate, delta);
    const nextMonthValue = format(nextMonth, 'yyyy-MM');
    setSelectedMonth(nextMonthValue);
    setSelectedDay(`${nextMonthValue}-01`);
    setSelectedRecordingId(null);
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedMonth(format(today, 'yyyy-MM'));
    setSelectedDay(format(today, 'yyyy-MM-dd'));
    setSelectedRecordingId(null);
  };

  const handleSelectDay = (dateValue: string) => {
    setSelectedDay(dateValue);
    const dayRecordings = recordingsByDay[dateValue] || [];
    setSelectedRecordingId(dayRecordings[0]?.id || null);
  };

  const handleSelectRecording = (recording: CalendarRecordingWithLinks) => {
    setSelectedDay(recording.recording_date);
    setSelectedRecordingId(recording.id);
  };

  return (
    <div data-cy="calendar-recordings-page" className="space-y-6">
      <div className="relative overflow-hidden rounded-[32px] border border-border/70 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(37,99,235,0.08),_transparent_26%),radial-gradient(circle_at_bottom_left,_rgba(225,6,0,0.05),_transparent_22%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Badge className="w-fit rounded-full bg-blue-50 px-3 py-1 text-blue-700 shadow-none hover:bg-blue-50">
              Evolução Audiovisual
            </Badge>
            <div>
              <h1 className="text-3xl font-black tracking-[-0.05em] text-foreground sm:text-4xl">Calendário de Gravação</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Tudo salvo no Supabase, com atualização em tempo real para quem estiver acessando a mesma base.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild className="rounded-2xl border-border/60 bg-white/85 shadow-sm">
              <a href="/operacional/upgrade-de-amanda">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao hub
              </a>
            </Button>
            <Button data-cy="calendar-recordings-create" className="rounded-2xl bg-red-600 text-white shadow-md shadow-red-500/20 hover:bg-red-500" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nova gravação
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Gravações no mês', value: stats.total, note: 'salvas no período', icon: CalendarDays, tone: 'bg-blue-50 text-blue-600', cy: 'calendar-stat-total' },
          { label: 'Concluídas', value: stats.finished, note: 'gravadas com sucesso', icon: CalendarRange, tone: 'bg-emerald-50 text-emerald-600', cy: 'calendar-stat-finished' },
          { label: 'Reagendadas', value: stats.rescheduled, note: 'pendentes de novo horário', icon: Clock3, tone: 'bg-amber-50 text-amber-600', cy: 'calendar-stat-rescheduled' },
          { label: 'Canceladas', value: stats.canceled, note: 'eventos cancelados', icon: Trash2, tone: 'bg-rose-50 text-rose-600', cy: 'calendar-stat-canceled' },
          { label: 'Clientes para retorno', value: stats.returnClients, note: 'prazo ideal ultrapassado', icon: Users, tone: 'bg-violet-50 text-violet-600', cy: 'calendar-stat-return' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} data-cy={item.cy} className="overflow-hidden rounded-[28px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <div className="mt-1 text-3xl font-black tracking-[-0.05em] text-foreground" data-cy={`${item.cy}-value`}>{item.value}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardHeader className="border-b border-slate-200/80 pb-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <CardTitle className="text-2xl">Agenda</CardTitle>
                <CardDescription>Visualização mensal com eventos destacados por cor.</CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-full border-slate-200 bg-white shadow-none" onClick={() => changeMonth(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-[180px] rounded-full border border-slate-200 bg-white px-4 py-2 text-center shadow-none">
                  <p className="text-sm font-semibold capitalize text-slate-900">{monthLabel}</p>
                </div>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-full border-slate-200 bg-white shadow-none" onClick={() => changeMonth(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="rounded-full border-slate-200 bg-white shadow-none" onClick={goToToday}>
                  Hoje
                </Button>
                <Button variant="outline" className="rounded-full border-slate-200 bg-white shadow-none" onClick={() => setFiltersOpen((current) => !current)}>
                  Filtros
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'mes', label: 'Mês' },
                { id: 'semana', label: 'Semana' },
                { id: 'lista', label: 'Lista' },
              ].map((tab) => {
                const active = viewMode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setViewMode(tab.id as typeof viewMode)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {filtersOpen ? (
              <div className="mt-4 grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_240px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    data-cy="calendar-recordings-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por cliente, local ou tipo"
                    className="h-11 rounded-full border-slate-200 bg-white pl-9 shadow-none"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-cy="calendar-recordings-status-filter" className="h-11 rounded-full border-slate-200 bg-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os status</SelectItem>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </CardHeader>

          <CardContent className="p-5 md:p-6">
            {isLoading ? (
              <div className="flex min-h-[520px] items-center justify-center rounded-[24px] border border-dashed border-border/60 bg-slate-50 text-sm text-muted-foreground">
                Carregando gravações do Supabase...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-7 gap-0 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((day) => (
                    <div key={day} className="py-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid gap-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white md:grid-cols-2 xl:grid-cols-7">
                  {calendarDays.map((day) => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const dayEvents = recordingsByDay[dayKey] || [];
                    const isSelected = selectedDay === dayKey;
                    const isCurrentMonth = isSameMonth(day, monthDate);
                    return (
                      <button
                        key={dayKey}
                        type="button"
                        onClick={() => handleSelectDay(dayKey)}
                        className={`min-h-[156px] border border-slate-200 p-3 text-left transition ${isSelected ? 'border-blue-500 bg-blue-50/50' : 'bg-white hover:bg-slate-50'} ${!isCurrentMonth ? 'bg-slate-50/40 opacity-45' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${isToday(day) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                          >
                            {format(day, 'd')}
                          </div>
                          {dayEvents.length > 0 ? (
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                              {dayEvents.length}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-3 space-y-2">
                          {dayEvents.slice(0, 2).map((recording) => (
                            <button
                              key={recording.id}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleSelectRecording(recording);
                              }}
                              className={`w-full rounded-lg border-l-4 px-3 py-2 text-left text-xs font-medium leading-5 transition hover:bg-white hover:shadow-sm ${getEventTone(recording.status)}`}
                            >
                              <div className="flex items-start gap-2">
                                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${getEventDotTone(recording.status)}`} />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate">{getRecordingClientLabel(recording)}</p>
                                  <p className="text-[11px] opacity-75">{recording.recording_time}</p>
                                </div>
                              </div>
                            </button>
                          ))}
                          {dayEvents.length > 2 ? (
                            <div className="pl-1 text-[11px] font-medium text-muted-foreground">+{dayEvents.length - 2} eventos</div>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="overflow-hidden rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            {selectedRecording ? (
              <>
                <CardHeader className="border-b border-slate-200/80 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <CardTitle className="text-xl">{getRecordingClientLabel(selectedRecording)}</CardTitle>
                      <CardDescription>{selectedRecording.recording_type}</CardDescription>
                    </div>
                    <div className="relative">
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl" onClick={() => setDetailsMenuOpen((current) => !current)}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {detailsMenuOpen ? (
                        <div className="absolute right-0 top-11 z-20 w-44 rounded-2xl border border-border/60 bg-white p-2 shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50"
                            onClick={() => {
                              openEditDialog(selectedRecording);
                              setDetailsMenuOpen(false);
                            }}
                          >
                            <Edit3 className="h-4 w-4" />
                            Editar
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50"
                            onClick={() => {
                              setViewRecording(selectedRecording);
                              setViewOpen(true);
                              setDetailsMenuOpen(false);
                            }}
                          >
                            <CalendarDays className="h-4 w-4" />
                            Ver detalhes
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setDeleteRecording(selectedRecording);
                              setDetailsMenuOpen(false);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <Badge className={`rounded-full ${getStatusTone(selectedRecording.status)}`}>{selectedRecording.status}</Badge>
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {format(new Date(`${selectedRecording.recording_date}T00:00:00`), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="rounded-[22px] border border-border/60 bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Horário</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{selectedRecording.recording_time}</p>
                    </div>
                    <div className="rounded-[22px] border border-border/60 bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Endereço</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{selectedRecording.location}</p>
                    </div>
                    <div className="rounded-[22px] border border-border/60 bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Tipo de gravação</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{selectedRecording.recording_type}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1 rounded-2xl bg-red-600 text-white hover:bg-red-500" onClick={() => openEditDialog(selectedRecording)}>
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 rounded-2xl border-border/60 bg-white"
                      onClick={() => {
                        setViewRecording(selectedRecording);
                        setViewOpen(true);
                      }}
                    >
                      Ver detalhes
                    </Button>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex min-h-[340px] flex-col items-center justify-center p-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <CalendarDays className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">Nenhum evento selecionado</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                  Clique em um evento no calendário para ver os detalhes, editar ou excluir a gravação.
                </p>
              </CardContent>
            )}
          </Card>

          <Card className="overflow-hidden rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <CardHeader className="border-b border-slate-200/80 pb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">Lembretes de retorno</CardTitle>
                  <CardDescription>Clientes que já passaram do prazo ideal.</CardDescription>
                </div>
                <Button variant="ghost" className="rounded-full text-blue-600 hover:bg-blue-50 hover:text-blue-600" onClick={() => setFiltersOpen(true)}>
                  Ver todos
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {reminders.length > 0 ? (
                <div className="space-y-3">
                  {reminders.slice(0, 4).map((item) => (
                    <div key={item.id} className="rounded-[22px] border border-border/60 bg-slate-50 p-4">
                      <p className="font-semibold text-foreground">{item.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{format(parseISO(item.date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[22px] border border-dashed border-border/60 bg-slate-50 p-5 text-sm text-muted-foreground">
                  Nenhum cliente para retorno neste mês.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent data-cy="calendar-recording-view-dialog" className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewRecording ? 'Detalhes da gravação' : 'Gravação'}</DialogTitle>
          </DialogHeader>
          {viewRecording ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[22px] border border-border/60 bg-surface-2/20 p-4 md:col-span-2">
                  <p className="text-sm text-muted-foreground">Cliente / Doutor do CRM Operacional</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {viewRecording.operational_clients
                      ? (viewRecording.operational_clients.clinic_name
                          ? `${viewRecording.operational_clients.client_name} - ${viewRecording.operational_clients.clinic_name}`
                          : viewRecording.operational_clients.client_name)
                      : viewRecording.brand_profiles?.display_name || 'Sem cliente'}
                  </p>
                </div>
                <div className="rounded-[22px] border border-border/60 bg-surface-2/20 p-4">
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="mt-1 font-semibold text-foreground">{format(new Date(`${viewRecording.recording_date}T00:00:00`), 'dd/MM/yyyy', { locale: ptBR })}</p>
                </div>
                <div className="rounded-[22px] border border-border/60 bg-surface-2/20 p-4">
                  <p className="text-sm text-muted-foreground">Horário</p>
                  <p className="mt-1 font-semibold text-foreground">{viewRecording.recording_time}</p>
                </div>
                <div className="rounded-[22px] border border-border/60 bg-surface-2/20 p-4 md:col-span-2">
                  <p className="text-sm text-muted-foreground">Local</p>
                  <p className="mt-1 font-semibold text-foreground">{viewRecording.location}</p>
                </div>
                <div className="rounded-[22px] border border-border/60 bg-surface-2/20 p-4">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="mt-1 font-semibold text-foreground">{viewRecording.status}</p>
                </div>
                <div className="rounded-[22px] border border-border/60 bg-surface-2/20 p-4">
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="mt-1 font-semibold text-foreground">{viewRecording.recording_type}</p>
                </div>
                <div className="rounded-[22px] border border-border/60 bg-surface-2/20 p-4 md:col-span-2">
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="mt-1 font-semibold text-foreground">{viewRecording.observations || 'Sem observações'}</p>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-cy="calendar-recording-dialog" className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRecording ? 'Editar gravação' : 'Nova gravação'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Cliente / Doutor do CRM Operacional</Label>
              <Select value={form.client_id} onValueChange={(value) => setForm((current) => ({ ...current, client_id: value }))}>
                <SelectTrigger data-cy="calendar-recording-client" className="h-11 rounded-2xl">
                  <SelectValue placeholder="Selecione um perfil do CRM operacional" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.clinic_name ? `${client.client_name} - ${client.clinic_name}` : client.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Lista vinda do CRM Operacional. Se o cliente não aparecer, cadastre ou ative ele lá primeiro.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recording-date">Data</Label>
              <Input
                data-cy="calendar-recording-date"
                id="recording-date"
                type="date"
                value={form.recording_date}
                onChange={(event) => setForm((current) => ({ ...current, recording_date: event.target.value }))}
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recording-time">Horário</Label>
              <Input
                data-cy="calendar-recording-time"
                id="recording-time"
                type="time"
                value={form.recording_time}
                onChange={(event) => setForm((current) => ({ ...current, recording_time: event.target.value }))}
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="recording-type">Tipo de gravação</Label>
              <Input
                data-cy="calendar-recording-type"
                id="recording-type"
                value={form.recording_type}
                onChange={(event) => setForm((current) => ({ ...current, recording_type: event.target.value }))}
                placeholder="Ex.: Reels, depoimento, institucional"
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="recording-location">Endereço / local</Label>
              <Input
                data-cy="calendar-recording-location"
                id="recording-location"
                value={form.location}
                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                placeholder="Endereço, clínica ou estúdio"
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}>
                <SelectTrigger data-cy="calendar-recording-status" className="h-11 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="recording-observations">Observações</Label>
              <Textarea
                data-cy="calendar-recording-observations"
                id="recording-observations"
                value={form.observations}
                onChange={(event) => setForm((current) => ({ ...current, observations: event.target.value }))}
                placeholder="Anotações sobre roteiro, equipe, deslocamento, pendências..."
                className="min-h-32 rounded-2xl"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button className="bg-red-600 text-white hover:bg-red-500" onClick={submitForm} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : editingRecording ? 'Salvar alterações' : 'Criar gravação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteRecording)} onOpenChange={(open) => !open && setDeleteRecording(null)}>
        <DialogContent data-cy="calendar-recording-delete-dialog">
          <DialogHeader>
            <DialogTitle>Excluir gravação</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir a gravação de{' '}
            <strong>
              {deleteRecording?.operational_clients
                ? (deleteRecording.operational_clients.clinic_name
                    ? `${deleteRecording.operational_clients.client_name} - ${deleteRecording.operational_clients.clinic_name}`
                    : deleteRecording.operational_clients.client_name)
                : deleteRecording?.brand_profiles?.display_name || 'este registro'}
            </strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRecording(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteRecording && deleteMutation.mutate(deleteRecording.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
