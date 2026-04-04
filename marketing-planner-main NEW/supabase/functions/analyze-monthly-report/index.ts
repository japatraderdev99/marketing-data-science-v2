import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-sonnet-4";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: authError } = await supabaseAnon.auth.getUser();
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { fileUrl, fileName, reportMonth } = await req.json();
    if (!fileUrl || !fileName || !reportMonth) {
      return new Response(JSON.stringify({ error: "fileUrl, fileName, reportMonth required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download PDF
    const pdfResponse = await fetch(fileUrl);
    if (!pdfResponse.ok) {
      return new Response(JSON.stringify({ error: "Failed to download PDF" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const pdfBytes = await pdfResponse.arrayBuffer();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Claude with PDF as base64 document
    const systemPrompt = `Você é um analista de marketing sênior da DQEF. Analise este relatório mensal do CMO e extraia dados estruturados.

IMPORTANTE: Retorne sua resposta em DOIS blocos separados:

BLOCO 1 - JSON ESTRUTURADO (entre tags <json> e </json>):
<json>
{
  "kpis": {
    "investimento_total": 0,
    "leads_gerados": 0,
    "cpl": 0,
    "conversoes": 0,
    "roas": 0,
    "impressoes": 0,
    "cliques": 0,
    "ctr": 0,
    "cpc": 0,
    "receita": 0,
    "novos_clientes": 0,
    "ticket_medio": 0,
    "custo_aquisicao": 0
  },
  "canais": [
    {"nome": "canal", "investimento": 0, "leads": 0, "conversoes": 0, "roas": 0}
  ],
  "top_campanhas": [
    {"nome": "campanha", "investimento": 0, "resultado": "descrição", "score": 0}
  ],
  "alertas": ["alerta 1", "alerta 2"],
  "recomendacoes": ["recomendação 1", "recomendação 2"]
}
</json>

BLOCO 2 - ANÁLISE MARKDOWN COMPLETA:
Forneça uma análise estratégica detalhada em markdown com:
## Resumo Executivo
## Performance por Canal
## Top Campanhas
## Insights Estratégicos
## Alertas e Riscos
## Recomendações para Próximo Mês

Use dados reais do relatório. Se algum KPI não estiver disponível, use 0. Seja preciso e factual.`;

    const aiResponse = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://dqef.lovable.app",
        "X-Title": "DQEF Marketing Hub",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: pdfBase64,
                },
              },
              {
                type: "text",
                text: `Analise este relatório mensal de marketing referente ao mês ${reportMonth}. Extraia todos os KPIs, insights e recomendações conforme o formato solicitado.`,
              },
            ],
          },
        ],
        max_tokens: 8000,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errText = await aiResponse.text();
      console.error(`AI error: ${status}`, errText);

      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Aguarde alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes no OpenRouter." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: `AI error: ${status}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const fullText = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON block
    let extractedData: Record<string, unknown> = {};
    const jsonMatch = fullText.match(/<json>([\s\S]*?)<\/json>/);
    if (jsonMatch) {
      try {
        extractedData = JSON.parse(jsonMatch[1].trim());
      } catch {
        console.error("Failed to parse extracted JSON");
      }
    }

    // Get markdown (everything outside <json> tags)
    const aiAnalysis = fullText
      .replace(/<json>[\s\S]*?<\/json>/g, "")
      .trim();

    // Persist to DB
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: report, error: insertError } = await supabaseAdmin
      .from("monthly_reports")
      .insert({
        user_id: userId,
        report_month: reportMonth,
        file_url: fileUrl,
        file_name: fileName,
        extracted_data: extractedData,
        ai_analysis: aiAnalysis,
        model_used: MODEL,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save report" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log usage
    const tokensIn = aiData.usage?.prompt_tokens || 0;
    const tokensOut = aiData.usage?.completion_tokens || 0;
    supabaseAdmin
      .from("ai_usage_log")
      .insert({
        user_id: userId,
        function_name: "analyze-monthly-report",
        task_type: "analyze",
        model_used: MODEL,
        provider: "openrouter",
        tokens_input: tokensIn,
        tokens_output: tokensOut,
        cost_estimate: (tokensIn * 3 + tokensOut * 15) / 1_000_000,
        latency_ms: 0,
        success: true,
      })
      .then(({ error }) => {
        if (error) console.error("Usage log error:", error);
      });

    return new Response(
      JSON.stringify({
        success: true,
        report,
        extracted_data: extractedData,
        ai_analysis: aiAnalysis,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyze-monthly-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
