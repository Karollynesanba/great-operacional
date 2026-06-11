import { Link } from 'react-router-dom';
import {
  BellRing,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  MapPin,
  MoreHorizontal,
  PlayCircle,
  Video,
  Users,
  RotateCw,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const stats = [
  { label: 'Gravações no mês', value: '12', note: 'agendadas', icon: CalendarDays, tone: 'bg-violet-50 text-violet-600' },
  { label: 'Concluídas', value: '8', note: 'este mês', icon: RotateCw, tone: 'bg-emerald-50 text-emerald-600' },
  { label: 'Reagendadas', value: '2', note: 'este mês', icon: MoreHorizontal, tone: 'bg-orange-50 text-orange-500' },
  { label: 'Canceladas', value: '1', note: 'este mês', icon: CalendarRange, tone: 'bg-rose-50 text-rose-600' },
  { label: 'Clientes para retorno', value: '5', note: 'já completou 30 dias', icon: BellRing, tone: 'bg-blue-50 text-blue-600' },
];

const calendarEvents = [
  { day: '05', title: 'Dr. João Silva', time: '09:00', tag: 'Roteiro', color: 'bg-violet-100 text-violet-600', active: false },
  { day: '07', title: 'Dra. Camila Rocha', time: '09:00', tag: 'Criativo', color: 'bg-orange-100 text-orange-500', active: false },
  { day: '12', title: 'Dr. Lucas Ferreira', time: '10:30', tag: 'Agendada', color: 'bg-emerald-100 text-emerald-600', active: false },
  { day: '15', title: 'Dr. João Silva', time: '09:00', tag: 'Roteiro', color: 'bg-violet-100 text-violet-600', active: false },
  { day: '20', title: 'Dra. Camila Rocha', time: '14:00', tag: 'Agendada', color: 'bg-orange-100 text-orange-500', active: false },
  { day: '24', title: 'Dr. João Silva', time: '09:00', tag: 'Roteiro', color: 'bg-violet-100 text-violet-600', active: true },
  { day: '27', title: 'Dr. Pedro Almeida', time: '15:30', tag: 'Criativo', color: 'bg-blue-100 text-blue-600', active: false },
];

const reminders = [
  { name: 'Dr. João Silva', last: '24/04/2025', days: 'Já faz 30 dias', action: 'Ir novamente até o cliente' },
  { name: 'Dra. Camila Rocha', last: '21/04/2025', days: 'Já faz 33 dias', action: 'Ir novamente até o cliente' },
  { name: 'Dr. Lucas Ferreira', last: '19/04/2025', days: 'Já faz 35 dias', action: 'Ir novamente até o cliente' },
];

const agendaDetails = [
  { label: 'Data', value: '24/05/2025', icon: CalendarDays },
  { label: 'Horário', value: '09:00', icon: Clock3 },
  { label: 'Endereço', value: 'Av. Boa Viagem, 1234 - Recife/PE', icon: MapPin },
  { label: 'Tipo de gravação', value: 'Vídeo - Implante Dentário', icon: Video },
];

const filters = ['Todos', 'Mês', 'Semana', 'Lista'];

export default function UpgradeAmandaCalendarioGravacao() {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[32px] border border-border/70 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.08),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(225,6,0,0.06),_transparent_24%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Badge className="w-fit rounded-full bg-blue-50 px-3 py-1 text-blue-600 shadow-none hover:bg-blue-50">
              Upgrade de Amanda
            </Badge>
            <div>
              <h1 className="text-3xl font-black tracking-[-0.05em] text-foreground sm:text-4xl">Calendário de Gravação</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Uma agenda visual mais bonita, com cards de destaque, lembretes e detalhamento lateral para
                se aproximar do protótipo sem perder a identidade da Great.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="rounded-2xl border-border/60 bg-white/85 shadow-sm">
              <PlayCircle className="mr-2 h-4 w-4" />
              Como funciona
            </Button>
            <Button className="rounded-2xl bg-red-600 text-white shadow-md shadow-red-500/20 hover:bg-red-500">
              <CalendarRange className="mr-2 h-4 w-4" />
              Nova gravação
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="overflow-hidden rounded-[28px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <div className="mt-1 text-3xl font-black tracking-[-0.05em] text-foreground">{stat.value}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{stat.note}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.tone}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card className="overflow-hidden rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <CardTitle className="text-xl">Agenda</CardTitle>
                <CardDescription>Visualização mensal com eventos destacados por cor.</CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-border/60 bg-white/80">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-border/60 bg-white/80">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="h-10 rounded-2xl border-border/60 bg-white/80">
                  Hoje
                </Button>
                <Button variant="outline" className="h-10 rounded-2xl border-border/60 bg-white/80">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtros
                </Button>
                <div className="flex items-center gap-1 rounded-2xl border border-border/60 bg-white/80 p-1">
                  {filters.map((filter, index) => (
                    <Button
                      key={filter}
                      variant={index === 1 ? 'default' : 'ghost'}
                      className={`h-9 rounded-xl px-4 ${index === 1 ? 'bg-red-600 text-white hover:bg-red-500' : 'text-muted-foreground'}`}
                    >
                      {filter}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="grid gap-4 p-5 xl:grid-cols-[1fr_340px]">
              <div className="rounded-[28px] border border-border/60 bg-white p-4 shadow-sm">
                <div className="grid grid-cols-7 gap-2 pb-3">
                  {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((day) => (
                    <div key={day} className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {[
                    27, 28, 29, 30, 1, 2, 3,
                    4, 5, 6, 7, 8, 9, 10,
                    11, 12, 13, 14, 15, 16, 17,
                    18, 19, 20, 21, 22, 23, 24,
                    25, 26, 27, 28, 29, 30, 31,
                  ].map((day, index) => {
                    const event = calendarEvents.find((item) => Number(item.day) === day);
                    const active = Boolean(event?.active);
                    const selected = day === 24;
                    return (
                      <div
                        key={`${day}-${index}`}
                        className={`min-h-[120px] rounded-[22px] border p-2.5 transition-all ${selected ? 'border-red-300 ring-2 ring-red-200/70' : 'border-border/60'} ${index < 4 ? 'bg-surface-2/30 text-muted-foreground' : 'bg-white'}`}
                      >
                        <div className="flex items-start justify-between">
                          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${active ? 'bg-red-600 text-white' : 'text-slate-700'}`}>
                            {day}
                          </span>
                          {event ? <Badge className="rounded-full bg-red-50 text-[10px] uppercase tracking-[0.16em] text-red-600">1</Badge> : null}
                        </div>

                        {event ? (
                          <div className="mt-3 space-y-1.5">
                            <div className={`rounded-xl border border-transparent px-2.5 py-2 ${event.color}`}>
                              <p className="truncate text-xs font-semibold">{event.title}</p>
                              <p className="text-[11px] opacity-90">{event.time}</p>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium">
                  <span className="inline-flex items-center gap-2 text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full bg-violet-500" />Roteiro</span>
                  <span className="inline-flex items-center gap-2 text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Criativo</span>
                  <span className="inline-flex items-center gap-2 text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" />Agendada</span>
                  <span className="inline-flex items-center gap-2 text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full bg-slate-400" />Depoimento</span>
                </div>
              </div>

              <div className="space-y-4">
                <Card className="rounded-[28px] border-border/60 bg-white shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                        <Video className="h-7 w-7" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-bold text-foreground">Dr. João Silva</h3>
                            <Badge className="mt-1 rounded-full bg-violet-50 text-violet-600">Roteiro</Badge>
                          </div>
                          <Button variant="ghost" size="icon" className="rounded-full">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />24/05/2025</span>
                          <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />09:00</span>
                        </div>

                        <div className="mt-4 grid gap-3">
                          {agendaDetails.map((item) => {
                            const Icon = item.icon;
                            return (
                              <div key={item.label} className="flex items-start gap-3 rounded-[20px] border border-border/60 bg-surface-2/30 p-3">
                                <div className="mt-0.5 text-blue-600">
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                                  <p className="text-sm text-muted-foreground">{item.value}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <Button variant="outline" className="rounded-2xl border-border/60 bg-white/80">
                            Editar
                          </Button>
                          <Button className="rounded-2xl bg-red-600 text-white hover:bg-red-500">
                            Ver detalhes
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[28px] border-border/60 bg-white shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-foreground">Lembretes de retorno</h3>
                        <p className="text-sm text-muted-foreground">Clientes que já passaram do prazo ideal.</p>
                      </div>
                      <Button variant="ghost" className="rounded-2xl text-red-600 hover:bg-red-50 hover:text-red-600">
                        Ver todos
                      </Button>
                    </div>

                    <div className="mt-4 space-y-3">
                      {reminders.map((item) => (
                        <div key={item.name} className="rounded-[22px] border border-orange-200/70 bg-orange-50/60 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-foreground">{item.name}</p>
                              <p className="text-sm text-muted-foreground">Última gravação: {item.last}</p>
                            </div>
                            <Badge className="rounded-full bg-orange-100 text-orange-600">{item.days}</Badge>
                          </div>
                          <Button variant="outline" className="mt-3 h-10 w-full justify-between rounded-2xl border-orange-200 bg-white/90 text-orange-700 hover:bg-orange-50">
                            {item.action}
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="grid gap-4 px-5 pb-5 lg:grid-cols-[1.2fr_0.8fr]">
              <Card className="rounded-[28px] border-border/60 bg-white shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Lembrete automático</h3>
                      <p className="text-sm text-muted-foreground">Após 30 dias da última gravação, você será lembrado para retornar ao cliente.</p>
                    </div>
                    <Button className="rounded-2xl bg-blue-600 text-white hover:bg-blue-500">
                      <BellRing className="mr-2 h-4 w-4" />
                      Ativar notificações
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[28px] border-border/60 bg-white shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Próximas gravações</h3>
                      <p className="text-sm text-muted-foreground">Resumo do que vem a seguir na agenda.</p>
                    </div>
                    <Button variant="ghost" className="rounded-2xl text-red-600 hover:bg-red-50 hover:text-red-600">
                      Ver todas
                    </Button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {calendarEvents.slice(0, 4).map((item) => (
                      <div key={item.title + item.day} className="flex items-center gap-3 rounded-[20px] border border-border/60 bg-surface-2/30 p-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm">
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground">{item.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.tag} • {item.time}
                          </p>
                        </div>
                        <Badge className={`rounded-full ${item.color}`}>{item.tag}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
