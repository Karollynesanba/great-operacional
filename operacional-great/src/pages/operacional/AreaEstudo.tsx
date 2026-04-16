<<<<<<< HEAD
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BookOpen, Bot, ExternalLink, File, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
=======
import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, ExternalLink, File, FolderOpen, Heart, Loader2, Palette, Pencil, PenTool, Plus, Search, ShieldCheck, Sparkles, Target, Trash2, Upload, Users, Video, X } from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  target: Target,
  users: Users,
  'heart-handshake': Heart,
  palette: Palette,
  video: Video,
  'pen-tool': PenTool,
  sparkles: Sparkles,
  'shield-check': ShieldCheck,
  book: BookOpen,
};
>>>>>>> 7cd6517 (sua mensagem)

interface StudyCategory {
  id: string;
  name: string;
  color: string | null;
}

interface StudyResource {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  source_url: string | null;
  file_ref: string | null;
}

export default function AreaEstudo() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
<<<<<<< HEAD
  const canManage = isAdmin || (user as any)?.operational_role === "COORDENADOR_RED";

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<StudyResource | null>(null);
  const [form, setForm] = useState({ category_id: "", title: "", description: "", source_url: "" });

  const { data: categories = [] } = useQuery({
    queryKey: ["study-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("study_categories").select("id, name, color").order("name");
=======
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddResourceOpen, setIsAddResourceOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<StudyResource | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', icon: 'book', color: '#ef4444' });
  const [newResource, setNewResource] = useState({ category_id: '', title: '', description: '', source_url: '' });
  const [editLink, setEditLink] = useState('');
  const [editFile, setEditFile] = useState<{ name: string; ref: string } | null>(null);

  const canManage = isAdmin || (user as { operational_role?: string } | null)?.operational_role === 'COORDENADOR_RED';

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['study-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('study_categories').select('*').order('name');
>>>>>>> 7cd6517 (sua mensagem)
      if (error) throw error;
      return data as StudyCategory[];
    },
  });

<<<<<<< HEAD
  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["study-resources", selectedCategory],
    queryFn: async () => {
      let query = supabase.from("study_resources").select("id, category_id, title, description, source_url, file_ref");
      if (selectedCategory !== "all") query = query.eq("category_id", selectedCategory);
      const { data, error } = await query.order("created_at", { ascending: false });
=======
  const { data: resources = [], isLoading: resourcesLoading } = useQuery({
    queryKey: ['study-resources', selectedCategory],
    queryFn: async () => {
      let query = supabase.from('study_resources').select('*');
      if (selectedCategory) query = query.eq('category_id', selectedCategory);
      const { data, error } = await query.order('created_at', { ascending: false });
>>>>>>> 7cd6517 (sua mensagem)
      if (error) throw error;
      return data as StudyResource[];
    },
  });

<<<<<<< HEAD
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        category_id: form.category_id,
        title: form.title,
        description: form.description || null,
        source_url: form.source_url || null,
        file_ref: editingResource?.file_ref || null,
        type: "LINK" as any,
        tags: [],
        difficulty: "INICIANTE" as any,
        visibility: "ALL_INTERNAL" as any,
=======
  const createCategory = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('study_categories').insert({
        ...newCategory,
        description: newCategory.description || null,
        created_by_user_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-categories'] });
      setIsAddCategoryOpen(false);
      setNewCategory({ name: '', description: '', icon: 'book', color: '#ef4444' });
      toast.success('Área criada com sucesso.');
    },
    onError: () => toast.error('Erro ao criar área.'),
  });

  const createResource = useMutation({
    mutationFn: async () => {
      let fileRef: string | null = null;
      if (selectedFile) {
        setIsUploading(true);
        const ext = selectedFile.name.split('.').pop();
        const path = `${user?.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('study-files').upload(path, selectedFile);
        if (uploadError) throw uploadError;
        fileRef = path;
        setIsUploading(false);
      }

      const { error } = await supabase.from('study_resources').insert({
        category_id: newResource.category_id,
        type: selectedFile ? 'DOCUMENT' : 'LINK',
        title: newResource.title,
        description: newResource.description || null,
        tags: [],
        source_url: newResource.source_url || null,
        file_ref: fileRef,
        difficulty: 'INICIANTE',
        visibility: 'ALL_INTERNAL',
>>>>>>> 7cd6517 (sua mensagem)
        created_by_user_id: user?.id,
      };

      if (editingResource) {
        const { error } = await supabase.from("study_resources").update(payload).eq("id", editingResource.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("study_resources").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
<<<<<<< HEAD
      queryClient.invalidateQueries({ queryKey: ["study-resources"] });
      toast.success(editingResource ? "ConteÃºdo atualizado!" : "ConteÃºdo adicionado!");
      setIsAddOpen(false);
      setEditingResource(null);
      setForm({ category_id: "", title: "", description: "", source_url: "" });
    },
    onError: () => toast.error("Erro ao salvar conteÃºdo"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("study_resources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-resources"] });
      toast.success("ConteÃºdo removido!");
    },
  });

  const filteredResources = resources.filter((resource) =>
    resource.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const openEdit = (resource: StudyResource) => {
    setEditingResource(resource);
    setForm({
      category_id: resource.category_id,
      title: resource.title,
      description: resource.description || "",
      source_url: resource.source_url || "",
    });
    setIsAddOpen(true);
  };

  return (
    <div className="grid min-h-[calc(100vh-8.5rem)] grid-cols-1 overflow-hidden rounded-[32px] border border-primary/10 bg-card shadow-[0_20px_50px_rgba(225,6,0,0.08)] lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="border-b border-primary/10 bg-[linear-gradient(180deg,rgba(255,248,248,1),rgba(255,255,255,1))] lg:border-b-0 lg:border-r">
        <div className="border-b border-primary/10 p-5">
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <BookOpen className="h-5 w-5 text-primary" />
            Ãreas de estudo
          </h2>
        </div>
        <ScrollArea className="h-[220px] lg:h-[calc(100vh-17rem)]">
          <div className="space-y-1 p-2">
            <button
              onClick={() => setSelectedCategory("all")}
                className={cn("w-full rounded-xl px-3 py-2 text-left text-sm transition-colors", selectedCategory === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-primary/5 hover:text-foreground")}
            >
              Todos os conteÃºdos
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn("w-full rounded-xl px-3 py-2 text-left text-sm transition-colors", selectedCategory === category.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-primary/5 hover:text-foreground")}
              >
                {category.name}
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>

      <section className="min-w-0 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(255,250,250,0.96))]">
        <div className="border-b border-primary/10 px-5 py-5 md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Ãrea de Estudos</h1>
              <p className="text-sm text-muted-foreground">ConteÃºdos do setor operacional.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-2xl border border-primary/10 bg-card p-1 shadow-sm">
                <span className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">ConteÃºdos</span>
                <Link to="/operacional/great-study-ai" className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-primary/5 hover:text-foreground">
                  <Bot className="h-4 w-4 text-primary" />
                  Great Study AI
                </Link>
              </div>
              {canManage && (
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingResource(null);
                      setForm({ category_id: "", title: "", description: "", source_url: "" });
                    }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar conteÃºdo
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{editingResource ? "Editar conteÃºdo" : "Adicionar conteÃºdo"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label>Ãrea</Label>
                        <Select value={form.category_id} onValueChange={(value) => setForm((prev) => ({ ...prev, category_id: value }))}>
                          <SelectTrigger><SelectValue placeholder="Selecione uma Ã¡rea" /></SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>TÃ­tulo</Label>
                        <Input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
                      </div>
                      <div>
                        <Label>DescriÃ§Ã£o</Label>
                        <Textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
                      </div>
                      <div>
                        <Label>Link</Label>
                        <Input value={form.source_url} onChange={(event) => setForm((prev) => ({ ...prev, source_url: event.target.value }))} placeholder="https://..." />
                      </div>
                      <Button onClick={() => saveMutation.mutate()} disabled={!form.category_id || !form.title || saveMutation.isPending} className="w-full">
                        {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
          <div className="relative mt-4 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar por tÃ­tulo..." className="pl-9" />
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-17.5rem)]">
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3 md:p-6">
            {isLoading ? (
              <div className="col-span-full flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="col-span-full rounded-[24px] border border-dashed border-primary/15 bg-card p-10 text-center">
                <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="mb-2 text-lg font-medium text-foreground">Nenhum conteÃºdo encontrado</h3>
                <p className="text-sm text-muted-foreground">Use a busca ou cadastre um novo material.</p>
              </div>
            ) : (
              filteredResources.map((resource) => {
                const category = categories.find((item) => item.id === resource.category_id);
                return (
                  <Card key={resource.id} className="border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(255,247,247,0.96))] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_16px_30px_rgba(225,6,0,0.08)]">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full px-2 py-1 text-xs" style={{ backgroundColor: category?.color ? `${category.color}20` : "hsl(var(--primary) / 0.1)", color: category?.color || "hsl(var(--primary))" }}>
                          {category?.name || "Sem categoria"}
                        </span>
                        {canManage && (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(resource)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => deleteMutation.mutate(resource.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <CardTitle className="text-base">{resource.title}</CardTitle>
                      {resource.description && <CardDescription>{resource.description}</CardDescription>}
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      {resource.source_url && (
                        <Button size="sm" className="flex-1 min-w-[140px]" onClick={() => window.open(resource.source_url!, "_blank")}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Acessar link
                        </Button>
                      )}
                      {resource.file_ref && (
                        <Button size="sm" variant="outline" className="flex-1 min-w-[140px]" onClick={() => window.open(supabase.storage.from("study-files").getPublicUrl(resource.file_ref!).data.publicUrl, "_blank")}>
                          <File className="mr-2 h-4 w-4" />
                          Baixar arquivo
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>
      </section>
=======
      queryClient.invalidateQueries({ queryKey: ['study-resources'] });
      setIsAddResourceOpen(false);
      setNewResource({ category_id: '', title: '', description: '', source_url: '' });
      setSelectedFile(null);
      toast.success('Conteúdo adicionado.');
    },
    onError: () => {
      setIsUploading(false);
      toast.error('Erro ao adicionar conteúdo.');
    },
  });

  const updateResource = useMutation({
    mutationFn: async () => {
      if (!editingResource) return;
      const { error } = await supabase.from('study_resources').update({ source_url: editLink || null, file_ref: editFile?.ref || null }).eq('id', editingResource.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-resources'] });
      setIsEditDialogOpen(false);
      setEditingResource(null);
      toast.success('Conteúdo atualizado.');
    },
    onError: () => toast.error('Erro ao atualizar conteúdo.'),
  });

  const deleteResource = useMutation({
    mutationFn: async (resourceId: string) => {
      const { error } = await supabase.from('study_resources').delete().eq('id', resourceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-resources'] });
      toast.success('Conteúdo removido.');
    },
    onError: () => toast.error('Erro ao remover conteúdo.'),
  });

  const selectedCategoryData = categories.find((item) => item.id === selectedCategory) ?? null;
  const filteredResources = resources.filter((resource) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;
    return resource.title.toLowerCase().includes(query) || resource.description?.toLowerCase().includes(query);
  });

  const openEdit = (resource: StudyResource) => {
    setEditingResource(resource);
    setEditLink(resource.source_url || '');
    setEditFile(resource.file_ref ? { name: resource.file_ref.split('/').pop() || 'Arquivo', ref: resource.file_ref } : null);
    setIsEditDialogOpen(true);
  };

  const getFileUrl = (fileRef: string) => supabase.storage.from('study-files').getPublicUrl(fileRef).data.publicUrl;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.08),_transparent_40%),linear-gradient(180deg,#fffdfd_0%,#f7f2f1_100%)]">
      <div className="border-b border-slate-200/80 px-6 py-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-red-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Área de Estudos</span>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-slate-950">Conteúdos</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Biblioteca interna com materiais, links e arquivos para estudo e consulta do time.</p>
          </div>

          {canManage ? (
            <div className="flex flex-wrap gap-3">
              <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                <DialogTrigger asChild><Button variant="outline" className="h-12 rounded-2xl border-red-200 bg-white/90 px-5 text-red-500 hover:bg-red-50"><Plus className="mr-2 h-4 w-4" />Nova área</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Criar área de estudo</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Input value={newCategory.name} onChange={(e) => setNewCategory((p) => ({ ...p, name: e.target.value }))} placeholder="Nome da área" />
                    <Textarea value={newCategory.description} onChange={(e) => setNewCategory((p) => ({ ...p, description: e.target.value }))} placeholder="Descrição" />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Select value={newCategory.icon} onValueChange={(value) => setNewCategory((p) => ({ ...p, icon: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="book">Livro</SelectItem><SelectItem value="target">Alvo</SelectItem><SelectItem value="users">Equipe</SelectItem><SelectItem value="palette">Design</SelectItem><SelectItem value="video">Vídeo</SelectItem><SelectItem value="sparkles">IA</SelectItem><SelectItem value="shield-check">Processos</SelectItem><SelectItem value="heart-handshake">Pessoas</SelectItem><SelectItem value="pen-tool">Roteiro</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input type="color" value={newCategory.color} onChange={(e) => setNewCategory((p) => ({ ...p, color: e.target.value }))} />
                    </div>
                    <Button className="w-full" onClick={() => createCategory.mutate()} disabled={!newCategory.name || createCategory.isPending}>{createCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar área'}</Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isAddResourceOpen} onOpenChange={setIsAddResourceOpen}>
                <DialogTrigger asChild><Button className="h-12 rounded-2xl bg-red-500 px-5 text-white hover:bg-red-600"><Plus className="mr-2 h-4 w-4" />Adicionar conteúdo</Button></DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Adicionar conteúdo</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Select value={newResource.category_id} onValueChange={(value) => setNewResource((p) => ({ ...p, category_id: value }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione uma área" /></SelectTrigger>
                      <SelectContent>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input value={newResource.title} onChange={(e) => setNewResource((p) => ({ ...p, title: e.target.value }))} placeholder="Título do conteúdo" />
                    <Textarea value={newResource.description} onChange={(e) => setNewResource((p) => ({ ...p, description: e.target.value }))} placeholder="Descrição" />
                    <Input value={newResource.source_url} onChange={(e) => setNewResource((p) => ({ ...p, source_url: e.target.value }))} placeholder="https://..." />
                    <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.mp4,.mp3" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className={cn('w-full rounded-2xl border-2 border-dashed p-4 text-sm', selectedFile ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50')}>
                      {selectedFile ? selectedFile.name : 'Selecionar arquivo opcional'}
                    </button>
                    <Button className="w-full" onClick={() => createResource.mutate()} disabled={!newResource.category_id || !newResource.title || createResource.isPending || isUploading}>{isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar conteúdo'}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por título ou descrição..." className="h-12 rounded-2xl border-slate-200 bg-white/95 pl-11" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Área ativa</p><p className="mt-1 text-sm font-semibold text-slate-900">{selectedCategoryData?.name ?? 'Todas as áreas'}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Resultados</p><p className="mt-1 text-sm font-semibold text-slate-900">{filteredResources.length} conteúdos</p></div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 p-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="min-h-0 rounded-[28px] border-white/70 bg-white/85">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><BookOpen className="h-5 w-5 text-red-500" />Trilhas</CardTitle><CardDescription>Escolha uma área para filtrar os materiais.</CardDescription></CardHeader>
          <CardContent className="min-h-0">
            <ScrollArea className="h-[calc(100vh-22rem)] pr-3 xl:h-[calc(100vh-18rem)]">
              <div className="space-y-2">
                <button type="button" onClick={() => setSelectedCategory(null)} className={cn('flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm', !selectedCategory ? 'bg-red-500 text-white' : 'bg-slate-50 text-slate-700')}>
                  <FolderOpen className="h-4 w-4" /><span className="font-medium">Todos os conteúdos</span>
                </button>
                {categories.map((category) => {
                  const Icon = iconMap[category.icon || 'book'] || BookOpen;
                  const active = selectedCategory === category.id;
                  return (
                    <button key={category.id} type="button" onClick={() => setSelectedCategory(category.id)} className={cn('flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left', active ? 'bg-red-500 text-white' : 'bg-slate-50 text-slate-700')}>
                      <span className={cn('mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl', active ? 'bg-white/16' : 'bg-white')}><Icon className="h-4 w-4" style={{ color: active ? '#fff' : category.color || '#ef4444' }} /></span>
                      <span className="min-w-0"><span className="block truncate text-sm font-semibold">{category.name}</span>{category.description ? <span className={cn('mt-1 block text-xs', active ? 'text-white/80' : 'text-slate-500')}>{category.description}</span> : null}</span>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="min-h-0 rounded-[28px] border-white/70 bg-white/88">
          <CardHeader className="border-b border-slate-100 pb-5"><CardTitle className="text-xl font-bold text-slate-950">{selectedCategoryData?.name ?? 'Todos os conteúdos'}</CardTitle><CardDescription>{selectedCategoryData?.description || 'Links, arquivos e materiais centralizados em um só lugar.'}</CardDescription></CardHeader>
          <CardContent className="min-h-0 p-0">
            <ScrollArea className="h-[calc(100vh-18rem)] px-6 py-6">
              {categoriesLoading || resourcesLoading ? <div className="flex h-52 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-red-500" /></div> : (
                filteredResources.length === 0 ? <div className="flex h-[60vh] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 text-center"><BookOpen className="mb-4 h-12 w-12 text-slate-300" /><h3 className="text-xl font-semibold text-slate-900">Nenhum conteúdo encontrado</h3><p className="mt-2 max-w-md text-sm text-slate-500">{canManage ? 'Adicione materiais nessa área para começar a montar a biblioteca.' : 'Quando novos materiais forem publicados, eles aparecerão aqui.'}</p></div> : (
                  <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                    {filteredResources.map((resource) => {
                      const category = categories.find((item) => item.id === resource.category_id);
                      const Icon = category ? iconMap[category.icon || 'book'] || BookOpen : BookOpen;
                      return (
                        <Card key={resource.id} className="rounded-[26px] border-slate-200/90 bg-white">
                          <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: category?.color ? `${category.color}1f` : 'rgba(239,68,68,.12)' }}><Icon className="h-5 w-5" style={{ color: category?.color || '#ef4444' }} /></div>
                              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{category?.name || 'Biblioteca'}</p><CardTitle className="mt-1 text-lg leading-tight text-slate-950">{resource.title}</CardTitle></div>
                            </div>
                            {resource.description ? <CardDescription className="line-clamp-3 text-sm leading-6 text-slate-500">{resource.description}</CardDescription> : null}
                          </CardHeader>
                          <CardContent className="space-y-3 pt-0">
                            <div className="flex flex-wrap gap-2">
                              {resource.source_url ? <Button size="sm" className="rounded-xl bg-red-500 text-white hover:bg-red-600" onClick={() => window.open(resource.source_url!, '_blank')}><ExternalLink className="mr-2 h-4 w-4" />Abrir link</Button> : null}
                              {resource.file_ref ? <Button size="sm" variant="outline" className="rounded-xl border-slate-200" onClick={() => window.open(getFileUrl(resource.file_ref!), '_blank')}><File className="mr-2 h-4 w-4" />Abrir arquivo</Button> : null}
                            </div>
                            {canManage ? <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3"><Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-500" onClick={() => openEdit(resource)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-500" onClick={() => deleteResource.mutate(resource.id)}><Trash2 className="h-4 w-4" /></Button></div> : null}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar conteúdo</DialogTitle></DialogHeader>
          {editingResource ? (
            <div className="space-y-4 pt-4">
              <div><Label className="font-medium">{editingResource.title}</Label><p className="text-sm text-slate-500">{editingResource.description || 'Sem descrição'}</p></div>
              <Input value={editLink} onChange={(e) => setEditLink(e.target.value)} placeholder="Atualizar link" />
              <div className="rounded-xl bg-slate-100 p-3 text-sm text-slate-600">{editFile ? editFile.name : 'Nenhum arquivo anexado'}</div>
              <input ref={editFileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.mp4,.mp3" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setIsUploading(true);
                try {
                  const ext = file.name.split('.').pop();
                  const path = `${user?.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                  const { error } = await supabase.storage.from('study-files').upload(path, file);
                  if (error) throw error;
                  setEditFile({ name: file.name, ref: path });
                } catch {
                  toast.error('Erro ao enviar arquivo.');
                } finally {
                  setIsUploading(false);
                }
              }} />
              <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => editFileInputRef.current?.click()} disabled={isUploading}>{isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="mr-2 h-4 w-4" />Trocar arquivo</>}</Button>{editFile ? <Button variant="outline" size="icon" onClick={() => setEditFile(null)}><X className="h-4 w-4" /></Button> : null}</div>
              <div className="flex gap-2 border-t border-slate-200 pt-4"><Button variant="outline" className="flex-1" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button><Button className="flex-1" onClick={() => updateResource.mutate()} disabled={updateResource.isPending}>{updateResource.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}</Button></div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
>>>>>>> 7cd6517 (sua mensagem)
    </div>
  );
}
