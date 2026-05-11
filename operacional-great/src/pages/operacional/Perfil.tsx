import { useEffect, useState, useCallback } from 'react';
import { Mail, ShieldCheck, UserCircle, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS, type User, type UserRole } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

const USER_ROLE_OPTIONS: UserRole[] = [
  'ATENDENTE',
  'GESTOR',
  'COORDENADOR_RED',
  'DESIGN',
  'EDITOR_VIDEO',
  'SDR',
  'CLOSER',
  'COORDENADOR_COMERCIAL',
  'EQUIPE_DESIGN',
  'EQUIPE_TECH',
  'ADMIN',
];

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
  const { user, isAdmin, addUser, deleteUser } = useAuth();
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [isUsersDialogOpen, setIsUsersDialogOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('ATENDENTE');
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, operational_role, commercial_role, team_id, is_active, created_at, is_admin')
          .order('full_name', { ascending: true });

        if (error) {
          throw error;
        }

        const mappedUsers = (data || [])
          .map((profile: any) => ({
            id: profile.id,
            name: profile.full_name || profile.email || 'Usuário',
            email: profile.email || '',
            role: profile.operational_role || profile.commercial_role || 'ATENDENTE',
            isAdmin: profile.is_admin ?? false,
            teamId: profile.team_id || undefined,
            active: profile.is_active !== false,
            createdAt: profile.created_at ? new Date(profile.created_at) : new Date(),
          }))
          .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));

        if (isMounted) {
          setRegisteredUsers(mappedUsers);
        }
      } catch (error) {
        console.error('Erro ao carregar perfis cadastrados:', error);
      }
    };

    void loadProfiles();

    return () => {
      isMounted = false;
    };
  }, []);

  const reloadProfiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, operational_role, commercial_role, team_id, is_active, created_at, is_admin')
        .order('full_name', { ascending: true });

      if (error) {
        throw error;
      }

      const mappedUsers = (data || [])
        .map((profile: any) => ({
          id: profile.id,
          name: profile.full_name || profile.email || 'Usuário',
          email: profile.email || '',
          role: profile.operational_role || profile.commercial_role || 'ATENDENTE',
          isAdmin: profile.is_admin ?? false,
          teamId: profile.team_id || undefined,
          active: profile.is_active !== false,
          createdAt: profile.created_at ? new Date(profile.created_at) : new Date(),
        }))
        .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));

      setRegisteredUsers(mappedUsers);
    } catch (error) {
      console.error('Erro ao recarregar perfis cadastrados:', error);
    }
  }, []);

  if (!user) return null;

  const orderedUsers = sortUsers(registeredUsers);
  const currentUser = orderedUsers.find((registeredUser) => registeredUser.id === user.id) ?? user;

  const resetCreateUserForm = () => {
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserRole('ATENDENTE');
    setNewUserIsAdmin(false);
  };

  const handleCreateUser = async () => {
    if (!isAdmin) return;

    const name = newUserName.trim();
    const email = newUserEmail.trim();
    const password = newUserPassword.trim();

    if (!name || !email || !password) return;

    const role = newUserIsAdmin ? 'ADMIN' : newUserRole;

    await addUser({
      name,
      email,
      password,
      role,
      isAdmin: role === 'ADMIN',
      active: true,
    });

    await reloadProfiles();
    resetCreateUserForm();
    setIsCreateUserOpen(false);
  };

  const handleDeleteUser = async () => {
    if (!isAdmin || !userToDelete || userToDelete.id === currentUser.id) return;

    await deleteUser(userToDelete.id);
    await reloadProfiles();
    setUserToDelete(null);
  };

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
                {isAdmin ? 'Perfil de administrador' : 'Perfil operacional'}
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

        <div className="flex flex-wrap gap-3 self-start md:self-auto">
          {isAdmin && (
            <Button
              type="button"
              size="lg"
              className="gap-2"
              data-cy="btn-adicionar-pessoa"
              onClick={() => {
                void reloadProfiles();
                setIsCreateUserOpen(true);
              }}
            >
              <UserCircle className="h-4 w-4" />
              Adicionar pessoa
            </Button>
          )}

          <Button
            type="button"
            size="lg"
            variant="outline"
            className="gap-2"
            data-cy="btn-usuarios-cadastrados"
            onClick={() => {
              void reloadProfiles();
              setIsUsersDialogOpen(true);
            }}
          >
            <Users className="h-4 w-4" />
            Usuários cadastrados
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/80 shadow-card">
          <CardHeader className="pb-3">
            <CardDescription>Usuários ativos</CardDescription>
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
            <CardDescription>Visão rápida da conta atualmente conectada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Nome</p>
              <p className="mt-2 text-base font-medium text-foreground">{currentUser.name}</p>
            </div>

            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">E-mail</p>
              <p className="mt-2 text-base font-medium text-foreground">{currentUser.email}</p>
            </div>

            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Status</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10">
                  {currentUser.active ? 'Ativo' : 'Inativo'}
                </Badge>
                {currentUser.isAdmin && (
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                    Administrador
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">Conta liberada para login local.</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-card">
          <CardHeader>
            <CardTitle>Permissões</CardTitle>
            <CardDescription>Configuração atual para o perfil conectado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Acesso ao módulo operacional</p>
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
                  <p className="font-medium text-foreground">Criação e acompanhamento de tarefas</p>
                  <p className="text-sm text-muted-foreground">
                    Os usuários adicionados foram configurados com o mesmo perfil operacional para trabalhar no dia a dia.
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
              <DialogTitle>Usuários cadastrados</DialogTitle>
              <DialogDescription>
                Lista atual de contas ativas sincronizadas com o Supabase e disponíveis para tarefas e acesso.
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
                          Você
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
                      {registeredUser.isAdmin ? (
                        <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                          Admin
                        </Badge>
                      ) : null}
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

                {isAdmin && registeredUser.id !== currentUser.id && (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="md:ml-4"
                    data-cy="btn-excluir-usuario"
                    onClick={() => setUserToDelete(registeredUser)}
                  >
                    Excluir
                  </Button>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCreateUserOpen}
        onOpenChange={(open) => {
          setIsCreateUserOpen(open);
          if (!open) resetCreateUserForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar pessoa</DialogTitle>
            <DialogDescription>
              Crie uma nova conta local com acesso de usuário ou administrador.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-user-name">Nome</Label>
              <Input
                id="new-user-name"
                value={newUserName}
                onChange={(event) => setNewUserName(event.target.value)}
                placeholder="Nome da pessoa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-user-email">E-mail</Label>
              <Input
                id="new-user-email"
                type="email"
                value={newUserEmail}
                onChange={(event) => setNewUserEmail(event.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-user-password">Senha</Label>
              <Input
                id="new-user-password"
                type="password"
                value={newUserPassword}
                onChange={(event) => setNewUserPassword(event.target.value)}
                placeholder="Senha inicial"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-user-role">Perfil</Label>
              <Select
                value={newUserRole}
                onValueChange={(value) => {
                  const nextRole = value as UserRole;
                  setNewUserRole(nextRole);
                  setNewUserIsAdmin(nextRole === 'ADMIN');
                }}
              >
                <SelectTrigger id="new-user-role">
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-3">
              <Checkbox
                checked={newUserIsAdmin}
                onCheckedChange={(checked) => {
                  const nextIsAdmin = Boolean(checked);
                  setNewUserIsAdmin(nextIsAdmin);
                  setNewUserRole(nextIsAdmin ? 'ADMIN' : 'ATENDENTE');
                }}
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium text-foreground">É administrador?</span>
                <span className="block text-xs text-muted-foreground">
                  Administradores podem entrar no modo admin, filtrar o Meu Dia e excluir ou adicionar pessoas.
                </span>
              </span>
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateUserOpen(false);
                resetCreateUserForm();
              }}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleCreateUser}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(userToDelete)} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pessoa?</AlertDialogTitle>
            <AlertDialogDescription>
              {userToDelete
                ? `Tem certeza que deseja excluir ${userToDelete.name}? Essa ação remove o acesso dessa conta.`
                : 'Essa ação remove o acesso dessa conta.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-cy="btn-confirmar-exclusao"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
