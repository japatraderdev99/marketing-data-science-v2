import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function extractJSON(raw: string): Record<string, unknown> {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { throw new Error('Could not parse JSON from AI response'); }
    }
    throw new Error('No JSON found in AI response');
  }
}

// Load generative playbook knowledge from database
async function loadImagePlaybookForCarousel(): Promise<string> {
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data } = await supabase
      .from("generative_playbooks")
      .select("knowledge_json")
      .eq("playbook_type", "image")
      .limit(1)
      .single();
    if (!data?.knowledge_json) return "";
    const k = data.knowledge_json as Record<string, unknown>;
    const brand = k.dqef_brand_visual as Record<string, string> || {};
    const formula = k.universal_formula || "";
    const rules = k.photorealism_rules as Record<string, string[]> || {};
    const elements = k.formula_elements as Record<string, Record<string, unknown>> || {};
    const examples = k.example_prompts as Record<string, string> || {};

    return `
PLAYBOOK DE IMAGEM GENERATIVA (pesquisa profunda — aplicar nos imagePrompt):
FÓRMULA: ${formula}
SUJEITO DQEF: ${brand.target_audience || ""}. Cor: ${brand.brand_color || ""}
OBRIGATÓRIO: ${brand.must_have || ""}
PROIBIDO: ${brand.forbidden || ""}
ILUMINAÇÃO: ${(elements.lighting as Record<string, string>)?.dqef_default || ""}
ESTILO: ${(elements.style as Record<string, string>)?.dqef_default || ""}
AMBIENTES BR: ${elements.environment?.dqef_contexts ? JSON.stringify(elements.environment.dqef_contexts) : ""}
DO: ${(rules.do || []).join(" | ")}
DON'T: ${(rules.dont || []).join(" | ")}
EXEMPLO REFERÊNCIA (AC): ${examples.ac_technician_hero || ""}`;
  } catch { return ""; }
}

// Fetch strategy context from knowledge base + meta-fields
async function getStrategyContext(req: Request, strategyContext?: string): Promise<string> {
  const base = strategyContext ? `\nCONTEXTO ESTRATÉGICO DA MARCA (extraído do playbook):\n${strategyContext}\n` : '';

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return base;

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return base;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: knowledgeDocs } = await supabase
      .from("strategy_knowledge")
      .select("document_name, extracted_knowledge")
      .eq("user_id", user.id)
      .eq("status", "done")
      .limit(3);

    if (!knowledgeDocs || knowledgeDocs.length === 0) return base;

    const knowledgeContext = knowledgeDocs.map((doc: { document_name: string; extracted_knowledge: Record<string, unknown> | null }) => {
      const k = doc.extracted_knowledge as Record<string, unknown>;
      if (!k) return "";
      const parts: string[] = [];
      if (k.brandName) parts.push(`MARCA: ${k.brandName}`);
      if (k.brandEssence) parts.push(`ESSÊNCIA: ${k.brandEssence}`);
      if (k.positioning) parts.push(`POSICIONAMENTO: ${k.positioning}`);
      if (k.uniqueValueProp) parts.push(`PROPOSTA DE VALOR: ${k.uniqueValueProp}`);
      if (k.toneOfVoice) parts.push(`TOM DE VOZ: ${JSON.stringify(k.toneOfVoice)}`);
      if (Array.isArray(k.keyMessages) && k.keyMessages.length) parts.push(`MENSAGENS-CHAVE: ${k.keyMessages.join(" | ")}`);
      if (Array.isArray(k.forbiddenTopics) && k.forbiddenTopics.length) parts.push(`PROIBIDO: ${k.forbiddenTopics.join(", ")}`);
      if (k.ctaStyle) parts.push(`ESTILO DE CTA: ${k.ctaStyle}`);
      if (k.promptContext) parts.push(`SYSTEM PROMPT DA MARCA: ${k.promptContext}`);
      return parts.join("\n");
    }).filter(Boolean).join("\n\n");

    if (!knowledgeContext) return base;
    return `\nKNOWLEDGE BASE DA MARCA (dos documentos analisados — prioridade máxima):\n---\n${knowledgeContext}\n---\n${base}`;
  } catch {
    return base;
  }
}

const VISUAL_RULES = `
IDENTIDADE VISUAL (OBRIGATÓRIA):
- Fundo: #E8603C (laranja coral) em TODAS as lâminas — sem exceção. bgStyle sempre 'dark'.
- Texto: BRANCO puro #FFFFFF
- Destaque (headlineHighlight): palavra que terá fundo semi-transparente branco, criando contraste visual
- Fonte: Montserrat 900 — caixa alta, peso máximo
- Watermark "DQEF" discreto no canto inferior direito de cada lâmina
- LIMITE ABSOLUTO: Máximo 5 lâminas por carrossel. Nunca gere mais que isso.

REGRAS ABSOLUTAS DE COPY:
- Frases de 3-7 palavras por linha no headline
- Máximo 2-3 linhas por slide
- SEMPRE em CAIXA ALTA (uppercase) — combina com Montserrat 900
- Zero jargão corporativo
- Números reais (%, R$, dias) quando disponíveis no contexto da marca
- Verbo no imperativo ou afirmação direta
- Tom peer-to-peer de acordo com o tom de voz da marca
- PROIBIDO mencionar cidades, estados ou regiões geográficas nos textos dos slides

SLOGAN OBRIGATÓRIO NO CTA:
- O último slide (type: 'cta') DEVE ter no subtext o slogan "pronto. resolvido." ao final.

REGRAS DE DESIGN POR TIPO DE SLIDE:
- hook: APENAS TEXTO em caixa alta. Headline de impacto máximo. layout: 'text-only'
- setup: Texto + indicação de foto real. layout: 'text-photo-split'
- data: Número GIGANTE ocupa 60% do slide. layout: 'number-dominant'
- contrast: Headline contrastante, subtext explicativo. layout: 'text-only'
- validation: Texto emocional, direto. layout: 'text-only'
- cta: Ação clara + link na bio. layout: 'cta-clean'

PROMPTS DE IMAGEM (imagePrompt) — REGRAS ABSOLUTAS:
- Em inglês, ultra-detalhados para geração de imagem
- PÚBLICO-ALVO OBRIGATÓRIO: O sujeito da imagem DEVE ser um prestador de serviço autônomo brasileiro (30-50 anos), com aparência real de trabalhador — mãos calejadas, ferramentas visíveis, ambiente de obra/serviço. VARIEDADE DE ROUPA OBRIGATÓRIA: variar entre camisetas lisas (branca, cinza, preta, verde, vermelha), regatas, camisas de trabalho, macacões, coletes refletivos — NUNCA usar polo azul como padrão. Cada slide deve ter roupa DIFERENTE. NUNCA jovens modelos, executivos de escritório ou pessoas genéricas.
- CONEXÃO COM O COPY: A imagem DEVE ilustrar diretamente o contexto do headline/subtext da lâmina. Se o headline fala de precificação, mostre alguém calculando orçamento. Se fala de ferramenta, mostre a ferramenta em uso real.
- Incluir: sujeito físico real do público-alvo, textura real, iluminação natural, enquadramento close-up 4:5
- Estilo: documentary truth, raw authenticity, natural light, real work environment. NOT stock photo, NOT polished, NOT corporate.
- PROIBIDO: jovens modelos, ambientes corporativos, roupas sociais, cenários artificiais de estúdio
- Mínimo 80 palavras
- Sempre incluir no prompt: "Brazilian autonomous service provider, aged 35-50, weathered hands, varied casual work clothing (NOT blue polo), real job site environment"

LÓGICA AUTÔNOMA (quando briefing vazio):
1. Analise o contexto e estratégia da marca disponíveis
2. Escolha o ângulo mais estratégico para conversão agora
3. Justifique no campo angleRationale
4. Gere o carrossel com EXATAMENTE 5 slides

LIMITE CRÍTICO: Gere SEMPRE exatamente 5 slides. Nunca mais que 5.

RETORNE EXATAMENTE ESTE JSON (sem texto antes ou depois):
{
  "title": "TÍTULO EM CAIXA ALTA",
  "angle": "ORGULHO|DINHEIRO|URGÊNCIA|RAIVA|ALÍVIO",
  "angleEmoji": "🏆|💸|⏰|🔴|💚",
  "angleRationale": "Por que esse ângulo agora — raciocínio estratégico detalhado",
  "targetProfile": "Perfil-alvo principal",
  "channel": "Instagram Feed|Stories|TikTok|LinkedIn",
  "viralLogic": "Por que esse carrossel vai ser salvo/compartilhado",
  "designNotes": "Notas de design para o conjunto",
  "bestTime": "Melhor horário e dia para postar",
  "caption": "Caption completa com emojis, quebras de linha e hashtags",
  "slides": [
    {
      "number": 1,
      "type": "hook",
      "headline": "TEXTO EM CAIXA ALTA",
      "headlineHighlight": "PALAVRA para destaque visual (opcional)",
      "subtext": "Texto menor de suporte (opcional, sem caixa alta)",
      "logic": "Raciocínio estratégico do slide",
      "visualDirection": "O que o designer deve fazer",
      "needsMedia": false,
      "mediaType": null,
      "mediaDescription": null,
      "imagePrompt": null,
      "veoPrompt": null,
      "bgStyle": "dark",
      "layout": "text-only"
    }
  ]
}`;

async function getUserId(req: Request): Promise<string | null> {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return null;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    return user?.id ?? null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { context = '', angle = '', persona = '', channel = '', tone = '', strategyContext = '' } = body;

    // Get dynamic brand strategy context + generative playbook knowledge
    const [brandContext, playbookKnowledge] = await Promise.all([
      getStrategyContext(req, strategyContext),
      loadImagePlaybookForCarousel(),
    ]);
    const userId = await getUserId(req);

    const systemPrompt = `Você é o estrategista criativo especialista em carrosséis virais para Instagram com profundo conhecimento do prestador de serviço autônomo brasileiro.
${brandContext}
${playbookKnowledge}
${VISUAL_RULES}`;

    const isAutonomous = !context && !angle && !persona;

    const userPrompt = isAutonomous
      ? `Briefing em branco. Ative o modo autônomo: analise o contexto e a estratégia da marca disponíveis, escolha o ângulo mais estratégico para conversão agora, justifique no angleRationale, e gere o carrossel com EXATAMENTE 5 slides seguindo todas as regras. Todos os slides com bgStyle: 'dark'.`
      : `Gere um carrossel com EXATAMENTE 5 slides e estas especificações:
${context ? `IDEIA/CONTEXTO: ${context}` : ''}
${angle ? `ÂNGULO: ${angle}` : ''}
${persona ? `PERFIL-ALVO: ${persona}` : ''}
${channel ? `CANAL: ${channel}` : ''}
${tone ? `TOM: ${tone}` : ''}

Siga todas as regras de copy, design e mídia. EXATAMENTE 5 slides. bgStyle sempre 'dark'. As copies devem estar 100% alinhadas com a estratégia e tom de voz da marca. Retorne o JSON completo.`;

    // Route through ai-router (Claude Sonnet 4 for copy)
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-router`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SRK}` },
      body: JSON.stringify({
        task_type: "copy",
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        options: { temperature: 0.85 },
        user_id: userId,
        function_name: "generate-carousel-visual",
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: "Erro na API de IA" }));
      return new Response(JSON.stringify(errData), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = await response.json();
    const rawContent = aiResponse.choices?.[0]?.message?.content ?? '';

    let carousel;
    try {
      carousel = extractJSON(rawContent);
    } catch (e) {
      console.error('JSON parse error:', e, 'Raw:', rawContent.slice(0, 500));
      return new Response(JSON.stringify({ error: 'Erro ao processar resposta da IA. Tente novamente.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ carousel, autonomous: isAutonomous, usedStrategyContext: !!brandContext }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
