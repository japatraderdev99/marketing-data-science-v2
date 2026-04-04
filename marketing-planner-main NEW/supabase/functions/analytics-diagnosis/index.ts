import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: authError } = await anonClient.auth.getUser();
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { period = "30d" } = await req.json();
    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    // 1. Fetch Meta Ads data (DQEF account only - Gabriel Merhy)
    const { data: metaAds } = await supabase
      .from("meta_ads_performance")
      .select("ad_name, campaign_name, impressions, clicks, spend, cpc, cpm, ctr, conversions, cost_per_conversion, roas, date_start, ad_account_id")
      .gte("date_start", cutoffStr)
      .order("spend", { ascending: false })
      .limit(100);

    // Filter for DQEF account
    const dqefAds = (metaAds || []);

    // Aggregate Meta Ads
    const metaTotals = dqefAds.reduce(
      (acc, a) => ({
        spend: acc.spend + (Number(a.spend) || 0),
        impressions: acc.impressions + (a.impressions || 0),
        clicks: acc.clicks + (a.clicks || 0),
        conversions: acc.conversions + (Number(a.conversions) || 0),
      }),
      { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
    );

    const topAds = dqefAds.slice(0, 15).map((a) => ({
      name: a.ad_name,
      campaign: a.campaign_name,
      spend: Number(a.spend) || 0,
      impressions: a.impressions || 0,
      clicks: a.clicks || 0,
      ctr: Number(a.ctr) || 0,
      conversions: Number(a.conversions) || 0,
      roas: Number(a.roas) || 0,
    }));

    // 2. Fetch GA4 data
    const { data: ga4Data } = await supabase
      .from("ga4_metrics")
      .select("metric_date, sessions, total_users, new_users, page_views, bounce_rate, conversions, conversion_rate, source_medium, landing_page, device_category")
      .gte("metric_date", cutoffStr)
      .order("metric_date", { ascending: false })
      .limit(200);

    const ga4Totals = (ga4Data || []).reduce(
      (acc, g) => ({
        sessions: acc.sessions + (g.sessions || 0),
        users: acc.users + (g.total_users || 0),
        newUsers: acc.newUsers + (g.new_users || 0),
        pageViews: acc.pageViews + (g.page_views || 0),
        conversions: acc.conversions + (g.conversions || 0),
      }),
      { sessions: 0, users: 0, newUsers: 0, pageViews: 0, conversions: 0 }
    );

    // GA4 top sources
    const sourceMap = new Map<string, { sessions: number; conversions: number }>();
    (ga4Data || []).forEach((g) => {
      const src = g.source_medium || "(direct)";
      const existing = sourceMap.get(src) || { sessions: 0, conversions: 0 };
      existing.sessions += g.sessions || 0;
      existing.conversions += g.conversions || 0;
      sourceMap.set(src, existing);
    });
    const topSources = Array.from(sourceMap.entries())
      .sort((a, b) => b[1].sessions - a[1].sessions)
      .slice(0, 10)
      .map(([source, data]) => ({ source, ...data }));

    // 3. Fetch Operational data
    const { data: opData } = await supabase
      .from("operational_metrics")
      .select("metric_type, count, total_value, city, state, metric_date")
      .gte("metric_date", cutoffStr)
      .limit(200);

    const opSummary: Record<string, { count: number; value: number }> = {};
    (opData || []).forEach((o) => {
      if (!opSummary[o.metric_type]) opSummary[o.metric_type] = { count: 0, value: 0 };
      opSummary[o.metric_type].count += o.count || 0;
      opSummary[o.metric_type].value += Number(o.total_value) || 0;
    });

    // 4. Fetch Google Ads data
    const { data: gadsData } = await supabase
      .from("google_ads_campaigns")
      .select("campaign_name, campaign_status, impressions, clicks, cost, conversions, conversion_value, ctr, avg_cpc, date_start")
      .gte("date_start", cutoffStr)
      .limit(100);

    const gadsTotals = (gadsData || []).reduce(
      (acc, g) => ({
        spend: acc.spend + (Number(g.cost) || 0),
        impressions: acc.impressions + (g.impressions || 0),
        clicks: acc.clicks + (g.clicks || 0),
        conversions: acc.conversions + (Number(g.conversions) || 0),
      }),
      { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
    );

    // Build the data package for Claude
    const dataPackage = {
      period: `Últimos ${days} dias (desde ${cutoffStr})`,
      meta_ads: {
        totals: metaTotals,
        avgCTR: metaTotals.impressions > 0 ? ((metaTotals.clicks / metaTotals.impressions) * 100).toFixed(2) + "%" : "0%",
        avgCPC: metaTotals.clicks > 0 ? "R$" + (metaTotals.spend / metaTotals.clicks).toFixed(2) : "R$0",
        costPerConversion: metaTotals.conversions > 0 ? "R$" + (metaTotals.spend / metaTotals.conversions).toFixed(2) : "N/A",
        topAds,
        totalAds: dqefAds.length,
      },
      ga4: {
        totals: ga4Totals,
        avgBounceRate: ga4Data?.length ? ((ga4Data.reduce((s, g) => s + (Number(g.bounce_rate) || 0), 0)) / ga4Data.length).toFixed(1) + "%" : "N/A",
        avgConversionRate: ga4Data?.length ? ((ga4Data.reduce((s, g) => s + (Number(g.conversion_rate) || 0), 0)) / ga4Data.length).toFixed(2) + "%" : "N/A",
        topSources,
      },
      google_ads: {
        totals: gadsTotals,
        campaigns: (gadsData || []).slice(0, 10).map((g) => ({
          name: g.campaign_name,
          status: g.campaign_status,
          spend: Number(g.cost) || 0,
          clicks: g.clicks || 0,
          conversions: Number(g.conversions) || 0,
        })),
      },
      operacional: opSummary,
    };

    // Call Claude Opus via OpenRouter
    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openRouterKey) {
      return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um CMO analítico e estrategista de marketing digital da DQEF (Deixa Que Eu Faço), um marketplace que conecta prestadores de serviço (eletricistas, piscineiros, faxineiras, etc.) a clientes no Brasil.

Sua tarefa é analisar os dados cross-channel abaixo e produzir um DIAGNÓSTICO EXECUTIVO com insights acionáveis.

FORMATO DE RESPOSTA (use markdown):

## 🔍 Diagnóstico Geral
(2-3 frases sobre o estado geral da operação de marketing)

## 📊 Performance por Canal

### Meta Ads
- O que está funcionando e o que não
- Anúncios com melhor/pior performance e por quê

### Google Ads
- Análise de campanhas ativas
- Oportunidades de otimização

### GA4 / Tráfego Orgânico
- Fontes de tráfego mais relevantes
- Conversão e bounce rate - o que melhorar

### Operacional
- Status da operação (prestadores, serviços, cidades)

## 🎯 Top 5 Ações Imediatas
(lista numerada de ações específicas e acionáveis com impacto esperado)

## ⚠️ Alertas e Riscos
(pontos de atenção que exigem ação urgente)

## 💡 Oportunidades de Crescimento
(2-3 oportunidades estratégicas baseadas nos dados)

Seja DIRETO, PRÁTICO e BRUTALMENTE HONESTO. Não use eufemismos. Se algo está ruim, diga claramente.`;

    const aiResponse = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://dqef.lovable.app",
        "X-Title": "DQEF Marketing Hub",
      },
      body: JSON.stringify({
        model: "anthropic/claude-opus-4",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Analise os seguintes dados de marketing da DQEF e forneça seu diagnóstico:\n\n${JSON.stringify(dataPackage, null, 2)}`,
          },
        ],
        max_tokens: 4000,
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorBody = await aiResponse.text();
      console.error("OpenRouter error:", aiResponse.status, errorBody);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes no OpenRouter." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: `AI error: ${aiResponse.status}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const diagnosis = aiData.choices?.[0]?.message?.content || "Sem resposta da IA";
    const tokensUsed = aiData.usage || {};

    // Log usage
    try {
      await supabase.from("ai_usage_log").insert({
        user_id: userData.user.id,
        function_name: "analytics-diagnosis",
        task_type: "strategy",
        model_used: "anthropic/claude-opus-4",
        provider: "openrouter",
        tokens_input: tokensUsed.prompt_tokens || 0,
        tokens_output: tokensUsed.completion_tokens || 0,
        cost_estimate: 0,
        latency_ms: Date.now() - (Number(req.headers.get("x-request-start")) || Date.now()),
        success: true,
      });
    } catch (logErr) {
      console.error("Failed to log usage:", logErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        diagnosis,
        dataSnapshot: {
          meta_spend: metaTotals.spend,
          meta_conversions: metaTotals.conversions,
          ga4_sessions: ga4Totals.sessions,
          gads_spend: gadsTotals.spend,
          period: `${days}d`,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("analytics-diagnosis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
