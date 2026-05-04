import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, UserRole, Module, ActivityLog, Team } from '@/types';
import { TEAM_USERS, canEditPlatform } from '@/lib/userMapping';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/safeStorage';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  canEdit: boolean;
  hasDualAccess: boolean;
  login: (email: string, password: string, mode?: 'admin' | 'user') => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string, isAdmin?: boolean) => Promise<{ success: boolean; error?: string }>;
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

const SHARED_OPERATIONAL_PASSWORD = 'Great2026!';
const REMOVED_USER_EMAILS = new Set([
  'gestor@great.com',
  'comercial@great.com',
  'feliperangel.rego03@gmail.com',
  'design@great.com',
  'coordenador@great.com',
  'editor@great.com',
  'atendente@great.com',
]);

const REQUESTED_OPERATIONAL_USERS: (User & { password: string })[] = [
  {
    id: 'operacional-isaque-soares',
    name: 'Isaque Soares',
    email: 'isaquegreatsd@gmail.com',
    password: SHARED_OPERATIONAL_PASSWORD,
    role: 'ATENDENTE',
    isAdmin: false,
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'operacional-gustavo-lira',
    name: 'Gustavo Lira',
    email: 'gugaliraclash@gmail.com',
    password: SHARED_OPERATIONAL_PASSWORD,
    role: 'ATENDENTE',
    isAdmin: false,
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'operacional-victoria-freitas',
    name: 'Victória Freitas',
    email: 'freitasviih00@gmail.com',
    password: SHARED_OPERATIONAL_PASSWORD,
    role: 'ATENDENTE',
    isAdmin: false,
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'operacional-gerson-lopes',
    name: 'Gerson Lopes',
    email: 'gersonlopesgreat@gmail.com',
    password: SHARED_OPERATIONAL_PASSWORD,
    role: 'ATENDENTE',
    isAdmin: false,
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'operacional-matheus-tchaka',
    name: 'Matheus Tchaka',
    email: 'ocdremex@gmail.com',
    password: SHARED_OPERATIONAL_PASSWORD,
    role: 'ATENDENTE',
    isAdmin: false,
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'operacional-kauan-anderson',
    name: 'Kauan Anderson',
    email: 'kauananderson1919@gmail.com',
    password: SHARED_OPERATIONAL_PASSWORD,
    role: 'ATENDENTE',
    isAdmin: false,
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'operacional-amanda-great',
    name: 'Amanda Great',
    email: 'amandagreatsd@gmail.com',
    password: SHARED_OPERATIONAL_PASSWORD,
    role: 'EDITOR_VIDEO',
    isAdmin: false,
    teamId: 'team-2',
    active: true,
    createdAt: new Date(),
  },
];

const FORCED_ROLE_BY_EMAIL: Record<string, UserRole> = {
  'amandagreatsd@gmail.com': 'EDITOR_VIDEO',
};

const FORCED_ROLE_BY_NAME: Record<string, UserRole> = {
  bryton: 'GESTOR',
  brayton: 'GESTOR',
};

function normalizeLookupKey(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const INITIAL_USERS: (User & { password: string })[] = [
  {
    id: 'admin-1',
    name: TEAM_USERS.BRUNO.name,
    email: TEAM_USERS.BRUNO.email,
    password: 'Brunogomes2005!',
    role: 'ADMIN',
    isAdmin: true,
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'admin-pedro',
    name: 'Pedro Juan',
    email: 'pedroojuann1@gmail.com',
    password: 'Pedro2024!',
    role: 'ADMIN',
    isAdmin: true,
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'cled-1',
    name: TEAM_USERS.CLED.name,
    email: TEAM_USERS.CLED.email,
    password: 'Cled2001',
    role: 'COORDENADOR_COMERCIAL',
    isAdmin: false,
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'hebert-1',
    name: TEAM_USERS.HERBERT.name,
    email: TEAM_USERS.HERBERT.email,
    password: 'josehebert123',
    role: 'CLOSER',
    isAdmin: false,
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'miguel-1',
    name: TEAM_USERS.MIGUEL.name,
    email: TEAM_USERS.MIGUEL.email,
    password: 'Miguel24',
    role: 'SDR',
    isAdmin: false,
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'felipe-1',
    name: TEAM_USERS.FELIPE.name,
    email: TEAM_USERS.FELIPE.email,
    password: '343802',
    role: 'SDR',
    isAdmin: false,
    active: true,
    createdAt: new Date(),
  },
  {
    id: '1',
    name: 'Carlos Silva',
    email: 'comercial@great.com',
    password: 'demo123',
    role: 'SETOR_COMERCIAL',
    isAdmin: false,
    active: true,
    createdAt: new Date(),
  },
  {
    id: '2',
    name: 'Ana Santos',
    email: 'gestor@great.com',
    password: 'demo123',
    role: 'GESTOR',
    isAdmin: false,
    teamId: 'team-1',
    active: true,
    createdAt: new Date(),
  },
  {
    id: '3',
    name: 'Pedro Costa',
    email: 'atendente@great.com',
    password: 'demo123',
    role: 'ATENDENTE',
    isAdmin: false,
    teamId: 'team-1',
    active: true,
    createdAt: new Date(),
  },
  {
    id: '4',
    name: 'Marcos Oliveira',
    email: 'coordenador@great.com',
    password: 'demo123',
    role: 'COORDENADOR_RED',
    isAdmin: false,
    active: true,
    createdAt: new Date(),
  },
  {
    id: '5',
    name: 'Julia Mendes',
    email: 'design@great.com',
    password: 'demo123',
    role: 'DESIGN',
    isAdmin: false,
    teamId: 'team-2',
    active: true,
    createdAt: new Date(),
  },
  {
    id: '6',
    name: 'Ricardo Alves',
    email: 'editor@great.com',
    password: 'demo123',
    role: 'EDITOR_VIDEO',
    isAdmin: false,
    teamId: 'team-2',
    active: true,
    createdAt: new Date(),
  },
  // ── Usuários de teste (Cypress) ───────────────────────────
  {
    id: 'test-user-1',
    name: 'Usuário Teste',
    email: 'user@teste.com',
    password: '123456',
    role: 'ATENDENTE',
    isAdmin: false,
    teamId: 'team-1',
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'test-admin-1',
    name: 'Admin Teste',
    email: 'admin@teste.com',
    password: '123456',
    role: 'ADMIN',
    isAdmin: true,
    active: true,
    createdAt: new Date(),
  },
  ...REQUESTED_OPERATIONAL_USERS,
];

const LOCAL_TEAM_TO_PROFILE_TEAM: Record<string, string> = {
  'team-1': 'equipe-7',
  'team-2': 'tropa-de-elite',
};

function normalizeUserRecord(userRecord: User & { password: string }): User & { password: string } {
  const forcedRole = FORCED_ROLE_BY_EMAIL[userRecord.email.toLowerCase()];
  const forcedRoleByName = FORCED_ROLE_BY_NAME[normalizeLookupKey(userRecord.name)];
  return {
    ...userRecord,
    role: forcedRole || forcedRoleByName || userRecord.role,
    isAdmin: userRecord.isAdmin ?? userRecord.role === 'ADMIN',
    createdAt: userRecord.createdAt ? new Date(userRecord.createdAt) : new Date(),
  };
}

function mergeUsersWithDefaults(storedUsers?: (User & { password: string })[] | null) {
  const mergedUsers = new Map<string, User & { password: string }>();

  INITIAL_USERS.forEach((defaultUser) => {
    const normalizedEmail = defaultUser.email.toLowerCase();
    if (!REMOVED_USER_EMAILS.has(normalizedEmail)) {
      mergedUsers.set(normalizedEmail, normalizeUserRecord(defaultUser));
    }
  });

  storedUsers?.forEach((storedUser) => {
    const normalizedStoredUser = normalizeUserRecord(storedUser);
    const normalizedEmail = normalizedStoredUser.email.toLowerCase();
    if (!REMOVED_USER_EMAILS.has(normalizedEmail)) {
      mergedUsers.set(normalizedEmail, normalizedStoredUser);
    }
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

function toProfileRecord(userRecord: User & { password: string }): TablesInsert<'profiles'> {
  return {
    id: userRecord.id,
    email: userRecord.email,
    full_name: userRecord.name,
    is_active: userRecord.active,
    avatar_url: null,
    operational_role: getOperationalRole(userRecord.role),
    commercial_role: getCommercialRole(userRecord.role),
    team_id: userRecord.teamId ? (LOCAL_TEAM_TO_PROFILE_TEAM[userRecord.teamId] ?? null) : null,
  };
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

  const [users, setUsers] = useState<(User & { password: string })[]>(() => {
    const stored = safeGetItem('great_users');
    if (stored) {
      try {
        return mergeUsersWithDefaults(JSON.parse(stored));
      } catch {
        return INITIAL_USERS;
      }
    }
    return mergeUsersWithDefaults(INITIAL_USERS);
  });

  const [teams, setTeams] = useState<Team[]>(() => {
    const stored = safeGetItem('great_teams');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return INITIAL_TEAMS;
      }
    }
    return INITIAL_TEAMS;
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const stored = safeGetItem('great_activity_logs');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  });

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
        await supabase.from('profiles').upsert(users.map(toProfileRecord));
        const activeIds = users.map((userRecord) => userRecord.id);
        const activeEmails = users.map((userRecord) => userRecord.email.toLowerCase());
        const { data: existingProfiles } = await supabase
          .from('profiles')
          .select('id, email');

        const profilesToRemove = (existingProfiles || []).filter((profile) => {
          const profileEmail = (profile.email || '').toLowerCase();
          return (
            REMOVED_USER_EMAILS.has(profileEmail) ||
            (!activeIds.includes(profile.id) && !activeEmails.includes(profileEmail))
          );
        });

        if (profilesToRemove.length > 0) {
          const idsToRemove = profilesToRemove.map((profile) => profile.id);
          const emailsToRemove = profilesToRemove.map((profile) => profile.email);
          await supabase.from('profiles').delete().in('id', idsToRemove);
          await supabase.from('profiles').delete().in('email', emailsToRemove);
        }
      } catch (error) {
        console.error('Erro ao sincronizar perfis locais:', error);
      }
    };

    void syncProfiles();
  }, [users]);

  useEffect(() => {
    if (!user) return;

    const currentEmail = user.email.toLowerCase();
    const stillExists = users.some((registeredUser) => registeredUser.id === user.id);

    if (REMOVED_USER_EMAILS.has(currentEmail) || !stillExists) {
      setUser(null);
      setSelectedModule(null);
      safeRemoveItem('great_user');
      safeRemoveItem('great_selected_module');
    }
  }, [user, users]);

  useEffect(() => {
    safeSetItem('great_teams', JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    safeSetItem('great_activity_logs', JSON.stringify(activityLogs));
  }, [activityLogs]);

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
  }, [user]);

  const login = useCallback(async (email: string, password: string, mode: 'admin' | 'user' = 'user'): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    const found = users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password && u.active
    );

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

  const signUp = useCallback(async (email: string, password: string, name: string, isAdmin = false): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      setIsLoading(false);
      return { success: false, error: 'Este email já está cadastrado.' };
    }

    const newUser: User & { password: string } = {
      id: crypto.randomUUID(),
      email,
      name,
      password,
      role: isAdmin ? 'ADMIN' : 'ATENDENTE',
      isAdmin,
      active: true,
      createdAt: new Date(),
    };

    setUsers(prev => [...prev, newUser]);

    const { password: _, ...userWithoutPassword } = newUser;
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
        details: `Logout realizado às ${new Date().toLocaleTimeString('pt-BR')}`,
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
        details: `Acessou módulo ${module}`,
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

    const newUser = {
      ...userData,
      isAdmin: userData.isAdmin ?? userData.role === 'ADMIN',
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    setUsers(prev => [...prev, newUser]);
    logActivity('USER_CREATED', 'User', newUser.id, `Usuário ${newUser.name} (${newUser.email}) criado`);
  }, [user, logActivity]);

  const updateUser = useCallback((id: string, data: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
    logActivity('USER_UPDATED', 'User', id, 'Usuário atualizado');
  }, [logActivity]);

  const deleteUser = useCallback(async (id: string) => {
    if (!(user?.isAdmin || user?.role === 'ADMIN')) return;

    const userToDelete = users.find(u => u.id === id);
    setUsers(prev => prev.filter(u => u.id !== id));
    try {
      await supabase.from('profiles').delete().eq('id', id);
      if (userToDelete?.email) {
        await supabase.from('profiles').delete().eq('email', userToDelete.email);
      }
    } catch (error) {
      console.error('Erro ao excluir perfil globalmente:', error);
    }
    logActivity('USER_DELETED', 'User', id, `Usuário ${userToDelete?.name} removido`);
  }, [user, users, logActivity]);

  const addTeam = useCallback((name: string) => {
    const newTeam: Team = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date(),
    };
    setTeams(prev => [...prev, newTeam]);
    logActivity('TEAM_CREATED', 'Team', newTeam.id, `Equipe "${name}" criada`);
  }, [logActivity]);

  const updateTeam = useCallback((id: string, name: string) => {
    setTeams(prev => prev.map(t => t.id === id ? { ...t, name } : t));
    logActivity('TEAM_UPDATED', 'Team', id, `Equipe atualizada para "${name}"`);
  }, [logActivity]);

  const deleteTeam = useCallback((id: string) => {
    const teamToDelete = teams.find(t => t.id === id);
    setTeams(prev => prev.filter(t => t.id !== id));
    setUsers(prev => prev.map(u => u.teamId === id ? { ...u, teamId: undefined } : u));
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
