import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarDays,
  CalendarRange,
  Clock3,
  Edit3,
  MapPin,
  Plus,
  Search,
  Trash2,
  Video,
  Users,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
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

async function resolveBrandProfileIdForClient(client: OperationalClientRow) {
  const clientName = client.client_name.trim();
  if (!clientName) return null;

  const { data: existingProfiles, error: lookupError } = await supabase
    .from('brand_profiles')
    .select('id')
    .ilike('display_name', clientName)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (lookupError) throw lookupError;

  const existingProfileId = existingProfiles?.[0]?.id;
  if (existingProfileId) return existingProfileId;

  const { data: createdProfiles, error: createError } = await supabase
    .from('brand_profiles')
    .insert({
      display_name: clientName,
      profile_type: 'CLIENT',
      specialty: client.clinic_name || null,
      notes: 'Sincronizado do CRM operacional',
      is_active: true,
    })
    .select('id')
    .limit(1);

  if (createError) throw createError;

  return createdProfiles?.[0]?.id || null;
}

export default function UpgradeAmandaCalendarioGravacao() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingRecording, setEditingRecording] = useState<CalendarRecordingWithLinks | null>(null);
  const [viewRecording, setViewRecording] = useState<CalendarRecordingWithLinks | null>(null);
  const [deleteRecording, setDeleteRecording] = useState<CalendarRecordingWithLinks | null>(null);
  const [form, setForm] = useState<RecordingFormState>(initialFormState());

  const monthDate = parseISO(`${selectedMonth}-01`);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);

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
      const { data, error } = await supabase
        .from('calendar_recordings')
        .select('*, operational_clients(id, client_name, clinic_name), brand_profiles(id, display_name, profile_type)')
        .gte('recording_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('recording_date', format(monthEnd, 'yyyy-MM-dd'))
        .order('recording_date', { ascending: true })
        .order('recording_time', { ascending: true });
      if (error) throw error;
      return (data || []) as CalendarRecordingWithLinks[];
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
    const upcoming = recordings.filter((item) => ['AGENDADA', 'CONFIRMADA'].includes(item.status)).length;
    const rescheduled = recordings.filter((item) => item.status === 'REAGENDADA').length;
    const clients = new Set(recordings.map((item) => item.client_id || item.profile_id).filter(Boolean)).size;
    const plannedContent = recordings.filter((item) => Boolean(item.observations?.trim())).length;

    return { total, finished, upcoming, rescheduled, clients, plannedContent };
  }, [recordings]);

  const reminders = useMemo(() => {
    const cutoff = subDays(new Date(), 30);
    return recordings
      .filter((item) => item.status === 'GRAVADA' && parseISO(item.recording_date) <= cutoff)
      .map((item) => {
        const clientLabel = item.operational_clients
          ? (item.operational_clients.clinic_name
              ? `${item.operational_clients.client_name} - ${item.operational_clients.clinic_name}`
              : item.operational_clients.client_name)
          : item.brand_profiles?.display_name || 'cliente';

        return {
          id: item.id,
          label: `Agendar nova gravação com cliente ${clientLabel}`,
          date: item.recording_date,
        };
      });
  }, [recordings]);

  const saveMutation = useMutation({
    mutationFn: async (payload: RecordingFormState & { id?: string }) => {
      const selectedClient = clients.find((client) => client.id === payload.client_id) || null;
      const linkedProfileId = selectedClient ? await resolveBrandProfileIdForClient(selectedClient) : null;

      if (!linkedProfileId) {
        throw new Error('Não foi possível vincular o cliente selecionado a um perfil da identidade.');
      }

      const record = {
        profile_id: linkedProfileId,
        recording_date: payload.recording_date,
        recording_time: payload.recording_time,
        location: payload.location.trim(),
        status: payload.status,
        recording_type: payload.recording_type.trim(),
        observations: payload.observations.trim() || null,
      };

      if (payload.id) {
        const { data, error } = await supabase
          .from('calendar_recordings')
          .update(record)
          .eq('id', payload.id)
          .select('*, operational_clients(id, client_name, clinic_name), brand_profiles(id, display_name, profile_type)')
          .single();
        if (error) throw error;
        return data as CalendarRecordingWithLinks;
      }

      const { data, error } = await supabase
        .from('calendar_recordings')
        .insert(record)
        .select('*, operational_clients(id, client_name, clinic_name), brand_profiles(id, display_name, profile_type)')
        .single();
      if (error) throw error;
      return data as CalendarRecordingWithLinks;
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
  };

  return (
    <div data-cy="calendar-recordings-page" className="space-y-6">
      <div className="relative overflow-hidden rounded-[32px] border border-border/70 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.08),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(225,6,0,0.06),_transparent_24%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Badge className="w-fit rounded-full bg-blue-50 px-3 py-1 text-blue-600 shadow-none hover:bg-blue-50">
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
              <Link to="/operacional/agenda">
                <CalendarDays className="mr-2 h-4 w-4" />
                Abrir agenda operacional
              </Link>
            </Button>
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          { label: 'Gravações no mês', value: stats.total, note: 'total salvo', icon: CalendarDays, tone: 'bg-blue-50 text-blue-600', cy: 'calendar-stat-total' },
          { label: 'Próximas', value: stats.upcoming, note: 'agendadas ou confirmadas', icon: Video, tone: 'bg-emerald-50 text-emerald-600', cy: 'calendar-stat-upcoming' },
          { label: 'Concluídas', value: stats.finished, note: 'gravadas', icon: CalendarRange, tone: 'bg-violet-50 text-violet-600', cy: 'calendar-stat-finished' },
          { label: 'Reagendadas', value: stats.rescheduled, note: 'pendentes de novo horário', icon: Clock3, tone: 'bg-amber-50 text-amber-600', cy: 'calendar-stat-rescheduled' },
          { label: 'Clientes', value: stats.clients, note: 'clientes diferentes', icon: Users, tone: 'bg-fuchsia-50 text-fuchsia-600', cy: 'calendar-stat-clients' },
          { label: 'Conteúdo planejado', value: stats.plannedContent, note: 'com observações', icon: CalendarRange, tone: 'bg-sky-50 text-sky-600', cy: 'calendar-stat-planned' },
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

      {reminders.length > 0 ? (
        <Card data-cy="calendar-reminders" className="overflow-hidden rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle className="text-xl">Lembretes de retorno</CardTitle>
            <CardDescription>Gravações concluídas há 30 dias ou mais.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {reminders.map((item) => (
                <div key={item.id} data-cy="calendar-reminder-item" className="rounded-2xl border border-border/60 bg-slate-50 p-4">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{format(parseISO(item.date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="text-xl">Agenda sincronizada</CardTitle>
              <CardDescription>Edite, exclua e crie gravações sem perder a persistência no Supabase.</CardDescription>
            </div>
            <div className="grid gap-3 md:grid-cols-[220px_180px_1fr]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  data-cy="calendar-recordings-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por cliente, local ou tipo"
                  className="h-11 rounded-2xl border-border/60 bg-white pl-9 shadow-none"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-cy="calendar-recordings-status-filter" className="h-11 rounded-2xl border-border/60 bg-white">
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
              <Input
                data-cy="calendar-recordings-month-filter"
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="h-11 rounded-2xl border-border/60 bg-white shadow-none"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent data-cy="calendar-recordings-list" className="p-0">
          {isLoading ? (
            <div className="p-8 text-sm text-muted-foreground">Carregando gravações do Supabase...</div>
          ) : filteredRecordings.length === 0 ? (
            <div data-cy="calendar-recordings-empty" className="p-10 text-center">
              <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <p className="mt-4 text-lg font-semibold text-foreground">Nenhuma gravação encontrada</p>
              <p className="mt-1 text-sm text-muted-foreground">Crie uma gravação nova ou ajuste os filtros.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredRecordings.map((recording) => (
                <div key={recording.id} data-cy="calendar-recording-row" className="grid gap-4 p-5 lg:grid-cols-[1.35fr_0.95fr_0.6fr_auto] lg:items-center">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                      <Video className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          data-cy="calendar-recording-view"
                          className="text-left font-bold text-foreground hover:underline"
                          onClick={() => { setViewRecording(recording); setViewOpen(true); }}
                        >
                          {recording.operational_clients
                            ? (recording.operational_clients.clinic_name
                                ? `${recording.operational_clients.client_name} - ${recording.operational_clients.clinic_name}`
                                : recording.operational_clients.client_name)
                            : recording.brand_profiles?.display_name || 'Sem cliente'}
                        </button>
                        <Badge className={`rounded-full ${getStatusTone(recording.status)}`}>{recording.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{recording.recording_type}</p>
                      {recording.observations ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{recording.observations}</p> : null}
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      <span>{format(new Date(`${recording.recording_date}T00:00:00`), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4" />
                      <span>{recording.recording_time}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{recording.location}</span>
                    </div>
                  </div>

                  <div>
                    <Badge className="rounded-full bg-slate-100 text-slate-700">
                      {recording.operational_clients ? 'CRM operacional' : 'Legado'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-start gap-2 lg:justify-end">
                    <Button data-cy="calendar-recording-view-action" variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-border/60 bg-white" onClick={() => { setViewRecording(recording); setViewOpen(true); }}>
                      <CalendarDays className="h-4 w-4" />
                    </Button>
                    <Button data-cy="calendar-recording-edit-action" variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-border/60 bg-white" onClick={() => openEditDialog(recording)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      data-cy="calendar-recording-delete-action"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-2xl border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                      onClick={() => setDeleteRecording(recording)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
