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

    // Fetch all done knowledge docs for this user
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: knowledgeDocs } = await supabase
      .from("strategy_knowledge")
      .select("document_name, extracted_knowledge")
      .eq("user_id", user.id)
      .eq("status", "done");

    if (!knowledgeDocs || knowledgeDocs.length === 0) {
      throw new Error("Nenhum documento analisado encontrado no knowledge base.");
    }

    // Merge all extracted knowledge into a single context
    const knowledgeContext = knowledgeDocs.map((doc: { document_name: string; extracted_knowledge: Record<string, unknown> | null }) => {
      const k = doc.extracted_knowledge as Record<string, unknown>;
      if (!k) return "";
      return `=== DOCUMENTO: ${doc.document_name} ===
MARCA: ${k.brandName || ""}
ESSÊNCIA: ${k.brandEssence || ""}
MISSÃO: ${k.mission || ""}
VISÃO: ${k.vision || ""}
POSICIONAMENTO: ${k.positioning || ""}
PROPOSTA DE VALOR: ${k.uniqueValueProp || ""}
PERSONA: ${JSON.stringify(k.targetAudience || {})}
TOM DE VOZ: ${JSON.stringify(k.toneOfVoice || {})}
MENSAGENS-CHAVE: ${JSON.stringify(k.keyMessages || [])}
DIFERENCIAIS: ${JSON.stringify(k.differentials || [])}
CONCORRENTES: ${JSON.stringify(k.competitors || [])}
VANTAGEM COMPETITIVA: ${JSON.stringify(k.competitiveEdge || [])}
TÓPICOS PROIBIDOS: ${JSON.stringify(k.forbiddenTopics || [])}
ÂNGULOS DE CONTEÚDO: ${JSON.stringify(k.contentAngles || [])}
ESTILO DE CTA: ${k.ctaStyle || ""}
RESUMO: ${k.documentSummary || ""}
INSIGHTS: ${JSON.stringify(k.keyInsights || [])}`;
    }).join("\n\n");

    const { currentData } = await req.json();

    const prompt = `Você é um estrategista de marketing sênior. Com base no knowledge base de documentos de marca abaixo, preencha os campos do playbook estratégico que ainda estão vazios ou incompletos.

KNOWLEDGE BASE DOS DOCUMENTOS:
${knowledgeContext}

ESTADO ATUAL DO PLAYBOOK (campos já preenchidos — NÃO sobrescreva se já tem conteúdo substancial):
- positioning: ${currentData?.positioning || "(vazio)"}
- differentials: ${currentData?.differentials || "(vazio)"}
- targetAudience: ${currentData?.targetAudience || "(vazio)"}
- pains: ${currentData?.pains || "(vazio)"}
- toneOfVoice: ${currentData?.toneOfVoice || "(vazio)"}
- competitors: ${currentData?.competitors || "(vazio)"}
- forbiddenTopics: ${currentData?.forbiddenTopics || "(vazio)"}
- currentObjective: ${currentData?.currentObjective || "(vazio)"}
- kpis: ${currentData?.kpis || "(vazio)"}

REGRAS IMPORTANTES:
1. Se o campo já tem conteúdo substancial (mais de 30 caracteres), retorne o mesmo valor sem alterar
2. Se o campo está vazio ou muito genérico, preencha com as informações relevantes do knowledge base
3. Escreva em linguagem direta, acionável e em português do Brasil
4. Para "pains", use linguagem na voz do cliente (como ele pensaria/falaria)
5. Para "toneOfVoice", inclua exemplos concretos de ✅ PODE e ❌ NÃO PODE
6. Para "differentials", use dados concretos quando disponíveis
7. Se não há informação suficiente no knowledge base para um campo, retorne o valor atual ou uma string indicando que precisa ser preenchido manualmente

Retorne um JSON com EXATAMENTE estes campos:
{
  "positioning": "...",
  "differentials": "...",
  "targetAudience": "...",
  "pains": "...",
  "toneOfVoice": "...",
  "competitors": "...",
  "forbiddenTopics": "...",
  "currentObjective": "...",
  "kpis": "...",
  "filledFields": ["lista dos campos que foram preenchidos/atualizados pela IA"],
  "skippedFields": ["lista dos campos mantidos sem alteração pois já tinham conteúdo"]
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
            content: "Você é um estrategista de marketing sênior especializado em brand strategy. Retorne apenas JSON puro e válido, sem markdown.",
          },
          { role: "user", content: prompt },
        ],
        options: {
          temperature: 0.2,
          response_format: { type: "json_object" },
        },
        function_name: "fill-playbook-from-knowledge",
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit atingido. Tente novamente." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${await response.text()}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0].message.content;
    // Strip markdown fences if present
    let cleanContent = content.trim();
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }
    const playbook = JSON.parse(cleanContent);

    return new Response(JSON.stringify({ playbook, documentsUsed: knowledgeDocs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("fill-playbook-from-knowledge error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
