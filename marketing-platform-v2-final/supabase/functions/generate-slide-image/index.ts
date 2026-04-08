import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Primary: Gemini 3.1 Flash Image Preview via OpenRouter chat/completions
// Note: modalities:["image"] is REQUIRED — without it the model returns text, not image data
// The image is returned in message.images[0].image_url.url (NOT in message.content)
const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const IMAGE_MODEL = "google/gemini-3.1-flash-image-preview";

// Fallback: Gemini image generation via Google AI Studio
const GEMINI_IMAGE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent";

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
    const INTERNAL_SECRET = Deno.env.get("INTERNAL_SECRET") || SUPABASE_SRK;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-router`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${INTERNAL_SECRET}` },
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

async function generateWithOpenRouter(prompt: string, apiKey: string): Promise<string | null> {
  const res = await fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://dqef.app",
      "X-Title": "DQEF Studio",
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      stream: false,
      modalities: ["image"],
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("OpenRouter error:", res.status, err.slice(0, 300));
    return null;
  }

  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch (e) {
    console.error("OpenRouter JSON parse error:", e);
    return null;
  }

  const choice = (data.choices as Record<string, unknown>[])?.[0];
  const message = choice?.message as Record<string, unknown> | undefined;

  // OpenRouter returns Gemini image in message.images[0].image_url.url
  const images = message?.images as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(images) && images.length > 0) {
    const img = images[0];
    const imageUrlObj = img.image_url as { url?: string } | undefined;
    if (imageUrlObj?.url) return imageUrlObj.url;
    if (typeof img.url === "string") return img.url;
    if (typeof img.b64_json === "string") return `data:image/png;base64,${img.b64_json}`;
  }

  // Fallback: check content field (older response format)
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

// Fallback: Gemini image generation via Google AI Studio
async function generateWithGemini(prompt: string, apiKey: string): Promise<string | null> {
  const res = await fetch(`${GEMINI_IMAGE_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("Gemini error:", res.status, err.slice(0, 300));
    return null;
  }
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts as Array<{ inlineData?: { data: string; mimeType: string } }> | undefined;
  if (!parts) { console.error("Gemini: no candidates"); return null; }
  for (const part of parts) {
    if (part.inlineData?.data) {
      return `data:${part.inlineData.mimeType || "image/jpeg"};base64,${part.inlineData.data}`;
    }
  }
  console.error("Gemini: no inlineData in parts");
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
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    if (!openrouterKey && !geminiKey) throw new Error("Nenhuma API key configurada");

    let finalPrompt = imagePrompt;
    if (translateFirst) finalPrompt = await translatePrompt(imagePrompt, userId);

    const styledPrompt = `${finalPrompt}. Documentary photography, authentic Brazilian work environment, natural lighting, candid, photorealistic, high quality`;

    let imageDataUrl: string | null = null;
    let modelUsed = IMAGE_MODEL;

    if (openrouterKey) {
      imageDataUrl = await generateWithOpenRouter(styledPrompt, openrouterKey);
    }

    if (!imageDataUrl && geminiKey) {
      modelUsed = "gemini-2.0-flash-exp-image-generation";
      imageDataUrl = await generateWithGemini(styledPrompt, geminiKey);
    }

    if (userId) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      supabase.from("ai_usage_log").insert({
        user_id: userId, function_name: "generate-slide-image", task_type: "image",
        model_used: modelUsed, provider: modelUsed.includes("gemini") ? "google" : "openrouter",
        tokens_input: 0, tokens_output: 0, cost_estimate: 0, latency_ms: 0, success: !!imageDataUrl,
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
