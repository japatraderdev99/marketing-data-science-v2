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

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header ausente");

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Usuário não autenticado");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Load all data sources in parallel
    const [
      { data: knowledgeDocs },
      { data: benchmarks },
      { data: creativeDrafts },
      { data: activeCreatives },
      { data: aiUsageLogs },
      { data: mediaLibrary },
    ] = await Promise.all([
      supabase.from("strategy_knowledge").select("document_name, extracted_knowledge, status, created_at").eq("user_id", user.id),
      supabase.from("competitor_benchmarks").select("competitor_name, ai_insights, status, platform, created_at").eq("user_id", user.id).eq("status", "done").limit(10),
      supabase.from("creative_drafts").select("name, status, workflow_stage, channel, persona, angle, created_at, updated_at").eq("user_id", user.id).limit(20),
      supabase.from("active_creatives").select("title, status, platform, impressions, clicks, conversions, engagement_rate, spend, published_at").eq("user_id", user.id).limit(20),
      supabase.from("ai_usage_log").select("task_type, model_used, cost_estimate, tokens_input, tokens_output, created_at, success").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("media_library").select("id, category, tags").eq("user_id", user.id),
    ]);

    // Build knowledge context
    const kbSummary = (knowledgeDocs ?? []).filter((d: { status: string }) => d.status === "done").map((d: { document_name: string; extracted_knowledge: Record<string, unknown> | null }) => {
      const k = d.extracted_knowledge as Record<string, unknown>;
      if (!k) return `- ${d.document_name}: (sem dados extraídos)`;
      return `- ${d.document_name}: ${k.brandEssence || ""} | Posicionamento: ${k.positioning || "N/A"} | Score: ${k.completenessScore || "N/A"}`;
    }).join("\n");

    // Build benchmark insights
    const benchmarkSummary = (benchmarks ?? []).map((b: { competitor_name: string; platform: string | null; ai_insights: Record<string, unknown> | null }) => {
      const insights = b.ai_insights as Record<string, unknown>;
      return `- ${b.competitor_name} (${b.platform || "geral"}): Score ${insights?.overallScore || "N/A"} | ${insights?.summary || "sem resumo"}`;
    }).join("\n");

    // Build creative drafts summary
    const draftsByStatus: Record<string, number> = {};
    (creativeDrafts ?? []).forEach((d: { status: string }) => {
      draftsByStatus[d.status] = (draftsByStatus[d.status] || 0) + 1;
    });
    const draftSummary = Object.entries(draftsByStatus).map(([s, c]) => `${s}: ${c}`).join(", ");

    // Build active creatives performance
    const totalImpressions = (activeCreatives ?? []).reduce((sum: number, c: { impressions: number | null }) => sum + (c.impressions || 0), 0);
    const totalClicks = (activeCreatives ?? []).reduce((sum: number, c: { clicks: number | null }) => sum + (c.clicks || 0), 0);
    const totalConversions = (activeCreatives ?? []).reduce((sum: number, c: { conversions: number | null }) => sum + (c.conversions || 0), 0);
    const totalSpend = (activeCreatives ?? []).reduce((sum: number, c: { spend: number | null }) => sum + (c.spend || 0), 0);
    const avgEngagement = (activeCreatives ?? []).length > 0
      ? ((activeCreatives ?? []).reduce((sum: number, c: { engagement_rate: number | null }) => sum + (c.engagement_rate || 0), 0) / (activeCreatives ?? []).length).toFixed(2)
      : "0";

    // Build AI usage summary
    const totalAiCost = (aiUsageLogs ?? []).reduce((sum: number, l: { cost_estimate: number | null }) => sum + (l.cost_estimate || 0), 0);
    const aiCallsByType: Record<string, number> = {};
    (aiUsageLogs ?? []).forEach((l: { task_type: string }) => {
      aiCallsByType[l.task_type] = (aiCallsByType[l.task_type] || 0) + 1;
    });
    const aiUsageSummary = Object.entries(aiCallsByType).map(([t, c]) => `${t}: ${c} calls`).join(", ");

    // Media library stats
    const mediaByCat: Record<string, number> = {};
    (mediaLibrary ?? []).forEach((m: { category: string | null }) => {
      const cat = m.category || "sem_categoria";
      mediaByCat[cat] = (mediaByCat[cat] || 0) + 1;
    });
    const mediaSummary = Object.entries(mediaByCat).map(([c, n]) => `${c}: ${n}`).join(", ");

    const { additionalContext } = await req.json().catch(() => ({ additionalContext: "" }));

    const prompt = `Você é o Chief Strategy Officer (CSO) da DQEF, realizando a análise estratégica semanal completa da operação de marketing.

DATA DA ANÁLISE: ${new Date().toISOString().split("T")[0]}

═══ KNOWLEDGE BASE (${(knowledgeDocs ?? []).length} documentos) ═══
${kbSummary || "(vazio)"}

═══ BENCHMARKS DE CONCORRENTES (${(benchmarks ?? []).length} análises) ═══
${benchmarkSummary || "(nenhum benchmark analisado)"}

═══ CRIATIVOS EM PRODUÇÃO ═══
Total de drafts: ${(creativeDrafts ?? []).length} | Status: ${draftSummary || "nenhum"}
Criativos ativos: ${(activeCreatives ?? []).length}

═══ PERFORMANCE DOS CRIATIVOS ATIVOS ═══
Impressões: ${totalImpressions.toLocaleString()} | Cliques: ${totalClicks.toLocaleString()} | Conversões: ${totalConversions}
Spend total: R$ ${totalSpend.toFixed(2)} | Engagement médio: ${avgEngagement}%
CTR médio: ${totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0"}%
CPA: ${totalConversions > 0 ? `R$ ${(totalSpend / totalConversions).toFixed(2)}` : "N/A"}

═══ USO DE IA (últimas 50 chamadas) ═══
Custo total estimado: $${totalAiCost.toFixed(4)} USD
Chamadas por tipo: ${aiUsageSummary || "nenhuma"}

═══ BIBLIOTECA DE MÍDIA ═══
Total: ${(mediaLibrary ?? []).length} arquivos | Por categoria: ${mediaSummary || "nenhum"}

${additionalContext ? `═══ CONTEXTO ADICIONAL DO CMO ═══\n${additionalContext}` : ""}

═══ INSTRUÇÕES ═══
Gere uma análise estratégica completa e acionável. Retorne APENAS este JSON:

{
  "weekSummary": "Resumo executivo da semana em 3-4 frases (o que aconteceu, resultados, tendências)",
  "performanceAnalysis": {
    "topPerformers": ["criativo/campanha que mais performou e por quê"],
    "underperformers": ["o que não funcionou e diagnóstico"],
    "ctrAnalysis": "análise do CTR vs benchmark do setor",
    "roiAnalysis": "análise do ROI/CPA vs meta"
  },
  "strategicInsights": [
    {
      "insight": "insight acionável específico",
      "priority": "CRÍTICA|ALTA|MÉDIA",
      "action": "ação concreta a tomar",
      "deadline": "prazo sugerido",
      "responsible": "quem deve executar"
    }
  ],
  "contentRecommendations": {
    "whatToCreate": ["tipo de conteúdo que deve ser criado esta semana e por quê"],
    "whatToStop": ["o que parar de fazer e por quê"],
    "whatToTest": ["experimentos sugeridos com hipótese clara"]
  },
  "competitivePosition": "análise da posição competitiva baseada nos benchmarks",
  "brandHealthScore": 0,
  "operationalEfficiency": {
    "aiCostTrend": "análise do custo de IA — está otimizado?",
    "productionVelocity": "velocidade de produção de criativos",
    "bottlenecks": ["gargalos identificados no pipeline"]
  },
  "weeklyOKRs": [
    {
      "objective": "objetivo da semana",
      "keyResults": ["KR1 mensurável", "KR2 mensurável"],
      "confidence": 0
    }
  ],
  "risks": [
    {
      "risk": "risco identificado",
      "impact": "ALTO|MÉDIO|BAIXO",
      "mitigation": "como mitigar"
    }
  ],
  "ceoSummary": "Parágrafo direto para o CEO: o que ele precisa saber e decidir esta semana"
}

REGRAS:
- Seja BRUTALMENTE honesto — sem otimismo falso
- Use dados concretos (números, %) em cada insight
- brandHealthScore: 0-100 baseado na completude do KB, performance dos criativos, e consistência da marca
- confidence nos OKRs: 0-100 probabilidade de atingir
- Priorize ações com maior impacto no lançamento (15/03/2026)
- Se dados estiverem escassos, aponte isso como risco`;

    // Route through ai-router (weekly_strategy -> Claude Opus 4)
    const aiRes = await fetch(`${SUPABASE_URL}/functions/v1/ai-router`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({
        task_type: "weekly_strategy",
        messages: [
          { role: "system", content: "Você é o Chief Strategy Officer da DQEF com 20 anos de experiência em marketing digital, growth hacking e gestão de lançamentos de produto. Sua análise é rigorosa, baseada em dados, e brutalmente honesta. Retorne apenas JSON válido." },
          { role: "user", content: prompt },
        ],
        options: { temperature: 0.3, response_format: { type: "json_object" } },
        user_id: user.id,
        function_name: "weekly-strategy-review",
      }),
    });

    if (!aiRes.ok) {
      const errData = await aiRes.json().catch(() => ({ error: "AI error" }));
      return new Response(JSON.stringify(errData), {
        status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("Resposta vazia da IA");

    let review: Record<string, unknown>;
    try {
      review = JSON.parse(content);
    } catch {
      throw new Error("IA retornou JSON inválido");
    }

    return new Response(
      JSON.stringify({
        success: true,
        review,
        dataSourcesSummary: {
          knowledgeDocs: (knowledgeDocs ?? []).length,
          benchmarks: (benchmarks ?? []).length,
          creativeDrafts: (creativeDrafts ?? []).length,
          activeCreatives: (activeCreatives ?? []).length,
          aiUsageLogs: (aiUsageLogs ?? []).length,
          mediaLibrary: (mediaLibrary ?? []).length,
        },
        model: aiData._meta?.model || "anthropic/claude-opus-4",
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("weekly-strategy-review error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
