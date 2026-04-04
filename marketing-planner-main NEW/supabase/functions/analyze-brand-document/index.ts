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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header ausente");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Usuário não autenticado");

    const { knowledgeId, documentUrl, documentName } = await req.json();
    if (!knowledgeId || !documentUrl) throw new Error("knowledgeId e documentUrl são obrigatórios");

    // Mark as analyzing
    await supabase
      .from("strategy_knowledge")
      .update({ status: "analyzing" })
      .eq("id", knowledgeId)
      .eq("user_id", user.id);

    // Fetch document as base64
    const fileRes = await fetch(documentUrl);
    if (!fileRes.ok) throw new Error(`Erro ao buscar documento: ${fileRes.status}`);

    const mimeType = fileRes.headers.get("content-type") || "application/pdf";
    const buffer = await fileRes.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8.length; i += chunkSize) {
      binary += String.fromCharCode(...uint8.slice(i, i + chunkSize));
    }
    const base64 = btoa(binary);

    const systemPrompt = `Você é um estrategista de marca senior especializado em brand strategy.
Analise o documento (brand book, playbook ou guia de marca) e extraia os meta-fields estruturados abaixo.
Seja preciso, use dados concretos quando disponíveis. Retorne apenas JSON válido.`;

    const userPrompt = `Analise este documento e extraia TODOS os seguintes campos estratégicos da marca:

{
  "brandName": "nome da marca/empresa",
  "brandEssence": "essência da marca em 1 frase",
  "mission": "missão da empresa",
  "vision": "visão da empresa",
  "values": ["valor 1", "valor 2", "valor 3"],
  "uniqueValueProp": "proposta de valor única em 1-2 frases",
  "positioning": "posicionamento de mercado detalhado",
  "targetAudience": {
    "primaryPersona": "perfil da persona principal",
    "demographics": "dados demográficos",
    "psychographics": "comportamentos e motivações",
    "biggestPain": "maior dor/frustração",
    "dream": "o que deseja conquistar",
    "digitalBehavior": "comportamento digital"
  },
  "toneOfVoice": {
    "personality": "personalidade da marca",
    "use": ["como deve comunicar 1", "como deve comunicar 2"],
    "avoid": ["o que evitar 1", "o que evitar 2"]
  },
  "keyMessages": ["mensagem central 1", "mensagem central 2"],
  "differentials": ["diferencial 1", "diferencial 2"],
  "competitors": ["concorrente 1", "concorrente 2"],
  "competitiveEdge": ["vantagem 1", "vantagem 2"],
  "forbiddenTopics": ["proibido 1", "proibido 2"],
  "visualIdentity": {
    "colors": "paleta de cores",
    "typography": "tipografia",
    "style": "estilo visual"
  },
  "contentAngles": ["ângulo 1", "ângulo 2"],
  "ctaStyle": "estilo de CTA recomendado",
  "promptContext": "parágrafo completo de contexto para system prompt",
  "documentSummary": "resumo executivo em 3-4 frases",
  "keyInsights": ["insight 1", "insight 2"],
  "completenessScore": 0
}

Para completenessScore: 0-100 baseado na riqueza das informações.
Se um campo não for encontrado, use null ou array vazio.`;

    // Route through ai-router (analyze -> Claude Sonnet 4, supports vision/documents)
    const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const aiRes = await fetch(`${SUPABASE_URL}/functions/v1/ai-router`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SRK}` },
      body: JSON.stringify({
        task_type: "analyze",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
            ],
          },
        ],
        options: { temperature: 0.2, response_format: { type: "json_object" } },
        user_id: user.id,
        function_name: "analyze-brand-document",
      }),
    });

    if (!aiRes.ok) {
      const errData = await aiRes.json().catch(() => ({ error: "AI error" }));
      if (aiRes.status === 429 || aiRes.status === 402) {
        await supabase.from("strategy_knowledge").update({
          status: "error",
          error_message: aiRes.status === 429 ? "Rate limit atingido." : "Créditos esgotados.",
        }).eq("id", knowledgeId);
      }
      return new Response(JSON.stringify(errData), {
        status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("Resposta vazia da IA");

    let extractedKnowledge: Record<string, unknown>;
    try {
      extractedKnowledge = JSON.parse(content);
    } catch {
      throw new Error("IA retornou JSON inválido");
    }

    const { error: updateError } = await supabase
      .from("strategy_knowledge")
      .update({
        status: "done",
        extracted_knowledge: extractedKnowledge,
        error_message: null,
      })
      .eq("id", knowledgeId)
      .eq("user_id", user.id);

    if (updateError) throw new Error(`Erro ao salvar: ${updateError.message}`);

    return new Response(
      JSON.stringify({ success: true, knowledge: extractedKnowledge }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("analyze-brand-document error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
