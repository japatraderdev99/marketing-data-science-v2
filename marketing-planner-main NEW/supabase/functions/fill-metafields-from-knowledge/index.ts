import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // AI calls are routed through ai-router

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header ausente");

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Usuário não autenticado");

    const { currentMetafields, strategyData } = await req.json();

    // Fetch all analyzed KB docs
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: knowledgeDocs } = await supabase
      .from("strategy_knowledge")
      .select("document_name, extracted_knowledge")
      .eq("user_id", user.id)
      .eq("status", "done");

    if (!knowledgeDocs || knowledgeDocs.length === 0) {
      throw new Error("Nenhum documento analisado encontrado no Knowledge Base. Envie e analise documentos primeiro.");
    }

    const knowledgeContext = knowledgeDocs.map((doc: { document_name: string; extracted_knowledge: Record<string, unknown> | null }) => {
      const k = doc.extracted_knowledge as Record<string, unknown>;
      if (!k) return "";
      return `=== ${doc.document_name} ===
Marca: ${k.brandName || ""}
Essência: ${k.brandEssence || ""}
Posicionamento: ${k.positioning || ""}
Proposta de Valor: ${k.uniqueValueProp || ""}
Missão: ${k.mission || ""} | Visão: ${k.vision || ""}
Valores: ${JSON.stringify(k.values || [])}
Persona/Público: ${JSON.stringify(k.targetAudience || {})}
Tom de Voz: ${JSON.stringify(k.toneOfVoice || {})}
Mensagens-Chave: ${JSON.stringify(k.keyMessages || [])}
Diferenciais: ${JSON.stringify(k.differentials || [])}
Concorrentes: ${JSON.stringify(k.competitors || [])}
Vantagem Competitiva: ${JSON.stringify(k.competitiveEdge || [])}
Tópicos Proibidos: ${JSON.stringify(k.forbiddenTopics || [])}
Ângulos de Conteúdo: ${JSON.stringify(k.contentAngles || [])}
CTA: ${k.ctaStyle || ""}
Insights: ${JSON.stringify(k.keyInsights || [])}
Resumo: ${k.documentSummary || ""}`;
    }).filter(Boolean).join("\n\n");

    // Build current metafields context to show what's filled and what's missing
    const currentStr = currentMetafields ? JSON.stringify(currentMetafields, null, 2) : "(nenhum meta-field extraído ainda)";

    const prompt = `Você é um estrategista de marca e marketing sênior com experiência em branding corporativo e comunicação persuasiva.

MISSÃO: Analise PROFUNDAMENTE o Knowledge Base de documentos da marca abaixo e preencha/melhore todos os meta-fields estratégicos. Seu trabalho será VALIDADO por um operador humano, então seja preciso, específico e baseado em evidências dos documentos.

KNOWLEDGE BASE (${knowledgeDocs.length} documento(s) analisado(s)):
---
${knowledgeContext}
---

PLAYBOOK ESTRATÉGICO ATUAL (campos manuais do usuário):
---
Posicionamento: ${strategyData?.positioning || "(vazio)"}
Diferenciais: ${strategyData?.differentials || "(vazio)"}
Público-alvo: ${strategyData?.targetAudience || "(vazio)"}
Dores: ${strategyData?.pains || "(vazio)"}
Tom de Voz: ${strategyData?.toneOfVoice || "(vazio)"}
Concorrentes: ${strategyData?.competitors || "(vazio)"}
Tópicos Proibidos: ${strategyData?.forbiddenTopics || "(vazio)"}
Objetivo Atual: ${strategyData?.currentObjective || "(vazio)"}
KPIs: ${strategyData?.kpis || "(vazio)"}
---

META-FIELDS ATUAIS (pode estar vazio ou parcialmente preenchido):
${currentStr}

REGRAS CRÍTICAS:
1. Use TODAS as fontes (KB + playbook manual) para inferir dados
2. Se um meta-field já está preenchido com dados bons, MANTENHA e MELHORE (não substitua por algo genérico)
3. Se um meta-field está vazio ou genérico, PREENCHA com base no KB
4. Seja ESPECÍFICO e ACIONÁVEL — evite generalidades e clichês
5. Use dados concretos, nomes, números e exemplos reais quando disponíveis no KB
6. O promptContext deve ser um parágrafo rico que sirva como system prompt em qualquer geração de IA para essa marca
7. O completenessScore deve refletir a QUALIDADE real dos dados, não apenas se foram preenchidos

Retorne um JSON com EXATAMENTE esta estrutura:
{
  "brandEssence": "frase de 1 linha capturando a essência da marca",
  "uniqueValueProp": "proposta de valor única em 1-2 frases diretas e específicas",
  "targetPersona": {
    "profile": "perfil conciso em 1 linha",
    "demographics": "idade, renda, localização, ocupação",
    "digitalBehavior": "plataformas que usa, como consome conteúdo",
    "biggestPain": "dor principal em 1 frase na voz do cliente",
    "dream": "o que sonha conquistar"
  },
  "toneRules": {
    "use": ["regra concreta 1", "regra concreta 2", "regra concreta 3"],
    "avoid": ["regra concreta 1", "regra concreta 2", "regra concreta 3"]
  },
  "keyMessages": ["mensagem central 1", "mensagem central 2", "mensagem central 3"],
  "painPoints": ["dor 1 na voz do cliente", "dor 2", "dor 3", "dor 4"],
  "competitiveEdge": ["diferencial concreto 1", "diferencial concreto 2"],
  "forbiddenTopics": ["tópico proibido 1", "tópico proibido 2", "tópico proibido 3"],
  "currentCampaignFocus": "foco atual com prazo e meta numérica",
  "contentAngles": ["ângulo 1", "ângulo 2", "ângulo 3", "ângulo 4"],
  "ctaStyle": "estilo de CTA recomendado",
  "kpiPriorities": ["kpi 1", "kpi 2", "kpi 3"],
  "promptContext": "parágrafo completo para system prompt da marca",
  "completenessScore": 0,
  "missingCritical": ["campo que NÃO pôde ser preenchido por falta de dados"],
  "filledFromKB": ["lista dos campos que foram preenchidos/melhorados a partir do KB"],
  "confidenceNotes": {
    "high": ["campos com alta confiança baseados em dados claros do KB"],
    "medium": ["campos inferidos com confiança média"],
    "low": ["campos que precisam de validação humana mais cuidadosa"]
  }
}`;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-router`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        task_type: "analyze",
        messages: [
          {
            role: "system",
            content: "Você é um estrategista de marca sênior com 20 anos de experiência em branding e comunicação. Analise documentos de marca com profundidade e extraia meta-fields acionáveis. Retorne APENAS JSON puro e válido, sem markdown, sem comentários.",
          },
          { role: "user", content: prompt },
        ],
        options: {
          temperature: 0.2,
          response_format: { type: "json_object" },
        },
        function_name: "fill-metafields-from-knowledge",
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit atingido. Tente novamente em alguns segundos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos ao workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${await response.text()}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0].message.content;
    let cleanContent = content.trim();
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }
    const metafields = JSON.parse(cleanContent);

    return new Response(JSON.stringify({ metafields, documentsUsed: knowledgeDocs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("fill-metafields-from-knowledge error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
