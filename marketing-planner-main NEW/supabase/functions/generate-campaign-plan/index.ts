import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const { campaignForm, strategyMetafields, extraInstructions } = await req.json();

    // Load knowledge base if auth header present
    let knowledgeContext = "";
    let userId: string | null = null;
    try {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await userClient.auth.getUser();
        if (user) {
          userId = user.id;
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const { data: docs } = await supabase
            .from("strategy_knowledge")
            .select("document_name, extracted_knowledge")
            .eq("user_id", user.id)
            .eq("status", "done")
            .limit(2);

          if (docs && docs.length > 0) {
            knowledgeContext = docs.map((d: { document_name: string; extracted_knowledge: Record<string, unknown> | null }) => {
              const k = d.extracted_knowledge as Record<string, unknown>;
              if (!k) return "";
              return [
                k.promptContext ? `Brand context: ${k.promptContext}` : "",
                k.positioning ? `Positioning: ${k.positioning}` : "",
                Array.isArray(k.keyMessages) ? `Key messages: ${(k.keyMessages as string[]).join(" | ")}` : "",
                Array.isArray(k.contentAngles) ? `Content angles: ${(k.contentAngles as string[]).join(", ")}` : "",
              ].filter(Boolean).join("\n");
            }).filter(Boolean).join("\n\n");
          }
        }
      }
    } catch (_) { /* optional */ }

    // Build meta-fields context
    const mf = strategyMetafields ?? {};
    const metaContext = [
      mf.brandEssence ? `ESSÊNCIA: ${mf.brandEssence}` : "",
      mf.uniqueValueProp ? `PROPOSTA DE VALOR: ${mf.uniqueValueProp}` : "",
      mf.promptContext ? `CONTEXTO DA MARCA: ${mf.promptContext}` : "",
      mf.currentCampaignFocus ? `FOCO ATUAL: ${mf.currentCampaignFocus}` : "",
      mf.targetPersona?.profile ? `PERSONA: ${mf.targetPersona.profile}` : "",
      mf.targetPersona?.biggestPain ? `DOR PRINCIPAL: ${mf.targetPersona.biggestPain}` : "",
      Array.isArray(mf.toneRules?.use) ? `TOM (pode): ${mf.toneRules.use.join(", ")}` : "",
      Array.isArray(mf.toneRules?.avoid) ? `TOM (evitar): ${mf.toneRules.avoid.join(", ")}` : "",
      Array.isArray(mf.keyMessages) ? `MENSAGENS: ${mf.keyMessages.join(" | ")}` : "",
      Array.isArray(mf.contentAngles) ? `ÂNGULOS: ${mf.contentAngles.join(", ")}` : "",
      Array.isArray(mf.forbiddenTopics) ? `PROIBIDO: ${mf.forbiddenTopics.join(", ")}` : "",
      Array.isArray(mf.kpiPriorities) ? `KPIs: ${mf.kpiPriorities.join(", ")}` : "",
    ].filter(Boolean).join("\n");

    const today = new Date();
    const startDate = campaignForm.startDate || today.toISOString().split("T")[0];

    const prompt = `Você é um estrategista de marketing sênior e CMO experiente. Crie um plano completo de campanha baseado nas informações abaixo.

${knowledgeContext ? `KNOWLEDGE BASE DA MARCA:\n${knowledgeContext}\n\n` : ""}${metaContext ? `META-FIELDS ESTRATÉGICOS:\n${metaContext}\n\n` : ""}BRIEFING DA CAMPANHA:
- Nome: ${campaignForm.name || "(a definir)"}
- Objetivo: ${campaignForm.objective || "(não informado)"}
- Canal principal: ${campaignForm.channel || "Instagram"}
- Formato: ${campaignForm.format || "Carrossel"}
- Público-alvo: ${campaignForm.targetAudience || mf.targetPersona?.profile || "(a definir)"}
- Orçamento: ${campaignForm.budget ? `R$ ${campaignForm.budget}` : "(não informado)"}
- Início: ${startDate}
- Duração estimada: ${campaignForm.duration || "30 dias"}
- Funil: ${campaignForm.funnel || "Topo"}
- Prioridade: ${campaignForm.priority || "Alta"}
${extraInstructions ? `\nINSTRUÇÕES ADICIONAIS DO CMO:\n${extraInstructions}` : ""}

Gere um plano COMPLETO e ACIONÁVEL. Retorne APENAS este JSON:
{
  "campaignSummary": "resumo executivo em 2-3 frases",
  "angle": "ângulo emocional principal",
  "hooks": ["hook 1", "hook 2", "hook 3"],
  "keyMessage": "mensagem central em 1 frase",
  "ctaMain": "CTA principal",
  "viralLogic": "por que vai ser salvo/compartilhado",
  "kanbanTasks": [
    { "title": "tarefa", "description": "descrição", "format": "Post|Reels|Stories|Carrossel|Ads|Shorts", "channel": "Instagram|TikTok|Meta Ads|LinkedIn|YouTube|Orgânico", "priority": "Alta|Média|Baixa", "status": "ideia", "daysFromStart": 0 }
  ],
  "calendarEntries": [
    { "title": "título", "format": "Post|Reels|Stories|Carrossel|Ads|Shorts", "channel": "Instagram|TikTok|Meta Ads|LinkedIn|YouTube|Orgânico", "daysFromStart": 0, "copy": "copy pronta", "responsible": "Time Marketing" }
  ],
  "estimatedResults": { "reach": "alcance", "engagement": "engajamento", "conversions": "conversões" },
  "warnings": ["alerta 1"]
}

REGRAS:
- 5-8 kanbanTasks cobrindo briefing, criação, revisão, publicação e análise
- 6-12 calendarEntries distribuídos pela duração
- Copies devem refletir o tom de voz da marca
- NUNCA mencione cidades ou regiões específicas`;

    // Route through ai-router (auto -> OpenRouter Auto Router)
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-router`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({
        task_type: "copy",
        messages: [
          { role: "system", content: "Você é um CMO e estrategista de marketing sênior. Retorne apenas JSON puro e válido, sem markdown." },
          { role: "user", content: prompt },
        ],
        options: { temperature: 0.6, response_format: { type: "json_object" } },
        user_id: userId,
        function_name: "generate-campaign-plan",
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: "AI error" }));
      return new Response(JSON.stringify(errData), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    let content = aiResponse.choices[0].message.content;
    // Strip markdown fences if present (e.g. ```json ... ```)
    content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    const plan = JSON.parse(content);

    return new Response(JSON.stringify({ plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("generate-campaign-plan error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
