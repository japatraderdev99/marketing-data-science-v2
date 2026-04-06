import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRAND_CONTEXT =
  `Brazilian autonomous service provider (prestador de serviço autônomo), aged 30-50, ` +
  `weathered hands, real job site environment (construction, repair, installation, electrical, plumbing). ` +
  `CLOTHING VARIETY IS MANDATORY: randomly vary between plain t-shirts (white, gray, black, green, red, yellow), ` +
  `tank tops, button-up work shirts, coveralls, hi-vis vests, rolled-up sleeves casual shirts — ` +
  `NEVER default to blue polo shirts. Each image must have DIFFERENT clothing. ` +
  `Documentary photography style, natural warm lighting, photorealistic 4K, raw authenticity. ` +
  `ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO LOGOS, NO OVERLAYS in the image. ` +
  `NOT stock photo, NOT corporate, NOT studio. Real Brazilian neighborhoods, homes, workshops. ` +
  `Show diverse workers in PROFESSIONAL, DIGNIFIED settings. NO favelas, NO poverty imagery, NO racial stereotypes. ` +
  `Clean workshops, organized job sites, modern residential areas. Represent competence and professional pride.`;

async function callOpenRouterImage(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<{ imageUrl: string; model: string } | null> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://dqef.app",
      "X-Title": "DQEF Studio",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    console.warn(`OpenRouter ${model} failed (${response.status}): ${errBody.slice(0, 200)}`);
    return null;
  }

  const data = await response.json();
  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? null;
  if (!imageUrl) {
    console.warn(`OpenRouter ${model}: response OK but no image in output`);
    return null;
  }

  return { imageUrl, model };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imagePrompt, quality = "standard" } = await req.json();

    if (!imagePrompt) {
      return new Response(JSON.stringify({ error: "imagePrompt é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fullPrompt =
      `Generate a photorealistic image. NO TEXT, NO WORDS, NO LETTERS anywhere in the image. ` +
      `Scene: ${imagePrompt}. ` +
      `Style: ${BRAND_CONTEXT}`;

    // Models in priority order: HQ uses gemini-3-pro, standard uses gemini-2.5-flash
    const models = quality === "hq"
      ? ["google/gemini-3-pro-image-preview", "google/gemini-2.5-flash-image", "google/gemini-3.1-flash-image-preview"]
      : ["google/gemini-2.5-flash-image", "google/gemini-3.1-flash-image-preview", "google/gemini-3-pro-image-preview"];

    let result: { imageUrl: string; model: string } | null = null;
    for (const model of models) {
      result = await callOpenRouterImage(apiKey, model, fullPrompt);
      if (result) break;
    }

    if (!result) {
      return new Response(
        JSON.stringify({ error: "Todos os modelos de geração de imagem falharam. Verifique créditos no OpenRouter." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const imageBase64 = result.imageUrl.startsWith("data:")
      ? result.imageUrl.split(",")[1] ?? null
      : null;

    return new Response(
      JSON.stringify({
        imageUrl: result.imageUrl,
        imageBase64,
        provider: "openrouter",
        model: result.model,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
