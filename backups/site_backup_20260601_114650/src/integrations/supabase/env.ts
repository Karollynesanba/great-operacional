const env = import.meta.env;

function normalizeEnvValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readEnvValue(...keys: string[]) {
  for (const key of keys) {
    const value = normalizeEnvValue(env[key]);
    if (value) return value;
  }

  return '';
}

export const SUPABASE_URL = readEnvValue(
  'VITE_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_URL',
);

export const SUPABASE_PUBLISHABLE_KEY =
  readEnvValue(
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_ANON_KEY',
  );

export const SUPABASE_FUNCTIONS_URL =
  readEnvValue(
    'VITE_SUPABASE_FUNCTIONS_URL',
    'NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL',
    'SUPABASE_FUNCTIONS_URL',
  ) || SUPABASE_URL;

const isLocalSupabase =
  SUPABASE_URL.includes('localhost') || SUPABASE_URL.includes('127.0.0.1');

const useExplicitMock = env.VITE_SUPABASE_USE_MOCK?.trim() === 'true';
const isCypressRuntime =
  typeof window !== 'undefined' && Boolean((window as { Cypress?: unknown }).Cypress);

export const isMockSupabase =
  useExplicitMock ||
  isCypressRuntime ||
  (isLocalSupabase &&
    (!SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY === 'mock_key'));

export const hasSupabaseConfig = Boolean(SUPABASE_URL) && Boolean(SUPABASE_PUBLISHABLE_KEY);

export const SUPABASE_AI_PUBLISHABLE_KEY = SUPABASE_PUBLISHABLE_KEY;

export function getSupabaseRuntimeSummary() {
  const host = SUPABASE_URL ? new URL(SUPABASE_URL).host : '';
  const functionsHost = SUPABASE_FUNCTIONS_URL ? new URL(SUPABASE_FUNCTIONS_URL).host : '';

  return {
    mode: env.MODE || 'unknown',
    dev: Boolean(env.DEV),
    prod: Boolean(env.PROD),
    vercelEnv: normalizeEnvValue(env.VERCEL_ENV) || normalizeEnvValue(env.VITE_VERCEL_ENV) || 'local',
    supabaseUrlConfigured: Boolean(SUPABASE_URL),
    supabaseUrlHost: host || 'missing',
    supabaseKeyConfigured: Boolean(SUPABASE_PUBLISHABLE_KEY),
    functionsUrlConfigured: Boolean(SUPABASE_FUNCTIONS_URL),
    functionsUrlHost: functionsHost || 'missing',
    mockMode: isMockSupabase,
  };
}

let didLogRuntimeSummary = false;

export function logSupabaseRuntimeSummary() {
  if (didLogRuntimeSummary) return;
  didLogRuntimeSummary = true;
  console.info('[Great Operacional] Supabase runtime config', getSupabaseRuntimeSummary());
}
