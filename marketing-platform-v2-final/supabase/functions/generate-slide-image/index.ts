import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// === MODELOS (ordem de prioridade) ===
// 1. Imagen 4 via Google AI (melhor qualidade fotorrealista)
const IMAGEN4_URL = "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict";
// 2. Gemini 3 Pro Image via Google AI (fallback Google)
const GEMINI3_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent";
// 3. OpenRouter (fallback final)
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "google/gemini-3.1-flash-image-preview";

async function getUserId(req: Request): Promise<string | null> {
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return null;
    const c = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await c.auth.getUser();
    return user?.id ?? null;
  } catch { return null; }
}

async function translatePrompt(imagePrompt: string, userId: string | null): Promise<string> {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-router`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SRK}` },
      body: JSON.stringify({
        task_type: "suggest",
        messages: [
          { role: "system", content: "Translate this image prompt to English. Return ONLY the translated text, nothing else. Preserve visual details and photographic style." },
          { role: "user", content: imagePrompt },
        ],
        options: { temperature: 0.2, max_tokens: 300 },
        user_id: userId,
        function_name: "generate-slide-image",
      }),
    });
    if (!res.ok) return imagePrompt;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || imagePrompt;
  } catch { return imagePrompt; }
}

/** Primary: Imagen 4 via Google AI (:predict, formato Vertex) */
async function generateWithImagen4(prompt: string, apiKey: string): Promise<string | null> {
  const res = await fetch(`${IMAGEN4_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: "1:1" },
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("Imagen4 error:", res.status, err.slice(0, 200));
    return null;
  }
  const data = await res.json();
  const b64 = data.predictions?.[0]?.bytesBase64Encoded;
  const mime = data.predictions?.[0]?.mimeType || "image/png";
  if (!b64) { console.error("Imagen4: no bytesBase64Encoded"); return null; }
  return `data:${mime};base64,${b64}`;
}

/** Fallback 1: Gemini 3 Pro Image via Google AI (:generateContent) */
async function generateWithGemini3Pro(prompt: string, apiKey: string): Promise<string | null> {
  const res = await fetch(`${GEMINI3_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("Gemini3Pro error:", res.status, err.slice(0, 200));
    return null;
  }
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts as Array<{ inlineData?: { data: string; mimeType: string } }> | undefined;
  if (!parts) { console.error("Gemini3Pro: no candidates"); return null; }
  for (const part of parts) {
    if (part.inlineData?.data) return `data:${part.inlineData.mimeType || "image/jpeg"};base64,${part.inlineData.data}`;
  }
  console.error("Gemini3Pro: no inlineData");
  return null;
}

/** Fallback 2: OpenRouter (gemini-3.1-flash-image-preview) */
async function generateWithOpenRouter(prompt: string, apiKey: string): Promise<string | null> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://dqef.app",
      "X-Title": "DQEF Studio",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      stream: false,
      modalities: ["image"],
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("OpenRouter error:", res.status, err.slice(0, 200));
    return null;
  }
  let data: Record<string, unknown>;
  try { data = await res.json(); } catch { return null; }

  const choice = (data.choices as Record<string, unknown>[])?.[0];
  const message = choice?.message as Record<string, unknown> | undefined;

  // OpenRouter retorna imagem em message.images[0].image_url.url
  const images = message?.images as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(images) && images.length > 0) {
    const img = images[0];
    const urlObj = img.image_url as { url?: string } | undefined;
    if (urlObj?.url) return urlObj.url;
    if (typeof img.url === "string") return img.url;
    if (typeof img.b64_json === "string") return `data:image/png;base64,${img.b64_json}`;
  }
  // Fallback: content field
  const content = message?.content;
  if (typeof content === "string" && content.startsWith("data:image/")) return content;
  if (Array.isArray(content)) {
    for (const part of content as Array<Record<string, unknown>>) {
      const imgUrl = (part.image_url as { url?: string } | undefined)?.url;
      if (imgUrl) return imgUrl;
      const inlineData = part.inlineData as { data?: string; mimeType?: string } | undefined;
      if (inlineData?.data) return `data:${inlineData.mimeType || "image/jpeg"};base64,${inlineData.data}`;
    }
  }
  console.error("OpenRouter: no image in response, finish_reason:", choice?.finish_reason);
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imagePrompt, translateFirst = false } = await req.json();
    if (!imagePrompt) {
      return new Response(JSON.stringify({ error: "imagePrompt é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = await getUserId(req);
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");

    if (!geminiKey && !openrouterKey) throw new Error("Nenhuma API key configurada");

    let finalPrompt = imagePrompt;
    if (translateFirst) finalPrompt = await translatePrompt(imagePrompt, userId);
    const styledPrompt = `${finalPrompt}. Documentary photography style, candid and authentic. The person depicted is a well-dressed Brazilian liberal professional (lawyer, consultant, designer, architect, therapist, accountant, coach, nutritionist, or similar knowledge worker) in a proper professional environment (modern office, studio, co-working space, clinic, or atelier). Professional clothing appropriate for an office or studio setting. Natural lighting, photorealistic, high quality. No text, no logos, no watermarks. NOT: electrician, plumber, construction worker, cleaner, maid, delivery worker, manual laborer. NOT: favela, poverty, dirty clothes, stereotyped environments.`;

    let imageDataUrl: string | null = null;
    let modelUsed = "";

    // 1. Imagen 4 (melhor qualidade)
    if (geminiKey) {
      imageDataUrl = await generateWithImagen4(styledPrompt, geminiKey);
      if (imageDataUrl) modelUsed = "imagen-4.0-generate-001";
    }

    // 2. Gemini 3 Pro Image (fallback Google)
    if (!imageDataUrl && geminiKey) {
      imageDataUrl = await generateWithGemini3Pro(styledPrompt, geminiKey);
      if (imageDataUrl) modelUsed = "gemini-3-pro-image-preview";
    }

    // 3. OpenRouter (fallback final)
    if (!imageDataUrl && openrouterKey) {
      imageDataUrl = await generateWithOpenRouter(styledPrompt, openrouterKey);
      if (imageDataUrl) modelUsed = OPENROUTER_MODEL;
    }

    if (userId && modelUsed) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      supabase.from("ai_usage_log").insert({
        user_id: userId, function_name: "generate-slide-image", task_type: "image",
        model_used: modelUsed,
        provider: modelUsed.includes("openrouter") || modelUsed.includes("gemini-3.1") ? "openrouter" : "google",
        tokens_input: 0, tokens_output: 0, cost_estimate: 0, latency_ms: 0, success: true,
      }).then(({ error }) => { if (error) console.error("Log error:", error); });
    }

    if (!imageDataUrl) {
      return new Response(JSON.stringify({ error: "Não foi possível gerar a imagem. Verifique os logs da edge function." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isBase64 = imageDataUrl.startsWith("data:");
    return new Response(JSON.stringify({
      imageDataUrl: isBase64 ? imageDataUrl : null,
      imageUrl: !isBase64 ? imageDataUrl : null,
      imageBase64: isBase64 ? imageDataUrl.replace(/^data:image\/\w+;base64,/, "") : null,
      model: modelUsed,
      translated: translateFirst,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
