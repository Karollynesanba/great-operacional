import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Check, ChevronsUpDown, Filter, Search, Users, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  dedupeOperationalClientsByName,
  formatOperationalClientLabel,
  normalizeOperationalClientName,
} from '@/lib/operationalClientDisplay';

type ArtesPorClienteRow = {
  client_id: string;
  client_name: string;
  clinic_name: string | null;
  week_1: number;
  week_2: number;
  week_3: number;
  week_4: number;
  week_5: number;
  total: number;
};

type OperationalClient = {
  id: string;
  client_name: string;
  clinic_name: string | null;
  updated_at: string | null;
};

type ActivityRow = {
  client_id: string;
  week: number;
  artes_count: number;
  operational_clients: {
    client_name: string;
    clinic_name: string | null;
  };
};

type MatrixRow = {
  client_id: string;
  client_name: string;
  week_1: number;
  week_2: number;
  week_3: number;
  week_4: number;
  week_5: number;
  total: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MONTH_LABELS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

interface SpreadsheetCellProps {
  value: number;
  onSave: (value: number) => void;
  isPending: boolean;
}

function SpreadsheetCell({ value, onSave, isPending }: SpreadsheetCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    if (!isEditing) setEditValue(value);
  }, [value, isEditing]);

  const handleSave = () => {
    onSave(Math.max(0, Number.isFinite(editValue) ? editValue : 0));
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center justify-center gap-1">
        <Input
          type="number"
          min={0}
          value={editValue}
          onChange={(e) => setEditValue(Number(e.target.value))}
          className="h-8 w-16 text-center"
          autoFocus
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSave} disabled={isPending}>
          <Check className="h-3 w-3 text-green-600" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancel}>
          <X className="h-3 w-3 text-red-600" />
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="flex h-8 w-full items-center justify-center rounded-md border border-transparent bg-transparent transition-colors hover:border-border hover:bg-muted/40"
      title="Clique para editar"
    >
      <span className={cn('font-medium', value > 0 ? 'text-foreground' : 'text-muted-foreground')}>
        {value}
      </span>
    </button>
  );
}

export default function CriativosPorClienteDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientFilterOpen, setClientFilterOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, index) => current - 2 + index);
  }, []);

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['operational-clients-artes-matrix'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_clients')
        .select('id, client_name, clinic_name, updated_at')
        .order('client_name');
      if (error) throw error;
      return (data || []) as OperationalClient[];
    },
    enabled: open,
  });

  const { data: matrixBase = [], isLoading: matrixLoading } = useQuery({
    queryKey: ['artes-por-cliente-matrix', selectedYear, selectedMonth, selectedClientId, clientSearch],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_artes_por_cliente_matrix', {
        p_year: selectedYear,
        p_month: selectedMonth,
        p_client_id: selectedClientId,
        p_search: normalizeOperationalClientName(clientSearch) || null,
      });

      if (error) throw error;
      return (data || []) as MatrixRow[];
    },
    enabled: open,
  });

  const { data: activityRows = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['client-activity-tracking-artes-matrix-overrides', selectedYear, selectedMonth, selectedClientId, clientSearch],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_activity_tracking')
        .select(`
          client_id,
          week,
          artes_count,
          operational_clients!inner(client_name, clinic_name)
        `)
        .eq('year', selectedYear)
        .eq('month', selectedMonth)
        .eq('designer_name', 'PLANILHA')
        .order('week', { ascending: true });

      if (error) throw error;
      return (data || []) as ActivityRow[];
    },
    enabled: open,
  });

  const uniqueClients = useMemo(() => dedupeOperationalClientsByName(clients), [clients]);

  const selectedClient = useMemo(
    () => uniqueClients.find((client) => client.id === selectedClientId) ?? null,
    [uniqueClients, selectedClientId],
  );

  const filteredClients = useMemo(() => {
    const term = clientSearch.trim().toLowerCase();
    if (!term) return uniqueClients;
    return uniqueClients.filter((client) => {
      const name = client.client_name.toLowerCase();
      const clinic = (client.clinic_name || '').toLowerCase();
      return name.includes(term) || clinic.includes(term);
    });
  }, [uniqueClients, clientSearch]);

  const displayedMatrix = useMemo(() => {
    const overridesByClient = new Map<string, Record<number, number>>();

    for (const activity of activityRows) {
      const week = Math.min(5, Math.max(1, Number(activity.week) || 1));
      const current = overridesByClient.get(activity.client_id) || {};
      current[week] = Number(activity.artes_count) || 0;
      overridesByClient.set(activity.client_id, current);
    }

    return matrixBase.map((row) => {
      const overrides = overridesByClient.get(row.client_id) || {};
      const week_1 = overrides[1] ?? row.week_1 ?? 0;
      const week_2 = overrides[2] ?? row.week_2 ?? 0;
      const week_3 = overrides[3] ?? row.week_3 ?? 0;
      const week_4 = overrides[4] ?? row.week_4 ?? 0;
      const week_5 = overrides[5] ?? row.week_5 ?? 0;
      const total = week_1 + week_2 + week_3 + week_4 + week_5;

      return {
        client_id: row.client_id,
        client_name: row.client_name,
        clinic_name: uniqueClients.find((client) => client.id === row.client_id)?.clinic_name ?? null,
        week_1,
        week_2,
        week_3,
        week_4,
        week_5,
        total,
      };
    }).sort((left, right) => left.client_name.localeCompare(right.client_name, 'pt-BR'));
  }, [activityRows, matrixBase, uniqueClients]);

  const isLoading = clientsLoading || matrixLoading || activitiesLoading;

  const totals = useMemo(() => {
    return displayedMatrix.reduce(
      (acc, row) => {
        acc.week_1 += row.week_1 || 0;
        acc.week_2 += row.week_2 || 0;
        acc.week_3 += row.week_3 || 0;
        acc.week_4 += row.week_4 || 0;
        acc.week_5 += row.week_5 || 0;
        acc.total += row.total || 0;
        return acc;
      },
      { week_1: 0, week_2: 0, week_3: 0, week_4: 0, week_5: 0, total: 0 },
    );
  }, [displayedMatrix]);

  const monthLabel = format(new Date(selectedYear, selectedMonth - 1, 1), "MMMM 'de' yyyy", { locale: ptBR });

  const saveCellMutation = useMutation({
    mutationFn: async ({ clientId, week, value }: { clientId: string; week: number; value: number }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('client_activity_tracking')
        .upsert(
          {
            client_id: clientId,
            year: selectedYear,
            month: selectedMonth,
            week,
            artes_count: value,
            designer_name: 'PLANILHA',
            created_by_user_id: user?.id || userData?.user?.id || null,
          },
          { onConflict: 'client_id,year,month,week,designer_name' },
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artes-por-cliente-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['client-activity-tracking-artes-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['client-activity-tracking-artes-matrix-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['client-activity-tracking'] });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] w-[96vw] h-[92vh] p-0 overflow-hidden bg-background">
        <div className="flex h-full flex-col">
          <DialogHeader className="border-b border-border bg-gradient-to-r from-background via-background to-muted/20 px-6 py-5">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Quantidade de Artes por Cliente
            </DialogTitle>
          </DialogHeader>

          <div className="border-b border-border bg-muted/20 px-6 py-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <Popover open={clientFilterOpen} onOpenChange={setClientFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientFilterOpen}
                    className="h-11 w-full justify-between rounded-full border-border bg-background px-4 font-normal shadow-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-left">
                      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {selectedClient ? formatOperationalClientLabel(selectedClient) : 'Buscar ou selecionar cliente do CRM...'}
                      </span>
                    </span>
                    <span className="ml-3 flex items-center gap-2 text-muted-foreground">
                      {selectedClient && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedClientId(null);
                            setClientSearch('');
                          }}
                          className="rounded-full p-1 hover:bg-muted"
                        >
                          <X className="h-4 w-4" />
                        </span>
                      )}
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[min(640px,92vw)] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar cliente no CRM operacional..."
                      value={clientSearch}
                      onValueChange={setClientSearch}
                    />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="todos"
                          onSelect={() => {
                            setSelectedClientId(null);
                            setClientSearch('');
                            setClientFilterOpen(false);
                          }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', !selectedClientId ? 'opacity-100' : 'opacity-0')} />
                          Todos os clientes
                        </CommandItem>
                        {filteredClients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={`${client.client_name} ${client.clinic_name || ''}`}
                            onSelect={() => {
                              setSelectedClientId(client.id);
                              setClientSearch(formatOperationalClientLabel(client));
                              setClientFilterOpen(false);
                            }}
                          >
                            <Check className={cn('mr-2 h-4 w-4', selectedClientId === client.id ? 'opacity-100' : 'opacity-0')} />
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate">{client.client_name}</span>
                              {client.clinic_name && (
                                <span className="truncate text-xs text-muted-foreground">{client.clinic_name}</span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="h-10 bg-transparent text-sm outline-none"
                >
                  {MONTH_LABELS.map((label, index) => (
                    <option key={label} value={index + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="h-10 bg-transparent text-sm outline-none"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border bg-background px-3 py-1">
                Período: {monthLabel}
              </span>
              <span className="rounded-full border border-border bg-background px-3 py-1">
                Cliente: {selectedClient ? formatOperationalClientLabel(selectedClient) : 'Todos'}
              </span>
              <span className="rounded-full border border-border bg-background px-3 py-1">
                Clique nas células para editar
              </span>
              <span className="rounded-full border border-border bg-background px-3 py-1">
                Total do mês: {totals.total}
              </span>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6">
              <Card className="border-border shadow-sm">
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="space-y-3 p-4">
                      {[...Array(8)].map((_, index) => (
                        <Skeleton key={index} className="h-14 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table className="min-w-[920px]">
                        <TableHeader className="sticky top-0 z-10 bg-background">
                          <TableRow className="bg-muted/40">
                            <TableHead className="min-w-[280px] font-semibold">Cliente</TableHead>
                            <TableHead className="w-28 text-center font-semibold">1ª Semana</TableHead>
                            <TableHead className="w-28 text-center font-semibold">2ª Semana</TableHead>
                            <TableHead className="w-28 text-center font-semibold">3ª Semana</TableHead>
                            <TableHead className="w-28 text-center font-semibold">4ª Semana</TableHead>
                            <TableHead className="w-28 text-center font-semibold">5ª Semana</TableHead>
                            <TableHead className="w-28 text-center font-semibold bg-rose-50">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayedMatrix.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="py-14 text-center text-muted-foreground">
                                Nenhum cliente encontrado para este período.
                              </TableCell>
                            </TableRow>
                          ) : (
                            <>
                              {displayedMatrix.map((row) => (
                                <TableRow key={row.client_id} className="hover:bg-muted/30">
                                  <TableCell className="font-semibold text-foreground">
                                    <div className="min-w-0">
                                      <p className="truncate">{row.client_name}</p>
                                      {row.clinic_name && (
                                        <p className="truncate text-xs text-muted-foreground">{row.clinic_name}</p>
                                      )}
                                    </div>
                                  </TableCell>
                                  {[
                                    { week: 1, value: row.week_1 },
                                    { week: 2, value: row.week_2 },
                                    { week: 3, value: row.week_3 },
                                    { week: 4, value: row.week_4 },
                                    { week: 5, value: row.week_5 },
                                  ].map((weekData) => (
                                    <TableCell key={weekData.week} className="p-2 text-center">
                                      <SpreadsheetCell
                                        value={weekData.value}
                                        isPending={saveCellMutation.isPending}
                                        onSave={(value) =>
                                          saveCellMutation.mutate({
                                            clientId: row.client_id,
                                            week: weekData.week,
                                            value,
                                          })
                                        }
                                      />
                                    </TableCell>
                                  ))}
                                  <TableCell className="bg-rose-50 text-center font-bold text-foreground">
                                    <span className="inline-flex min-w-10 justify-center rounded-full bg-background px-3 py-1 shadow-sm">
                                      {row.total}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="border-t-2 border-border bg-muted/40 font-semibold">
                                <TableCell className="text-foreground">TOTAL</TableCell>
                                <TableCell className="text-center">{totals.week_1}</TableCell>
                                <TableCell className="text-center">{totals.week_2}</TableCell>
                                <TableCell className="text-center">{totals.week_3}</TableCell>
                                <TableCell className="text-center">{totals.week_4}</TableCell>
                                <TableCell className="text-center">{totals.week_5}</TableCell>
                                <TableCell className="bg-rose-50 text-center font-bold">{totals.total}</TableCell>
                              </TableRow>
                            </>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
