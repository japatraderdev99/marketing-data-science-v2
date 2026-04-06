import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BRAND_CONTEXT =
  `Brazilian autonomous service provider (prestador de serviço autônomo), aged 30-50, ` +
  `weathered hands, real job site environment. Documentary photography style, natural warm lighting, ` +
  `photorealistic 4K, raw authenticity. CLOTHING VARIETY: randomly vary between plain t-shirts ` +
  `(white, gray, black, green, red, yellow), tank tops, work shirts, coveralls, hi-vis vests — ` +
  `NEVER default to blue polo. ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO LOGOS in the image. ` +
  `NOT stock photo, NOT corporate. Real Brazilian neighborhoods, homes, workshops. ` +
  `NO favelas, NO poverty imagery, NO racial stereotypes. Competence and professional pride.`;

interface ImageResult {
  imageUrl: string | null;
  imageBase64: string | null;
  provider: string;
  model: string;
}

// ── Provider 1: Gemini Direct API (native image generation) ────────────────
async function tryGeminiDirect(
  prompt: string,
  apiKey: string,
  quality: string,
): Promise<ImageResult | null> {
  // Current GA models that support image generation (April 2026)
  const models =
    quality === "high"
      ? ["gemini-2.5-flash-image", "gemini-3.1-flash-image-preview"]
      : ["gemini-2.5-flash-image"];

  const imgPrompt =
    `Generate this image (ONLY visual content, NO text/words/letters): ${prompt}. Style: ${BRAND_CONTEXT}`;

  for (const model of models) {
    try {
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: imgPrompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.warn(
          `Gemini ${model} failed (${res.status}): ${errBody.slice(0, 300)}`,
        );
        continue;
      }

      const data = await res.json();
      for (const candidate of data.candidates || []) {
        for (const part of candidate.content?.parts || []) {
          if (part.inlineData?.data) {
            const mime = part.inlineData.mimeType || "image/png";
            console.log(
              `Gemini ${model}: image OK (${mime}, ${part.inlineData.data.length} chars)`,
            );
            return {
              imageUrl: `data:${mime};base64,${part.inlineData.data}`,
              imageBase64: part.inlineData.data,
              provider: "gemini-direct",
              model,
            };
          }
        }
      }

      const parts = data.candidates?.[0]?.content?.parts || [];
      const partTypes = parts.map((p: Record<string, unknown>) =>
        Object.keys(p).join(",")
      );
      console.warn(`Gemini ${model}: no image. Parts: [${partTypes}]`);
    } catch (e) {
      console.warn(`Gemini ${model} error:`, e);
    }
  }
  return null;
}

// ── Provider 2: OpenRouter (Gemini image models) ───────────────────────────
async function tryOpenRouter(
  prompt: string,
  apiKey: string,
  quality: string,
): Promise<ImageResult | null> {
  const models =
    quality === "high"
      ? [
        "google/gemini-2.5-flash-image",
        "google/gemini-3.1-flash-image-preview",
      ]
      : ["google/gemini-2.5-flash-image"];

  for (const model of models) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://dqef.app",
          "X-Title": "DQEF Studio",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content:
                `Generate this image (NO text/words/letters in image): ${prompt}\n\nStyle: ${BRAND_CONTEXT}`,
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.warn(
          `OpenRouter ${model} failed (${res.status}): ${errBody.slice(0, 300)}`,
        );
        continue;
      }

      const data = await res.json();
      const msg = data.choices?.[0]?.message;

      // Format 1: message.images[] array
      if (msg?.images?.[0]?.image_url?.url) {
        console.log(`OpenRouter ${model}: image via images[] array`);
        return {
          imageUrl: msg.images[0].image_url.url,
          imageBase64: null,
          provider: "openrouter",
          model,
        };
      }

      // Format 2: multipart content array
      if (Array.isArray(msg?.content)) {
        for (const part of msg.content) {
          if (part.type === "image_url" && part.image_url?.url) {
            return {
              imageUrl: part.image_url.url,
              imageBase64: null,
              provider: "openrouter",
              model,
            };
          }
        }
      }

      // Format 3: base64 in text
      if (typeof msg?.content === "string") {
        const b64Match = msg.content.match(
          /(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)/,
        );
        if (b64Match) {
          return {
            imageUrl: b64Match[1],
            imageBase64: null,
            provider: "openrouter",
            model,
          };
        }
      }

      console.warn(`OpenRouter ${model}: no image found in response`);
    } catch (e) {
      console.warn(`OpenRouter ${model} error:`, e);
    }
  }
  return null;
}

// ── Provider 3: Together AI FLUX ───────────────────────────────────────────
async function tryTogetherAI(
  prompt: string,
  apiKey: string,
): Promise<ImageResult | null> {
  const models = [
    "black-forest-labs/FLUX.1-schnell-Free",
    "black-forest-labs/FLUX.1-schnell",
  ];

  for (const model of models) {
    try {
      const res = await fetch(
        "https://api.together.xyz/v1/images/generations",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            prompt:
              `${prompt}. Style: documentary photography, Brazilian service provider, photorealistic, natural lighting, NO text or words in image`,
            width: 1024,
            height: 1024,
            n: 1,
            response_format: "base64",
          }),
        },
      );

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.warn(
          `Together ${model} failed (${res.status}): ${errBody.slice(0, 200)}`,
        );
        continue;
      }

      const data = await res.json();
      const b64 = data.data?.[0]?.b64_json;
      if (b64) {
        return {
          imageUrl: `data:image/png;base64,${b64}`,
          imageBase64: b64,
          provider: "together",
          model,
        };
      }
      const url = data.data?.[0]?.url;
      if (url) {
        return { imageUrl: url, imageBase64: null, provider: "together", model };
      }
      console.warn(`Together ${model}: no image in response`);
    } catch (e) {
      console.warn(`Together ${model} error:`, e);
    }
  }
  return null;
}

// ── Main handler ───────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imagePrompt, quality = "standard" } = await req.json();
    if (!imagePrompt) {
      return new Response(
        JSON.stringify({ error: "imagePrompt é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    const togetherKey = Deno.env.get("TOGETHER_API_KEY");

    if (!geminiKey && !openrouterKey && !togetherKey) {
      return new Response(
        JSON.stringify({ error: "Nenhuma API key configurada." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `Image gen: quality=${quality} keys: gemini=${!!geminiKey} openrouter=${!!openrouterKey} together=${!!togetherKey}`,
    );

    let result: ImageResult | null = null;
    const errors: string[] = [];

    // Gemini Direct first (fastest, cheapest)
    if (geminiKey && !result) {
      result = await tryGeminiDirect(imagePrompt, geminiKey, quality);
      if (!result) errors.push("Gemini: sem imagem");
    }

    // OpenRouter second (Gemini via proxy)
    if (openrouterKey && !result) {
      result = await tryOpenRouter(imagePrompt, openrouterKey, quality);
      if (!result) errors.push("OpenRouter: sem imagem");
    }

    // Together AI last (FLUX, different style)
    if (togetherKey && !result) {
      result = await tryTogetherAI(imagePrompt, togetherKey);
      if (!result) errors.push("Together: sem imagem");
    }

    if (!result) {
      console.error("All providers failed:", errors.join("; "));
      return new Response(
        JSON.stringify({
          error: "Nenhum provedor conseguiu gerar a imagem.",
          details: errors,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`Image OK via ${result.provider}/${result.model}`);

    // Log usage async (fire-and-forget)
    try {
      const auth = req.headers.get("Authorization");
      if (auth) {
        const c = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: auth } } },
        );
        const {
          data: { user },
        } = await c.auth.getUser();
        if (user?.id) {
          const admin = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          );
          admin
            .from("ai_usage_log")
            .insert({
              user_id: user.id,
              function_name: "generate-slide-image",
              task_type: "image",
              model_used: result.model,
              provider: result.provider,
              tokens_input: 0,
              tokens_output: 0,
              cost_estimate: 0,
              latency_ms: 0,
              success: true,
            })
            .then(({ error }) => {
              if (error) console.error("Log error:", error);
            });
        }
      }
    } catch {
      /* logging is best-effort */
    }

    return new Response(
      JSON.stringify({
        imageUrl: result.imageUrl,
        imageBase64: result.imageBase64,
        provider: result.provider,
        model: result.model,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("generate-slide-image error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro interno",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
