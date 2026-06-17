import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  FileArchive,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  PlayCircle,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Video,
  CalendarRange,
  Copy,
  WandSparkles,
} from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { resolveBrandProfileIdForClient } from '@/lib/upgradeAmandaClientLink';
import { useReadyModelMutations, useReadyModels } from '@/hooks/useUpgradeAmandaModels';
import { buildAssetPath, getStoragePathFromUrl, uploadFileToStorage } from './upgradeAmandaStorage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type OperationalClientRow = Database['public']['Tables']['operational_clients']['Row'];
type ReadyModelRow = Database['public']['Tables']['ready_models']['Row'];
type ReadyModelWithLinks = ReadyModelRow & {
  operational_clients?: Pick<OperationalClientRow, 'id' | 'client_name' | 'clinic_name'> | null;
  brand_profiles?: Pick<Database['public']['Tables']['brand_profiles']['Row'], 'id' | 'display_name' | 'profile_type'> | null;
};

type ModelFormState = {
  client_id: string;
  title: string;
  model_type: string;
  category: string;
  description: string;
  content: string;
  reference_date: string;
  related_campaign: string;
  asset_kind: 'file' | 'image' | 'video';
  asset_url: string;
  asset_path: string;
  model_tags: string;
};

const MODEL_TYPE_OPTIONS = ['Roteiro', 'Estrutura', 'Material', 'Campanha'];

function emptyForm(): ModelFormState {
  return {
    client_id: '',
    title: '',
    model_type: 'Roteiro',
    category: '',
    description: '',
    content: '',
    reference_date: format(new Date(), 'yyyy-MM-dd'),
    related_campaign: '',
    asset_kind: 'file',
    asset_url: '',
    asset_path: '',
    model_tags: '',
  };
}

function splitTags(tags: string) {
  return tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

async function copyToClipboardLegacy(value: string) {
  const text = value.trim();
  if (!text) throw new Error('Nada para copiar.');

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const success = document.execCommand('copy');
  document.body.removeChild(textarea);

  if (!success) {
    throw new Error('Não foi possível copiar o conteúdo.');
  }
}

async function copyToClipboard(value: string) {
  if (!value.trim()) {
    throw new Error('Nada para copiar.');
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const success = document.execCommand('copy');
  document.body.removeChild(textarea);

  if (!success) {
    throw new Error('Não foi possível copiar o conteúdo.');
  }
}

export default function UpgradeAmandaModelosProntos() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [periodFrom, setPeriodFrom] = useState(format(subDays(new Date(), 90), 'yyyy-MM-dd'));
  const [periodTo, setPeriodTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<ReadyModelRow | null>(null);
  const [editingItem, setEditingItem] = useState<ReadyModelRow | null>(null);
  const [viewItem, setViewItem] = useState<ReadyModelRow | null>(null);
  const [form, setForm] = useState<ModelFormState>(emptyForm());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['operational-clients-models'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_clients')
        .select('id, client_name, clinic_name, status_operacional')
        .order('client_name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: models = [], isLoading, error } = useReadyModels({
    clientId: clientFilter,
    type: typeFilter,
    category: categoryFilter,
    periodFrom,
    periodTo,
    search,
  });

  const { saveMutation, deleteMutation } = useReadyModelMutations();

  useEffect(() => {
    const channel = supabase
      .channel('upgrade-amanda-ready-models')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ready_models' }, () => {
        // react-query hook already invalidates through the shared mutation hook
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const categories = useMemo(() => Array.from(new Set(models.map((item) => item.category).filter(Boolean))).sort(), [models]);

  const summary = useMemo(() => {
    return {
      total: models.length,
      withFile: models.filter((item) => Boolean(item.asset_url)).length,
      tags: new Set(models.flatMap((item) => (Array.isArray(item.model_tags) ? item.model_tags : []))).size,
    };
  }, [models]);

  const getClientLabel = (client: Pick<OperationalClientRow, 'client_name' | 'clinic_name'>) =>
    client.clinic_name ? `${client.client_name} - ${client.clinic_name}` : client.client_name;

  const openCreateDialog = () => {
    setEditingItem(null);
    setForm({
      ...emptyForm(),
      client_id: clients[0]?.id || '',
    });
    setSelectedFile(null);
    setDialogOpen(true);
  };

  const openEditDialog = (item: ReadyModelRow) => {
    setEditingItem(item);
    setForm({
      client_id: (item as ReadyModelWithLinks).client_id || '',
      title: item.title,
      model_type: item.model_type,
      category: item.category,
      description: item.description || '',
      content: item.content,
      reference_date: item.reference_date,
      related_campaign: item.related_campaign || '',
      asset_kind: (item.asset_kind as ModelFormState['asset_kind']) || 'file',
      asset_url: item.asset_url || '',
      asset_path: item.asset_path || '',
      model_tags: Array.isArray(item.model_tags) ? item.model_tags.join(', ') : '',
    });
    setSelectedFile(null);
    setDialogOpen(true);
  };

  const saveModel = async () => {
    if (!form.client_id) {
      toast.error('Selecione um cliente do CRM operacional.');
      return;
    }
    if (!form.title.trim()) {
      toast.error('Informe um título.');
      return;
    }
    if (!form.content.trim()) {
      toast.error('Informe o conteúdo do modelo.');
      return;
    }

    const selectedClient = clients.find((client) => client.id === form.client_id) || null;
    const linkedProfileId = selectedClient ? await resolveBrandProfileIdForClient(selectedClient) : editingItem?.profile_id || null;

    let assetUrl = form.asset_url;
    let assetPath = form.asset_path;

    if (selectedFile) {
      setIsUploading(true);
      const newPath = buildAssetPath(form.client_id, 'ready-models', selectedFile);
      const newUrl = await uploadFileToStorage('brand-assets', newPath, selectedFile);
      assetUrl = newUrl;
      assetPath = newPath;
    }

    await saveMutation.mutateAsync({
      id: editingItem?.id,
      client_id: form.client_id,
      profile_id: linkedProfileId,
      title: form.title.trim(),
      model_type: form.model_type.trim(),
      category: form.category.trim(),
      description: form.description.trim() || null,
      content: form.content.trim(),
      reference_date: form.reference_date,
      related_campaign: form.related_campaign.trim() || null,
      asset_kind: selectedFile ? form.asset_kind : form.asset_url ? form.asset_kind : null,
      asset_url: assetUrl || null,
      asset_path: assetPath || null,
      model_tags: splitTags(form.model_tags),
    } as any);

    if (selectedFile && editingItem?.asset_path && editingItem.asset_path !== assetPath) {
      await supabase.storage.from('brand-assets').remove([editingItem.asset_path]);
    }

    toast.success(editingItem ? 'Modelo atualizado.' : 'Modelo criado.');
    setDialogOpen(false);
    setEditingItem(null);
    setForm(emptyForm());
    setSelectedFile(null);
    setIsUploading(false);
  };

  const removeModel = async () => {
    if (!deleteItem) return;
    if (deleteItem.asset_path) {
      await supabase.storage.from('brand-assets').remove([deleteItem.asset_path]);
    } else if (deleteItem.asset_url) {
      const storagePath = getStoragePathFromUrl('brand-assets', deleteItem.asset_url);
      if (storagePath) await supabase.storage.from('brand-assets').remove([storagePath]);
    }
    await deleteMutation.mutateAsync(deleteItem.id);
    toast.success('Modelo excluído.');
    setDeleteItem(null);
  };

  const useModel = async (item: ReadyModelRow) => {
    await copyToClipboard(item.content);
    toast.success('Conteúdo do modelo copiado para uso.');
    setViewItem(item);
    setViewOpen(true);
  };

  const copyAssetLink = async (item: ReadyModelRow) => {
    if (!item.asset_url) {
      toast.error('Este modelo não possui arquivo.');
      return;
    }

    await copyToClipboard(item.asset_url);
    toast.success('Link do arquivo copiado.');
  };

  const duplicateModel = (item: ReadyModelRow) => {
    setEditingItem(null);
    setForm({
      client_id: (item as ReadyModelWithLinks).client_id || '',
      title: `${item.title} (cópia)`,
      model_type: item.model_type,
      category: item.category,
      description: item.description || '',
      content: item.content,
      reference_date: format(new Date(), 'yyyy-MM-dd'),
      related_campaign: item.related_campaign || '',
      asset_kind: (item.asset_kind as ModelFormState['asset_kind']) || 'file',
      asset_url: item.asset_url || '',
      asset_path: '',
      model_tags: Array.isArray(item.model_tags) ? item.model_tags.join(', ') : '',
    });
    setSelectedFile(null);
    setDialogOpen(true);
    toast.success('Modelo duplicado para edição.');
  };

  const insertIntoScript = async (item: ReadyModelRow) => {
    try {
      const clientId = (item as ReadyModelWithLinks).client_id || null;
      const selectedClient = clients.find((client) => client.id === clientId) || null;
      const legacyProfileId = item.profile_id || (selectedClient ? await resolveBrandProfileIdForClient(selectedClient) : null);

      if (!clientId && !legacyProfileId) {
        throw new Error('Este modelo não possui cliente do CRM operacional vinculado.');
      }

      const { error } = await supabase.from('validated_scripts').upsert({
        client_id: clientId,
        profile_id: legacyProfileId,
        title: item.title,
        script_date: format(new Date(), 'yyyy-MM-dd'),
        format: item.model_type,
        category: item.category,
        content: item.content,
        document_name: item.asset_url ? item.title : null,
        document_url: item.asset_url || null,
        document_path: item.asset_path || null,
      }, { onConflict: 'id' });

      if (error) throw error;

      toast.success('Modelo enviado para Roteiros Validados.');
      navigate('/operacional/upgrade-de-amanda/roteiros-validados');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível inserir o modelo no roteiro.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[32px] border border-border/70 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-[-0.05em] text-foreground sm:text-4xl">Modelos Prontos</h1>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-red-50 text-red-600 shadow-sm">
              <FolderOpen className="h-5 w-5" />
            </span>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            Modelos persistidos no Supabase com arquivo no Storage, filtros completos e busca global.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild className="rounded-2xl border-border/60 bg-white/85 shadow-sm">
            <a href="/operacional/upgrade-de-amanda">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao hub
            </a>
          </Button>
          <Button className="rounded-2xl bg-red-600 text-white shadow-md shadow-red-500/20 hover:bg-red-500" onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Novo modelo
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { title: 'Roteiros Salvos', value: summary.total, subtitle: 'itens persistidos', accent: 'bg-red-50 text-red-600', icon: FileText },
          { title: 'Com arquivo', value: summary.withFile, subtitle: 'upload no Storage', accent: 'bg-emerald-50 text-emerald-600', icon: Upload },
          { title: 'Tags únicas', value: summary.tags, subtitle: 'organização', accent: 'bg-violet-50 text-violet-600', icon: Sparkles },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="rounded-[28px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${item.accent}`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-muted-foreground">{item.title}</p>
                    <div className="mt-1 text-4xl font-black tracking-[-0.05em] text-foreground">{item.value}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.subtitle}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <CardContent className="p-4">
          <div className="grid gap-3 xl:grid-cols-[1.2fr_0.7fr_0.7fr_0.9fr_0.75fr] xl:items-end">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar modelos..." className="h-11 rounded-2xl border-border/60 bg-white pl-9 shadow-none" />
            </div>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-white">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os clientes</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {getClientLabel(client)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-white">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os tipos</SelectItem>
                {MODEL_TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-white">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as categorias</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-2">
              <Input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} className="h-11 rounded-2xl border-border/60 bg-white shadow-none" />
              <Input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} className="h-11 rounded-2xl border-border/60 bg-white shadow-none" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <CardContent className="p-0">
          <div className="grid gap-4 border-b border-border/60 px-6 py-6 md:grid-cols-[1fr_auto] md:items-center">
            <div className="relative max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Busca global por título, descrição, conteúdo ou campanha..."
                className="h-12 rounded-2xl border-border/60 bg-white pl-9 shadow-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" className="rounded-2xl border-border/60 bg-white/80" onClick={() => { setSearch(''); setClientFilter('ALL'); setTypeFilter('ALL'); setCategoryFilter('ALL'); }}>
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Limpar filtros
              </Button>
              <Button className="rounded-2xl bg-red-600 text-white shadow-md shadow-red-500/20 hover:bg-red-500" onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Criar modelo
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-sm text-muted-foreground">Carregando modelos do Supabase...</div>
          ) : error ? (
            <div className="p-8 text-sm text-red-600">Falha ao carregar modelos: {error instanceof Error ? error.message : 'erro desconhecido'}</div>
          ) : models.length === 0 ? (
            <div className="p-10 text-center">
              <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <p className="mt-4 text-lg font-semibold text-foreground">Nenhum modelo encontrado</p>
              <p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros ou crie o primeiro modelo pronto.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[1180px]">
                <div className="grid grid-cols-[1.3fr_0.7fr_0.8fr_0.55fr_0.55fr_0.55fr_0.45fr_0.45fr] bg-surface-2/40 px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <div>Modelo</div>
                  <div>Cliente</div>
                  <div>Categoria</div>
                  <div>Tipo</div>
                  <div>Arquivo</div>
                  <div>Data</div>
                  <div>Tags</div>
                  <div>Ações</div>
                </div>
                <div className="divide-y divide-border/60 bg-white">
                  {models.map((item) => (
                    <div key={item.id} className="grid grid-cols-[1.3fr_0.7fr_0.8fr_0.55fr_0.55fr_0.55fr_0.45fr_0.45fr] items-center gap-4 px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 shadow-sm">
                          <FileText className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold leading-5 text-foreground">{item.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                          {item.content ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground/80">Conteúdo pronto para copiar e usar diretamente.</p> : null}
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {(item.operational_clients && getClientLabel(item.operational_clients)) || item.brand_profiles?.display_name || 'Sem cliente'}
                        </p>
                        <p className="text-sm text-muted-foreground">{item.model_type}</p>
                      </div>
                      <div>
                        <Badge className="rounded-full bg-blue-100 text-blue-700">{item.category}</Badge>
                      </div>
                      <div>
                        <Badge className="rounded-full bg-slate-100 text-slate-700">{item.model_type}</Badge>
                      </div>
                      <div>
                        {item.asset_url ? (
                          <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-border/60 bg-white shadow-sm" onClick={() => { setViewItem(item); setViewOpen(true); }}>
                            <Eye className="h-5 w-5 text-red-600" />
                          </Button>
                        ) : (
                          <Badge className="rounded-full bg-slate-100 text-slate-700">Sem arquivo</Badge>
                        )}
                      </div>
                      <div className="text-sm text-foreground">{format(parseISO(item.reference_date), 'dd/MM/yyyy')}</div>
                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(item.model_tags) ? item.model_tags : []).slice(0, 2).map((tag) => (
                          <Badge key={tag} className="rounded-full bg-violet-100 text-violet-700">{tag}</Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" className="h-10 rounded-2xl border-border/60 bg-white" onClick={() => insertIntoScript(item)}>
                          <WandSparkles className="mr-2 h-4 w-4" />
                          Inserir no roteiro
                        </Button>
                        <Button variant="outline" className="h-10 rounded-2xl border-border/60 bg-white" onClick={() => duplicateModel(item)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicar
                        </Button>
                        <Button variant="outline" className="h-10 rounded-2xl border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" onClick={() => useModel(item)}>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Usar
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl" onClick={() => { setViewItem(item); setViewOpen(true); }}>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-border/60 bg-white" onClick={() => openEditDialog(item)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-red-200 bg-red-50 text-red-600 hover:bg-red-100" onClick={() => setDeleteItem(item)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-border/60 bg-surface-2/30 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Modelos sincronizados via Supabase e visíveis para todos os usuários.</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-border/60 bg-white">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="h-10 rounded-2xl border-red-200 bg-red-50 text-red-600">1</Button>
              <Button variant="outline" className="h-10 rounded-2xl border-border/60 bg-white">2</Button>
              <Button variant="outline" className="h-10 rounded-2xl border-border/60 bg-white">3</Button>
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-border/60 bg-white">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar modelo pronto' : 'Novo modelo pronto'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Cliente / Doutor do CRM Operacional</Label>
              <Select value={form.client_id} onValueChange={(value) => setForm((current) => ({ ...current, client_id: value }))}>
                <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>{getClientLabel(client)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} className="h-11 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.model_type} onValueChange={(value) => setForm((current) => ({ ...current, model_type: value }))}>
                <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODEL_TYPE_OPTIONS.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Input value={form.category} onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))} className="h-11 rounded-2xl" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} className="min-h-24 rounded-2xl" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Conteúdo</Label>
              <Textarea value={form.content} onChange={(e) => setForm((current) => ({ ...current, content: e.target.value }))} className="min-h-40 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={form.reference_date} onChange={(e) => setForm((current) => ({ ...current, reference_date: e.target.value }))} className="h-11 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label>Campanha relacionada</Label>
              <Input value={form.related_campaign} onChange={(e) => setForm((current) => ({ ...current, related_campaign: e.target.value }))} className="h-11 rounded-2xl" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Tags</Label>
              <Input value={form.model_tags} onChange={(e) => setForm((current) => ({ ...current, model_tags: e.target.value }))} placeholder="tag1, tag2, tag3" className="h-11 rounded-2xl" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Arquivo / imagem / vídeo</Label>
              <div className="grid gap-2 md:grid-cols-[0.65fr_1fr_auto]">
                <Select value={form.asset_kind} onValueChange={(value) => setForm((current) => ({ ...current, asset_kind: value as ModelFormState['asset_kind'] }))}>
                  <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="file">Arquivo</SelectItem>
                    <SelectItem value="image">Imagem</SelectItem>
                    <SelectItem value="video">Vídeo</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={form.asset_url} onChange={(e) => setForm((current) => ({ ...current, asset_url: e.target.value }))} placeholder="Link atual ou deixar vazio" className="h-11 rounded-2xl" />
                <Button type="button" variant="outline" className="rounded-2xl border-border/60 bg-white/80" onClick={() => fileInputRef.current?.click()}>
                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Upload
                </Button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-red-600 text-white hover:bg-red-500" onClick={saveModel} disabled={saveMutation.isPending || isUploading}>
              {saveMutation.isPending ? 'Salvando...' : editingItem ? 'Salvar alterações' : 'Criar modelo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewItem?.title || 'Modelo pronto'}</DialogTitle>
          </DialogHeader>
          {viewItem ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[22px] border border-border/60 bg-surface-2/20 p-4 md:col-span-2">
                  <p className="text-sm text-muted-foreground">Cliente / Doutor do CRM Operacional</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {(viewItem.operational_clients && getClientLabel(viewItem.operational_clients)) || viewItem.brand_profiles?.display_name || 'Sem cliente'}
                  </p>
                </div>
                <div className="rounded-[22px] border border-border/60 bg-surface-2/20 p-4">
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="mt-1 font-semibold text-foreground">{viewItem.model_type}</p>
                </div>
                <div className="rounded-[22px] border border-border/60 bg-surface-2/20 p-4">
                  <p className="text-sm text-muted-foreground">Categoria</p>
                  <p className="mt-1 font-semibold text-foreground">{viewItem.category}</p>
                </div>
                <div className="rounded-[22px] border border-border/60 bg-surface-2/20 p-4">
                  <p className="text-sm text-muted-foreground">Campanha / data</p>
                  <p className="mt-1 font-semibold text-foreground">{viewItem.related_campaign || 'Sem campanha'} • {format(parseISO(viewItem.reference_date), 'dd/MM/yyyy')}</p>
                </div>
                <div className="rounded-[22px] border border-border/60 bg-surface-2/20 p-4 md:col-span-2">
                  <p className="text-sm text-muted-foreground">Tags</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(Array.isArray(viewItem.model_tags) ? viewItem.model_tags : []).map((tag) => (
                      <Badge key={tag} className="rounded-full bg-violet-100 text-violet-700">{tag}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-border/60 bg-white p-4">
                <p className="text-sm font-semibold text-foreground">Descrição</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{viewItem.description}</p>
              </div>
              <div className="rounded-[24px] border border-border/60 bg-white p-4">
                <p className="text-sm font-semibold text-foreground">Conteúdo</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{viewItem.content}</p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[24px] border border-border/60 bg-white p-4">
                  <p className="text-sm font-semibold text-foreground">Preview</p>
                  <div className="mt-3">
                    {viewItem.asset_url && viewItem.asset_kind === 'image' ? (
                      <img src={viewItem.asset_url} alt={viewItem.title} className="max-h-[420px] w-full rounded-[18px] object-contain" />
                    ) : null}
                    {viewItem.asset_url && viewItem.asset_kind === 'video' ? (
                      <video controls className="max-h-[420px] w-full rounded-[18px]">
                        <source src={viewItem.asset_url} />
                        Seu navegador não suporta vídeo.
                      </video>
                    ) : null}
                    {viewItem.asset_url && viewItem.asset_kind === 'file' ? (
                      <div className="flex min-h-[180px] items-center justify-center rounded-[18px] border border-dashed border-border/60 bg-surface-2/20 p-6 text-center">
                        <div>
                          <FileArchive className="mx-auto h-10 w-10 text-muted-foreground" />
                          <p className="mt-3 text-sm font-medium text-foreground">Arquivo pronto para abrir</p>
                          <p className="mt-1 text-xs text-muted-foreground">{viewItem.asset_url}</p>
                        </div>
                      </div>
                    ) : null}
                    {!viewItem.asset_url ? (
                      <div className="flex min-h-[180px] items-center justify-center rounded-[18px] border border-dashed border-border/60 bg-surface-2/20 p-6 text-sm text-muted-foreground">
                        Este modelo não tem arquivo anexado.
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-[24px] border border-border/60 bg-white p-4">
                  <p className="text-sm font-semibold text-foreground">Ações rápidas</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {viewItem.asset_url ? (
                      <a href={viewItem.asset_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-white px-3 py-2 text-sm text-red-600 hover:underline">
                        <Eye className="h-4 w-4" />
                        Abrir arquivo
                      </a>
                    ) : null}
                    <Button variant="outline" size="sm" className="rounded-xl border-border/60 bg-white" onClick={() => copyAssetLink(viewItem)}>
                      <FileArchive className="mr-2 h-4 w-4" />
                      Copiar link
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" onClick={() => useModel(viewItem)}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Copiar conteúdo
                    </Button>
                    <Button className="rounded-xl bg-red-600 text-white hover:bg-red-500" onClick={() => insertIntoScript(viewItem)}>
                      <WandSparkles className="mr-2 h-4 w-4" />
                      Inserir no roteiro
                    </Button>
                  </div>
                </div>
              </div>
              {viewItem.asset_url && viewItem.asset_kind === 'image' ? (
                <div className="overflow-hidden rounded-[24px] border border-border/60 bg-white">
                  <img src={viewItem.asset_url} alt={viewItem.title} className="max-h-[420px] w-full object-contain" />
                </div>
              ) : null}
              {viewItem.asset_url && viewItem.asset_kind === 'video' ? (
                <div className="overflow-hidden rounded-[24px] border border-border/60 bg-white p-3">
                  <video controls className="max-h-[420px] w-full rounded-[18px]">
                    <source src={viewItem.asset_url} />
                    Seu navegador não suporta vídeo.
                  </video>
                </div>
              ) : null}
              {viewItem.asset_url ? (
                <div className="flex flex-wrap gap-2">
                  <a href={viewItem.asset_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-red-600 hover:underline">
                    <Eye className="h-4 w-4" />
                    Abrir arquivo
                  </a>
                  <Button variant="outline" size="sm" className="rounded-xl border-border/60 bg-white" onClick={() => copyAssetLink(viewItem)}>
                    <FileArchive className="mr-2 h-4 w-4" />
                    Copiar link
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" onClick={() => useModel(viewItem)}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Copiar conteúdo
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteItem)} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir modelo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Deseja excluir <strong>{deleteItem?.title}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={removeModel}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
