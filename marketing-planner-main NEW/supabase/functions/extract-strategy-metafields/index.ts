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
    // LOVABLE_API_KEY is used by ai-router, not needed here directly

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { strategyData } = await req.json();

    // Try to load knowledge base docs for this user (optional, use auth header if present)
    let knowledgeContext = "";
    try {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await userClient.auth.getUser();
        if (user) {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const { data: knowledgeDocs } = await supabase
            .from("strategy_knowledge")
            .select("document_name, extracted_knowledge")
            .eq("user_id", user.id)
            .eq("status", "done");

          if (knowledgeDocs && knowledgeDocs.length > 0) {
            knowledgeContext = knowledgeDocs.map((doc: { document_name: string; extracted_knowledge: Record<string, unknown> | null }) => {
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
          }
        }
      }
    } catch (_) {
      // knowledge base is optional — proceed without it
    }

    const hasKnowledge = knowledgeContext.length > 0;
    const refDocs: Array<{ name: string; url: string; type: string }> = Array.isArray(strategyData.docs) ? strategyData.docs : [];

    const prompt = `Você é um estrategista de marketing sênior especializado em brand strategy e comunicação persuasiva.

Analise TODAS as fontes de informação abaixo e extraia os META-FIELDS estruturados que devem nortear TODAS as campanhas, copies e comunicações da marca.

${hasKnowledge ? `KNOWLEDGE BASE ANALISADO (prioridade máxima — extraído dos documentos enviados):
---
${knowledgeContext}
---

` : ""}${refDocs.length > 0 ? `ARQUIVOS DE REFERÊNCIA ENVIADOS (use os nomes como contexto):
${refDocs.map(d => `- ${d.name}`).join("\n")}

` : ""}PLAYBOOK ESTRATÉGICO (campos manuais):
---
POSICIONAMENTO: ${strategyData.positioning || "(não preenchido)"}
DIFERENCIAIS COMPETITIVOS: ${strategyData.differentials || "(não preenchido)"}
PÚBLICO-ALVO: ${strategyData.targetAudience || "(não preenchido)"}
DORES E FRUSTRAÇÕES: ${strategyData.pains || "(não preenchido)"}
TOM DE VOZ: ${strategyData.toneOfVoice || "(não preenchido)"}
CONCORRENTES: ${strategyData.competitors || "(não preenchido)"}
TÓPICOS PROIBIDOS: ${strategyData.forbiddenTopics || "(não preenchido)"}
OBJETIVO ATUAL (30-90 dias): ${strategyData.currentObjective || "(não preenchido)"}
KPIs E METAS: ${strategyData.kpis || "(não preenchido)"}
---

INSTRUÇÃO: Use TODAS as fontes disponíveis. Se um campo do playbook está vazio, infira com base no contexto disponível. Seja específico e acionável. Prefira dados concretos a generalizações.

Retorne um JSON com a seguinte estrutura exata:
{
  "brandEssence": "frase de 1 linha que captura a essência da marca",
  "uniqueValueProp": "proposta de valor única em 1-2 frases diretas",
  "targetPersona": {
    "profile": "perfil em 1 linha",
    "demographics": "idade, renda, localização, ocupação",
    "digitalBehavior": "como usa digital, quais plataformas",
    "biggestPain": "dor principal em 1 frase",
    "dream": "o que sonha conquistar"
  },
  "toneRules": {
    "use": ["regra 1", "regra 2", "regra 3"],
    "avoid": ["regra 1", "regra 2", "regra 3"]
  },
  "keyMessages": ["mensagem central 1", "mensagem central 2", "mensagem central 3"],
  "painPoints": ["dor 1", "dor 2", "dor 3", "dor 4"],
  "competitiveEdge": ["diferencial vs concorrente 1", "diferencial vs concorrente 2"],
  "forbiddenTopics": ["proibido 1", "proibido 2", "proibido 3"],
  "currentCampaignFocus": "foco atual em 1-2 frases com prazo e número",
  "contentAngles": ["ângulo de conteúdo 1", "ângulo de conteúdo 2", "ângulo de conteúdo 3", "ângulo de conteúdo 4"],
  "ctaStyle": "estilo de CTA recomendado baseado no objetivo",
  "kpiPriorities": ["kpi 1", "kpi 2", "kpi 3"],
  "promptContext": "parágrafo resumido de contexto para usar como system prompt em qualquer geração de IA para essa marca",
  "completenessScore": 0,
  "missingCritical": ["campo faltante 1", "campo faltante 2"]
}

Para completenessScore: calcule 0-100 baseado na qualidade e completude de TODAS as fontes combinadas.
Para missingCritical: liste apenas campos críticos que não foram encontrados em nenhuma fonte.`;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-router`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        task_type: "analyze",
        messages: [
          { role: "system", content: "Você é um estrategista de marketing sênior. Retorne apenas JSON puro, sem markdown." },
          { role: "user", content: prompt }
        ],
        options: {
          temperature: 0.3,
          response_format: { type: "json_object" },
        },
        function_name: "extract-strategy-metafields",
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit atingido. Tente novamente." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${await response.text()}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0].message.content;
    let cleanContent = content.trim();
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }
    const metafields = JSON.parse(cleanContent);

    return new Response(JSON.stringify({ metafields, sourcedFromKnowledge: hasKnowledge }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
