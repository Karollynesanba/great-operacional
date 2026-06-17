import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Edit3,
  Eye,
  FileText,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { resolveBrandProfileIdForClient } from '@/lib/upgradeAmandaClientLink';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { buildAssetPath, getStoragePathFromUrl, uploadFileToStorage } from './upgradeAmandaStorage';

type BrandProfileRow = Database['public']['Tables']['brand_profiles']['Row'];
type OperationalClientRow = Database['public']['Tables']['operational_clients']['Row'];
type ValidatedScriptRow = Database['public']['Tables']['validated_scripts']['Row'];

type ValidatedScriptWithLinks = ValidatedScriptRow & {
  operational_clients?: Pick<OperationalClientRow, 'id' | 'client_name' | 'clinic_name'> | null;
  brand_profiles?: Pick<BrandProfileRow, 'id' | 'display_name' | 'profile_type'> | null;
};

type ScriptFormState = {
  client_id: string;
  title: string;
  script_date: string;
  format: string;
  category: string;
  content: string;
  document_name: string;
  document_url: string;
  document_path: string;
};

const FORMATS = ['Reels', 'Carrossel', 'Vídeo Curto', 'Vídeo Longo', 'Stories', 'Depoimento'];

function emptyScriptForm(): ScriptFormState {
  return {
    client_id: '',
    title: '',
    script_date: format(new Date(), 'yyyy-MM-dd'),
    format: 'Reels',
    category: '',
    content: '',
    document_name: '',
    document_url: '',
    document_path: '',
  };
}

export default function UpgradeAmandaRoteirosValidados() {
  const queryClient = useQueryClient();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [selectedProfileId, setSelectedProfileId] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteScript, setDeleteScript] = useState<ValidatedScriptWithLinks | null>(null);
  const [editingScript, setEditingScript] = useState<ValidatedScriptWithLinks | null>(null);
  const [viewScript, setViewScript] = useState<ValidatedScriptWithLinks | null>(null);
  const [form, setForm] = useState<ScriptFormState>(emptyScriptForm());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['operational-clients-scripts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_clients')
        .select('id, client_name, clinic_name, status_operacional')
        .order('client_name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: scripts = [], isLoading } = useQuery({
    queryKey: ['validated-scripts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('validated_scripts')
        .select('*, operational_clients(id, client_name, clinic_name), brand_profiles(id, display_name, profile_type)')
        .order('script_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ValidatedScriptWithLinks[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('upgrade-amanda-validated-scripts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'validated_scripts' }, () => {
        queryClient.invalidateQueries({ queryKey: ['validated-scripts'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useEffect(() => {
    if (dialogOpen && !editingScript && !form.client_id && clients[0]) {
      setForm((current) => ({ ...current, client_id: clients[0].id }));
    }
  }, [dialogOpen, editingScript, form.client_id, clients]);

  const filteredScripts = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    return scripts.filter((script) => {
      const matchesProfile = selectedProfileId === 'ALL' || script.client_id === selectedProfileId;
      const matchesMonth = script.script_date.startsWith(selectedMonth);
      const clientLabel = script.operational_clients?.client_name || script.brand_profiles?.display_name || '';
      const matchesSearch =
        !searchValue ||
        script.title.toLowerCase().includes(searchValue) ||
        script.content.toLowerCase().includes(searchValue) ||
        (script.category || '').toLowerCase().includes(searchValue) ||
        clientLabel.toLowerCase().includes(searchValue);
      return matchesProfile && matchesMonth && matchesSearch;
    });
  }, [scripts, search, selectedMonth, selectedProfileId]);

  const stats = useMemo(() => {
    const total = filteredScripts.length;
    const withFiles = filteredScripts.filter((item) => item.document_url).length;
    const linkedClients = new Set(filteredScripts.map((item) => item.client_id || item.profile_id));
    return { total, withFiles, clients: linkedClients.size };
  }, [filteredScripts]);

  const saveMutation = useMutation({
    mutationFn: async (payload: ScriptFormState & { id?: string }) => {
      if (!payload.client_id) throw new Error('Selecione um cliente do CRM operacional antes de salvar o roteiro.');
      if (!payload.title.trim()) throw new Error('Informe um título para o roteiro.');
      if (!payload.content.trim()) throw new Error('O conteúdo do roteiro é obrigatório.');

      const selectedClient = clients.find((client) => client.id === payload.client_id) || null;
      const linkedProfileId = selectedClient ? await resolveBrandProfileIdForClient(selectedClient) : editingScript?.profile_id || null;

      let documentUrl = payload.document_url;
      let documentPath = payload.document_path;
      let documentName = payload.document_name;

      if (selectedFile) {
        const newPath = buildAssetPath(payload.client_id, 'scripts', selectedFile);
        const newUrl = await uploadFileToStorage('brand-assets', newPath, selectedFile);
        documentUrl = newUrl;
        documentPath = newPath;
        documentName = selectedFile.name;
      }

      const record = {
        client_id: payload.client_id,
        profile_id: linkedProfileId,
        title: payload.title.trim(),
        script_date: payload.script_date,
        format: payload.format.trim(),
        category: payload.category.trim(),
        content: payload.content.trim(),
        document_name: documentName || null,
        document_url: documentUrl || null,
        document_path: documentPath || null,
      };

      const { error } = await supabase
        .from('validated_scripts')
        .upsert(payload.id ? { ...record, id: payload.id } : record, { onConflict: 'id' });
      if (error) throw error;

      if (selectedFile && editingScript?.document_path && editingScript.document_path !== documentPath) {
        await supabase.storage.from('brand-assets').remove([editingScript.document_path]);
      }
    },
    onSuccess: () => {
      toast.success(editingScript ? 'Roteiro atualizado.' : 'Roteiro salvo.');
      queryClient.invalidateQueries({ queryKey: ['validated-scripts'] });
      setDialogOpen(false);
      setEditingScript(null);
      setForm(emptyScriptForm());
      setSelectedFile(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o roteiro.');
    },
    onSettled: () => setIsUploading(false),
  });

  const deleteMutation = useMutation({
    mutationFn: async (script: ValidatedScriptWithLinks) => {
      if (script.document_path) {
        await supabase.storage.from('brand-assets').remove([script.document_path]);
      } else if (script.document_url) {
        const storagePath = getStoragePathFromUrl('brand-assets', script.document_url);
        if (storagePath) {
          await supabase.storage.from('brand-assets').remove([storagePath]);
        }
      }

      const { error } = await supabase.from('validated_scripts').delete().eq('id', script.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Roteiro excluído.');
      queryClient.invalidateQueries({ queryKey: ['validated-scripts'] });
      setDeleteScript(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Não foi possível excluir o roteiro.');
    },
  });

  const openCreateDialog = () => {
    setEditingScript(null);
    setForm({
      ...emptyScriptForm(),
      client_id: clients[0]?.id || '',
    });
    setSelectedFile(null);
    setDialogOpen(true);
  };

  const openEditDialog = (script: ValidatedScriptWithLinks) => {
    setEditingScript(script);
    setForm({
      client_id: script.client_id || '',
      title: script.title,
      script_date: script.script_date,
      format: script.format,
      category: script.category,
      content: script.content,
      document_name: script.document_name || '',
      document_url: script.document_url || '',
      document_path: script.document_path || '',
    });
    setSelectedFile(null);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (selectedFile) {
      setIsUploading(true);
    }
    await saveMutation.mutateAsync({ ...form, id: editingScript?.id });
  };

  return (
    <div data-cy="validated-scripts-page" className="space-y-6">
      <div className="relative overflow-hidden rounded-[32px] border border-border/70 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(225,6,0,0.08),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.08),_transparent_24%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Badge className="w-fit rounded-full bg-purple-50 px-3 py-1 text-purple-600 shadow-none hover:bg-purple-50">
              Evolução Audiovisual
            </Badge>
            <div>
              <h1 className="text-3xl font-black tracking-[-0.05em] text-foreground sm:text-4xl">Roteiros Validados</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Roteiros persistidos no Supabase, com busca, filtro por mês e abertura completa do conteúdo.
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
            <Button data-cy="validated-scripts-create" className="rounded-2xl bg-red-600 text-white shadow-md shadow-red-500/20 hover:bg-red-500" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Novo roteiro
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Roteiros', value: stats.total, icon: FileText, tone: 'bg-blue-50 text-blue-600', cy: 'validated-scripts-stat-total' },
          { label: 'Com arquivo', value: stats.withFiles, icon: Upload, tone: 'bg-emerald-50 text-emerald-600', cy: 'validated-scripts-stat-files' },
          { label: 'Perfis únicos', value: stats.clients, icon: Users, tone: 'bg-violet-50 text-violet-600', cy: 'validated-scripts-stat-clients' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} data-cy={item.cy} className="overflow-hidden rounded-[28px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <div className="mt-1 text-3xl font-black tracking-[-0.05em] text-foreground" data-cy={`${item.cy}-value`}>{item.value}</div>
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

      <Card className="rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <CardContent data-cy="validated-scripts-filters" className="p-6">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr_0.8fr] lg:items-end">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                data-cy="validated-scripts-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por título, conteúdo ou categoria"
                className="h-12 rounded-2xl border-border/60 bg-white pl-9 shadow-none"
              />
            </div>

            <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
              <SelectTrigger data-cy="validated-scripts-client-filter" className="h-12 rounded-2xl border-border/60 bg-white">
                <SelectValue placeholder="Filtrar por cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os clientes</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.clinic_name ? `${client.client_name} - ${client.clinic_name}` : client.client_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              data-cy="validated-scripts-month-filter"
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="h-12 rounded-2xl border-border/60 bg-white shadow-none"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="text-xl">Biblioteca validada</CardTitle>
              <CardDescription>Abra o roteiro completo, edite os dados e mantenha o arquivo no Storage.</CardDescription>
            </div>
            <Button data-cy="validated-scripts-add" variant="outline" className="rounded-2xl border-border/60 bg-white/80" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent data-cy="validated-scripts-library" className="p-0">
          {isLoading ? (
            <div className="p-8 text-sm text-muted-foreground">Carregando roteiros do Supabase...</div>
          ) : filteredScripts.length === 0 ? (
            <div data-cy="validated-scripts-empty" className="p-10 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <p className="mt-4 text-lg font-semibold text-foreground">Nenhum roteiro encontrado</p>
              <p className="mt-1 text-sm text-muted-foreground">Crie um roteiro novo ou ajuste os filtros.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredScripts.map((script) => (
                <div key={script.id} data-cy="validated-script-row" className="grid gap-4 p-5 lg:grid-cols-[1.25fr_0.95fr_0.5fr_0.5fr_auto] lg:items-center">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-foreground">{script.title}</h3>
                        <Badge className="rounded-full bg-slate-100 text-slate-700">{script.format}</Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{script.content}</p>
                    </div>
                  </div>

                  <div>
                    <p className="font-medium text-foreground">
                      {script.operational_clients
                        ? (script.operational_clients.clinic_name
                            ? `${script.operational_clients.client_name} - ${script.operational_clients.clinic_name}`
                            : script.operational_clients.client_name)
                        : script.brand_profiles?.display_name || 'Sem cliente'}
                    </p>
                    <p className="text-sm text-muted-foreground">{script.category}</p>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {format(parseISO(script.script_date), 'dd/MM/yyyy')}
                  </div>

                  <div>
                    {script.document_url ? (
                      <Button data-cy="validated-script-view" variant="outline" className="rounded-2xl border-border/60 bg-white/80" onClick={() => { setViewScript(script); setViewOpen(true); }}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver
                      </Button>
                    ) : (
                      <Badge className="rounded-full bg-slate-100 text-slate-700">Sem arquivo</Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-start gap-2 lg:justify-end">
                    <Button data-cy="validated-script-open" variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-border/60 bg-white" onClick={() => { setViewScript(script); setViewOpen(true); }}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button data-cy="validated-script-edit" variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-border/60 bg-white" onClick={() => openEditDialog(script)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button data-cy="validated-script-delete" variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-red-200 bg-red-50 text-red-600 hover:bg-red-100" onClick={() => setDeleteScript(script)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-cy="validated-script-dialog" className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingScript ? 'Editar roteiro' : 'Novo roteiro'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Cliente / Doutor do CRM Operacional</Label>
              <Select value={form.client_id} onValueChange={(value) => setForm((current) => ({ ...current, client_id: value }))}>
                <SelectTrigger data-cy="validated-script-client-select" className="h-11 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.clinic_name ? `${client.client_name} - ${client.clinic_name}` : client.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="script-title">Título</Label>
              <Input data-cy="validated-script-title" id="script-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="h-11 rounded-2xl" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="script-date">Data</Label>
              <Input data-cy="validated-script-date" id="script-date" type="date" value={form.script_date} onChange={(event) => setForm((current) => ({ ...current, script_date: event.target.value }))} className="h-11 rounded-2xl" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="script-format">Formato</Label>
              <Select value={form.format} onValueChange={(value) => setForm((current) => ({ ...current, format: value }))}>
                <SelectTrigger data-cy="validated-script-format" className="h-11 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((formatOption) => (
                    <SelectItem key={formatOption} value={formatOption}>
                      {formatOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="script-category">Categoria</Label>
              <Input data-cy="validated-script-category" id="script-category" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="h-11 rounded-2xl" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="script-content">Conteúdo do roteiro</Label>
              <Textarea data-cy="validated-script-content" id="script-content" value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} className="min-h-40 rounded-2xl" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Documento / arquivo</Label>
              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <Input
                  data-cy="validated-script-document-name"
                  value={form.document_name}
                  onChange={(event) => setForm((current) => ({ ...current, document_name: event.target.value }))}
                  placeholder="Nome do arquivo"
                  className="h-11 rounded-2xl"
                />
                <Button data-cy="validated-script-upload-button" type="button" variant="outline" className="rounded-2xl border-border/60 bg-white/80" onClick={() => uploadInputRef.current?.click()}>
                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Anexar arquivo
                </Button>
                <input
                  ref={uploadInputRef}
                  data-cy="validated-script-file-input"
                  type="file"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setSelectedFile(file);
                    if (file) {
                      setForm((current) => ({ ...current, document_name: file.name }));
                    }
                  }}
                />
              </div>
              {form.document_url ? (
                <a href={form.document_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-red-600 hover:underline">
                  <Eye className="h-4 w-4" />
                  Abrir arquivo atual
                </a>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-red-600 text-white hover:bg-red-500" onClick={handleSubmit} disabled={saveMutation.isPending || isUploading}>
              {saveMutation.isPending ? 'Salvando...' : editingScript ? 'Salvar alterações' : 'Criar roteiro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent data-cy="validated-script-view-dialog" className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewScript?.title || 'Roteiro'}</DialogTitle>
          </DialogHeader>
          {viewScript ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[22px] border border-border/60 bg-surface-2/20 p-4">
                  <p className="text-sm text-muted-foreground">Cliente / Doutor do CRM Operacional</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {viewScript.operational_clients
                      ? (viewScript.operational_clients.clinic_name
                          ? `${viewScript.operational_clients.client_name} - ${viewScript.operational_clients.clinic_name}`
                          : viewScript.operational_clients.client_name)
                      : viewScript.brand_profiles?.display_name || 'Sem cliente'}
                  </p>
                </div>
                <div className="rounded-[22px] border border-border/60 bg-surface-2/20 p-4">
                  <p className="text-sm text-muted-foreground">Data e formato</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {format(parseISO(viewScript.script_date), 'dd/MM/yyyy')} • {viewScript.format}
                  </p>
                </div>
                <div className="rounded-[22px] border border-border/60 bg-surface-2/20 p-4 md:col-span-2">
                  <p className="text-sm text-muted-foreground">Categoria</p>
                  <p className="mt-1 font-semibold text-foreground">{viewScript.category}</p>
                </div>
              </div>

              <div className="rounded-[24px] border border-border/60 bg-white p-4">
                <p className="text-sm font-semibold text-foreground">Conteúdo</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{viewScript.content}</p>
              </div>

              {viewScript.document_url ? (
                <a href={viewScript.document_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-red-600 hover:underline">
                  <Upload className="h-4 w-4" />
                  Abrir documento anexado
                </a>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteScript)} onOpenChange={(open) => !open && setDeleteScript(null)}>
        <DialogContent data-cy="validated-script-delete-dialog">
          <DialogHeader>
            <DialogTitle>Excluir roteiro</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Deseja excluir o roteiro <strong>{deleteScript?.title}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteScript(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteScript && deleteMutation.mutate(deleteScript)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
