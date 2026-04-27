import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_AI_PUBLISHABLE_KEY, SUPABASE_FUNCTIONS_URL } from './env';

type FunctionResult = {
  data: { message?: string; error?: string } | null;
  error: { message: string } | null;
};

async function invokeDirect(functionName: string, body: unknown): Promise<FunctionResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (SUPABASE_AI_PUBLISHABLE_KEY) {
    headers.apikey = SUPABASE_AI_PUBLISHABLE_KEY;
    headers.Authorization = `Bearer ${SUPABASE_AI_PUBLISHABLE_KEY}`;
  }

  const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers,
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

async function invokeVercelApi(functionName: string, body: unknown): Promise<FunctionResult> {
  const response = await fetch(`/api/${functionName}`, {
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

function buildLocalFallback(functionName: string, body: unknown): FunctionResult {
  const payload = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const lastMessage = messages[messages.length - 1] as { content?: unknown } | undefined;
  const content =
    typeof lastMessage?.content === 'string'
      ? lastMessage.content
      : Array.isArray(lastMessage?.content)
        ? lastMessage.content
            .map((item: any) => item?.text)
            .filter(Boolean)
            .join(' ')
        : '';

  if (functionName === 'support-ai-chat') {
    return {
      data: {
        message:
          content.trim().length > 0
            ? `Fallback local da IA de Suporte: recebi "${content.slice(0, 240)}" e posso ajudar a estruturar, auditar ou melhorar esse pedido.`
            : 'Fallback local da IA de Suporte: me envie um prompt, fluxo ou contexto para eu responder melhor.',
      },
      error: null,
    };
  }

  if (functionName === 'study-ai-chat') {
    const modeLabel = payload.mode === 'CATEGORY_FOCUS' ? 'foco na área' : 'modo geral';
    const categoryLabel = typeof payload.categoryName === 'string' && payload.categoryName.trim() ? payload.categoryName : 'Operacional';

    return {
      data: {
        message: `Fallback local (${modeLabel}) sobre ${categoryLabel}: ${content || 'posso resumir, explicar ou montar um exercício sobre esse tema.'}`,
      },
      error: null,
    };
  }

  if (functionName === 'analyst-ai-chat') {
    return {
      data: {
        message: 'Fallback local do Agente Analista: cenário recebido, causas mapeadas e próximos passos sugeridos.',
      },
      error: null,
    };
  }

  return {
    data: null,
    error: { message: `Function ${functionName} indisponível no momento.` },
  };
}

export async function invokeAiFunction(functionName: string, body: unknown): Promise<FunctionResult> {
  try {
    const direct = await invokeDirect(functionName, body);
    if (!direct.error) return direct;
  } catch {
    // Fallback below.
  }

  try {
    const vercelApi = await invokeVercelApi(functionName, body);
    if (!vercelApi.error) return vercelApi;
  } catch {
    // Fallback below.
  }

  try {
    const { data, error } = await supabase.functions.invoke(functionName, { body });
    if (!error) {
      return {
        data,
        error: null,
      };
    }
  } catch {
    // Final fallback below.
  }

  return buildLocalFallback(functionName, body);
}
