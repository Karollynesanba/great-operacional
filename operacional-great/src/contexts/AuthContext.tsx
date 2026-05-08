import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, UserRole, Module, ActivityLog, Team } from '@/types';
import { canEditPlatform } from '@/lib/userMapping';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/safeStorage';
import { getAuthSeedUsers, getRemovedAuthEmails } from '@/config/authSeed';
import { supabase } from '@/integrations/supabase/client';
import type { Database, TablesInsert } from '@/integrations/supabase/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  canEdit: boolean;
  hasDualAccess: boolean;
  login: (email: string, password: string, mode?: 'admin' | 'user') => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string, role?: UserRole, isAdmin?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  selectedModule: Module | null;
  selectModule: (module: Module) => void;
  getModule: () => Module | null;
  hasAccess: (requiredModule: Module) => boolean;
  users: User[];
  addUser: (user: Omit<User, 'id' | 'createdAt'> & { password: string }) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => Promise<void>;
  teams: Team[];
  addTeam: (name: string) => void;
  updateTeam: (id: string, name: string) => void;
  deleteTeam: (id: string) => void;
  activityLogs: ActivityLog[];
  logActivity: (action: string, entity: string, entityId?: string, details?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_SEED_USERS = getAuthSeedUsers();
const REMOVED_USER_EMAILS = new Set(Array.from(getRemovedAuthEmails()).map((email) => normalizeEmailForLogin(email)));
const LOCAL_TEAM_TO_PROFILE_TEAM: Record<string, string> = {
  'team-1': 'equipe-7',
  'team-2': 'tropa-de-elite',
};

const FORCED_ROLE_BY_EMAIL: Record<string, UserRole> = {
  'amandagreatsd@gmail.com': 'EDITOR_VIDEO',
};

const FORCED_ROLE_BY_NAME: Record<string, UserRole> = {
  bryton: 'GESTOR',
  brayton: 'GESTOR',
};

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type StoredUserRecord = User & { password: string };

function normalizeLookupKey(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizeEmailForLogin(value: string) {
  const email = value.trim().toLowerCase();
  const atIndex = email.lastIndexOf('@');

  if (atIndex === -1) {
    return email;
  }

  const localPart = email.slice(0, atIndex);
  const domainPart = email.slice(atIndex + 1);

  if (domainPart === 'gmail.com' || domainPart === 'googlemail.com') {
    return `${localPart.replace(/\./g, '').split('+')[0]}@${domainPart}`;
  }

  return email;
}

function getSeedPasswordByEmail(_email: string) {
  const normalizedEmail = normalizeEmailForLogin(_email);
  const seedUser = AUTH_SEED_USERS.find((user) => normalizeEmailForLogin(user.email) === normalizedEmail);
  return seedUser?.password ?? null;
}

function normalizeUserRecord(userRecord: StoredUserRecord): StoredUserRecord {
  const forcedRole = FORCED_ROLE_BY_EMAIL[userRecord.email.toLowerCase()];
  const forcedRoleByName = FORCED_ROLE_BY_NAME[normalizeLookupKey(userRecord.name)];
  return {
    ...userRecord,
    role: forcedRole || forcedRoleByName || userRecord.role,
    isAdmin: userRecord.isAdmin ?? userRecord.role === 'ADMIN',
    createdAt: userRecord.createdAt ? new Date(userRecord.createdAt) : new Date(),
  };
}

function mergeUsersWithDefaults(storedUsers?: StoredUserRecord[] | null) {
  const mergedUsers = new Map<string, StoredUserRecord>();

  AUTH_SEED_USERS.forEach((seedUser) => {
    const normalizedSeedEmail = normalizeEmailForLogin(seedUser.email);
    if (REMOVED_USER_EMAILS.has(normalizedSeedEmail)) {
      return;
    }
    mergedUsers.set(normalizedSeedEmail, normalizeUserRecord(seedUser));
  });

  storedUsers?.forEach((storedUser) => {
    const normalizedStoredUser = normalizeUserRecord(storedUser);
    const normalizedEmail = normalizeEmailForLogin(normalizedStoredUser.email);
    if (REMOVED_USER_EMAILS.has(normalizedEmail)) {
      return;
    }
    mergedUsers.set(normalizedEmail, normalizedStoredUser);
  });

  return Array.from(mergedUsers.values());
}

function getOperationalRole(role: UserRole): TablesInsert<'profiles'>['operational_role'] {
  switch (role) {
    case 'ATENDENTE':
    case 'GESTOR':
    case 'COORDENADOR_RED':
    case 'DESIGN':
    case 'EDITOR_VIDEO':
    case 'EQUIPE_DESIGN':
    case 'EQUIPE_TECH':
      return role;
    default:
      return null;
  }
}

function getCommercialRole(role: UserRole): TablesInsert<'profiles'>['commercial_role'] {
  switch (role) {
    case 'SDR':
    case 'CLOSER':
    case 'COORDENADOR_COMERCIAL':
      return role;
    default:
      return null;
  }
}

function getUserRoleFromProfile(profile: Pick<ProfileRow, 'operational_role' | 'commercial_role' | 'is_admin'>): UserRole {
  if (profile.is_admin) return 'ADMIN';
  if (profile.operational_role) return profile.operational_role;
  if (profile.commercial_role) return profile.commercial_role;
  return 'ATENDENTE';
}

function toStoredUserFromProfile(profile: ProfileRow, passwordFallback = ''): StoredUserRecord {
  const role = getUserRoleFromProfile(profile);
  return normalizeUserRecord({
    id: profile.id,
    name: profile.full_name,
    email: profile.email,
    password: profile.login_password || passwordFallback,
    role,
    isAdmin: profile.is_admin ?? role === 'ADMIN',
    teamId: profile.team_id ?? undefined,
    active: profile.is_active ?? true,
    createdAt: profile.created_at ? new Date(profile.created_at) : new Date(),
  });
}

function toProfileRecord(userRecord: StoredUserRecord): TablesInsert<'profiles'> {
  return {
    id: userRecord.id,
    email: userRecord.email,
    full_name: userRecord.name,
    is_active: userRecord.active,
    avatar_url: null,
    operational_role: getOperationalRole(userRecord.role),
    commercial_role: getCommercialRole(userRecord.role),
    team_id: userRecord.teamId ? (LOCAL_TEAM_TO_PROFILE_TEAM[userRecord.teamId] ?? null) : null,
    login_password: userRecord.password,
    is_admin: userRecord.isAdmin ?? userRecord.role === 'ADMIN',
  };
}

async function syncProfileForUser(userRecord: StoredUserRecord) {
  const record = toProfileRecord(userRecord);
  const normalizedEmail = normalizeEmailForLogin(record.email);

  const { data: existingProfile, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .ilike('email', normalizedEmail)
    .maybeSingle();

  if (lookupError) {
    console.error('Erro ao localizar perfil para sincronização:', lookupError);
    return false;
  }

  if (existingProfile?.id) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        ...record,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingProfile.id);

    if (updateError) {
      console.error('Erro ao atualizar perfil no Supabase:', updateError);
      return false;
    }

    return true;
  }

  const { error: insertError } = await supabase.from('profiles').insert({
    ...record,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error('Erro ao inserir perfil no Supabase:', insertError);
    return false;
  }

  return true;
}

const ROLE_MODULE_MAP: Record<UserRole, Module | null> = {
  'ADMIN': null,
  'SETOR_COMERCIAL': 'COMERCIAL',
  'ATENDENTE': 'OPERACIONAL',
  'GESTOR': 'OPERACIONAL',
  'COORDENADOR_RED': 'OPERACIONAL',
  'DESIGN': 'OPERACIONAL',
  'EDITOR_VIDEO': 'OPERACIONAL',
  'SDR': 'COMERCIAL',
  'CLOSER': 'COMERCIAL',
  'COORDENADOR_COMERCIAL': 'COMERCIAL',
  'EQUIPE_DESIGN': 'OPERACIONAL',
  'EQUIPE_TECH': null,
};

const INITIAL_TEAMS: Team[] = [
  { id: 'team-1', name: 'Equipe 7', createdAt: new Date() },
  { id: 'team-2', name: 'Tropa de Elite', createdAt: new Date() },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = safeGetItem('great_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const forcedRole = FORCED_ROLE_BY_EMAIL[String(parsed.email || '').toLowerCase()];
        const forcedRoleByName = FORCED_ROLE_BY_NAME[normalizeLookupKey(String(parsed.name || ''))];
        return {
          ...parsed,
          role: forcedRole || forcedRoleByName || parsed.role,
          isAdmin: parsed.isAdmin ?? (forcedRole || forcedRoleByName || parsed.role) === 'ADMIN',
        };
      } catch {
        return null;
      }
    }
    return null;
  });

  const [users, setUsers] = useState<StoredUserRecord[]>(() => {
    const stored = safeGetItem('great_users');
    if (stored) {
      try {
        return mergeUsersWithDefaults(JSON.parse(stored));
      } catch {
        return mergeUsersWithDefaults();
      }
    }
    return mergeUsersWithDefaults();
  });

  const [usersLoaded, setUsersLoaded] = useState(false);

  const [teams, setTeams] = useState<Team[]>(() => {
    return INITIAL_TEAMS;
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => []);

  const [isLoading, setIsLoading] = useState(false);

  const [selectedModule, setSelectedModule] = useState<Module | null>(() => {
    const stored = safeGetItem('great_selected_module');
    return stored as Module | null;
  });

  useEffect(() => {
    safeSetItem('great_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    const syncProfiles = async () => {
      try {
        for (const userRecord of users) {
          await syncProfileForUser(userRecord);
        }
      } catch (error) {
        console.error('Erro ao sincronizar perfis locais:', error);
      }
    };

    void syncProfiles();
  }, [users]);

  useEffect(() => {
    const loadRemoteProfiles = async () => {
      try {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url, operational_role, commercial_role, team_id, is_active, created_at, login_password, is_admin');

        if (error) throw error;

        if (!profiles?.length) return;

        setUsers((currentUsers) => {
          const remoteUsers = profiles
            .filter((profile) => !REMOVED_USER_EMAILS.has(normalizeEmailForLogin(profile.email)))
            .map((profile) => toStoredUserFromProfile(profile));
          return mergeUsersWithDefaults([...currentUsers, ...remoteUsers]);
        });
      } catch (error) {
        console.error('Erro ao carregar perfis remotos:', error);
      } finally {
        setUsersLoaded(true);
      }
    };

    void loadRemoteProfiles();
  }, []);

  useEffect(() => {
    if (!user || !usersLoaded) return;

    const stillExists = users.some((registeredUser) => registeredUser.id === user.id);

    if (!stillExists) {
      setUser(null);
      setSelectedModule(null);
      safeRemoveItem('great_user');
      safeRemoveItem('great_selected_module');
    }
  }, [user, users, usersLoaded]);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const { data: remoteTeams, error } = await supabase
          .from('teams')
          .select('id, name, created_at, updated_at')
          .order('name', { ascending: true });

        if (error) throw error;

        if (remoteTeams?.length) {
          setTeams(
            remoteTeams.map((team) => ({
              id: team.id,
              name: team.name,
              createdAt: team.created_at ? new Date(team.created_at) : new Date(),
            })),
          );
        }
      } catch (error) {
        console.error('Erro ao carregar equipes remotas:', error);
      }
    };

    void loadTeams();
  }, []);

  const logActivity = useCallback((action: string, entity: string, entityId?: string, details?: string) => {
    if (!user) return;
    const log: ActivityLog = {
      id: crypto.randomUUID(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action,
      entity,
      entityId,
      details,
      createdAt: new Date(),
    };
    setActivityLogs(prev => [log, ...prev].slice(0, 500));

    void supabase.from('activity_logs').insert({
      id: log.id,
      user_id: log.userId,
      user_name: log.userName,
      user_email: user.email,
      action: log.action,
      entity: log.entity,
      entity_id: log.entityId || null,
      details: log.details || null,
    });
  }, [user]);

  const login = useCallback(async (email: string, password: string, mode: 'admin' | 'user' = 'user'): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const normalizedEmail = normalizeEmailForLogin(email);

    let found = users.find(
      u => normalizeEmailForLogin(u.email) === normalizedEmail && u.password === password && u.active
    );

    if (!found) {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, operational_role, commercial_role, team_id, is_active, created_at, login_password, is_admin')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao consultar perfil remoto no login:', error);
      } else {
        const profile = profiles?.find((remoteProfile) =>
          normalizeEmailForLogin(remoteProfile.email) === normalizedEmail &&
          remoteProfile.login_password === password &&
          (remoteProfile.is_active ?? true)
        );

        if (profile) {
          found = toStoredUserFromProfile(profile);
        }
      }

      if (found) {
        setUsers((currentUsers) => mergeUsersWithDefaults([...currentUsers, found as StoredUserRecord]));
        await syncProfileForUser(found as StoredUserRecord);
      }
    }

    if (!found) {
      setIsLoading(false);
      return { success: false, error: 'Email ou senha incorretos.' };
    }

    if (mode === 'admin' && !found.isAdmin) {
      setIsLoading(false);
      return { success: false, error: 'Esse acesso é exclusivo para administradores.' };
    }

    if (mode === 'user' && found.isAdmin) {
      setIsLoading(false);
      return { success: false, error: 'Use a opção de administrador para entrar com essa conta.' };
    }

    const { password: _, ...userWithoutPassword } = found;
    const loggedUser: User = { ...userWithoutPassword, isAdmin: userWithoutPassword.isAdmin ?? userWithoutPassword.role === 'ADMIN' };

    setUser(loggedUser);
    safeSetItem('great_user', JSON.stringify(loggedUser));

    const log: ActivityLog = {
      id: crypto.randomUUID(),
      userId: loggedUser.id,
      userName: loggedUser.name,
      userRole: loggedUser.role,
      action: 'LOGIN',
      entity: 'Session',
      details: `Login realizado às ${new Date().toLocaleTimeString('pt-BR')}`,
      createdAt: new Date(),
    };
    setActivityLogs(prev => [log, ...prev].slice(0, 500));

    setIsLoading(false);
    return { success: true };
  }, [users]);

  const signUp = useCallback(async (email: string, password: string, name: string, role: UserRole = 'ATENDENTE', isAdmin = false): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      const normalizedEmail = normalizeEmailForLogin(email);

    const exists = users.find(u => normalizeEmailForLogin(u.email) === normalizedEmail);
    if (exists) {
      setIsLoading(false);
      return { success: false, error: 'Este email já está cadastrado.' };
    }

    const { data: profiles, error: existingError } = await supabase
      .from('profiles')
      .select('id, email')
      .order('created_at', { ascending: false });

    if (existingError) {
      console.error('Erro ao verificar perfil existente:', existingError);
    }

    const existingProfile = profiles?.find((profile) => normalizeEmailForLogin(profile.email) === normalizedEmail);
    if (existingProfile) {
      setIsLoading(false);
      return { success: false, error: 'Este email já está cadastrado.' };
    }

      const newUser: User & { password: string } = {
        id: crypto.randomUUID(),
        email: normalizedEmail,
        name,
        password,
        role: isAdmin ? 'ADMIN' : role,
        isAdmin,
        active: true,
        createdAt: new Date(),
      };

    setUsers(prev => [...prev, newUser]);
    const synced = await syncProfileForUser(newUser);
    if (!synced) {
      setIsLoading(false);
      return { success: false, error: 'Não foi possível salvar sua conta no servidor.' };
    }

    const { password: __, ...userWithoutPassword } = newUser;
    setUser(userWithoutPassword);
    safeSetItem('great_user', JSON.stringify(userWithoutPassword));

    setIsLoading(false);
    return { success: true };
  }, [users]);

  const logout = useCallback(async () => {
    if (user) {
      const log: ActivityLog = {
        id: crypto.randomUUID(),
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'LOGOUT',
        entity: 'Session',
        details: `Logout realizado Ã s ${new Date().toLocaleTimeString('pt-BR')}`,
        createdAt: new Date(),
      };
      setActivityLogs(prev => [log, ...prev].slice(0, 500));
    }

    setUser(null);
    setSelectedModule(null);
    safeRemoveItem('great_user');
    safeRemoveItem('great_selected_module');
  }, [user]);

  const selectModule = useCallback((module: Module) => {
    setSelectedModule(module);
    safeSetItem('great_selected_module', module);

    if (user) {
      const log: ActivityLog = {
        id: crypto.randomUUID(),
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'MODULE_SWITCH',
        entity: 'Module',
        details: `Acessou mÃ³dulo ${module}`,
        createdAt: new Date(),
      };
      setActivityLogs(prev => [log, ...prev].slice(0, 500));
    }
  }, [user]);

  const getModule = useCallback((): Module | null => {
    if (!user) return null;
    if (user.isAdmin || user.role === 'ADMIN') return selectedModule;
    if (user.role === 'EQUIPE_TECH') return selectedModule;
    return ROLE_MODULE_MAP[user.role];
  }, [user, selectedModule]);

  const hasAccess = useCallback((module: Module): boolean => {
    if (!user) return false;
    if (user.isAdmin || user.role === 'ADMIN') return true;
    if (user.role === 'EQUIPE_TECH' && (module === 'TECH' || module === 'OPERACIONAL')) return true;
    return ROLE_MODULE_MAP[user.role] === module;
  }, [user]);

  const addUser = useCallback((userData: Omit<User, 'id' | 'createdAt'> & { password: string }) => {
    if (!(user?.isAdmin || user?.role === 'ADMIN')) return;

    const normalizedEmail = normalizeEmailForLogin(userData.email);
    const alreadyExists = users.some((existingUser) => normalizeEmailForLogin(existingUser.email) === normalizedEmail);
    if (alreadyExists) return;

    const newUser = {
      ...userData,
      email: normalizedEmail,
      isAdmin: userData.isAdmin ?? userData.role === 'ADMIN',
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    setUsers(prev => [...prev, newUser]);
    void syncProfileForUser(newUser);
    logActivity('USER_CREATED', 'User', newUser.id, `Usuário ${newUser.name} (${newUser.email}) criado`);
  }, [user, logActivity, users]);

  const updateUser = useCallback((id: string, data: Partial<User>) => {
    setUsers(prev => {
      const updatedUsers = prev.map((u) => (u.id === id ? { ...u, ...data, email: data.email ? normalizeEmailForLogin(data.email) : u.email } : u));
      const updatedUser = updatedUsers.find((u) => u.id === id);
      if (updatedUser) {
        void syncProfileForUser(updatedUser);
      }
      return updatedUsers;
    });
    logActivity('USER_UPDATED', 'User', id, 'Usuário atualizado');
  }, [logActivity]);

  const deleteUser = useCallback(async (id: string) => {
    if (!(user?.isAdmin || user?.role === 'ADMIN')) return;

    const userToDelete = users.find(u => u.id === id);
    setUsers(prev => prev.filter(u => u.id !== id));
    try {
      const emailToDelete = userToDelete ? normalizeEmailForLogin(userToDelete.email) : null;
      if (emailToDelete) {
        await supabase.from('profiles').delete().ilike('email', emailToDelete);
      }
      await supabase.from('profiles').delete().eq('id', id);
    } catch (error) {
      console.error('Erro ao excluir perfil globalmente:', error);
    }
    logActivity('USER_DELETED', 'User', id, `UsuÃ¡rio ${userToDelete?.name} removido`);
  }, [user, users, logActivity]);

  const addTeam = useCallback((name: string) => {
    const newTeam: Team = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date(),
    };
    setTeams(prev => [...prev, newTeam]);
    void supabase.from('teams').insert({
      id: newTeam.id,
      name: newTeam.name,
      created_at: newTeam.createdAt.toISOString(),
      updated_at: newTeam.createdAt.toISOString(),
    });
    logActivity('TEAM_CREATED', 'Team', newTeam.id, `Equipe "${name}" criada`);
  }, [logActivity]);

  const updateTeam = useCallback((id: string, name: string) => {
    setTeams(prev => prev.map(t => t.id === id ? { ...t, name } : t));
    void supabase.from('teams').update({
      name,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    logActivity('TEAM_UPDATED', 'Team', id, `Equipe atualizada para "${name}"`);
  }, [logActivity]);

  const deleteTeam = useCallback((id: string) => {
    const teamToDelete = teams.find(t => t.id === id);
    setTeams(prev => prev.filter(t => t.id !== id));
    setUsers(prev => prev.map(u => u.teamId === id ? { ...u, teamId: undefined } : u));
    void supabase.from('teams').delete().eq('id', id);
    logActivity('TEAM_DELETED', 'Team', id, `Equipe "${teamToDelete?.name}" removida`);
  }, [teams, logActivity]);

  const isAuthenticated = !!user;
  const isAdmin = user?.isAdmin || user?.role === 'ADMIN';
  const canEdit = isAdmin || canEditPlatform(user?.email || '', user?.role || '');
  const hasDualAccess = false;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        isAdmin,
        canEdit,
        hasDualAccess,
        login,
        signUp,
        logout,
        selectedModule,
        selectModule,
        getModule,
        hasAccess,
        users: users.map(({ password, ...u }) => u),
        addUser,
        updateUser,
        deleteUser,
        teams,
        addTeam,
        updateTeam,
        deleteTeam,
        activityLogs,
        logActivity,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useAuthSafe() {
  const context = useContext(AuthContext);
  return context ?? null;
}

