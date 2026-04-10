import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { resolveWorkspace } from "../_shared/workspace.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface IgPost { media_type: string; reach: number; engagement: number; likes: number; saves: number; shares: number; published_at: string; caption: string | null }
interface MetaAd { ad_name: string; impressions: number; clicks: number; ctr: number; spend: number; conversions: number; ad_body: string | null }

function hourOf(iso: string): number {
  return new Date(iso).getHours();
}

function avgEngagement(posts: IgPost[]): number {
  if (!posts.length) return 0;
  return posts.reduce((s, p) => s + (p.reach > 0 ? (p.engagement || 0) / p.reach : 0), 0) / posts.length;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ws = await resolveWorkspace(req);
    if (!ws) return errorResponse("Não autorizado", 401);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffStr = cutoff.toISOString();

    // Load data
    const [igRes, metaRes] = await Promise.all([
      ws.supabase.from("instagram_posts").select("media_type,reach,engagement,likes,saves,shares,published_at,caption").eq("user_id", ws.userId).gte("published_at", cutoffStr).limit(500),
      ws.supabase.from("meta_ads_performance").select("ad_name,impressions,clicks,ctr,spend,conversions,ad_body").eq("user_id", ws.userId).gte("date_start", cutoff.toISOString().split('T')[0]).limit(500),
    ]);

    const igPosts: IgPost[] = igRes.data ?? [];
    const metaAds: MetaAd[] = metaRes.data ?? [];

    if (igPosts.length === 0 && metaAds.length === 0) {
      return jsonResponse({ success: true, message: "Sem dados suficientes para análise", patterns: 0 });
    }

    // --- Pattern: by media type ---
    const byType: Record<string, IgPost[]> = {};
    igPosts.forEach(p => { (byType[p.media_type] = byType[p.media_type] || []).push(p); });

    // --- Pattern: by hour of day ---
    const byHour: Record<number, IgPost[]> = {};
    igPosts.forEach(p => { if (p.published_at) { const h = hourOf(p.published_at); (byHour[h] = byHour[h] || []).push(p); } });

    const hourSummary = Object.entries(byHour)
      .map(([h, posts]) => ({ hour: Number(h), avg_engagement: avgEngagement(posts), count: posts.length }))
      .sort((a, b) => b.avg_engagement - a.avg_engagement)
      .slice(0, 5);

    const typeSummary = Object.entries(byType)
      .map(([type, posts]) => ({ type, avg_engagement: avgEngagement(posts), avg_reach: Math.round(posts.reduce((s, p) => s + p.reach, 0) / posts.length), count: posts.length }));

    // --- Pattern: top vs low posts ---
    const sorted = [...igPosts].sort((a, b) => avgEngagement([b]) - avgEngagement([a]));
    const top20 = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.2)));
    const avgSavesTop = top20.length ? top20.reduce((s, p) => s + p.saves, 0) / top20.length : 0;
    const avgSharesTop = top20.length ? top20.reduce((s, p) => s + p.shares, 0) / top20.length : 0;

    // --- Meta ads patterns ---
    const topAds = [...metaAds].sort((a, b) => (b.ctr || 0) - (a.ctr || 0)).slice(0, 10);

    // Build aggregated package for AI
    const dataPackage = {
      total_posts: igPosts.length, total_ads: metaAds.length,
      by_format: typeSummary,
      best_hours: hourSummary,
      top_posts_avg_saves: avgSavesTop, top_posts_avg_shares: avgSharesTop,
      top_ads_ctr: topAds.slice(0, 5).map(a => ({ name: a.ad_name, ctr: a.ctr, spend: a.spend, conversions: a.conversions })),
    };

    const PROMPT = `Você é um data scientist especializado em marketing de conteúdo brasileiro.
Analise esses padrões de performance e identifique os insights mais valiosos para um criador de conteúdo.

DADOS:
${JSON.stringify(dataPackage, null, 2)}

Retorne JSON com array de insights, cada um com:
[
  {
    "insight_type": "tipo_unico_snake_case",
    "title": "Título curto",
    "pattern_data": { "chave": "valor" },
    "avg_engagement_rate": 0.0,
    "avg_reach": 0,
    "total_occurrences": 0,
    "ai_recommendation": "Recomendação acionável e específica (1-2 frases)",
    "confidence_score": 0.0
  }
]

insight_types possíveis: best_format, best_hour, saves_driver, share_driver, top_ad_pattern, engagement_peak
Retorne entre 3 e 6 insights. Apenas JSON, sem texto adicional.`;

    const aiRes = await fetch(`${SUPABASE_URL}/functions/v1/ai-router`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        task_type: "classify",  // Gemini Flash — barato
        messages: [{ role: "user", content: PROMPT }],
        function_name: "analyze-content-patterns",
        options: { temperature: 0.3, max_tokens: 2048, response_format: { type: "json_object" } },
      }),
    });

    if (!aiRes.ok) throw new Error(`ai-router ${aiRes.status}`);
    const aiData = await aiRes.json();
    let content = (aiData as { choices?: Array<{ message?: { content?: string } }> })
      .choices?.[0]?.message?.content ?? "[]";

    // Extract JSON
    content = content.trim();
    if (content.startsWith("```")) content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
    let insights: Array<Record<string, unknown>> = [];
    try {
      const parsed = JSON.parse(content);
      insights = Array.isArray(parsed) ? parsed : (parsed.insights ?? parsed.data ?? []);
    } catch { insights = []; }

    // Upsert each insight
    let saved = 0;
    for (const ins of insights) {
      if (!ins.insight_type) continue;
      const { error } = await ws.supabase.from("content_performance_insights").upsert({
        user_id: ws.userId,
        insight_type: String(ins.insight_type),
        pattern_data: ins.pattern_data ?? {},
        avg_engagement_rate: Number(ins.avg_engagement_rate) || 0,
        avg_reach: Number(ins.avg_reach) || 0,
        total_occurrences: Number(ins.total_occurrences) || 0,
        ai_recommendation: String(ins.ai_recommendation || ""),
        confidence_score: Number(ins.confidence_score) || 0,
        analyzed_at: new Date().toISOString(),
      }, { onConflict: "user_id,insight_type" });
      if (!error) saved++;
    }

    return jsonResponse({ success: true, patterns: saved, posts_analyzed: igPosts.length, ads_analyzed: metaAds.length });
  } catch (e) {
    console.error("analyze-content-patterns:", e);
    return errorResponse(e instanceof Error ? e.message : "Erro interno");
  }
});
