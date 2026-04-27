import type { IncomingMessage, ServerResponse } from 'node:http';

type ChatMessage = {
  role: string;
  content: unknown;
};

type AiRouteOptions = {
  model: string;
  maxTokens: number;
  buildSystemPrompt: (payload: Record<string, unknown>) => string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

function setCorsHeaders(res: ServerResponse) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
}

function isChatMessage(value: unknown): value is ChatMessage {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as ChatMessage).role === 'string' &&
      'content' in (value as Record<string, unknown>),
  );
}

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  setCorsHeaders(res);
  res.statusCode = status;
  res.end(JSON.stringify(body));
}

export async function handleAiRoute(req: IncomingMessage, res: ServerResponse, options: AiRouteOptions) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const payload = await readJsonBody(req);
    const messages = Array.isArray(payload.messages)
      ? payload.messages.filter(isChatMessage)
      : [];

    const lovableApiKey = process.env.LOVABLE_API_KEY;
    if (!lovableApiKey) {
      sendJson(res, 500, { error: 'LOVABLE_API_KEY is not configured' });
      return;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model,
        messages: [
          { role: 'system', content: options.buildSystemPrompt(payload) },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: options.maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);

      if (response.status === 429) {
        sendJson(res, 429, { error: 'Limite de requisições excedido. Aguarde um momento.' });
        return;
      }

      if (response.status === 402) {
        sendJson(res, 402, { error: 'Créditos insuficientes. Contate o administrador.' });
        return;
      }

      sendJson(res, 500, { error: 'Erro no gateway de IA' });
      return;
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || 'Desculpe, não consegui processar sua pergunta.';

    sendJson(res, 200, { message });
  } catch (error) {
    console.error('AI route error:', error);
    sendJson(res, 500, { error: error instanceof Error ? error.message : 'Erro interno' });
  }
}
