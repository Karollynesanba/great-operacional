import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CalendarRange,
  Clock3,
  Filter,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAgendaData, type AgendaEvent, type AgendaEventInsert } from '@/hooks/useAgendaData';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { cn, getLocalDateString } from '@/lib/utils';

type ViewMode = 'month' | 'week' | 'day';
type ComposerMode = 'create' | 'edit';
type AgendaDisplayEvent = AgendaEvent & {
  source?: 'database' | 'holiday';
  isAllDay?: boolean;
  holidayType?: string;
};

type ComposerDraft = {
  title: string;
  description: string;
  notes: string;
  client_name: string;
  client_phone: string;
  event_date: string;
  event_time: string;
  duration_minutes: number;
  meeting_link: string;
  color: string;
  assigned_closer_id: string;
  team_id: string;
};

const COLOR_PRESETS = [
  '#EF4444',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#A855F7',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
];

const LEGEND = [
  { label: 'Reunião', color: '#EF4444' },
  { label: 'Compromisso', color: '#3B82F6' },
  { label: 'Ligação', color: '#F59E0B' },
  { label: 'Evento', color: '#A855F7' },
  { label: 'Feriado', color: '#E11D48' },
  { label: 'Lembrete', color: '#22C55E' },
];

type HolidayDefinition = {
  name: string;
  month: number;
  day: number;
  color: string;
  holidayType: string;
  description?: string;
  notes?: string;
};

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function addDaysToDate(date: Date, offset: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function getEasterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function dateToHolidayString(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function getHolidayEventsForYear(year: number): AgendaDisplayEvent[] {
  const easter = getEasterSunday(year);
  const carnival = addDaysToDate(easter, -47);
  const goodFriday = addDaysToDate(easter, -2);
  const corpusChristi = addDaysToDate(easter, 60);

  const holidays: HolidayDefinition[] = [
    { name: 'Confraternização Universal', month: 1, day: 1, color: '#E11D48', holidayType: 'Feriado nacional', description: 'Início do ano' },
    { name: 'Carnaval', month: carnival.getMonth() + 1, day: carnival.getDate(), color: '#A855F7', holidayType: 'Ponto facultativo', description: 'Data móvel' },
    { name: 'Sexta-feira Santa', month: goodFriday.getMonth() + 1, day: goodFriday.getDate(), color: '#8B5CF6', holidayType: 'Feriado nacional', description: 'Data móvel' },
    { name: 'Páscoa', month: easter.getMonth() + 1, day: easter.getDate(), color: '#F59E0B', holidayType: 'Data comemorativa', description: 'Data móvel' },
    { name: 'Tiradentes', month: 4, day: 21, color: '#0EA5E9', holidayType: 'Feriado nacional', description: 'Data cívica' },
    { name: 'Dia do Trabalho', month: 5, day: 1, color: '#3B82F6', holidayType: 'Feriado nacional', description: 'Dia do trabalhador' },
    { name: 'Corpus Christi', month: corpusChristi.getMonth() + 1, day: corpusChristi.getDate(), color: '#10B981', holidayType: 'Ponto facultativo', description: 'Data móvel' },
    { name: 'São João', month: 6, day: 24, color: '#F97316', holidayType: 'Festa junina', description: 'Comemorativo regional' },
    { name: 'Independência do Brasil', month: 9, day: 7, color: '#2563EB', holidayType: 'Feriado nacional', description: 'Data cívica' },
    { name: 'Nossa Senhora Aparecida', month: 10, day: 12, color: '#FB7185', holidayType: 'Feriado nacional', description: 'Padroeira do Brasil' },
    { name: 'Finados', month: 11, day: 2, color: '#64748B', holidayType: 'Feriado nacional', description: 'Dia de Finados' },
    { name: 'Proclamação da República', month: 11, day: 15, color: '#14B8A6', holidayType: 'Feriado nacional', description: 'Data cívica' },
    { name: 'Natal', month: 12, day: 25, color: '#DC2626', holidayType: 'Feriado nacional', description: 'Natal' },
  ];

  return holidays.map((holiday, index) => ({
    id: `holiday-${year}-${pad2(holiday.month)}-${pad2(holiday.day)}-${index}`,
    title: holiday.name,
    description: holiday.description || holiday.holidayType,
    notes: holiday.notes || 'Aviso automático gerado pelo sistema.',
    client_name: holiday.holidayType,
    client_phone: '',
    event_date: dateToHolidayString(year, holiday.month, holiday.day),
    event_time: '00:00:00',
    duration_minutes: 1440,
    meeting_link: null,
    color: holiday.color,
    reminder_2h_sent: false,
    reminder_30min_sent: false,
    created_by_user_id: null,
    assigned_closer_id: null,
    team_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    assigned_closer: null,
    team: null,
    source: 'holiday',
    isAllDay: true,
    holidayType: holiday.holidayType,
  }));
}

function emptyDraft(date = getLocalDateString()): ComposerDraft {
  return {
    title: '',
    description: '',
    notes: '',
    client_name: '',
    client_phone: '',
    event_date: date,
    event_time: '09:00',
    duration_minutes: 60,
    meeting_link: '',
    color: '#EF4444',
    assigned_closer_id: '',
    team_id: '',
  };
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function eventEndTime(event: AgendaEvent) {
  const base = parseISO(`2000-01-01T${event.event_time}`);
  return format(new Date(base.getTime() + (event.duration_minutes || 60) * 60000), 'HH:mm');
}

function eventSearchBlob(event: AgendaEvent) {
  return normalizeText(
    [
      event.title,
      event.client_name,
      event.client_phone,
      event.description || '',
      event.notes || '',
      event.team?.name || '',
      event.assigned_closer?.full_name || '',
    ].join(' '),
  );
}

function dayTitle(date: Date) {
  return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
}

function monthLabel(date: Date) {
  return format(date, "MMMM 'de' yyyy", { locale: ptBR });
}

function buildDraftFromEvent(event: AgendaEvent): ComposerDraft {
  return {
    title: event.title,
    description: event.description || '',
    notes: event.notes || '',
    client_name: event.client_name,
    client_phone: event.client_phone,
    event_date: event.event_date,
    event_time: event.event_time.slice(0, 5),
    duration_minutes: event.duration_minutes || 60,
    meeting_link: event.meeting_link || '',
    color: event.color || '#EF4444',
    assigned_closer_id: event.assigned_closer_id || '',
    team_id: event.team_id || '',
  };
}

export default function Agenda() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { events, isLoading, createEvent, updateEvent, deleteEvent } = useAgendaData();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<ComposerMode>('create');
  const [composerDraft, setComposerDraft] = useState<ComposerDraft>(emptyDraft());
  const [deleteTarget, setDeleteTarget] = useState<AgendaDisplayEvent | null>(null);

  const holidayEvents = useMemo(() => getHolidayEventsForYear(currentMonth.getFullYear()), [currentMonth]);

  const allEvents = useMemo(() => [...events, ...holidayEvents], [events, holidayEvents]);

  const filteredEvents = useMemo(() => {
    const needle = normalizeText(searchTerm);
    const source = needle.length === 0 ? allEvents : allEvents.filter((event) => eventSearchBlob(event).includes(needle));

    return [...source].sort((a, b) => {
      if (a.event_date !== b.event_date) return a.event_date.localeCompare(b.event_date);
      return a.event_time.localeCompare(b.event_time);
    });
  }, [allEvents, searchTerm]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, AgendaDisplayEvent[]>();
    filteredEvents.forEach((event) => {
      const list = map.get(event.event_date) || [];
      list.push(event);
      map.set(event.event_date, list);
    });

    map.forEach((list) => list.sort((a, b) => a.event_time.localeCompare(b.event_time)));
    return map;
  }, [filteredEvents]);

  const selectedDayKey = format(selectedDate, 'yyyy-MM-dd');
  const selectedDayEvents = eventsByDate.get(selectedDayKey) || [];
  const selectedEvent = useMemo(
    () => filteredEvents.find((event) => event.id === selectedEventId) || selectedDayEvents[0] || null,
    [filteredEvents, selectedDayEvents, selectedEventId],
  );

  useEffect(() => {
    if (!selectedEventId) return;
    const stillExists = allEvents.some((event) => event.id === selectedEventId);
    if (!stillExists) {
      setSelectedEventId(null);
    }
  }, [allEvents, selectedEventId]);

  useEffect(() => {
    if (!selectedDayEvents.length) {
      setSelectedEventId(null);
      return;
    }

    if (!selectedEventId || !selectedDayEvents.some((event) => event.id === selectedEventId)) {
      const primaryEvent = selectedDayEvents.find((event) => event.source !== 'holiday') || selectedDayEvents[0];
      setSelectedEventId(primaryEvent.id);
    }
  }, [selectedDayEvents, selectedEventId]);

  const monthGridDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days: Date[] = [];
    for (let day = gridStart; day <= gridEnd; day = addDays(day, 1)) {
      days.push(day);
    }
    return days;
  }, [currentMonth]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [selectedDate]);

  const upcomingEvents = useMemo(() => {
    const today = startOfDay(new Date());
    return filteredEvents
      .filter((event) => event.source !== 'holiday')
      .filter((event) => {
        const eventDate = parseISO(event.event_date);
        return isAfter(eventDate, today) || isSameDay(eventDate, today);
      })
      .slice(0, 4);
  }, [filteredEvents]);

  const monthHolidayEvents = useMemo(() => {
    return holidayEvents
      .filter((event) => isSameMonth(parseISO(event.event_date), currentMonth))
      .sort((a, b) => a.event_date.localeCompare(b.event_date));
  }, [holidayEvents, currentMonth]);

  const monthTotal = filteredEvents.filter((event) => isSameMonth(parseISO(event.event_date), currentMonth)).length;
  const todayTotal = filteredEvents.filter((event) => event.event_date === getLocalDateString()).length;
  const weekTotal = filteredEvents.filter((event) => {
    const eventDate = parseISO(event.event_date);
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 0 });
    return (isAfter(eventDate, start) || isSameDay(eventDate, start)) && (isBefore(eventDate, end) || isSameDay(eventDate, end));
  }).length;

  const selectedDateLabel = dayTitle(selectedDate);
  const monthBadgeLabel = monthLabel(currentMonth);
  const selectedEventColor = selectedEvent?.color || '#EF4444';
  const isHolidaySelected = selectedEvent?.source === 'holiday';

  const openCreateComposer = (date = selectedDate) => {
    setComposerMode('create');
    setComposerDraft(emptyDraft(format(date, 'yyyy-MM-dd')));
    setComposerOpen(true);
  };

  const openEditComposer = (event: AgendaDisplayEvent) => {
    if (event.source === 'holiday') {
      toast.info('Esse é um aviso automático de feriado e não pode ser editado.');
      return;
    }
    setComposerMode('edit');
    setComposerDraft(buildDraftFromEvent(event));
    setSelectedEventId(event.id);
    setComposerOpen(true);
  };

  const handleSaveEvent = async () => {
    const payload: AgendaEventInsert = {
      title: composerDraft.title.trim(),
      description: composerDraft.description.trim() || null,
      notes: composerDraft.notes.trim() || null,
      client_name: composerDraft.client_name.trim(),
      client_phone: composerDraft.client_phone.trim(),
      event_date: composerDraft.event_date,
      event_time: composerDraft.event_time.length === 5 ? `${composerDraft.event_time}:00` : composerDraft.event_time,
      duration_minutes: Number(composerDraft.duration_minutes) || 60,
      meeting_link: composerDraft.meeting_link.trim() || null,
      color: composerDraft.color,
      created_by_user_id: user?.id || null,
      assigned_closer_id: composerDraft.assigned_closer_id || null,
      team_id: composerDraft.team_id || null,
    };

    if (!payload.title || !payload.client_name || !payload.client_phone || !payload.event_date || !payload.event_time) {
      toast.error('Preencha título, cliente, telefone, data e horário.');
      return;
    }

    try {
      if (composerMode === 'create') {
        await createEvent.mutateAsync(payload);
        setSelectedDate(parseISO(payload.event_date));
      } else if (selectedEventId) {
        await updateEvent.mutateAsync({
          id: selectedEventId,
          ...payload,
        });
      }

      setComposerOpen(false);
      setSelectedEventId(null);
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.source === 'holiday') {
      toast.info('Avisos automáticos de feriado não podem ser apagados.');
      setDeleteTarget(null);
      return;
    }
    try {
      await deleteEvent.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      if (selectedEventId === deleteTarget.id) {
        setSelectedEventId(null);
      }
    } catch (error) {
      console.error('Erro ao excluir evento:', error);
    }
  };

  const renderEventChip = (event: AgendaDisplayEvent, compact = false) => (
    <button
      key={event.id}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setSelectedDate(parseISO(event.event_date));
        setSelectedEventId(event.id);
      }}
      className={cn(
        'group relative w-full rounded-xl border px-2.5 py-2 text-left transition-all hover:-translate-y-[1px] hover:shadow-sm',
        selectedEventId === event.id ? 'border-primary/30 ring-1 ring-primary/20' : 'border-transparent',
        event.source === 'holiday' && 'border-dashed',
        compact && 'py-1.5',
        event.source !== 'holiday' && 'pr-9',
      )}
      style={{
        backgroundColor: `${event.color || '#EF4444'}15`,
        borderLeft: `3px solid ${event.color || '#EF4444'}`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold" style={{ color: event.color || '#EF4444' }}>
          {event.source === 'holiday' ? `Dia todo • ${event.title}` : `${event.event_time.slice(0, 5)} ${event.title}`}
        </span>
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {event.source === 'holiday' ? 'Feriado' : `${event.duration_minutes || 60}m`}
        </span>
      </div>
      {!compact ? (
        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="truncate">{event.source === 'holiday' ? 'Aviso automático' : event.client_name}</span>
          {event.source !== 'holiday' && event.assigned_closer?.full_name ? <span className="truncate">{event.assigned_closer.full_name}</span> : null}
        </div>
      ) : null}

      {event.source !== 'holiday' ? (
        <button
          type="button"
          aria-label={`Excluir compromisso ${event.title}`}
          title="Excluir compromisso"
          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-transparent bg-white/90 text-muted-foreground opacity-0 shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteTarget(event);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[30px] border border-border/70 bg-white/90 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-sm md:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(225,6,0,0.08),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.08),_transparent_26%)]" />

        <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-md shadow-red-500/20">
                <CalendarRange className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-[-0.05em] text-foreground">Agenda</h1>
                <p className="text-sm text-muted-foreground">Organize seus compromissos, reuniões e lembretes.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative w-full xl:w-[280px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar na agenda..."
                className="h-11 rounded-2xl border-border/60 bg-surface-2 pl-10 shadow-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className="h-11 rounded-2xl border-border/60 bg-white/80"
                onClick={() => {
                  const today = new Date();
                  setCurrentMonth(today);
                  setSelectedDate(today);
                }}
              >
                Hoje
              </Button>

              <div className="flex items-center gap-1 rounded-2xl border border-border/60 bg-white/80 px-2 py-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-xl"
                  onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[110px] px-2 text-center text-sm font-semibold capitalize text-foreground">
                  {monthBadgeLabel}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-xl"
                  onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center rounded-2xl border border-border/60 bg-surface-2 p-1">
                {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      'h-9 rounded-xl px-4 capitalize',
                      viewMode === mode ? 'bg-red-600 text-white hover:bg-red-600' : 'text-muted-foreground',
                    )}
                  >
                    {mode === 'month' && <LayoutGrid className="mr-2 h-4 w-4" />}
                    {mode === 'week' && <Filter className="mr-2 h-4 w-4" />}
                    {mode === 'day' && <List className="mr-2 h-4 w-4" />}
                    {mode === 'month' ? 'Mês' : mode === 'week' ? 'Semana' : 'Dia'}
                  </Button>
                ))}
              </div>

              <Button
                className="h-11 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 px-5 text-white shadow-md shadow-red-500/20 hover:from-red-500 hover:to-red-600"
                onClick={() => openCreateComposer(selectedDate)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova reunião
              </Button>

              <Button variant="outline" size="icon" className="h-11 w-11 rounded-2xl border-border/60 bg-white/80">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="relative mt-5 grid gap-3 md:grid-cols-3">
          {[
            { label: 'Eventos no mês', value: monthTotal, accent: 'bg-red-500/10 text-red-600' },
            { label: 'Eventos hoje', value: todayTotal, accent: 'bg-blue-500/10 text-blue-600' },
            { label: 'Eventos na semana', value: weekTotal, accent: 'bg-emerald-500/10 text-emerald-600' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-border/60 bg-white/90 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <span className="text-3xl font-black tracking-[-0.05em] text-foreground">{item.value}</span>
                <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', item.accent)}>{selectedDateLabel}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-blue-200/70 bg-blue-50/70 px-4 py-3 text-sm text-blue-900">
        <strong className="font-semibold">Avisos automáticos:</strong> feriados nacionais, São João e datas comemorativas do ano atual aparecem automaticamente na agenda.
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_370px]">
        <Card className="overflow-hidden rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle className="text-xl">Calendário</CardTitle>
            <CardDescription>Visualização mensal com eventos destacados por cor.</CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando agenda...</div>
            ) : viewMode === 'month' ? (
              <div className="overflow-x-auto">
                <div className="min-w-[980px] p-4 md:p-6">
                  <div className="grid grid-cols-7 gap-2 pb-3">
                    {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((day) => (
                      <div key={day} className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {monthGridDays.map((day) => {
                      const key = format(day, 'yyyy-MM-dd');
                      const dayEvents = eventsByDate.get(key) || [];
                      const outsideMonth = !isSameMonth(day, currentMonth);
                      const selected = isSameDay(day, selectedDate);

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setSelectedDate(day);
                            const primaryEvent = dayEvents.find((event) => event.source !== 'holiday') || dayEvents[0] || null;
                            setSelectedEventId(primaryEvent?.id || null);
                          }}
                          className={cn(
                            'group flex min-h-[150px] flex-col rounded-[24px] border p-3 text-left transition-all',
                            outsideMonth ? 'bg-surface-2/45 text-muted-foreground' : 'bg-white',
                            selected ? 'border-red-300 ring-2 ring-red-200/70' : 'border-border/60 hover:border-red-200',
                          )}
                        >
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <span
                              className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                                isToday(day) && 'bg-red-600 text-white',
                                !isToday(day) && outsideMonth && 'text-muted-foreground',
                              )}
                            >
                              {format(day, 'd')}
                            </span>
                            {dayEvents.length > 0 ? (
                              <Badge variant="outline" className="rounded-full bg-red-50 text-[10px] uppercase tracking-[0.16em] text-red-600">
                                {dayEvents.length}
                              </Badge>
                            ) : null}
                          </div>

                          <div className="space-y-1.5">
                            {dayEvents.slice(0, 3).map((event) => (
                              <div key={event.id} onClick={(e) => e.stopPropagation()}>
                                {renderEventChip(event)}
                              </div>
                            ))}

                            {dayEvents.length > 3 ? (
                              <div className="rounded-xl border border-dashed border-border bg-surface-2 px-2.5 py-1.5 text-xs text-muted-foreground">
                                +{dayEvents.length - 3} mais
                              </div>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : viewMode === 'week' ? (
              <div className="grid gap-3 p-4 md:grid-cols-7 md:p-6">
                {weekDays.map((day) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const dayEvents = eventsByDate.get(key) || [];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        'rounded-[24px] border border-border/60 bg-white p-3 text-left transition-all hover:border-red-200',
                        isSameDay(day, selectedDate) && 'ring-2 ring-red-200/70',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {format(day, 'EEE', { locale: ptBR })}
                          </p>
                          <p className={cn('text-lg font-black tracking-[-0.04em]', isToday(day) && 'text-red-600')}>
                            {format(day, 'dd')}
                          </p>
                        </div>
                        <Badge variant="outline" className="rounded-full bg-surface-2 text-xs">
                          {dayEvents.length}
                        </Badge>
                      </div>

                      <div className="mt-3 space-y-2">
                        {dayEvents.slice(0, 2).map((event) => (
                          <div key={event.id}>{renderEventChip(event, true)}</div>
                        ))}
                        {dayEvents.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border bg-surface-2 px-3 py-4 text-center text-xs text-muted-foreground">
                            Sem eventos
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid gap-4 p-4 md:grid-cols-[280px_1fr] md:p-6">
                <div className="rounded-[24px] border border-border/60 bg-surface-2 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Dia selecionado</p>
                  <h3 className="mt-2 text-2xl font-black tracking-[-0.05em] text-foreground">{selectedDateLabel}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedDayEvents.length} compromisso(s) neste dia</p>

                  <Button
                    className="mt-4 w-full rounded-2xl bg-red-600 text-white hover:bg-red-500"
                    onClick={() => openCreateComposer(selectedDate)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Novo compromisso
                  </Button>
                </div>

                <ScrollArea className="h-[520px] pr-3">
                  <div className="space-y-3">
                    {selectedDayEvents.map((event) => (
                      <div key={event.id}>{renderEventChip(event)}</div>
                    ))}
                    {selectedDayEvents.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-border bg-white p-8 text-center text-muted-foreground">
                        Nenhum compromisso encontrado para este dia.
                      </div>
                    ) : null}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle className="text-xl">Detalhes</CardTitle>
            <CardDescription>{selectedEvent ? 'Evento selecionado' : 'Selecione um evento no calendário'}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 p-5">
            {selectedEvent ? (
              <>
                <div
                  className="rounded-[24px] border border-border/60 p-4"
                  style={{ backgroundColor: `${selectedEventColor}10` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <Badge className="rounded-full" style={{ backgroundColor: `${selectedEventColor}18`, color: selectedEventColor }}>
                        {selectedEvent.title}
                      </Badge>
                      <h3 className="text-2xl font-black tracking-[-0.05em] text-foreground">
                        {isHolidaySelected ? selectedEvent.title : selectedEvent.client_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">{selectedEvent.description || 'Sem descrição'}</p>
                    </div>
                    <div className="rounded-full border border-border bg-white p-2 text-muted-foreground">
                      <CalendarDays className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm">
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/80 px-3 py-2.5">
                      <span className="text-muted-foreground">Data</span>
                      <span className="font-semibold text-foreground">{format(parseISO(selectedEvent.event_date), 'dd/MM/yyyy')}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/80 px-3 py-2.5">
                      <span className="text-muted-foreground">Horário</span>
                      <span className="font-semibold text-foreground">
                        {isHolidaySelected ? 'Dia todo' : `${selectedEvent.event_time.slice(0, 5)} - ${eventEndTime(selectedEvent)}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/80 px-3 py-2.5">
                      <span className="text-muted-foreground">Telefone</span>
                      <span className="font-semibold text-foreground">{selectedEvent.client_phone}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/80 px-3 py-2.5">
                      <span className="text-muted-foreground">Duração</span>
                      <span className="font-semibold text-foreground">
                        {isHolidaySelected ? 'Dia inteiro' : `${selectedEvent.duration_minutes} min`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-2xl border border-border/60 bg-surface-2 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {isHolidaySelected ? 'Aviso automático' : 'Time e responsável'}
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {isHolidaySelected ? (
                        <>
                          <p><span className="font-medium text-foreground">Tipo:</span> {selectedEvent.holidayType || 'Feriado'}</p>
                          <p><span className="font-medium text-foreground">Origem:</span> Sistema</p>
                          <p><span className="font-medium text-foreground">Observação:</span> Não pode ser editado ou removido.</p>
                        </>
                      ) : (
                        <>
                          <p><span className="font-medium text-foreground">Closer:</span> {selectedEvent.assigned_closer?.full_name || '-'}</p>
                          <p><span className="font-medium text-foreground">Equipe:</span> {selectedEvent.team?.name || '-'}</p>
                          <p><span className="font-medium text-foreground">Criado por:</span> {selectedEvent.created_by_user_id || '-'}</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-surface-2 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Clock3 className="h-4 w-4 text-muted-foreground" />
                      Observações
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                      {selectedEvent.notes || 'Nenhuma observação adicionada.'}
                    </p>
                    {selectedEvent.meeting_link ? (
                      <a
                        href={selectedEvent.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                      >
                        Abrir link da reunião
                      </a>
                    ) : null}
                  </div>
                </div>

                {!isHolidaySelected ? (
                  <div className="flex items-center gap-2">
                    <Button className="flex-1 rounded-2xl" onClick={() => openEditComposer(selectedEvent)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-2xl border-border/60"
                      onClick={() => setDeleteTarget(selectedEvent)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-white px-4 py-3 text-sm text-muted-foreground">
                    Esse aviso é automático e acompanha o calendário do ano.
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-[24px] border border-dashed border-border bg-surface-2/70 p-8 text-center text-muted-foreground">
                Selecione um evento na agenda para ver os detalhes aqui.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/60 pb-4">
          <div>
            <CardTitle className="text-xl">Próximos compromissos</CardTitle>
            <CardDescription>Os 4 eventos mais próximos em sua agenda.</CardDescription>
          </div>
          <Button variant="ghost" className="text-primary" onClick={() => navigate('/operacional/reunioes')}>
            Ver todos
          </Button>
        </CardHeader>

        <CardContent className="p-4 md:p-6">
          <div className="grid gap-4 xl:grid-cols-4">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => {
                    setSelectedDate(parseISO(event.event_date));
                    setSelectedEventId(event.id);
                    setViewMode('month');
                  }}
                  className="rounded-[24px] border border-border/60 bg-surface-2/45 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-red-200 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-2xl"
                      style={{ backgroundColor: `${event.color || '#EF4444'}22` }}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{event.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {format(parseISO(event.event_date), 'dd/MM')} • {event.event_time.slice(0, 5)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <p className="text-muted-foreground">{event.client_name}</p>
                    <p className="text-muted-foreground">
                      {event.assigned_closer?.full_name ? event.assigned_closer.full_name : 'Sem responsável definido'}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-border bg-surface-2 p-8 text-center text-muted-foreground xl:col-span-4">
                Nenhum compromisso futuro encontrado.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/60 pb-4">
          <div>
            <CardTitle className="text-xl">Feriados do mês</CardTitle>
            <CardDescription>Lembretes automáticos para evitar marcar reuniões em datas críticas.</CardDescription>
          </div>
          <div className="rounded-full border border-border/60 bg-surface-2 px-3 py-1 text-xs text-muted-foreground">
            {monthLabel(currentMonth)}
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-6">
          <div className="grid gap-4 xl:grid-cols-4">
            {monthHolidayEvents.length > 0 ? (
              monthHolidayEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-[24px] border border-dashed border-border/70 bg-surface-2/40 p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-2xl"
                      style={{ backgroundColor: `${event.color || '#EF4444'}22` }}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{event.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {format(parseISO(event.event_date), 'dd/MM')} • Feriado
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <p className="text-muted-foreground">{event.holidayType || 'Aviso automático do calendário'}</p>
                    <p className="text-muted-foreground">Sistema</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-border bg-surface-2 p-8 text-center text-muted-foreground xl:col-span-4">
                Nenhum feriado encontrado neste mês.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div className="flex flex-wrap items-center gap-3">
            {LEGEND.map((item) => (
              <div key={item.label} className="flex items-center gap-2 rounded-full border border-border/60 bg-surface-2 px-3 py-1.5 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">
            Sincronizada com Supabase e atualizada em tempo real.
          </div>
        </CardContent>
      </Card>

      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="max-w-3xl rounded-[28px] border-border/60 bg-white/98">
          <DialogHeader>
            <DialogTitle>{composerMode === 'create' ? 'Nova reunião' : 'Editar reunião'}</DialogTitle>
            <DialogDescription>
              Preencha os dados do compromisso. O registro será salvo no Supabase e refletido em todas as abas.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">Título</label>
              <Input value={composerDraft.title} onChange={(e) => setComposerDraft((prev) => ({ ...prev, title: e.target.value }))} placeholder="Ex: Alinhamento equipe" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Cliente</label>
              <Input value={composerDraft.client_name} onChange={(e) => setComposerDraft((prev) => ({ ...prev, client_name: e.target.value }))} placeholder="Nome do cliente ou reunião" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Telefone</label>
              <Input value={composerDraft.client_phone} onChange={(e) => setComposerDraft((prev) => ({ ...prev, client_phone: e.target.value }))} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Data</label>
              <Input type="date" value={composerDraft.event_date} onChange={(e) => setComposerDraft((prev) => ({ ...prev, event_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Horário</label>
              <Input type="time" value={composerDraft.event_time} onChange={(e) => setComposerDraft((prev) => ({ ...prev, event_time: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Duração (min)</label>
              <Input
                type="number"
                min={15}
                step={15}
                value={composerDraft.duration_minutes}
                onChange={(e) => setComposerDraft((prev) => ({ ...prev, duration_minutes: Number(e.target.value || 60) }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">Descrição</label>
              <Textarea
                value={composerDraft.description}
                onChange={(e) => setComposerDraft((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Pauta, observações ou contexto"
                className="min-h-[96px]"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">Observações</label>
              <Textarea
                value={composerDraft.notes}
                onChange={(e) => setComposerDraft((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas internas..."
                className="min-h-[96px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Link da reunião</label>
              <Input
                value={composerDraft.meeting_link}
                onChange={(e) => setComposerDraft((prev) => ({ ...prev, meeting_link: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Cor</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setComposerDraft((prev) => ({ ...prev, color }))}
                    className={cn(
                      'h-9 w-9 rounded-full border-2 transition-transform hover:scale-105',
                      composerDraft.color === color ? 'border-foreground ring-2 ring-red-200' : 'border-transparent',
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={`Selecionar cor ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="text-xs text-muted-foreground">
              {composerMode === 'create' ? 'Novo compromisso será salvo em todas as abas sincronizadas.' : 'Alterações atualizam o evento em tempo real.'}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setComposerOpen(false)}>
                Cancelar
              </Button>
              <Button className="bg-red-600 text-white hover:bg-red-500" onClick={handleSaveEvent}>
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-[24px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir compromisso?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação remove o evento da agenda para todos os clientes conectados e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent} className="bg-red-600 text-white hover:bg-red-500">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
