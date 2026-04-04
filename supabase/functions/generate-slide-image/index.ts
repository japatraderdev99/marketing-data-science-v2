import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Nano Banana Pro (Gemini 3 Pro Image Preview) via OpenRouter
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const IMAGE_MODEL = "google/gemini-3-pro-image-preview";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imagePrompt, quality = "standard", translateFirst = false } = await req.json();
    if (!imagePrompt) {
      return new Response(JSON.stringify({ error: "imagePrompt é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = await getUserId(req);
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) throw new Error("OPENROUTER_API_KEY não configurada");

    // If prompt is in PT-BR and translateFirst is true, translate via ai-router first
    let finalPrompt = imagePrompt;
    if (translateFirst) {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const translateRes = await fetch(`${SUPABASE_URL}/functions/v1/ai-router`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SRK}` },
        body: JSON.stringify({
          task_type: "suggest",
          messages: [
            { role: "system", content: "Traduza o prompt de imagem abaixo para inglês. Retorne APENAS o texto traduzido, nada mais. Mantenha detalhes visuais e estilo fotográfico." },
            { role: "user", content: imagePrompt },
          ],
          options: { temperature: 0.3, max_tokens: 500 },
          user_id: userId,
          function_name: "generate-slide-image",
        }),
      });
      if (translateRes.ok) {
        const translateData = await translateRes.json();
        finalPrompt = translateData.choices?.[0]?.message?.content?.trim() || imagePrompt;
      }
    }

    // Generate image with Nano Banana Pro via OpenRouter
    const isHQ = quality === "hq";
    const systemMsg = `You are an expert image generator. Generate a single photorealistic image based on the prompt below.
Style: documentary truth, raw authenticity, Brazilian service provider context.
Quality: ${isHQ ? "ultra high quality, 4K, maximum detail" : "high quality, clean composition"}.
IMPORTANT: Generate the image directly. Do not describe it — produce the visual.`;

    const response = await fetch(OPENROUTER_URL, {
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
          { role: "system", content: systemMsg },
          { role: "user", content: finalPrompt },
        ],
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return new Response(JSON.stringify({ error: `Erro ao gerar imagem: ${response.status}`, detail: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    // Log usage
    if (userId) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      supabase.from("ai_usage_log").insert({
        user_id: userId,
        function_name: "generate-slide-image",
        task_type: "image",
        model_used: IMAGE_MODEL,
        provider: "openrouter",
        tokens_input: data.usage?.prompt_tokens || 0,
        tokens_output: data.usage?.completion_tokens || 0,
        cost_estimate: 0,
        latency_ms: 0,
        success: true,
      }).then(({ error }) => { if (error) console.error("Log error:", error); });
    }

    // Extract image from response — Nano Banana Pro returns inline image data
    const content = data.choices?.[0]?.message?.content;
    let imageUrl: string | null = null;
    let imageBase64: string | null = null;

    if (typeof content === "string") {
      // Check for markdown image syntax
      const mdMatch = content.match(/!\[.*?\]\((.*?)\)/);
      if (mdMatch) imageUrl = mdMatch[1];
    } else if (Array.isArray(content)) {
      // Multipart content — look for image_url type
      for (const part of content) {
        if (part.type === "image_url") {
          imageUrl = part.image_url?.url;
        } else if (part.type === "image" && part.source?.data) {
          imageBase64 = part.source.data;
        }
      }
    }

    // Also check for inline_data in the raw response (Gemini native format)
    if (!imageUrl && !imageBase64 && data.choices?.[0]?.message?.content) {
      const parts = data.choices[0].message.content;
      if (Array.isArray(parts)) {
        for (const p of parts) {
          if (p.inline_data?.data) {
            imageBase64 = p.inline_data.data;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ imageUrl, imageBase64, model: IMAGE_MODEL, translated: translateFirst }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
