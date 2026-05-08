import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { hasSupabaseConfig, isMockSupabase, logSupabaseRuntimeSummary, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './env';
import { mockSupabase } from './mockClient';

logSupabaseRuntimeSummary();

if (!isMockSupabase && !hasSupabaseConfig) {
  throw new Error(
    'Configuração do Supabase ausente. Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no ambiente atual.',
  );
}

export const supabase = isMockSupabase
  ? (mockSupabase as any)
  : createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
