import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BookOpen,
  FileImage,
  Link2,
  Loader2,
  Monitor,
  Palette,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Users,
  FileText,
  Eye,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
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
import { buildAssetPath, getStoragePathFromUrl, uploadFileToStorage } from './upgradeAmandaStorage';

type BrandProfileRow = Database['public']['Tables']['brand_profiles']['Row'];
type BrandColorRow = Database['public']['Tables']['brand_colors']['Row'];
type BrandApplicationRow = Database['public']['Tables']['brand_applications']['Row'];
type BrandFileRow = Database['public']['Tables']['brand_files']['Row'];

type ProfileFormState = {
  display_name: string;
  profile_type: 'DOCTOR' | 'CLIENT';
  specialty: string;
  city: string;
  notes: string;
  is_active: boolean;
};

type ColorFormState = {
  name: string;
  hex: string;
  sort_order: number;
  is_primary: boolean;
};

type ApplicationFormState = {
  title: string;
  description: string;
  notes: string;
  sort_order: number;
  preview_url: string;
};

const FILE_TYPE_OPTIONS = [
  { value: 'logo', label: 'Logo' },
  { value: 'manual', label: 'Manual visual' },
  { value: 'reference', label: 'Referência visual' },
  { value: 'other', label: 'Outro arquivo' },
];

function emptyProfileForm(): ProfileFormState {
  return { display_name: '', profile_type: 'DOCTOR', specialty: '', city: '', notes: '', is_active: true };
}

function emptyColorForm(): ColorFormState {
  return { name: '', hex: '#E11D48', sort_order: 0, is_primary: false };
}

function emptyApplicationForm(): ApplicationFormState {
  return { title: '', description: '', notes: '', sort_order: 0, preview_url: '' };
}

function fileTone(type: string) {
  switch (type) {
    case 'logo':
      return 'bg-blue-50 text-blue-700';
    case 'manual':
      return 'bg-violet-50 text-violet-700';
    case 'reference':
      return 'bg-emerald-50 text-emerald-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

async function copyToClipboard(value: string) {
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

export default function UpgradeAmandaIdentidadePaleta() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [profileTypeFilter, setProfileTypeFilter] = useState<'ALL' | 'DOCTOR' | 'CLIENT'>('ALL');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const [applicationDialogOpen, setApplicationDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<BrandProfileRow | null>(null);
  const [editingColor, setEditingColor] = useState<BrandColorRow | null>(null);
  const [editingApplication, setEditingApplication] = useState<BrandApplicationRow | null>(null);
  const [deleteColor, setDeleteColor] = useState<BrandColorRow | null>(null);
  const [deleteApplication, setDeleteApplication] = useState<BrandApplicationRow | null>(null);
  const [deleteFile, setDeleteFile] = useState<BrandFileRow | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState>(emptyProfileForm());
  const [colorForm, setColorForm] = useState<ColorFormState>(emptyColorForm());
  const [applicationForm, setApplicationForm] = useState<ApplicationFormState>(emptyApplicationForm());
  const [uploadType, setUploadType] = useState<'logo' | 'manual' | 'reference' | 'other'>('logo');
  const [isUploading, setIsUploading] = useState(false);

  const { data: profiles = [] } = useQuery({
    queryKey: ['brand-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_profiles')
        .select('*')
        .order('display_name');
      if (error) throw error;
      return data || [];
    },
  });

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) || profiles[0] || null,
    [profiles, selectedProfileId],
  );

  useEffect(() => {
    if (!selectedProfileId && profiles[0]) {
      setSelectedProfileId(profiles[0].id);
    }
  }, [profiles, selectedProfileId]);

  const { data: colors = [] } = useQuery({
    queryKey: ['brand-colors', selectedProfileId],
    enabled: Boolean(selectedProfileId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_colors')
        .select('*')
        .eq('profile_id', selectedProfileId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: applications = [] } = useQuery({
    queryKey: ['brand-applications', selectedProfileId],
    enabled: Boolean(selectedProfileId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_applications')
        .select('*')
        .eq('profile_id', selectedProfileId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: files = [] } = useQuery({
    queryKey: ['brand-files', selectedProfileId],
    enabled: Boolean(selectedProfileId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_files')
        .select('*')
        .eq('profile_id', selectedProfileId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('upgrade-amanda-brand-data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brand_profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['brand-profiles'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brand_colors' }, () => {
        queryClient.invalidateQueries({ queryKey: ['brand-colors'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brand_applications' }, () => {
        queryClient.invalidateQueries({ queryKey: ['brand-applications'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brand_files' }, () => {
        queryClient.invalidateQueries({ queryKey: ['brand-files'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const filteredProfiles = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    return profiles.filter((profile) => {
      const matchesType = profileTypeFilter === 'ALL' || profile.profile_type === profileTypeFilter;
      const matchesSearch =
        !searchValue ||
        profile.display_name.toLowerCase().includes(searchValue) ||
        (profile.specialty || '').toLowerCase().includes(searchValue) ||
        (profile.city || '').toLowerCase().includes(searchValue);
      return matchesType && matchesSearch;
    });
  }, [profiles, profileTypeFilter, search]);

  useEffect(() => {
    if (selectedProfileId) return;
    if (filteredProfiles[0]) setSelectedProfileId(filteredProfiles[0].id);
  }, [filteredProfiles, selectedProfileId]);

  const profileMutation = useMutation({
    mutationFn: async (payload: ProfileFormState & { id?: string }) => {
      const record = {
        display_name: payload.display_name.trim(),
        profile_type: payload.profile_type,
        specialty: payload.specialty.trim() || null,
        city: payload.city.trim() || null,
        notes: payload.notes.trim() || null,
        is_active: payload.is_active,
      };

      if (payload.id) {
        const { error } = await supabase.from('brand_profiles').update(record).eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('brand_profiles').insert(record);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingProfile ? 'Perfil atualizado.' : 'Perfil criado.');
      queryClient.invalidateQueries({ queryKey: ['brand-profiles'] });
      setProfileDialogOpen(false);
      setEditingProfile(null);
      setProfileForm(emptyProfileForm());
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o perfil.');
    },
  });

  const colorMutation = useMutation({
    mutationFn: async (payload: ColorFormState & { id?: string }) => {
      if (!selectedProfileId) throw new Error('Selecione um perfil do CRM antes de salvar cores.');
      const record = {
        profile_id: selectedProfileId,
        name: payload.name.trim(),
        hex: payload.hex,
        sort_order: payload.sort_order,
        is_primary: payload.is_primary,
      };

      if (payload.id) {
        const { error } = await supabase.from('brand_colors').update(record).eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('brand_colors').insert(record);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingColor ? 'Cor atualizada.' : 'Cor adicionada.');
      queryClient.invalidateQueries({ queryKey: ['brand-colors'] });
      setColorDialogOpen(false);
      setEditingColor(null);
      setColorForm(emptyColorForm());
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar a cor.');
    },
  });

  const applicationMutation = useMutation({
    mutationFn: async (payload: ApplicationFormState & { id?: string }) => {
      if (!selectedProfileId) throw new Error('Selecione um perfil do CRM antes de salvar aplicações.');
      const record = {
        profile_id: selectedProfileId,
        title: payload.title.trim(),
        description: payload.description.trim() || null,
        notes: payload.notes.trim() || null,
        sort_order: payload.sort_order,
        preview_url: payload.preview_url.trim() || null,
      };

      if (payload.id) {
        const { error } = await supabase.from('brand_applications').update(record).eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('brand_applications').insert(record);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingApplication ? 'Aplicação atualizada.' : 'Aplicação salva.');
      queryClient.invalidateQueries({ queryKey: ['brand-applications'] });
      setApplicationDialogOpen(false);
      setEditingApplication(null);
      setApplicationForm(emptyApplicationForm());
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar a aplicação.');
    },
  });

  const deleteColorMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('brand_colors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cor removida.');
      queryClient.invalidateQueries({ queryKey: ['brand-colors'] });
      setDeleteColor(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Não foi possível remover a cor.');
    },
  });

  const deleteApplicationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('brand_applications').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Aplicação removida.');
      queryClient.invalidateQueries({ queryKey: ['brand-applications'] });
      setDeleteApplication(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Não foi possível remover a aplicação.');
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (file: BrandFileRow) => {
      if (file.file_path) {
        await supabase.storage.from('brand-assets').remove([file.file_path]);
      } else if (file.file_url) {
        const storagePath = getStoragePathFromUrl('brand-assets', file.file_url);
        if (storagePath) {
          await supabase.storage.from('brand-assets').remove([storagePath]);
        }
      }

      const { error } = await supabase.from('brand_files').delete().eq('id', file.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Arquivo removido.');
      queryClient.invalidateQueries({ queryKey: ['brand-files'] });
      setDeleteFile(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Não foi possível remover o arquivo.');
    },
  });

  const openProfileDialog = (profile?: BrandProfileRow) => {
    if (profile) {
      setEditingProfile(profile);
      setProfileForm({
        display_name: profile.display_name,
        profile_type: profile.profile_type as 'DOCTOR' | 'CLIENT',
        specialty: profile.specialty || '',
        city: profile.city || '',
        notes: profile.notes || '',
        is_active: profile.is_active ?? true,
      });
    } else {
      setEditingProfile(null);
      setProfileForm(emptyProfileForm());
    }
    setProfileDialogOpen(true);
  };

  const openColorDialog = (color?: BrandColorRow) => {
    if (color) {
      setEditingColor(color);
      setColorForm({
        name: color.name,
        hex: color.hex,
        sort_order: color.sort_order,
        is_primary: color.is_primary ?? false,
      });
    } else {
      setEditingColor(null);
      setColorForm(emptyColorForm());
    }
    setColorDialogOpen(true);
  };

  const openApplicationDialog = (application?: BrandApplicationRow) => {
    if (application) {
      setEditingApplication(application);
      setApplicationForm({
        title: application.title,
        description: application.description || '',
        notes: application.notes || '',
        sort_order: application.sort_order,
        preview_url: application.preview_url || '',
      });
    } else {
      setEditingApplication(null);
      setApplicationForm(emptyApplicationForm());
    }
    setApplicationDialogOpen(true);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!selectedProfileId) {
      toast.error('Selecione um cliente ou doutor antes de enviar arquivos.');
      return;
    }

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const path = buildAssetPath(selectedProfileId, uploadType, file);
        const publicUrl = await uploadFileToStorage('brand-assets', path, file);

        const { error } = await supabase.from('brand_files').insert({
          profile_id: selectedProfileId,
          file_name: file.name,
          file_url: publicUrl,
          file_path: path,
          file_type: uploadType,
          mime_type: file.type || null,
          file_size: file.size,
        });
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['brand-files'] });
      toast.success(`${files.length} arquivo(s) enviado(s) ao Supabase Storage.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar os arquivos.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const currentColors = colors;
  const currentApplications = applications;
  const currentFiles = files;
  const selectedExample = useMemo(() => {
    const primaryColor = currentColors.find((color) => color.is_primary) || currentColors[0] || null;
    const exampleApplication = currentApplications[0] || null;
    const exampleFile = currentFiles[0] || null;
    const palettePreview = currentColors
      .slice(0, 4)
      .map((color) => `${color.name}: ${color.hex}`)
      .join(' | ');

    return {
      primaryColor,
      exampleApplication,
      exampleFile,
      palettePreview,
    };
  }, [currentColors, currentApplications, currentFiles]);

  const handleCopyExample = async () => {
    const lines = [
      `Identidade: ${selectedProfile?.display_name || 'Sem perfil selecionado'}`,
      selectedExample.primaryColor ? `Cor principal: ${selectedExample.primaryColor.name} (${selectedExample.primaryColor.hex})` : 'Cor principal: não definida',
      selectedExample.palettePreview ? `Paleta: ${selectedExample.palettePreview}` : 'Paleta: vazia',
      selectedExample.exampleApplication ? `Aplicação: ${selectedExample.exampleApplication.title}` : 'Aplicação: nenhuma',
      selectedExample.exampleFile ? `Arquivo: ${selectedExample.exampleFile.file_name} (${selectedExample.exampleFile.file_type})` : 'Arquivo: nenhum',
    ];

    await copyToClipboard(lines.join('\n'));
    toast.success('Exemplo da identidade copiado.');
  };

  const handleCopyFileLink = async (url: string) => {
    await copyToClipboard(url);
    toast.success('Link copiado.');
  };

  const profileSummary = useMemo(() => {
    return {
      totalProfiles: profiles.length,
      doctors: profiles.filter((profile) => profile.profile_type === 'DOCTOR').length,
      clients: profiles.filter((profile) => profile.profile_type === 'CLIENT').length,
      files: currentFiles.length,
    };
  }, [profiles, currentFiles.length]);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[32px] border border-border/70 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(225,6,0,0.08),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.08),_transparent_24%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Badge className="w-fit rounded-full bg-red-50 px-3 py-1 text-red-600 shadow-none hover:bg-red-50">
              Upgrade de Amanda
            </Badge>
            <div>
              <h1 className="text-3xl font-black tracking-[-0.05em] text-foreground sm:text-4xl">Identidade / Paleta</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Perfis, cores, aplicações e arquivos ficam centralizados no Supabase, com Storage para todos os uploads.
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
            <Button className="rounded-2xl bg-red-600 text-white shadow-md shadow-red-500/20 hover:bg-red-500" onClick={() => openProfileDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo doutor / cliente
            </Button>
          </div>
        </div>
      </div>

      <Card className="rounded-[30px] border-border/70 bg-gradient-to-br from-white via-red-50/40 to-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Exemplo de uso</p>
                  <h2 className="text-2xl font-black tracking-[-0.04em] text-foreground">Identidade pronta para aplicar</h2>
                </div>
              </div>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                Este exemplo usa o perfil selecionado para mostrar cor principal, paleta, aplicação e arquivo mais recente. É útil para copiar e usar em peças, apresentações e campanhas.
              </p>
              <div className="flex flex-wrap gap-2">
                {currentColors.slice(0, 4).map((color) => (
                  <span key={color.id} className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white px-3 py-2 text-sm text-foreground shadow-sm">
                    <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: color.hex }} />
                    {color.name}
                  </span>
                ))}
                {currentColors.length === 0 ? (
                  <span className="rounded-full border border-dashed border-border/60 bg-white px-3 py-2 text-sm text-muted-foreground">Adicione cores para ver o exemplo.</span>
                ) : null}
              </div>
            </div>

            <div className="min-w-0 rounded-[26px] border border-border/60 bg-white p-4 shadow-sm lg:w-[420px]">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Perfil atual</p>
                  <p className="mt-1 text-lg font-bold text-foreground">{selectedProfile?.display_name || 'Selecione um perfil do CRM'}</p>
                  <p className="text-sm text-muted-foreground">{selectedProfile?.profile_type === 'DOCTOR' ? 'Doutor' : selectedProfile?.profile_type === 'CLIENT' ? 'Cliente' : 'Sem tipo'}</p>
                </div>

                <div className="space-y-2 rounded-[20px] bg-surface-2/20 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Paleta resumida</p>
                  <p className="text-sm leading-6 text-foreground">{selectedExample.palettePreview || 'Nenhuma cor cadastrada ainda.'}</p>
                </div>

                <div className="space-y-2 rounded-[20px] bg-surface-2/20 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Aplicação exemplo</p>
                  <p className="text-sm font-semibold text-foreground">{selectedExample.exampleApplication?.title || 'Nenhuma aplicação salva'}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{selectedExample.exampleApplication?.description || 'Cadastre uma aplicação para visualizar aqui.'}</p>
                </div>

                <div className="space-y-2 rounded-[20px] bg-surface-2/20 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Arquivo exemplo</p>
                  <p className="text-sm font-semibold text-foreground">{selectedExample.exampleFile?.file_name || 'Nenhum arquivo enviado'}</p>
                  <p className="text-sm text-muted-foreground">{selectedExample.exampleFile?.file_type || 'Logo, manual, referência ou outro'}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="rounded-2xl border-border/60 bg-white" onClick={handleCopyExample}>
                    <FileText className="mr-2 h-4 w-4" />
                    Copiar exemplo
                  </Button>
                  {selectedExample.exampleFile?.file_url ? (
                    <Button variant="outline" className="rounded-2xl border-border/60 bg-white" onClick={() => handleCopyFileLink(selectedExample.exampleFile!.file_url)}>
                      <Link2 className="mr-2 h-4 w-4" />
                      Copiar arquivo
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Perfis', value: profileSummary.totalProfiles, icon: Users, tone: 'bg-blue-50 text-blue-600' },
          { label: 'Doutores', value: profileSummary.doctors, icon: User, tone: 'bg-emerald-50 text-emerald-600' },
          { label: 'Clientes', value: profileSummary.clients, icon: Palette, tone: 'bg-violet-50 text-violet-600' },
          { label: 'Arquivos', value: profileSummary.files, icon: FileText, tone: 'bg-amber-50 text-amber-600' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="overflow-hidden rounded-[28px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <div className="mt-1 text-3xl font-black tracking-[-0.05em] text-foreground">{item.value}</div>
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
        <CardContent className="p-6">
          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr_0.5fr_auto] lg:items-end">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Filtrar por nome, especialidade ou cidade"
                className="h-12 rounded-2xl border-border/60 bg-white pl-9 shadow-none"
              />
            </div>

            <Select value={profileTypeFilter} onValueChange={(value) => setProfileTypeFilter(value as 'ALL' | 'DOCTOR' | 'CLIENT')}>
              <SelectTrigger className="h-12 rounded-2xl border-border/60 bg-white">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="DOCTOR">Doutores</SelectItem>
                <SelectItem value="CLIENT">Clientes</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
              <SelectTrigger className="h-12 rounded-2xl border-border/60 bg-white">
                <SelectValue placeholder="Selecionar perfil" />
              </SelectTrigger>
              <SelectContent>
                {filteredProfiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button variant="outline" className="h-12 rounded-2xl border-border/60 bg-white/80" onClick={() => openColorDialog()}>
                <Palette className="mr-2 h-4 w-4" />
                Cor
              </Button>
              <Button variant="outline" className="h-12 rounded-2xl border-border/60 bg-white/80" onClick={() => openApplicationDialog()}>
                <Monitor className="mr-2 h-4 w-4" />
                Aplicação
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">Perfis de marca</CardTitle>
                  <CardDescription>Filtre e selecione doutores/ clientes para gerenciar o material.</CardDescription>
                </div>
              </div>
              <Button variant="outline" className="rounded-2xl border-border/60 bg-white/80" onClick={() => openProfileDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Novo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-6 pt-0">
            {filteredProfiles.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                Nenhum perfil encontrado para este filtro.
              </div>
            ) : (
              filteredProfiles.map((profile) => {
                const active = profile.id === selectedProfileId;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => setSelectedProfileId(profile.id)}
                    className={`w-full rounded-[24px] border p-4 text-left transition ${
                      active ? 'border-red-300 bg-red-50/40 shadow-sm' : 'border-border/60 bg-white hover:border-red-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{profile.display_name}</p>
                          <Badge className="rounded-full bg-slate-100 text-slate-700">
                            {profile.profile_type === 'DOCTOR' ? 'Doutor' : 'Cliente'}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {profile.specialty || 'Sem especialidade'}{profile.city ? ` • ${profile.city}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="rounded-full" onClick={(event) => { event.stopPropagation(); openProfileDialog(profile); }}>
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    <Palette className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Paleta de cores</CardTitle>
                    <CardDescription>{selectedProfile?.display_name || 'Selecione um perfil do CRM'}</CardDescription>
                  </div>
                </div>
                <Button className="rounded-2xl bg-red-600 text-white hover:bg-red-500" onClick={() => openColorDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar cor
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-6 pt-0">
              {currentColors.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                  Nenhuma cor cadastrada para este perfil.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {currentColors.map((color) => (
                    <div key={color.id} className="rounded-[24px] border border-border/60 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 shrink-0 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: color.hex }} />
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">{color.name}</p>
                          <p className="text-sm text-muted-foreground">{color.hex}</p>
                          {color.is_primary ? <Badge className="mt-2 rounded-full bg-red-50 text-red-600">Principal</Badge> : null}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-end gap-2">
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border/60" onClick={() => openColorDialog(color)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-red-200 bg-red-50 text-red-600 hover:bg-red-100" onClick={() => setDeleteColor(color)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    <Monitor className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Aplicações da marca</CardTitle>
                    <CardDescription>Registre peças, mockups e usos da identidade.</CardDescription>
                  </div>
                </div>
                <Button className="rounded-2xl bg-red-600 text-white hover:bg-red-500" onClick={() => openApplicationDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova aplicação
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-6 pt-0">
              {currentApplications.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                  Nenhuma aplicação salva para este perfil.
                </div>
              ) : (
                currentApplications.map((application) => (
                  <div key={application.id} className="rounded-[24px] border border-border/60 bg-surface-2/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{application.title}</p>
                          <Badge className="rounded-full bg-slate-100 text-slate-700">#{application.sort_order}</Badge>
                        </div>
                        {application.description ? <p className="mt-1 text-sm text-muted-foreground">{application.description}</p> : null}
                        {application.preview_url ? (
                          <a href={application.preview_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm text-red-600 hover:underline">
                            <Link2 className="h-4 w-4" />
                            Ver link
                          </a>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border/60" onClick={() => openApplicationDialog(application)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-red-200 bg-red-50 text-red-600 hover:bg-red-100" onClick={() => setDeleteApplication(application)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    <FileImage className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Arquivos enviados</CardTitle>
                    <CardDescription>Logo, manual, referências e outros documentos no Storage.</CardDescription>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={uploadType} onValueChange={(value) => setUploadType(value as typeof uploadType)}>
                    <SelectTrigger className="h-11 w-[180px] rounded-2xl border-border/60 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FILE_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button className="rounded-2xl bg-red-600 text-white hover:bg-red-500" onClick={() => fileInputRef.current?.click()}>
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Upload
                  </Button>
                  <input ref={fileInputRef} type="file" className="hidden" multiple onChange={(event) => handleFileUpload(event.target.files)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-6 pt-0">
              {currentFiles.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                  Nenhum arquivo enviado para este perfil.
                </div>
              ) : (
                currentFiles.map((file) => {
                  const tone = fileTone(file.file_type);
                  return (
                    <div key={file.id} className="flex items-center gap-3 rounded-[22px] border border-border/60 bg-white p-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">{file.file_name}</p>
                          <Badge className="rounded-full bg-slate-100 text-slate-700">{file.file_type}</Badge>
                        </div>
                        <p className="truncate text-sm text-muted-foreground">{file.file_url}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="rounded-full" asChild>
                        <a href={file.file_url} target="_blank" rel="noreferrer">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setDeleteFile(file)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingProfile ? 'Editar perfil' : 'Novo perfil'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Nome</Label>
              <Input id="profile-name" value={profileForm.display_name} onChange={(event) => setProfileForm((current) => ({ ...current, display_name: event.target.value }))} className="h-11 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={profileForm.profile_type} onValueChange={(value) => setProfileForm((current) => ({ ...current, profile_type: value as 'DOCTOR' | 'CLIENT' }))}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOCTOR">Doutor</SelectItem>
                  <SelectItem value="CLIENT">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-specialty">Especialidade</Label>
                <Input id="profile-specialty" value={profileForm.specialty} onChange={(event) => setProfileForm((current) => ({ ...current, specialty: event.target.value }))} className="h-11 rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-city">Cidade</Label>
                <Input id="profile-city" value={profileForm.city} onChange={(event) => setProfileForm((current) => ({ ...current, city: event.target.value }))} className="h-11 rounded-2xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-notes">Observações</Label>
              <Textarea id="profile-notes" value={profileForm.notes} onChange={(event) => setProfileForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-28 rounded-2xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-red-600 text-white hover:bg-red-500" onClick={() => profileMutation.mutate(profileForm)}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={colorDialogOpen} onOpenChange={setColorDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingColor ? 'Editar cor' : 'Adicionar cor'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="color-name">Nome da cor</Label>
              <Input id="color-name" value={colorForm.name} onChange={(event) => setColorForm((current) => ({ ...current, name: event.target.value }))} className="h-11 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color-hex">Hex</Label>
              <Input id="color-hex" value={colorForm.hex} onChange={(event) => setColorForm((current) => ({ ...current, hex: event.target.value }))} className="h-11 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color-order">Ordem</Label>
              <Input id="color-order" type="number" value={colorForm.sort_order} onChange={(event) => setColorForm((current) => ({ ...current, sort_order: Number(event.target.value) }))} className="h-11 rounded-2xl" />
            </div>
            <label className="flex items-center gap-2 rounded-2xl border border-border/60 px-4 py-3 md:col-span-2">
              <input type="checkbox" checked={colorForm.is_primary} onChange={(event) => setColorForm((current) => ({ ...current, is_primary: event.target.checked }))} />
              <span className="text-sm text-foreground">Marcar como cor principal</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setColorDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-red-600 text-white hover:bg-red-500" onClick={() => colorMutation.mutate(colorForm)}>Salvar cor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={applicationDialogOpen} onOpenChange={setApplicationDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingApplication ? 'Editar aplicação' : 'Nova aplicação'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="application-title">Título</Label>
              <Input id="application-title" value={applicationForm.title} onChange={(event) => setApplicationForm((current) => ({ ...current, title: event.target.value }))} className="h-11 rounded-2xl" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="application-description">Descrição</Label>
              <Textarea id="application-description" value={applicationForm.description} onChange={(event) => setApplicationForm((current) => ({ ...current, description: event.target.value }))} className="min-h-24 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="application-preview">Link / preview</Label>
              <Input id="application-preview" value={applicationForm.preview_url} onChange={(event) => setApplicationForm((current) => ({ ...current, preview_url: event.target.value }))} className="h-11 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="application-order">Ordem</Label>
              <Input id="application-order" type="number" value={applicationForm.sort_order} onChange={(event) => setApplicationForm((current) => ({ ...current, sort_order: Number(event.target.value) }))} className="h-11 rounded-2xl" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="application-notes">Observações</Label>
              <Textarea id="application-notes" value={applicationForm.notes} onChange={(event) => setApplicationForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-24 rounded-2xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplicationDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-red-600 text-white hover:bg-red-500" onClick={() => applicationMutation.mutate(applicationForm)}>Salvar aplicação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteColor)} onOpenChange={(open) => !open && setDeleteColor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover cor</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Deseja remover a cor <strong>{deleteColor?.name}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteColor(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteColor && deleteColorMutation.mutate(deleteColor.id)}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteApplication)} onOpenChange={(open) => !open && setDeleteApplication(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover aplicação</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Deseja remover a aplicação <strong>{deleteApplication?.title}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteApplication(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteApplication && deleteApplicationMutation.mutate(deleteApplication.id)}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteFile)} onOpenChange={(open) => !open && setDeleteFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover arquivo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Deseja remover o arquivo <strong>{deleteFile?.file_name}</strong> do Storage?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteFile(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteFile && deleteFileMutation.mutate(deleteFile)}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
