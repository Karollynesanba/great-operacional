import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, UserRole, Module, ActivityLog, Team } from '@/types';
import { canEditPlatform } from '@/lib/userMapping';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/safeStorage';
import { getAuthSeedUsers } from '@/config/authSeed';
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
  ensureSupabaseSession: () => Promise<boolean>;
  addUser: (user: Omit<User, 'id' | 'createdAt'> & { password: string }) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  teams: Team[];
  addTeam: (name: string) => void;
  updateTeam: (id: string, name: string) => void;
  deleteTeam: (id: string) => void;
  activityLogs: ActivityLog[];
  logActivity: (action: string, entity: string, entityId?: string, details?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_SEED_USERS = getAuthSeedUsers();
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
type AuthUserLike = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

const PROFILE_SELECT_FIELDS = 'id, email, full_name, avatar_url, operational_role, commercial_role, team_id, is_active, created_at, login_password, is_admin';
let profilesTableUnavailable = false;
const AUTH_BOOTSTRAP_TIMEOUT_MS = 5000;

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
    if (!normalizedSeedEmail) {
      return;
    }
    mergedUsers.set(normalizedSeedEmail, normalizeUserRecord(seedUser));
  });

  storedUsers?.forEach((storedUser) => {
    const normalizedStoredUser = normalizeUserRecord(storedUser);
    const normalizedEmail = normalizeEmailForLogin(normalizedStoredUser.email);
    if (!normalizedEmail) {
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

function toStoredUserFromAppUser(appUser: User): StoredUserRecord {
  return normalizeUserRecord({
    id: appUser.id,
    name: appUser.name,
    email: appUser.email,
    password: '',
    role: appUser.role,
    isAdmin: appUser.isAdmin ?? appUser.role === 'ADMIN',
    teamId: appUser.teamId,
    active: appUser.active,
    createdAt: appUser.createdAt,
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

function buildFallbackUserFromAuthUser(authUser: AuthUserLike, fallbackProfile?: StoredUserRecord | null): StoredUserRecord {
  const normalizedEmail = authUser.email ? normalizeEmailForLogin(authUser.email) : (fallbackProfile?.email ?? '');
  const seedFallback = AUTH_SEED_USERS.find((user) => normalizeEmailForLogin(user.email) === normalizedEmail) || null;
  const source = fallbackProfile || seedFallback;
  const name = String(
    authUser.user_metadata?.full_name
      || authUser.user_metadata?.name
      || source?.name
      || authUser.email
      || normalizedEmail
      || 'Usuário',
  );
  const role = source?.role ?? 'ATENDENTE';

  return normalizeUserRecord({
    id: authUser.id || source?.id || crypto.randomUUID(),
    email: normalizedEmail || source?.email || authUser.email || '',
    name,
    password: source?.password ?? '',
    role,
    isAdmin: source?.isAdmin ?? role === 'ADMIN',
    teamId: source?.teamId,
    active: source?.active ?? true,
    createdAt: source?.createdAt ?? new Date(),
  });
}

async function syncProfileForUser(userRecord: StoredUserRecord) {
  if (profilesTableUnavailable) {
    return true;
  }

  const record = toProfileRecord(userRecord);
  const { error } = await supabase.from('profiles').upsert(
    {
      ...record,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  if (error) {
    if (noteProfilesTableUnavailable(error)) {
      return true;
    }
    console.error('Erro ao sincronizar perfil no Supabase:', error);
    return false;
  }

  return true;
}

async function fetchProfileForAuthUser(authUser: AuthUserLike) {
  if (profilesTableUnavailable) {
    return null;
  }

  const normalizedEmail = authUser.email ? normalizeEmailForLogin(authUser.email) : null;

  if (authUser.id) {
    const { data: profileById, error: idError } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT_FIELDS)
      .eq('id', authUser.id)
      .maybeSingle();

    if (idError) {
      if (noteProfilesTableUnavailable(idError)) {
        return null;
      }
      console.error('Erro ao buscar perfil por id:', idError);
    } else if (profileById) {
      return profileById;
    }
  }

  if (normalizedEmail) {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT_FIELDS);

    if (error) {
      if (noteProfilesTableUnavailable(error)) {
        return null;
      }
      console.error('Erro ao buscar perfis para autenticação:', error);
      return null;
    }

    const byEmail = profiles?.find((profile) => normalizeEmailForLogin(profile.email) === normalizedEmail) || null;
    if (byEmail) {
      return byEmail;
    }
  }

  return null;
}

async function fetchProfileByEmail(email: string) {
  if (profilesTableUnavailable) {
    return null;
  }

  const normalizedEmail = normalizeEmailForLogin(email);

  if (!normalizedEmail) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT_FIELDS)
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    if (noteProfilesTableUnavailable(error)) {
      return null;
    }
    console.error('Erro ao buscar perfil por e-mail:', error);
    return null;
  }

  return profile;
}

async function resolveUserFromProfileCredentials(email: string, password: string) {
  const profileRow = await fetchProfileByEmail(email);

  if (!profileRow) {
    return null;
  }

  const profilePassword = profileRow.login_password || '';
  if (profilePassword && profilePassword !== password) {
    return null;
  }

  return toStoredUserFromProfile(profileRow, password);
}

function restoreStoredSessionUser() {
  const stored = safeGetItem('great_user');
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as User;
    if (!parsed?.email || !parsed?.name) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function isProfilesSchemaCacheError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  return (
    message.includes("Could not find the table 'public.profiles' in the schema cache") ||
    (message.includes('public.profiles') && message.includes('schema cache')) ||
    message.includes('relation "public.profiles" does not exist') ||
    message.includes('relation "profiles" does not exist')
  );
}

function noteProfilesTableUnavailable(error: unknown) {
  if (!isProfilesSchemaCacheError(error)) {
    return false;
  }

  profilesTableUnavailable = true;
  console.warn('[Great Operacional] public.profiles indisponível neste ambiente; usando fallback seguro.');
  return true;
}

async function raceWithTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T | null> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timeoutHandle = setTimeout(() => {
          console.warn(`[Great Operacional] ${label} demorou demais; seguindo com fallback local.`);
          resolve(null);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

async function ensureProfileWithTimeout(authUser: AuthUserLike, fallbackProfile?: StoredUserRecord | null) {
  return raceWithTimeout(
    ensureProfileForAuthUser(authUser, fallbackProfile),
    AUTH_BOOTSTRAP_TIMEOUT_MS,
    'Busca de perfil',
  );
}

async function ensureProfileForAuthUser(authUser: AuthUserLike, fallbackProfile?: StoredUserRecord | null) {
  if (profilesTableUnavailable) {
    return buildFallbackUserFromAuthUser(authUser, fallbackProfile ?? undefined);
  }

  const profileRow = await fetchProfileForAuthUser(authUser);
  if (profileRow) {
    return toStoredUserFromProfile(profileRow, fallbackProfile?.password ?? '');
  }

  const normalizedEmail = authUser.email ? normalizeEmailForLogin(authUser.email) : '';
  const seedFallback = AUTH_SEED_USERS.find((user) => normalizeEmailForLogin(user.email) === normalizedEmail) || null;
  const derivedFallback = fallbackProfile || seedFallback || null;

  if (derivedFallback) {
    const candidate = buildFallbackUserFromAuthUser(authUser, derivedFallback);
    const synced = await syncProfileForUser(candidate);

    if (synced) {
      const refetchedProfile = await fetchProfileForAuthUser(authUser);
      if (refetchedProfile) {
        return toStoredUserFromProfile(refetchedProfile, candidate.password);
      }
    }

    return candidate;
  }

  return buildFallbackUserFromAuthUser(authUser);
}

async function bootstrapAuthSessionForStoredUser(
  userRecord: StoredUserRecord,
  password: string,
  label: string,
) {
  const normalizedEmail = normalizeEmailForLogin(userRecord.email);
  const bootstrapResult = await raceWithTimeout(
    supabase.functions.invoke('bootstrap-auth-user', {
      body: {
        email: normalizedEmail,
        password,
        full_name: userRecord.name,
        role: userRecord.isAdmin ? 'ADMIN' : userRecord.role,
        is_admin: userRecord.isAdmin ?? userRecord.role === 'ADMIN',
        team_id: userRecord.teamId ?? null,
        commercial_role: getCommercialRole(userRecord.role),
        operational_role: getOperationalRole(userRecord.role),
      },
    }),
    AUTH_BOOTSTRAP_TIMEOUT_MS,
    label,
  );

  if (!bootstrapResult || bootstrapResult.error) {
    if (bootstrapResult?.error) {
      console.warn(`[Great Operacional] ${label} falhou ao bootstrapar Auth:`, bootstrapResult.error);
    }
    return null;
  }

  const authRetry = await raceWithTimeout(
    supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    }),
    AUTH_BOOTSTRAP_TIMEOUT_MS,
    `${label} - reautenticação`,
  );

  if (!authRetry?.data.user) {
    return null;
  }

  try {
    const ensuredProfile = await ensureProfileWithTimeout(
      {
        id: authRetry.data.user.id,
        email: authRetry.data.user.email,
        user_metadata: authRetry.data.user.user_metadata,
      },
      userRecord,
    );

    return (ensuredProfile ?? userRecord) as StoredUserRecord;
  } catch (error) {
    console.warn(`[Great Operacional] ${label} conseguiu Auth, mas falhou ao carregar perfil:`, error);
    return null;
  }
}

async function createAccountWithoutBootstrap(
  email: string,
  password: string,
  name: string,
  role: UserRole,
  isAdmin: boolean,
): Promise<StoredUserRecord | null> {
  const authSignupResult = await raceWithTimeout(
    supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    }),
    AUTH_BOOTSTRAP_TIMEOUT_MS,
    'Criação de conta via Auth',
  );

  if (authSignupResult?.error) {
    console.warn('[Great Operacional] Cadastro via Auth falhou; tentando salvar perfil direto:', authSignupResult.error);

    const duplicateEmail = /already registered|already exists|user already/i.test(
      authSignupResult.error.message || '',
    );

    if (duplicateEmail) {
      return null;
    }
  }

  const authUserId = authSignupResult?.data.user?.id ?? crypto.randomUUID();
  const fallbackProfile = normalizeUserRecord({
    id: authUserId,
    email,
    name,
    password,
    role: isAdmin ? 'ADMIN' : role,
    isAdmin,
    active: true,
    createdAt: new Date(),
  });

  if (!profilesTableUnavailable) {
    const syncedProfile = await syncProfileForUser(fallbackProfile);
    if (!syncedProfile) {
      return null;
    }
  }

  const createdProfile = await fetchProfileByEmail(email);
  return createdProfile ? toStoredUserFromProfile(createdProfile, password) : fallbackProfile;
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
  const [user, setUser] = useState<User | null>(null);

  const [users, setUsers] = useState<StoredUserRecord[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);

  const [teams, setTeams] = useState<Team[]>(() => {
    return INITIAL_TEAMS;
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => []);

  const [isLoading, setIsLoading] = useState(true);

  const [selectedModule, setSelectedModule] = useState<Module | null>(() => {
    const stored = safeGetItem('great_selected_module');
    return stored as Module | null;
  });

  useEffect(() => {
    safeSetItem('great_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      try {
        const sessionResult = await raceWithTimeout(
          supabase.auth.getSession(),
          AUTH_BOOTSTRAP_TIMEOUT_MS,
          'Bootstrap do auth',
        );

        if (!isMounted) return;

        const session = sessionResult?.data?.session ?? null;
        const error = sessionResult?.error ?? null;

        if (error) {
          console.error('Erro ao carregar sessão do Supabase:', error);
        }

        if (session?.user) {
          let loadedProfile: StoredUserRecord | null = null;

          try {
            loadedProfile = await ensureProfileWithTimeout({
              id: session.user.id,
              email: session.user.email,
              user_metadata: session.user.user_metadata,
            });
          } catch (profileError) {
            console.error('Erro ao sincronizar perfil ao iniciar sessão:', profileError);
            loadedProfile = buildFallbackUserFromAuthUser({
              id: session.user.id,
              email: session.user.email,
              user_metadata: session.user.user_metadata,
            });
          }

          if (loadedProfile && isMounted) {
            const { password: _, ...userWithoutPassword } = loadedProfile;
            const loggedUser: User = { ...userWithoutPassword, isAdmin: userWithoutPassword.isAdmin ?? userWithoutPassword.role === 'ADMIN' };
            setUser(loggedUser);
            safeSetItem('great_user', JSON.stringify(loggedUser));
          }
        } else if (isMounted) {
          const storedUser = restoreStoredSessionUser();

          if (storedUser) {
            setUser(storedUser);
          } else {
            setUser(null);
            safeRemoveItem('great_user');
          }
        }
      } catch (bootstrapError) {
        console.error('Erro inesperado ao iniciar autenticação:', bootstrapError);
        if (isMounted) {
          const storedUser = restoreStoredSessionUser();
          if (storedUser) {
            setUser(storedUser);
          } else {
            setUser(null);
            safeRemoveItem('great_user');
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      try {
          if (session?.user) {
            let loadedProfile: StoredUserRecord | null = null;

            try {
            loadedProfile = await ensureProfileWithTimeout({
                id: session.user.id,
                email: session.user.email,
                user_metadata: session.user.user_metadata,
              });
            } catch (profileError) {
            console.error('Erro ao sincronizar perfil na mudança de auth:', profileError);
            loadedProfile = buildFallbackUserFromAuthUser({
              id: session.user.id,
              email: session.user.email,
              user_metadata: session.user.user_metadata,
            });
          }

          if (loadedProfile && isMounted) {
            const { password: _, ...userWithoutPassword } = loadedProfile;
            const loggedUser: User = { ...userWithoutPassword, isAdmin: userWithoutPassword.isAdmin ?? userWithoutPassword.role === 'ADMIN' };
            setUser(loggedUser);
            safeSetItem('great_user', JSON.stringify(loggedUser));
          }
        } else {
          const storedUser = restoreStoredSessionUser();

          if (storedUser) {
            setUser(storedUser);
          } else {
            setUser(null);
            safeRemoveItem('great_user');
          }
        }
      } catch (authStateError) {
        console.error('Erro inesperado ao processar mudança de sessão:', authStateError);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    });

    void bootstrapAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const syncProfiles = async () => {
      if (!usersLoaded) return;
      try {
        for (const userRecord of users) {
          await syncProfileForUser(userRecord);
        }
      } catch (error) {
        console.error('Erro ao sincronizar perfis locais:', error);
      }
    };

    void syncProfiles();
  }, [users, usersLoaded]);

  useEffect(() => {
    const loadRemoteProfiles = async () => {
      if (profilesTableUnavailable) {
        setUsers(mergeUsersWithDefaults([]));
        setUsersLoaded(true);
        return;
      }

      try {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select(PROFILE_SELECT_FIELDS);

        if (error) {
          if (noteProfilesTableUnavailable(error)) {
            setUsers(mergeUsersWithDefaults([]));
            setUsersLoaded(true);
            return;
          }
          throw error;
        }

        if (profiles?.length) {
          setUsers(
            mergeUsersWithDefaults(
              profiles.map((profile) => toStoredUserFromProfile(profile)),
            ),
          );
          return;
        }

        setUsers(mergeUsersWithDefaults([]));
      } catch (error) {
        console.error('Erro ao carregar perfis remotos:', error);
        setUsers(mergeUsersWithDefaults([]));
      } finally {
        setUsersLoaded(true);
      }
    };

    void loadRemoteProfiles();
  }, []);

  useEffect(() => {
    if (!usersLoaded || !user) return;

    const currentUserRecord = toStoredUserFromAppUser(user);
    const currentUserEmail = normalizeEmailForLogin(currentUserRecord.email);

    setUsers((prev) => {
      const nextUsers = [...prev];
      const existingIndex = nextUsers.findIndex((candidate) => normalizeEmailForLogin(candidate.email) === currentUserEmail);

      if (existingIndex >= 0) {
        nextUsers[existingIndex] = currentUserRecord;
      } else {
        nextUsers.unshift(currentUserRecord);
      }

      return nextUsers;
    });
  }, [user, usersLoaded]);

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

    let loadedProfile: StoredUserRecord | null = null;

    let authAttemptError: string | null = null;

    const authAttempt = await raceWithTimeout(
      supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      }),
      AUTH_BOOTSTRAP_TIMEOUT_MS,
      'Tentativa de login',
    );

    authAttemptError = authAttempt?.error?.message || null;

    if (authAttempt?.data.user) {
      try {
        loadedProfile = await ensureProfileWithTimeout({
          id: authAttempt.data.user.id,
          email: authAttempt.data.user.email,
          user_metadata: authAttempt.data.user.user_metadata,
        });
      } catch (profileError) {
        console.error('Erro ao sincronizar perfil após login:', profileError);
        loadedProfile = buildFallbackUserFromAuthUser({
          id: authAttempt.data.user.id,
          email: authAttempt.data.user.email,
          user_metadata: authAttempt.data.user.user_metadata,
        });
      }
    }

    if (!loadedProfile && !profilesTableUnavailable) {
      const profileLogin = await resolveUserFromProfileCredentials(normalizedEmail, password);
      if (profileLogin) {
        const authProfile = await bootstrapAuthSessionForStoredUser(profileLogin, password, 'Login por perfil');
        loadedProfile = authProfile ?? profileLogin;
      }
    }

    if (!loadedProfile) {
      console.error('Erro ao autenticar no Supabase:', authAttemptError || 'Credenciais não encontradas no perfil nem no Auth.');
      setIsLoading(false);
      return { success: false, error: 'Email ou senha incorretos.' };
    }

    if (mode === 'admin' && !loadedProfile.isAdmin) {
      await supabase.auth.signOut();
      setIsLoading(false);
      return { success: false, error: 'Esse acesso é exclusivo para administradores.' };
    }

    if (mode === 'user' && loadedProfile.isAdmin) {
      await supabase.auth.signOut();
      setIsLoading(false);
      return { success: false, error: 'Use a opção de administrador para entrar com essa conta.' };
    }

    const { password: _, ...userWithoutPassword } = loadedProfile;
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
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string, role: UserRole = 'ATENDENTE', isAdmin = false): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const normalizedEmail = normalizeEmailForLogin(email);

    try {
      const existingProfile = await resolveUserFromProfileCredentials(normalizedEmail, password);
      if (existingProfile) {
        const authProfile = await bootstrapAuthSessionForStoredUser(existingProfile, password, 'Cadastro existente');
        const effectiveProfile = authProfile ?? existingProfile;
        const { password: _, ...userWithoutPassword } = effectiveProfile;
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

        return { success: true };
      }

      if (!profilesTableUnavailable) {
        const profileExists = await fetchProfileByEmail(normalizedEmail);
        if (profileExists) {
          return { success: false, error: 'Esse e-mail já está cadastrado. Faça login para entrar.' };
        }
      }

      const bootstrapResult = await raceWithTimeout(
        supabase.functions.invoke('bootstrap-auth-user', {
          body: {
            email: normalizedEmail,
            password,
            full_name: name,
            role: isAdmin ? 'ADMIN' : role,
            is_admin: isAdmin,
            team_id: null,
            commercial_role: getCommercialRole(isAdmin ? 'ADMIN' : role),
            operational_role: getOperationalRole(isAdmin ? 'ADMIN' : role),
          },
        }),
        AUTH_BOOTSTRAP_TIMEOUT_MS,
        'Criação de conta',
      );

      if (bootstrapResult?.error) {
        console.warn('Erro ao criar conta via bootstrap; tentando fluxo alternativo:', bootstrapResult.error);
      }

      let loadedProfile: StoredUserRecord | null = null;

      if (!bootstrapResult?.error) {
        const createdProfile = await fetchProfileByEmail(normalizedEmail);
        loadedProfile = createdProfile ? toStoredUserFromProfile(createdProfile, password) : null;
      }

      if (!loadedProfile) {
        loadedProfile = await createAccountWithoutBootstrap(
          normalizedEmail,
          password,
          name,
          isAdmin ? 'ADMIN' : role,
          isAdmin,
        );
      }

      if (!loadedProfile) {
        return { success: false, error: 'Não foi possível salvar sua conta no servidor.' };
      }

      const { password: _, ...userWithoutPassword } = loadedProfile;
      const loggedUser: User = { ...userWithoutPassword, isAdmin: userWithoutPassword.isAdmin ?? userWithoutPassword.role === 'ADMIN' };

      setUser(loggedUser);
      safeSetItem('great_user', JSON.stringify(loggedUser));
      setUsers((prev) => mergeUsersWithDefaults([loadedProfile, ...prev]));

      const roleToLog = loggedUser.role;
      const log: ActivityLog = {
        id: crypto.randomUUID(),
        userId: loggedUser.id,
        userName: loggedUser.name,
        userRole: loggedUser.role,
        action: 'LOGIN',
        entity: 'Session',
        details: `Login realizado às ${new Date().toLocaleTimeString('pt-BR')} (${roleToLog})`,
        createdAt: new Date(),
      };
      setActivityLogs(prev => [log, ...prev].slice(0, 500));

      if (!profilesTableUnavailable) {
        void supabase.from('user_roles').upsert(
          [
            { user_id: loggedUser.id, role: 'user' as const },
            ...(loggedUser.isAdmin ? [{ user_id: loggedUser.id, role: 'admin' as const }] : []),
          ],
          { onConflict: 'user_id,role' },
        ).then(({ error: roleUpsertError }) => {
          if (roleUpsertError) {
            console.error('Erro ao sincronizar papéis do usuário:', roleUpsertError);
          }
        });
      }

      return { success: true };
    } catch (error) {
      noteProfilesTableUnavailable(error);
      console.error('Erro inesperado ao criar conta:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Não foi possível salvar sua conta no servidor.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

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

    await supabase.auth.signOut();
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

  const addUser = useCallback(async (userData: Omit<User, 'id' | 'createdAt'> & { password: string }) => {
    if (!(user?.isAdmin || user?.role === 'ADMIN')) return;

    const normalizedEmail = normalizeEmailForLogin(userData.email);
    const alreadyExists = users.some((existingUser) => normalizeEmailForLogin(existingUser.email) === normalizedEmail);
    if (alreadyExists) return;

    const { error } = await supabase.functions.invoke('create-user', {
      body: {
        email: normalizedEmail,
        password: userData.password,
        full_name: userData.name,
        team_id: userData.teamId || null,
        commercial_role: getCommercialRole(userData.role),
        operational_role: getOperationalRole(userData.role),
      },
    });

    if (error) {
      console.error('Erro ao criar usuário via edge function:', error);
      return;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT_FIELDS)
      .order('created_at', { ascending: false });

    setUsers((profiles || []).map((profile) => toStoredUserFromProfile(profile)));
    const createdProfile = (profiles || []).find((profile) => normalizeEmailForLogin(profile.email) === normalizedEmail);
    if (createdProfile) {
      logActivity('USER_CREATED', 'User', createdProfile.id, `Usuário ${createdProfile.full_name} (${createdProfile.email}) criado`);
    }
  }, [user, logActivity, users]);

  const updateUser = useCallback(async (id: string, data: Partial<User>) => {
    const nextEmail = data.email ? normalizeEmailForLogin(data.email) : null;
    const nextName = data.name || null;

    if (nextEmail || data.password) {
      const { error } = await supabase.functions.invoke('update-user', {
        body: {
          user_id: id,
          email: nextEmail || undefined,
          password: data.password || undefined,
        },
      });

      if (error) {
        console.error('Erro ao atualizar credenciais do usuário:', error);
        return;
      }
    }

    const updatedUsers = users.map((u) => (
      u.id === id
        ? {
            ...u,
            ...data,
            email: nextEmail || u.email,
            name: nextName || u.name,
            isAdmin: data.isAdmin ?? u.isAdmin,
          }
        : u
    ));

    setUsers(updatedUsers);
    const updatedUser = updatedUsers.find((u) => u.id === id);
    if (updatedUser) {
      await syncProfileForUser(updatedUser);
    }
    logActivity('USER_UPDATED', 'User', id, 'Usuário atualizado');
  }, [logActivity, users]);

  const deleteUser = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!(user?.isAdmin || user?.role === 'ADMIN')) {
      return { success: false, error: 'Sem permissão para excluir usuários.' };
    }

    const userToDelete = users.find(u => u.id === id);
    let deleted = false;
    let edgeDeleteFailed = false;

    try {
      const sessionReady = await ensureSupabaseSession();
      if (!sessionReady) {
        return { success: false, error: 'Não foi possível validar sua sessão para excluir o usuário.' };
      }

      const { error: rpcError } = await supabase.rpc('delete_profile_cascade', {
        target_user_id: id,
      });

      if (rpcError) {
        console.warn('Falha ao excluir perfil via RPC; tentando Edge Function:', rpcError);
      }

      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: id },
      });

      if (error || data?.error) {
        console.error('Erro ao excluir usuário via edge function:', error || data?.error);
        edgeDeleteFailed = true;
      }

      if (rpcError || edgeDeleteFailed) {
        const [{ error: profileDeleteError }, { error: roleDeleteError }] = await Promise.all([
          supabase.from('profiles').delete().eq('id', id),
          supabase.from('user_roles').delete().eq('user_id', id),
        ]);

        if (profileDeleteError) {
          return { success: false, error: profileDeleteError.message || 'Não foi possível excluir o usuário.' };
        }

        if (roleDeleteError) {
          console.warn('Falha ao limpar papéis do usuário no fallback local:', roleDeleteError);
        }
      }

      setUsers((prev) => prev.filter((u) => u.id !== id));
      deleted = true;
      return { success: true };
    } catch (error) {
      console.error('Erro ao excluir perfil globalmente:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Não foi possível excluir o usuário.' };
    } finally {
      if (deleted) {
        logActivity('USER_DELETED', 'User', id, `Usuário ${userToDelete?.name} removido`);
      }
    }
  }, [user, users, logActivity, ensureSupabaseSession]);

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
  async function ensureSupabaseSession() {
    if (!user) {
      return false;
    }

    try {
      const sessionResult = await raceWithTimeout(
        supabase.auth.getSession(),
        AUTH_BOOTSTRAP_TIMEOUT_MS,
        'Verificação de sessão',
      );
      const sessionUser = sessionResult?.data?.session?.user ?? null;

      if (sessionUser?.email && normalizeEmailForLogin(sessionUser.email) === normalizeEmailForLogin(user.email)) {
        return true;
      }

      const storedUser = users.find((candidate) => normalizeEmailForLogin(candidate.email) === normalizeEmailForLogin(user.email));
      const password = storedUser?.password || '';

      if (password) {
        const authProfile = await bootstrapAuthSessionForStoredUser(
          storedUser ?? toStoredUserFromAppUser(user),
          password,
          'Reautenticação automática',
        );

        if (authProfile) {
          return true;
        }
      }

      console.warn('[Great Operacional] Usando sessão local do app como fallback para continuar a operação.');
      return true;
    } catch (error) {
      console.error('Erro ao reautenticar sessão do Supabase:', error);
      return true;
    }
  }

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
        ensureSupabaseSession,
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

