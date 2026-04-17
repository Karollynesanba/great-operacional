import { useState } from 'react';
import { Mail, ShieldCheck, UserCircle, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS, type User } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatCreatedAt(value: Date | string | undefined) {
  if (!value) return 'Agora';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Agora';

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function sortUsers(users: User[]) {
  return [...users].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
}

export default function Perfil() {
  const { user, users } = useAuth();
  const [isUsersDialogOpen, setIsUsersDialogOpen] = useState(false);

  if (!user) return null;

  const orderedUsers = sortUsers(users);
  const currentUser = orderedUsers.find((registeredUser) => registeredUser.id === user.id) ?? user;

  return (
    <div className="space-y-6">
      <section className="great-panel flex flex-col gap-6 rounded-[28px] px-6 py-7 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border border-primary/15 bg-primary/5">
            <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
              {getInitials(currentUser.name)}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground md:text-3xl">{currentUser.name}</h1>
              <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                Perfil operacional
              </Badge>
            </div>

            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              {currentUser.email}
            </p>

            <p className="text-sm text-muted-foreground">
              Acesso atual: <span className="font-medium text-foreground">{ROLE_LABELS[currentUser.role]}</span>
            </p>
          </div>
        </div>

        <Button
          type="button"
          size="lg"
          className="gap-2 self-start md:self-auto"
          onClick={() => setIsUsersDialogOpen(true)}
        >
          <Users className="h-4 w-4" />
          Usuarios cadastrados
        </Button>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/80 shadow-card">
          <CardHeader className="pb-3">
            <CardDescription>Usuarios ativos</CardDescription>
            <CardTitle>{orderedUsers.filter((registeredUser) => registeredUser.active).length}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-border/80 shadow-card">
          <CardHeader className="pb-3">
            <CardDescription>Seu papel</CardDescription>
            <CardTitle>{ROLE_LABELS[currentUser.role]}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-border/80 shadow-card">
          <CardHeader className="pb-3">
            <CardDescription>Cadastrado em</CardDescription>
            <CardTitle>{formatCreatedAt(currentUser.createdAt)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/80 shadow-card">
          <CardHeader>
            <CardTitle>Resumo da conta</CardTitle>
            <CardDescription>Visao rapida da conta atualmente conectada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Nome</p>
              <p className="mt-2 text-base font-medium text-foreground">{currentUser.name}</p>
            </div>

            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Email</p>
              <p className="mt-2 text-base font-medium text-foreground">{currentUser.email}</p>
            </div>

            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Status</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10">
                  {currentUser.active ? 'Ativo' : 'Inativo'}
                </Badge>
                <span className="text-sm text-muted-foreground">Conta liberada para login local.</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-card">
          <CardHeader>
            <CardTitle>Permissoes</CardTitle>
            <CardDescription>Configuracao atual para o perfil conectado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Acesso ao modulo operacional</p>
                  <p className="text-sm text-muted-foreground">
                    O perfil atual pode entrar na plataforma e usar o fluxo operacional do app.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="flex items-start gap-3">
                <UserCircle className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Criacao e acompanhamento de tarefas</p>
                  <p className="text-sm text-muted-foreground">
                    Os usuarios adicionados foram configurados com o mesmo perfil operacional para trabalhar no dia a dia.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isUsersDialogOpen} onOpenChange={setIsUsersDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Usuarios cadastrados</DialogTitle>
            <DialogDescription>
              Lista atual de contas disponiveis no login local da plataforma.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
            {orderedUsers.map((registeredUser) => (
              <div
                key={registeredUser.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-background/70 p-4 md:flex-row md:items-center"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-primary/10 bg-primary/5">
                    <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                      {getInitials(registeredUser.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-foreground">{registeredUser.name}</p>
                      {registeredUser.id === currentUser.id ? (
                        <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                          Voce
                        </Badge>
                      ) : null}
                      <Badge
                        variant="outline"
                        className={
                          registeredUser.active
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
                            : 'border-border bg-muted text-muted-foreground'
                        }
                      >
                        {registeredUser.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>

                    <p className="truncate text-sm text-muted-foreground">{registeredUser.email}</p>
                  </div>
                </div>

                <div className="md:ml-auto md:text-right">
                  <p className="text-sm font-medium text-foreground">{ROLE_LABELS[registeredUser.role]}</p>
                  <p className="text-xs text-muted-foreground">
                    Desde {formatCreatedAt(registeredUser.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
