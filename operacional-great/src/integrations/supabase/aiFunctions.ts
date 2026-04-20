import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_FUNCTIONS_URL } from './env';

type FunctionResult = {
  data: { message?: string; error?: string } | null;
  error: { message: string } | null;
};

async function invokeDirect(functionName: string, body: unknown): Promise<FunctionResult> {
  const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      data,
      error: { message: data?.error || `Erro ao chamar ${functionName}` },
    };
  }

  return {
    data,
    error: null,
  };
}

export async function invokeAiFunction(functionName: string, body: unknown): Promise<FunctionResult> {
  try {
    const direct = await invokeDirect(functionName, body);
    if (!direct.error) return direct;
  } catch {
    // Fallback below.
  }

  const { data, error } = await supabase.functions.invoke(functionName, { body });
  return {
    data,
    error: error ? { message: error.message } : null,
  };
}
