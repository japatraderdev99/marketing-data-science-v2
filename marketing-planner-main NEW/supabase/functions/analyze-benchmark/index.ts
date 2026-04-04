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

    const { benchmarkId, fileUrl, competitorName, platform, formatType } = await req.json();
    if (!benchmarkId || !fileUrl) throw new Error("benchmarkId e fileUrl são obrigatórios");

    // Mark as analyzing
    await supabase
      .from("competitor_benchmarks")
      .update({ status: "analyzing" })
      .eq("id", benchmarkId)
      .eq("user_id", user.id);

    // Fetch user's strategy context for brand voice adaptation
    let brandContext = "";
    const { data: knowledgeDocs } = await supabase
      .from("strategy_knowledge")
      .select("document_name, extracted_knowledge")
      .eq("user_id", user.id)
      .eq("status", "done")
      .limit(3);

    if (knowledgeDocs && knowledgeDocs.length > 0) {
      const parts = knowledgeDocs.map((d: { document_name: string; extracted_knowledge: Record<string, unknown> | null }) => {
        const k = d.extracted_knowledge;
        if (!k) return "";
        return `Marca: ${k.brandName || "N/A"}\nPosicionamento: ${k.positioning || "N/A"}\nTom: ${JSON.stringify(k.toneOfVoice) || "N/A"}\nPersona: ${JSON.stringify(k.targetAudience) || "N/A"}`;
      }).filter(Boolean);
      brandContext = `\n\n--- CONTEXTO DA MARCA DO USUÁRIO ---\n${parts.join("\n\n")}`;
    }

    // Fetch file as base64
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) throw new Error(`Erro ao buscar arquivo: ${fileRes.status}`);
    const mimeType = fileRes.headers.get("content-type") || "image/png";
    const buffer = await fileRes.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8.length; i += chunkSize) {
      binary += String.fromCharCode(...uint8.slice(i, i + chunkSize));
    }
    const base64 = btoa(binary);

    const systemPrompt = `Você é um estrategista de marketing digital especializado em benchmarking competitivo e adaptação de comunicação.
Analise o material do concorrente e gere insights acionáveis adaptados à marca do usuário.
Foque em: o que funciona no material, como adaptar para a comunicação da marca, e oportunidades de diferenciação.
Retorne APENAS JSON válido.${brandContext}`;

    const userPrompt = `Analise este material de benchmark do concorrente "${competitorName || "não identificado"}" (plataforma: ${platform || "geral"}, formato: ${formatType || "geral"}).

Extraia e retorne o seguinte JSON:

{
  "competitorAnalysis": {
    "strengths": ["ponto forte 1", "ponto forte 2"],
    "weaknesses": ["ponto fraco 1"],
    "visualStyle": "descrição do estilo visual usado",
    "copyStyle": "descrição do estilo de copy",
    "cta": "tipo de CTA usado",
    "hook": "tipo de gancho/abertura",
    "engagement": "estratégia de engajamento percebida"
  },
  "adaptationInsights": {
    "whatToAdapt": ["o que adaptar para a marca 1", "o que adaptar 2"],
    "whatToAvoid": ["o que não copiar 1"],
    "differentiationOpportunity": "como se diferenciar deste concorrente",
    "suggestedAngle": "ângulo sugerido para a marca do usuário",
    "suggestedHook": "gancho adaptado à voz da marca",
    "suggestedCTA": "CTA adaptado ao tom da marca"
  },
  "formatInsights": {
    "formatName": "nome do formato identificado",
    "bestPractices": ["prática 1", "prática 2"],
    "dimensionsUsed": "dimensões aproximadas",
    "colorPalette": "cores predominantes",
    "typography": "estilo tipográfico"
  },
  "actionItems": ["ação concreta 1", "ação concreta 2", "ação concreta 3"],
  "overallScore": 75,
  "summary": "resumo executivo em 2-3 frases"
}

Para overallScore: 0-100 baseado na qualidade e relevância do material para benchmarking.`;

    // Route through ai-router (analyze -> Claude Sonnet 4, supports vision)
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
        options: { temperature: 0.3, response_format: { type: "json_object" } },
        user_id: user.id,
        function_name: "analyze-benchmark",
      }),
    });

    if (!aiRes.ok) {
      const errData = await aiRes.json().catch(() => ({ error: "AI error" }));
      if (aiRes.status === 429 || aiRes.status === 402) {
        await supabase.from("competitor_benchmarks").update({ status: "error" }).eq("id", benchmarkId);
      }
      return new Response(JSON.stringify(errData), {
        status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("Resposta vazia da IA");

    let insights: Record<string, unknown>;
    try {
      insights = JSON.parse(content);
    } catch {
      throw new Error("IA retornou JSON inválido");
    }

    await supabase
      .from("competitor_benchmarks")
      .update({ status: "done", ai_insights: insights })
      .eq("id", benchmarkId)
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({ success: true, insights }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("analyze-benchmark error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
