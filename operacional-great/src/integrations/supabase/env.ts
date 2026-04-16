const env = import.meta.env;

export const SUPABASE_URL = env.VITE_SUPABASE_URL?.trim() ?? '';

export const SUPABASE_PUBLISHABLE_KEY =
  env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  env.VITE_SUPABASE_ANON_KEY?.trim() ||
  '';

export const isMockSupabase =
  !SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY === 'mock_key';

export const hasSupabaseConfig = Boolean(SUPABASE_URL) && Boolean(SUPABASE_PUBLISHABLE_KEY);
