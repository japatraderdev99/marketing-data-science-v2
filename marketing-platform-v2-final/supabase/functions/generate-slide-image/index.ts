import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const IMAGE_MODEL = "google/gemini-3.1-flash-image-preview"; // via OpenRouter
const IMAGEN_URL = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict"; // fallback

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

function extractImageFromContent(content: unknown): string | null {
  if (typeof content === "string") {
    const mdMatch = content.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/);
    if (mdMatch) return mdMatch[1];
    const urlMatch = content.match(/https?:\/\/\S+\.(png|jpg|jpeg|webp)/i);
    if (urlMatch) return urlMatch[0];
    return null;
  }
  if (Array.isArray(content)) {
    for (const part of content) {
      if (part.type === "image_url" && part.image_url?.url) return part.image_url.url;
      if (part.type === "image" && part.source?.data) return `data:image/png;base64,${part.source.data}`;
      if (part.inline_data?.data) return `data:image/png;base64,${part.inline_data.data}`;
    }
  }
  return null;
}

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
      model: IMAGE_MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("OpenRouter image error:", res.status, err);
    return null;
  }

  const data = await res.json();
  return extractImageFromContent(data.choices?.[0]?.message?.content);
}

async function generateWithImagen3(prompt: string, apiKey: string): Promise<string | null> {
  const res = await fetch(`${IMAGEN_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: "4:5", safetyFilterLevel: "BLOCK_ONLY_HIGH", personGeneration: "ALLOW_ADULT" },
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const b64 = data.predictions?.[0]?.bytesBase64Encoded;
  return b64 ? `data:image/png;base64,${b64}` : null;
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

    // Primary: Gemini 3.1 Flash Image via OpenRouter
    let imageDataUrl: string | null = null;
    let modelUsed = IMAGE_MODEL;

    if (openrouterKey) {
      imageDataUrl = await generateWithOpenRouter(styledPrompt, openrouterKey);
    }

    // Fallback: Imagen 3 via Google AI
    if (!imageDataUrl && geminiKey) {
      modelUsed = "imagen-3.0-generate-002";
      imageDataUrl = await generateWithImagen3(styledPrompt, geminiKey);
    }

    if (userId) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      supabase.from("ai_usage_log").insert({
        user_id: userId, function_name: "generate-slide-image", task_type: "image",
        model_used: modelUsed, provider: modelUsed.includes("imagen") ? "google" : "openrouter",
        tokens_input: 0, tokens_output: 0, cost_estimate: 0, latency_ms: 0, success: !!imageDataUrl,
      }).then(({ error }) => { if (error) console.error("Log error:", error); });
    }

    if (!imageDataUrl) {
      return new Response(JSON.stringify({ error: "Não foi possível gerar a imagem. Verifique os logs." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isBase64 = imageDataUrl.startsWith("data:");
    return new Response(JSON.stringify({
      imageDataUrl: isBase64 ? imageDataUrl : null,
      imageUrl: !isBase64 ? imageDataUrl : null,
      imageBase64: isBase64 ? imageDataUrl.replace(/^data:image\/\w+;base64,/, "") : null,
      model: modelUsed, translated: translateFirst,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
