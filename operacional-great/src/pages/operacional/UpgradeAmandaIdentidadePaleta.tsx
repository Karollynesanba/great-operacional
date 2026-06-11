import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  FileImage,
  Image as ImageIcon,
  Pencil,
  Palette,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  Monitor,
  Lightbulb,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const palette = [
  { hex: '#2E7D32', label: 'Verde marca' },
  { hex: '#76C442', label: 'Verde apoio' },
  { hex: '#FFFFFF', label: 'Branco' },
  { hex: '#1A1A1A', label: 'Preto' },
  { hex: '#E5E7EB', label: 'Cinza claro' },
  { hex: '#F5F5DC', label: 'Bege claro' },
  { hex: '#D4AF37', label: 'Dourado' },
];

const references = [
  { title: 'Upload Logo', subtitle: 'PNG, JPG ou SVG', icon: Upload },
  { title: 'Upload Manual', subtitle: 'PDF ou imagens', icon: BookOpen },
  { title: 'Upload Referências', subtitle: 'Imagens ou vídeos', icon: FileImage },
];

const applications = [
  { title: 'Cartão de Visita', color: 'bg-emerald-900/90', type: 'thumb' },
  { title: 'Post Instagram', color: 'bg-emerald-700', type: 'thumb' },
  { title: 'Site', color: 'bg-slate-100', type: 'mock' },
  { title: 'Papel Timbrado', color: 'bg-slate-50', type: 'mock' },
  { title: 'Uniforme', color: 'bg-emerald-900', type: 'mock' },
  { title: 'Adicionar aplicação', color: 'bg-white', type: 'empty' },
];

export default function UpgradeAmandaIdentidadePaleta() {
  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-border/70 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Badge className="w-fit rounded-full bg-red-50 px-3 py-1 text-red-600 shadow-none hover:bg-red-50">
              Upgrade de Amanda
            </Badge>
            <div>
              <h1 className="text-3xl font-black tracking-[-0.05em] text-foreground sm:text-4xl">Identidade / Paleta</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Gerencie as identidades visuais, paletas de cores e referências dos seus clientes em uma
                tela mais bonita, clara e organizada.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="rounded-2xl border-border/60 bg-white/85 shadow-sm">
              <Search className="mr-2 h-4 w-4" />
              Ver como usar
            </Button>
            <Button variant="outline" size="icon" className="h-11 w-11 rounded-2xl border-border/60 bg-white/85">
              <BookOpen className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card className="rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <CardContent className="p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="grid gap-2 sm:grid-cols-[1.2fr_220px]">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Cliente</p>
                <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-white px-3 py-2.5 shadow-sm">
                  <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-red-50 text-red-600">
                    <Users className="h-4 w-4" />
                  </div>
                  <Input defaultValue="Doutor Gustavo Lira" className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0" />
                  <button className="text-muted-foreground">
                    <ArrowLeft className="h-4 w-4 rotate-[-90deg]" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Gerenciar</p>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" className="h-11 w-11 rounded-2xl border-border/60 bg-white/85">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-11 w-11 rounded-2xl border-red-200 bg-red-50 text-red-600 hover:bg-red-100">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        <Card className="rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">Informações do Cliente</CardTitle>
                <CardDescription>Dados essenciais da identidade.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-6 pt-0">
            <div>
              <p className="text-sm text-muted-foreground">Nome</p>
              <p className="mt-1 text-lg font-semibold text-foreground">Doutor Gustavo Lira</p>
            </div>
            <div className="h-px bg-border/70" />
            <div>
              <p className="text-sm text-muted-foreground">Especialidade</p>
              <p className="mt-1 text-lg font-semibold text-foreground">Implantodontia</p>
            </div>
            <div className="h-px bg-border/70" />
            <div>
              <p className="text-sm text-muted-foreground">Cidade</p>
              <p className="mt-1 text-lg font-semibold text-foreground">Recife - PE</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    <Palette className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Paleta de Cores</CardTitle>
                    <CardDescription>Cores principais da marca</CardDescription>
                  </div>
                </div>
              </div>
              <Button className="rounded-2xl bg-red-600 text-white hover:bg-red-500">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Cor
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="flex flex-wrap gap-6">
              {palette.map((item) => (
                <div key={item.hex} className="flex flex-col items-center gap-3">
                  <div
                    className="h-16 w-16 rounded-full border border-black/10 shadow-sm"
                    style={{ backgroundColor: item.hex }}
                  />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-muted-foreground">{item.hex}</p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-start gap-3 rounded-[22px] border border-amber-200/70 bg-amber-50/60 p-4 text-sm text-amber-900">
              <Lightbulb className="mt-0.5 h-4 w-4 text-amber-500" />
              <p>
                Dica: Mantenha entre 3 e 7 cores principais para consistência visual.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">Referências Visuais</CardTitle>
                <CardDescription>Logotipos, manuais e referências da marca</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-6 pt-0">
            <div className="grid gap-3 sm:grid-cols-3">
              {references.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.title}
                    className="group rounded-[24px] border border-dashed border-border/70 bg-white p-4 text-left transition hover:border-red-200 hover:shadow-sm"
                  >
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-center font-semibold text-foreground">{item.title}</p>
                    <p className="text-center text-sm text-muted-foreground">{item.subtitle}</p>
                  </button>
                );
              })}
            </div>

            <div>
              <h3 className="mb-3 text-lg font-bold text-foreground">Arquivos enviados</h3>
              <div className="space-y-3">
                {[
                  { name: 'logo-joao-silva.png', meta: 'Logo • PNG • 2.4MB', icon: FileImage },
                  { name: 'manual-marca.pdf', meta: 'Manual da Marca • PDF • 1.8MB', icon: BookOpen },
                ].map((file) => {
                  const Icon = file.icon;
                  return (
                    <div key={file.name} className="flex items-center gap-3 rounded-[20px] border border-border/60 bg-surface-2/30 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm text-red-600">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{file.name}</p>
                        <p className="text-sm text-muted-foreground">{file.meta}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="rounded-full">
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-full">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <Monitor className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">Aplicações da Marca</CardTitle>
                <CardDescription>Exemplos de aplicação da identidade visual</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {applications.map((item) => (
                <div
                  key={item.title}
                  className={`overflow-hidden rounded-[24px] border border-border/60 ${item.type === 'empty' ? 'bg-white' : 'bg-surface-2/25'} p-3`}
                >
                  {item.type === 'empty' ? (
                    <button className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-[18px] border border-dashed border-red-200 bg-white text-red-600 transition hover:bg-red-50/50">
                      <Plus className="h-6 w-6" />
                      <span className="text-sm font-medium">Adicionar aplicação</span>
                    </button>
                  ) : (
                    <div className={`flex h-36 items-end justify-between rounded-[18px] p-4 text-white ${item.color}`}>
                      <div className="space-y-1">
                        <p className="text-lg font-semibold leading-tight">{item.title}</p>
                        <p className="text-xs opacity-80">Exemplo visual</p>
                      </div>
                      <Badge className="rounded-full bg-white/20 text-white hover:bg-white/20">Preview</Badge>
                    </div>
                  )}
                  <p className="mt-3 text-sm font-medium text-foreground">{item.title}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Detalhes da marca</CardTitle>
            <CardDescription>Resumo rápido das informações visuais.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-6 pt-0 sm:grid-cols-3">
            {[
              { label: 'Categoria', value: 'Saúde' },
              { label: 'Cores principais', value: '7' },
              { label: 'Arquivos anexados', value: '12' },
            ].map((item) => (
              <div key={item.label} className="rounded-[24px] border border-border/60 bg-surface-2/30 p-4">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-xl font-black tracking-[-0.04em] text-foreground">{item.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[30px] border-border/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Ações rápidas</CardTitle>
            <CardDescription>Atalhos para edição e organização.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 p-6 pt-0">
            <Button className="rounded-2xl bg-red-600 text-white hover:bg-red-500">
              <Upload className="mr-2 h-4 w-4" />
              Upload logo
            </Button>
            <Button variant="outline" className="rounded-2xl border-border/60 bg-white/80">
              <FileImage className="mr-2 h-4 w-4" />
              Upload referências
            </Button>
            <Button variant="outline" className="rounded-2xl border-border/60 bg-white/80">
              <Pencil className="mr-2 h-4 w-4" />
              Editar cliente
            </Button>
            <Button asChild variant="ghost" className="rounded-2xl text-red-600 hover:bg-red-50 hover:text-red-600">
              <Link to="/operacional/upgrade-de-amanda">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao hub
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
