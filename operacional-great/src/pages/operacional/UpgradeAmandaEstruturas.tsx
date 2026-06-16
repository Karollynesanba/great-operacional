import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Copy,
  Edit3,
  Eye,
  Filter,
  Loader2,
  PlayCircle,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  Users,
  FileText,
  Image as ImageIcon,
  Video,
} from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { usePerformanceStructures } from '@/hooks/useUpgradeAmandaStructures';
import { buildAssetPath, getStoragePathFromUrl, uploadFileToStorage } from './upgradeAmandaStorage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type OperationalClientRow = Database['public']['Tables']['operational_clients']['Row'];
type PerformanceStructureRow = Database['public']['Tables']['performance_structures']['Row'] & {
  client_id?: string | null;
  is_favorite?: boolean | null;
  operational_clients?: Pick<OperationalClientRow, 'id' | 'client_name' | 'clinic_name'> | null;
  brand_profiles?: Pick<Database['public']['Tables']['brand_profiles']['Row'], 'id' | 'display_name' | 'profile_type'> | null;
};

type StructureFormState = {
  client_id: string;
  title: string;
  structure_type: string;
  category: string;
  description: string;
  usage_count: number;
  views_count: number;
  engagement_rate: number;
  saves_count: number;
  reference_date: string;
  asset_kind: 'image' | 'video' | 'file';
  asset_url: string;
  asset_path: string;
};

const TYPE_OPTIONS = ['Roteiro', 'Criativo', 'Hook', 'Antes e Depois', 'Modelo de Conteúdo'];

function emptyForm(): StructureFormState {
  return {
    client_id: '',
    title: '',
    structure_type: 'Roteiro',
    category: '',
    description: '',
    usage_count: 0,
    views_count: 0,
    engagement_rate: 0,
    saves_count: 0,
    reference_date: format(new Date(), 'yyyy-MM-dd'),
    asset_kind: 'image',
    asset_url: '',
    asset_path: '',
  };
}

export default function UpgradeAmandaEstruturas() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [profileFilter, setProfileFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [favoriteFilter, setFavoriteFilter] = useState('ALL');
  const [periodFrom, setPeriodFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [periodTo, setPeriodTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<PerformanceStructureRow | null>(null);
  const [editingItem, setEditingItem] = useState<PerformanceStructureRow | null>(null);
  const [viewItem, setViewItem] = useState<PerformanceStructureRow | null>(null);
  const [form, setForm] = useState<StructureFormState>(emptyForm());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['operational-clients-structures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_clients')
        .select('id, client_name, clinic_name, status_operacional, onboarding_stage, team_id')
        .order('client_name');
      if (error) throw error;
      return (data || []).filter((item) => item.status_operacional !== 'ENCERRADO' && item.status_operacional !== 'CHURNED');
    },
  });

  useEffect(() => {
    if (!profileFilter && clients[0]) setProfileFilter('ALL');
  }, [clients, profileFilter]);

  const { data: structures = [], isLoading, error } = usePerformanceStructures({
    profileId: profileFilter,
    type: typeFilter,
    periodFrom,
    periodTo,
    search,
  });

  useEffect(() => {
    const channel = supabase
      .channel('upgrade-amanda-structures')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'performance_structures' }, () => {
        queryClient.invalidateQueries({ queryKey: ['performance-structures'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const filteredClients = useMemo(() => clients, [clients]);
  const visibleStructures = useMemo(() => {
    if (favoriteFilter === 'ALL') return structures;
    const shouldShowFavorites = favoriteFilter === 'FAVORITES';
    return structures.filter((item) => Boolean(item.is_favorite) === shouldShowFavorites);
  }, [favoriteFilter, structures]);

  const summary = useMemo(() => {
    const total = visibleStructures.length;
    const views = visibleStructures.reduce((sum, item) => sum + Number(item.views_count || 0), 0);
    const engagement =
      visibleStructures.length > 0
        ? visibleStructures.reduce((sum, item) => sum + Number(item.engagement_rate || 0), 0) / visibleStructures.length
        : 0;
    const saves = visibleStructures.reduce((sum, item) => sum + Number(item.saves_count || 0), 0);
    return { total, views, engagement, saves };
  }, [visibleStructures]);

  const saveMutation = useMutation({
    mutationFn: async (payload: StructureFormState & { id?: string }) => {
      if (!payload.client_id) throw new Error('Selecione um cliente do CRM operacional.');
      if (!payload.title.trim()) throw new Error('Informe um título.');
      if (!payload.category.trim()) throw new Error('Informe uma categoria.');

      let assetUrl = payload.asset_url;
      let assetPath = payload.asset_path;

      if (selectedFile) {
        const newPath = buildAssetPath(payload.client_id, 'structures', selectedFile);
        const newUrl = await uploadFileToStorage('brand-assets', newPath, selectedFile);
        assetUrl = newUrl;
        assetPath = newPath;
      }

      const record = {
        client_id: payload.client_id,
        profile_id: null,
        title: payload.title.trim(),
        structure_type: payload.structure_type.trim(),
        category: payload.category.trim(),
        description: payload.description.trim() || null,
        usage_count: payload.usage_count,
        views_count: payload.views_count,
        engagement_rate: payload.engagement_rate,
        saves_count: payload.saves_count,
        reference_date: payload.reference_date,
        asset_kind: selectedFile ? payload.asset_kind : payload.asset_url ? payload.asset_kind : null,
        asset_url: assetUrl || null,
        asset_path: assetPath || null,
      };

      if (payload.id) {
        const { error } = await supabase.from('performance_structures').update(record).eq('id', payload.id);
        if (error) throw error;
        if (selectedFile && editingItem?.asset_path && editingItem.asset_path !== assetPath) {
          await supabase.storage.from('brand-assets').remove([editingItem.asset_path]);
        }
      } else {
        const { error } = await supabase.from('performance_structures').insert(record);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingItem ? 'Estrutura atualizada.' : 'Estrutura criada.');
      queryClient.invalidateQueries({ queryKey: ['performance-structures'] });
      setDialogOpen(false);
      setEditingItem(null);
      setForm(emptyForm());
      setSelectedFile(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar a estrutura.');
    },
    onSettled: () => setIsUploading(false),
  });

  const deleteMutation = useMutation({
    mutationFn: async (item: PerformanceStructureRow) => {
      if (item.asset_path) {
        await supabase.storage.from('brand-assets').remove([item.asset_path]);
      } else if (item.asset_url) {
        const storagePath = getStoragePathFromUrl('brand-assets', item.asset_url);
        if (storagePath) await supabase.storage.from('brand-assets').remove([storagePath]);
      }
      const { error } = await supabase.from('performance_structures').delete().eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Estrutura excluída.');
      queryClient.invalidateQueries({ queryKey: ['performance-structures'] });
      setDeleteItem(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Não foi possível excluir a estrutura.');
    },
  });

  const openCreateDialog = () => {
    setEditingItem(null);
    setForm({
      ...emptyForm(),
      client_id: clients[0]?.id || '',
    });
    setSelectedFile(null);
    setDialogOpen(true);
  };

  const openEditDialog = (item: PerformanceStructureRow) => {
    setEditingItem(item);
    setForm({
      client_id: item.client_id || '',
      title: item.title,
      structure_type: item.structure_type,
      category: item.category,
      description: item.description || '',
      usage_count: Number(item.usage_count || 0),
      views_count: Number(item.views_count || 0),
      engagement_rate: Number(item.engagement_rate || 0),
      saves_count: Number(item.saves_count || 0),
      reference_date: item.reference_date,
      asset_kind: (item.asset_kind as StructureFormState['asset_kind']) || 'image',
      asset_url: item.asset_url || '',
      asset_path: item.asset_path || '',
    });
    setSelectedFile(null);
    setDialogOpen(true);
  };

  const submit = async () => {
    if (selectedFile) setIsUploading(true);
    await saveMutation.mutateAsync({ ...form, id: editingItem?.id });
  };

  const duplicateStructure = async (item: PerformanceStructureRow) => {
    const { error } = await supabase.from('performance_structures').insert({
      client_id: item.client_id || item.profile_id || clients[0]?.id || '',
      title: `${item.title} (cópia)`,
      structure_type: item.structure_type,
      category: item.category,
      description: item.description || '',
      usage_count: Number(item.usage_count || 0),
      views_count: Number(item.views_count || 0),
      engagement_rate: Number(item.engagement_rate || 0),
      saves_count: Number(item.saves_count || 0),
      reference_date: format(new Date(), 'yyyy-MM-dd'),
      asset_kind: (item.asset_kind as StructureFormState['asset_kind']) || 'image',
      asset_url: item.asset_url || '',
      asset_path: '',
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['performance-structures'] });
    toast.success('Estrutura duplicada.');
  };

  const toggleFavorite = async (item: PerformanceStructureRow) => {
    const { error } = await supabase
      .from('performance_structures')
      .update({ is_favorite: !item.is_favorite })
      .eq('id', item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['performance-structures'] });
  };

  return (
    <div data-cy="performance-structures-page" className="space-y-6">
      <div className="relative overflow-hidden rounded-[32px] border border-border/70 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(225,6,0,0.08),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.08),_transparent_24%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-[-0.05em] text-foreground sm:text-4xl">Estruturas que Performam</h1>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-red-50 text-red-600 shadow-sm">
                <ArrowUpRight className="h-5 w-5" />
              </span>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
              Tudo salvo no Supabase com uploads de mídia, abertura completa e atualização em tempo real.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild className="rounded-2xl border-border/60 bg-white/85 shadow-sm">
              <a href="/operacional/upgrade-de-amanda">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao hub
              </a>
            </Button>
            <Button data-cy="performance-structures-create" className="rounded-2xl bg-red-600 text-white shadow-md shadow-red-500/20 hover:bg-red-500" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nova estrutura
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Estruturas', value: summary.total, helper: 'no período', icon: ArrowUpRight, tone: 'bg-rose-50 text-red-600', cy: 'structures-stat-total' },
          { label: 'Visualizações', value: summary.views.toLocaleString('pt-BR'), helper: 'somadas', icon: Eye, tone: 'bg-violet-50 text-violet-600', cy: 'structures-stat-views' },
          { label: 'Engajamento médio', value: `${summary.engagement.toFixed(1)}%`, helper: 'média do período', icon: Filter, tone: 'bg-emerald-50 text-emerald-600', cy: 'structures-stat-engagement' },
          { label: 'Salvamentos', value: summary.saves.toLocaleString('pt-BR'), helper: 'somados', icon: CalendarRange, tone: 'bg-orange-50 text-orange-500', cy: 'structures-stat-saves' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} data-cy={stat.cy} className="rounded-[28px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <div className="mt-1 text-3xl font-black tracking-[-0.05em] text-foreground" data-cy={`${stat.cy}-value`}>{stat.value}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{stat.helper}</p>
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

      <Card className="rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <CardContent data-cy="structures-filters" className="p-6">
          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.55fr_0.55fr_0.55fr] lg:items-end">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input data-cy="structures-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar estrutura..." className="h-12 rounded-2xl border-border/60 bg-white pl-9 shadow-none" />
            </div>
            <Select value={profileFilter} onValueChange={setProfileFilter}>
              <SelectTrigger data-cy="structures-client-filter" className="h-12 rounded-2xl border-border/60 bg-white">
                <SelectValue placeholder="Cliente/doutor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os clientes</SelectItem>
                  {filteredClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.clinic_name ? `${client.client_name} - ${client.clinic_name}` : client.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger data-cy="structures-type-filter" className="h-12 rounded-2xl border-border/60 bg-white">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os tipos</SelectItem>
                {TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={favoriteFilter} onValueChange={setFavoriteFilter}>
              <SelectTrigger data-cy="structures-favorite-filter" className="h-12 rounded-2xl border-border/60 bg-white">
                <SelectValue placeholder="Favoritas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                <SelectItem value="FAVORITES">Somente favoritas</SelectItem>
                <SelectItem value="NOT_FAVORITES">Sem favoritas</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="h-12 rounded-2xl border-border/60 bg-white/80">
              <Filter className="mr-2 h-4 w-4" />
              Período
            </Button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input data-cy="structures-period-from" type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} className="h-11 rounded-2xl border-border/60 bg-white shadow-none" />
            <Input data-cy="structures-period-to" type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} className="h-11 rounded-2xl border-border/60 bg-white shadow-none" />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="text-xl">Biblioteca de estruturas</CardTitle>
              <CardDescription>Visualize o conteúdo completo, edite ou exclua quando precisar.</CardDescription>
            </div>
            <Button data-cy="structures-add" variant="outline" className="rounded-2xl border-border/60 bg-white/80" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent data-cy="structures-library" className="p-0">
          {isLoading ? (
            <div className="p-8 text-sm text-muted-foreground">Carregando estruturas do Supabase...</div>
          ) : error ? (
            <div className="p-8 text-sm text-red-600">Falha ao carregar estruturas: {error instanceof Error ? error.message : 'erro desconhecido'}</div>
          ) : visibleStructures.length === 0 ? (
            <div data-cy="structures-empty" className="p-10 text-center">
              <PlayCircle className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <p className="mt-4 text-lg font-semibold text-foreground">Biblioteca vazia</p>
              <p className="mt-1 text-sm text-muted-foreground">Tente outro filtro ou crie a primeira estrutura.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {visibleStructures.map((item) => (
                <div key={item.id} data-cy="structure-row" className="grid gap-4 p-5 lg:grid-cols-[1.5fr_0.55fr_0.95fr_0.45fr_0.6fr_0.55fr_0.55fr_auto] lg:items-center">
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-24 items-center justify-center overflow-hidden rounded-2xl bg-slate-800 text-white shadow-sm">
                      {item.asset_kind === 'video' ? <Video className="h-6 w-6" /> : item.asset_kind === 'file' ? <FileText className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{item.title}</p>
                        <Badge className="rounded-full bg-slate-100 text-slate-700">{item.structure_type}</Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <div>
                    <Badge className="rounded-full bg-violet-100 text-violet-700">{item.structure_type}</Badge>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{item.operational_clients?.client_name || item.brand_profiles?.display_name || 'Sem perfil'}</p>
                    <p className="text-sm text-muted-foreground">{item.operational_clients?.clinic_name || item.category}</p>
                  </div>
                  <div className="text-sm text-foreground">{item.usage_count ?? 0}</div>
                  <div className="text-sm text-foreground">{Number(item.views_count || 0).toLocaleString('pt-BR')}</div>
                  <div className="text-sm text-emerald-700">{Number(item.engagement_rate || 0).toFixed(1)}%</div>
                  <div className="text-sm text-foreground">{Number(item.saves_count || 0).toLocaleString('pt-BR')}</div>
                  <div className="flex items-center gap-2 justify-start lg:justify-end">
                    <Button data-cy="structure-view" variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-border/60 bg-white" onClick={() => { setViewItem(item); setViewOpen(true); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button data-cy="structure-edit" variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-border/60 bg-white" onClick={() => openEditDialog(item)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button data-cy="structure-duplicate" variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-border/60 bg-white" onClick={() => duplicateStructure(item)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button data-cy="structure-favorite" variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-border/60 bg-white" onClick={() => toggleFavorite(item)}>
                      <Star className={item.is_favorite ? 'h-4 w-4 fill-current text-amber-500' : 'h-4 w-4'} />
                    </Button>
                    <Button data-cy="structure-delete" variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-red-200 bg-red-50 text-red-600 hover:bg-red-100" onClick={() => setDeleteItem(item)}>
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
        <DialogContent data-cy="structures-dialog" className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar estrutura' : 'Nova estrutura'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Cliente / Doutor do CRM Operacional</Label>
              <Select value={form.client_id} onValueChange={(value) => setForm((current) => ({ ...current, client_id: value }))}>
                <SelectTrigger data-cy="structures-client-select" className="h-11 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filteredClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.clinic_name ? `${client.client_name} - ${client.clinic_name}` : client.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="structure-title">Título</Label>
              <Input data-cy="structures-title-input" id="structure-title" value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} className="h-11 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.structure_type} onValueChange={(value) => setForm((current) => ({ ...current, structure_type: value }))}>
                <SelectTrigger data-cy="structures-type-select" className="h-11 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="structure-category">Categoria</Label>
              <Input data-cy="structures-category-input" id="structure-category" value={form.category} onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))} className="h-11 rounded-2xl" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="structure-description">Descrição</Label>
              <Textarea data-cy="structures-description-input" id="structure-description" value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} className="min-h-32 rounded-2xl" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 md:col-span-2">
              <div className="space-y-2">
                <Label htmlFor="structure-date">Período / data</Label>
                <Input data-cy="structures-date-input" id="structure-date" type="date" value={form.reference_date} onChange={(e) => setForm((current) => ({ ...current, reference_date: e.target.value }))} className="h-11 rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label>Arquivo / imagem / vídeo</Label>
                <div className="flex gap-2">
                  <Select value={form.asset_kind} onValueChange={(value) => setForm((current) => ({ ...current, asset_kind: value as StructureFormState['asset_kind'] }))}>
                    <SelectTrigger data-cy="structures-asset-kind-select" className="h-11 rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Imagem</SelectItem>
                      <SelectItem value="video">Vídeo</SelectItem>
                      <SelectItem value="file">Arquivo</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" className="rounded-2xl border-border/60 bg-white/80" onClick={() => fileInputRef.current?.click()}>
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Upload
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setSelectedFile(file);
                    }}
                  />
                </div>
                <Input
                  data-cy="structures-asset-url"
                  value={form.asset_url}
                  onChange={(e) => setForm((current) => ({ ...current, asset_url: e.target.value }))}
                  placeholder="Cole o link do vídeo, imagem ou arquivo"
                  className="h-11 rounded-2xl"
                />
                {form.asset_url ? (
                  <a href={form.asset_url} target="_blank" rel="noreferrer" className="text-sm text-red-600 hover:underline">
                    Arquivo atual
                  </a>
                ) : null}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 md:col-span-2">
              <div className="space-y-2">
                <Label>Uso</Label>
                <Input data-cy="structures-usage-input" type="number" value={form.usage_count} onChange={(e) => setForm((current) => ({ ...current, usage_count: Number(e.target.value) }))} className="h-11 rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label>Visualizações</Label>
                <Input data-cy="structures-views-input" type="number" value={form.views_count} onChange={(e) => setForm((current) => ({ ...current, views_count: Number(e.target.value) }))} className="h-11 rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label>Engajamento (%)</Label>
                <Input data-cy="structures-engagement-input" type="number" step="0.1" value={form.engagement_rate} onChange={(e) => setForm((current) => ({ ...current, engagement_rate: Number(e.target.value) }))} className="h-11 rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label>Salvamentos</Label>
                <Input data-cy="structures-saves-input" type="number" value={form.saves_count} onChange={(e) => setForm((current) => ({ ...current, saves_count: Number(e.target.value) }))} className="h-11 rounded-2xl" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button data-cy="structures-cancel" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button data-cy="structures-submit" className="bg-red-600 text-white hover:bg-red-500" onClick={submit} disabled={saveMutation.isPending || isUploading}>
              {saveMutation.isPending ? 'Salvando...' : editingItem ? 'Salvar alterações' : 'Criar estrutura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent data-cy="structures-view-dialog" className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewItem?.title || 'Estrutura'}</DialogTitle>
          </DialogHeader>
          {viewItem ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[22px] border border-border/60 bg-surface-2/20 p-4 md:col-span-2">
                  <p className="text-sm text-muted-foreground">Cliente / Doutor do CRM Operacional</p>
                  <p className="mt-1 font-semibold text-foreground">{viewItem.operational_clients?.client_name || viewItem.brand_profiles?.display_name || 'Sem perfil'}</p>
                  <p className="text-sm text-muted-foreground">{viewItem.operational_clients?.clinic_name || ''}</p>
                </div>
                <div className="rounded-[22px] border border-border/60 bg-surface-2/20 p-4">
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="mt-1 font-semibold text-foreground">{viewItem.structure_type}</p>
                </div>
                <div className="rounded-[22px] border border-border/60 bg-surface-2/20 p-4">
                  <p className="text-sm text-muted-foreground">Categoria</p>
                  <p className="mt-1 font-semibold text-foreground">{viewItem.category}</p>
                </div>
                <div className="rounded-[22px] border border-border/60 bg-surface-2/20 p-4">
                  <p className="text-sm text-muted-foreground">Uso</p>
                  <p className="mt-1 font-semibold text-foreground">{viewItem.usage_count ?? 0}</p>
                </div>
                <div className="rounded-[22px] border border-border/60 bg-surface-2/20 p-4">
                  <p className="text-sm text-muted-foreground">Período</p>
                  <p className="mt-1 font-semibold text-foreground">{format(parseISO(viewItem.reference_date), 'dd/MM/yyyy')}</p>
                </div>
              </div>

              <div className="rounded-[24px] border border-border/60 bg-white p-4">
                <p className="text-sm font-semibold text-foreground">Descrição</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{viewItem.description}</p>
              </div>

              {viewItem.asset_url ? (
                <a href={viewItem.asset_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-red-600 hover:underline">
                  <Eye className="h-4 w-4" />
                  Abrir arquivo
                </a>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button data-cy="structures-view-close" variant="outline" onClick={() => setViewOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteItem)} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <DialogContent data-cy="structures-delete-dialog">
          <DialogHeader>
            <DialogTitle>Excluir estrutura</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Deseja excluir <strong>{deleteItem?.title}</strong>?
          </p>
          <DialogFooter>
            <Button data-cy="structures-delete-cancel" variant="outline" onClick={() => setDeleteItem(null)}>Cancelar</Button>
            <Button data-cy="structures-delete-confirm" variant="destructive" onClick={() => deleteItem && deleteMutation.mutate(deleteItem)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
