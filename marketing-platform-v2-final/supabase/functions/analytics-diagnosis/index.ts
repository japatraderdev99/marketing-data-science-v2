import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { resolveWorkspace } from "../_shared/workspace.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function cutoffDate(period: string): string {
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ws = await resolveWorkspace(req);
    if (!ws) return errorResponse("Não autorizado", 401);

    const { period = "30d" } = await req.json().catch(() => ({}));
    const validPeriod = ["7d", "30d", "90d"].includes(period) ? period : "30d";

    // Check cache (6h TTL)
    const { data: cached } = await ws.supabase
      .from("diagnosis_cache")
      .select("diagnosis, kpi_snapshot, created_at, expires_at")
      .eq("user_id", ws.userId)
      .eq("period", validPeriod)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (cached) {
      return jsonResponse({ diagnosis: cached.diagnosis, kpi_snapshot: cached.kpi_snapshot, cached_at: cached.created_at, from_cache: true });
    }

    // Aggregate data
    const cutoff = cutoffDate(validPeriod);
    const [metaRes, ga4Res, gadsRes, opsRes, igRes] = await Promise.all([
      ws.supabase.from("meta_ads_performance").select("spend,impressions,clicks,conversions,ctr,cpc,campaign_name,ad_name").eq("user_id", ws.userId).gte("date_start", cutoff).limit(200),
      ws.supabase.from("ga4_metrics").select("sessions,total_users,new_users,conversions,bounce_rate,avg_session_duration,source_medium").eq("user_id", ws.userId).gte("metric_date", cutoff).limit(200),
      ws.supabase.from("google_ads_campaigns").select("cost,impressions,clicks,conversions,campaign_name,ctr").eq("user_id", ws.userId).gte("date_start", cutoff).limit(200),
      ws.supabase.from("operational_metrics").select("metric_type,count,total_value,metric_date").eq("user_id", ws.userId).gte("metric_date", cutoff).limit(100),
      ws.supabase.from("instagram_posts").select("media_type,reach,engagement,likes,saves,published_at").eq("user_id", ws.userId).gte("published_at", cutoff + "T00:00:00Z").limit(100),
    ]);

    const meta = metaRes.data ?? [];
    const ga4 = ga4Res.data ?? [];
    const gads = gadsRes.data ?? [];
    const ops = opsRes.data ?? [];
    const ig = igRes.data ?? [];

    // Compute KPI snapshot
    const totalSpendMeta = meta.reduce((s, r) => s + (r.spend || 0), 0);
    const totalSpendGads = gads.reduce((s, r) => s + (r.cost || 0), 0);
    const totalConvMeta = meta.reduce((s, r) => s + (r.conversions || 0), 0);
    const totalConvGads = gads.reduce((s, r) => s + (r.conversions || 0), 0);
    const avgCtr = meta.length ? meta.reduce((s, r) => s + (r.ctr || 0), 0) / meta.length : 0;
    const totalSessions = ga4.reduce((s, r) => s + (r.sessions || 0), 0);
    const avgBounce = ga4.length ? ga4.reduce((s, r) => s + (r.bounce_rate || 0), 0) / ga4.length : 0;
    const topCampaigns = [...meta].sort((a, b) => (b.spend || 0) - (a.spend || 0)).slice(0, 5).map(r => r.campaign_name).filter(Boolean);
    const topPostsByEngagement = [...ig].sort((a, b) => (b.engagement || 0) - (a.engagement || 0)).slice(0, 3);
    const opsMap = ops.reduce((m: Record<string, number>, r) => { m[r.metric_type] = (m[r.metric_type] || 0) + (r.count || 0); return m; }, {});

    const kpiSnapshot = {
      period: validPeriod, totalSpendMeta, totalSpendGads, totalInvest: totalSpendMeta + totalSpendGads,
      totalConversions: totalConvMeta + totalConvGads, avgCtrMeta: avgCtr, totalSessions, avgBounceRate: avgBounce,
      topCampaigns, igPostsAnalyzed: ig.length, operationalCounts: opsMap,
    };

    const dataPackage = JSON.stringify({
      periodo: validPeriod,
      meta_ads: { gasto_total: totalSpendMeta.toFixed(2), conversoes: totalConvMeta, ctr_medio: (avgCtr * 100).toFixed(2) + '%', top_campanhas: topCampaigns, total_anuncios: meta.length },
      google_ads: { gasto_total: totalSpendGads.toFixed(2), conversoes: totalConvGads, total_campanhas: gads.length },
      ga4: { sessoes: totalSessions, bounce_rate: (avgBounce * 100).toFixed(1) + '%', por_canal: ga4.reduce((m: Record<string, number>, r) => { if (r.source_medium) m[r.source_medium] = (m[r.source_medium] || 0) + (r.sessions || 0); return m; }, {}) },
      instagram_organico: { posts_analisados: ig.length, top_posts: topPostsByEngagement.map(p => ({ tipo: p.media_type, reach: p.reach, engagement: p.engagement })) },
      operacional: opsMap,
    });

    // Call ai-router (via internal service call)
    const SYSTEM = `Você é um CMO estrategista sênior especializado em marketing digital brasileiro.
Analise os dados de performance e gere um DIAGNÓSTICO EXECUTIVO em markdown estruturado.
Seja direto, específico e acionável. Use dados concretos. Máximo 800 palavras.

SEÇÕES OBRIGATÓRIAS:
## 🔍 DIAGNÓSTICO GERAL
## 💰 PERFORMANCE DE INVESTIMENTO
## 📊 FUNIL E CONVERSÃO
## 📱 CONTEÚDO ORGÂNICO
## 🎯 OPORTUNIDADES CRÍTICAS
## ⚠️ ALERTAS
## 📋 PRÓXIMAS 3 AÇÕES`;

    const aiRes = await fetch(`${SUPABASE_URL}/functions/v1/ai-router`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        task_type: "strategy",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `DADOS DE PERFORMANCE (${validPeriod}):\n${dataPackage}` },
        ],
        function_name: "analytics-diagnosis",
        options: { temperature: 0.5, max_tokens: 2048 },
      }),
    });

    if (!aiRes.ok) throw new Error(`ai-router ${aiRes.status}`);
    const aiData = await aiRes.json();
    const diagnosis = (aiData as { choices?: Array<{ message?: { content?: string } }> })
      .choices?.[0]?.message?.content ?? "Diagnóstico indisponível.";

    // Upsert cache
    await ws.supabase.from("diagnosis_cache").upsert({
      user_id: ws.userId,
      period: validPeriod,
      diagnosis,
      kpi_snapshot: kpiSnapshot,
      model_used: aiData._meta?.model ?? "claude-sonnet-4-6",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: "user_id,period" });

    return jsonResponse({ diagnosis, kpi_snapshot: kpiSnapshot, from_cache: false });
  } catch (e) {
    console.error("analytics-diagnosis:", e);
    return errorResponse(e instanceof Error ? e.message : "Erro interno");
  }
});
