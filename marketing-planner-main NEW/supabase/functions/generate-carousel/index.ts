import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DQEF_CONTEXT = `
Você é um estrategista de conteúdo sênior da Deixa Que Eu Faço (DQEF), um marketplace de serviços locais com lançamento em Florianópolis.

POSICIONAMENTO DA MARCA:
- Diferencial: comissão de 10-15% vs 27% da GetNinjas
- Pagamento via PIX no ato da conclusão do serviço (sem espera)
- Profissionais verificados por KYC
- Tom da marca: silêncio, verdade, brutalidade do número que dói — sem música animada, sem texto dançante
- Objetivo do conteúdo: salvar e compartilhar, não só curtir

ÂNGULOS EMOCIONAIS DISPONÍVEIS:
- Raiva: expõe injustiças das plataformas concorrentes
- Dinheiro: torna os números visíveis e dolorosos
- Orgulho: valida o ofício, mostra que o prestador merece mais
- Urgência: janela de oportunidade (verão em Floripa = 90-120 dias)
- Alívio: PIX na hora, controle, segurança financeira

DIRETRIZ DE TOM:
- Linguagem de prestador falando com prestador (peer-to-peer)
- Dados concretos e específicos (R$, %, dias)
- Frases curtas, impacto visual
- CTA que gere ação: salvar, compartilhar, comentar, entrar na plataforma
`;

interface GenerateRequest {
  persona: string;
  angle: string;
  channel: string;
  format: string;
  objective: string;
  personaData: {
    profile: string;
    painPoints: string[];
    hooks: string[];
    approach: string;
    ageRange: string;
    avgRate: string;
  };
  platformData?: {
    activeCampaigns?: number;
    publishedPosts?: number;
    topChannel?: string;
  };
  additionalContext?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: GenerateRequest = await req.json();
    const { persona, angle, channel, format, objective, personaData, platformData, additionalContext } = body;

    const platformContext = platformData ? `
DADOS DA PLATAFORMA (contexto atual):
- Campanhas ativas: ${platformData.activeCampaigns ?? "N/A"}
- Posts publicados: ${platformData.publishedPosts ?? "N/A"}
- Canal com melhor performance: ${platformData.topChannel ?? "Instagram"}
` : "";

    const userPrompt = `
Gere um roteiro completo de carrossel com os seguintes parâmetros:

PERSONA ALVO: ${persona}
Perfil: ${personaData.profile}
Faixa etária: ${personaData.ageRange}
Ticket médio: ${personaData.avgRate}
Dores principais: ${personaData.painPoints.join(", ")}
Hooks que funcionam: ${personaData.hooks.join(" | ")}
Abordagem recomendada: ${personaData.approach}

ÂNGULO EMOCIONAL: ${angle}
CANAL: ${channel}
FORMATO: ${format}
OBJETIVO: ${objective}
${platformContext}
${additionalContext ? `CONTEXTO ADICIONAL: ${additionalContext}` : ""}

INSTRUÇÕES DE FORMATO:
Gere um JSON com a seguinte estrutura exata:
{
  "title": "título impactante do carrossel",
  "subtitle": "subtítulo breve com o ângulo",
  "viralLogic": "por que esse conteúdo vai ser salvo/compartilhado (1-2 frases)",
  "slides": [
    {
      "number": 1,
      "type": "hook|content|data|cta",
      "headline": "texto principal do slide (máx 10 palavras, impactante)",
      "body": "texto complementar do slide (máx 25 palavras, opcional)",
      "visual": "descrição do que mostrar visualmente neste slide"
    }
  ],
  "caption": "caption completo para acompanhar o post (com hashtags relevantes)",
  "bestTime": "melhor horário para postar no canal escolhido",
  "engagementTip": "dica específica para maximizar engajamento deste carrossel"
}

REGRAS:
- Slides do tipo "hook" devem parar o scroll imediatamente
- Use números reais (R$, %, dias) quando possível
- O slide de CTA deve ter uma ação clara e específica
- Tom: direto, sem rodeios, prestador falando com prestador
- Gere entre 5 e 9 slides conforme a complexidade do conteúdo
- Retorne APENAS o JSON, sem markdown ou texto extra
`;

    // Route through ai-router (Claude Sonnet 4 for copy)
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-router`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SRK}` },
      body: JSON.stringify({
        task_type: "copy",
        messages: [
          { role: "system", content: DQEF_CONTEXT },
          { role: "user", content: userPrompt },
        ],
        options: { temperature: 0.8 },
        function_name: "generate-carousel",
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: "AI request failed" }));
      return new Response(JSON.stringify(errData), {
        status: response.status,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content ?? "";

    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: content }), {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ carousel: parsed }), {
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    });
  }
});
