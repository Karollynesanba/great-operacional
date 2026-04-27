const env = import.meta.env;

const DEFAULT_SUPABASE_URL = 'https://jcvmilqtmjyjynczwmlu.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impjdm1pbHF0bWp5anluY3p3bWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5ODAxOTAsImV4cCI6MjA4MzU1NjE5MH0.o9GAtKNSFLMmTTAQs2IGBPKEvXBPM3EMcBXQ6Vj5_eI';

export const SUPABASE_URL = env.VITE_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL;

export const SUPABASE_PUBLISHABLE_KEY =
  env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  env.VITE_SUPABASE_ANON_KEY?.trim() ||
  DEFAULT_SUPABASE_PUBLISHABLE_KEY;

const isLocalSupabase =
  SUPABASE_URL.includes('localhost') || SUPABASE_URL.includes('127.0.0.1');

const useExplicitMock = env.VITE_SUPABASE_USE_MOCK?.trim() === 'true';

export const isMockSupabase =
  useExplicitMock ||
  (isLocalSupabase &&
    (!SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY === 'mock_key'));

export const hasSupabaseConfig = Boolean(SUPABASE_URL) && Boolean(SUPABASE_PUBLISHABLE_KEY);

export const SUPABASE_AI_PUBLISHABLE_KEY =
  SUPABASE_PUBLISHABLE_KEY === 'mock_key' ? DEFAULT_SUPABASE_PUBLISHABLE_KEY : SUPABASE_PUBLISHABLE_KEY;

export const SUPABASE_FUNCTIONS_URL =
  env.VITE_SUPABASE_FUNCTIONS_URL?.trim() ||
  (isLocalSupabase ? DEFAULT_SUPABASE_URL : SUPABASE_URL) ||
  DEFAULT_SUPABASE_URL;
