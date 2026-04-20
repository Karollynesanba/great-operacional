const env = import.meta.env;

export const SUPABASE_URL = env.VITE_SUPABASE_URL?.trim() ?? '';

export const SUPABASE_PUBLISHABLE_KEY =
  env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  env.VITE_SUPABASE_ANON_KEY?.trim() ||
  '';

const isLocalSupabase =
  SUPABASE_URL.includes('localhost') || SUPABASE_URL.includes('127.0.0.1');

const useExplicitMock = env.VITE_SUPABASE_USE_MOCK?.trim() === 'true';

export const isMockSupabase =
  useExplicitMock ||
  !Boolean(SUPABASE_URL) ||
  !Boolean(SUPABASE_PUBLISHABLE_KEY) ||
  (isLocalSupabase &&
    (!SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY === 'mock_key'));

export const hasSupabaseConfig = Boolean(SUPABASE_URL) && Boolean(SUPABASE_PUBLISHABLE_KEY);

export const SUPABASE_FUNCTIONS_URL =
  env.VITE_SUPABASE_FUNCTIONS_URL?.trim() ||
  SUPABASE_URL ||
  'https://jcvmilqtmjyjynczwmlu.supabase.co';
