import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode, categoryName, categoryDescription } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";

    if (mode === "CATEGORY_FOCUS" && categoryName) {
      systemPrompt = `Você é o Great Study AI, assistente de estudos da Great.

Área: ${categoryName}${categoryDescription ? ` - ${categoryDescription}` : ""}

Formato obrigatório:
- Responda em português do Brasil
- Use no máximo 3 blocos curtos ou uma lista com até 5 itens
- Prefira linguagem simples, direta e agradável de ler
- Use listas quando houver passos, dicas ou exemplos
- Destaque termos importantes com **negrito**
- Termine com uma pergunta curta ou sugestão útil

Não faça:
- Textos longos em bloco único
- Introduções genéricas
- Jargões desnecessários
- Repetição de informações`;
    } else {
      systemPrompt = `Você é o Great Study AI, assistente de conhecimento da Great.

Áreas: processos internos, cultura, rotinas, marketing digital, gestão e operacional.

Formato obrigatório:
- Responda em português do Brasil
- Use no máximo 3 blocos curtos ou uma lista com até 5 itens
- Prefira linguagem simples, clara e agradável de ler
- Use listas quando houver passos, dicas ou exemplos
- Destaque termos importantes com **negrito**
- Termine com uma sugestão breve ou próxima ação

Não faça:
- Textos longos em bloco único
- Introduções genéricas
- Explicações desnecessárias
- Repetição de informações`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Aguarde um momento." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Contate o administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua pergunta.";

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Study AI Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
