import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { slideHeadline, slideSubtext, slideImagePrompt, slideType, userId, headline, subtext, imagePrompt, angle } = await req.json();

    const effectiveUserId = userId;
    if (!effectiveUserId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch all categorized media
    const { data: mediaItems, error: dbError } = await supabaseAdmin
      .from("media_library")
      .select("id, url, filename, category, tags, description")
      .eq("user_id", effectiveUserId)
      .not("category", "is", null)
      .limit(50);

    if (dbError) throw dbError;
    const items = mediaItems ?? [];

    if (items.length === 0) {
      return new Response(JSON.stringify({ suggestions: [], stereotype_filtered: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use both old and new field names for compatibility
    const h = headline || slideHeadline || "";
    const st = subtext || slideSubtext || "";
    const ip = imagePrompt || slideImagePrompt || "";
    const ang = angle || slideType || "";

    const slideContext = [
      h && `HEADLINE: "${h}"`,
      st && `SUBTEXTO: "${st}"`,
      ip && `DIREÇÃO VISUAL: "${ip}"`,
      ang && `ÂNGULO/TIPO: "${ang}"`,
    ].filter(Boolean).join("\n");

    const candidatesText = items.map((img, i) =>
      `${i + 1}. ID: ${img.id} | Categoria: ${img.category} | Tags: ${(img.tags ?? []).join(", ")} | Descrição: ${img.description ?? "sem descrição"}`
    ).join("\n");

    const prompt = `Você é um diretor de arte que seleciona imagens de arquivo para peças de marketing de prestadores de serviço autônomos brasileiros.

CONTEXTO DA PEÇA:
${slideContext}

IMAGENS DISPONÍVEIS:
${candidatesText}

INSTRUÇÕES:
1. Ranqueie as imagens por relevância visual e semântica com a peça
2. Use as sub-categorias nas tags (ex: "prestador:eletricista") para matching preciso com o tema da headline
3. FILTRO ANTI-ESTEREÓTIPO OBRIGATÓRIO: REJEITE qualquer imagem que mostre:
   - Pobreza, favelas, degradação urbana
   - Estereótipos raciais ou sociais negativos
   - Ambientes precários ou inseguros
   - Associações com marginalização
4. Score de 1 a 10 (10 = match perfeito)

Retorne APENAS um JSON válido:
{"rankings": [{"id": "<uuid>", "score": <1-10>, "reason": "<uma frase em pt-BR>"}, ...], "stereotype_filtered": <número de imagens rejeitadas pelo filtro>}

Inclua apenas as top 5 imagens com maior score. Sem explicações adicionais.`;

    const aiResponse = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Aguarde." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errData = await aiResponse.json().catch(() => ({ error: "AI error" }));
      return new Response(JSON.stringify(errData), {
        status: aiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const rawText = aiData.choices?.[0]?.message?.content ?? "";

    let rankings: Array<{ id: string; score: number; reason: string }> = [];
    let stereotypeFiltered = 0;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
      rankings = parsed.rankings ?? [];
      stereotypeFiltered = parsed.stereotype_filtered ?? 0;
    } catch {
      rankings = items.slice(0, 4).map((img, i) => ({ id: img.id, score: 8 - i, reason: "Sugestão automática" }));
    }

    const sorted = rankings
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(r => {
        const item = items.find(img => img.id === r.id);
        return item ? { ...item, score: r.score, reason: r.reason } : null;
      })
      .filter(Boolean);

    return new Response(JSON.stringify({ suggestions: sorted, stereotype_filtered: stereotypeFiltered }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-media error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
