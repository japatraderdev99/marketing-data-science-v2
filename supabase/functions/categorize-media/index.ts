import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, mediaId } = await req.json();
    if (!imageUrl || !mediaId) {
      return new Response(
        JSON.stringify({ error: "imageUrl and mediaId are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!openrouterKey && !geminiKey) {
      return new Response(
        JSON.stringify({ error: "No AI API key configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const systemPrompt = `Você é um sistema de categorização de imagens para uma plataforma marketplace de prestadores de serviço autônomos brasileiros (DQEF).

Analise a imagem e retorne APENAS um JSON válido:

- category: UMA das categorias: prestador, ambiente, problema, interface, mockup, ferramenta, produto, equipe, ação, abstrato, lifestyle, resultado
- subcategory: formato "categoria:detalhe" (ex: prestador:eletricista, ambiente:oficina)
- tags: array de 6-10 tags descritivas em português (inclua subcategoria, contexto, sentimento, uso sugerido)
- description: uma frase em português (max 100 chars)
- dignity_check: boolean - true se mostra profissional/ambiente DIGNO. false se mostra pobreza/estereótipos.

Responda APENAS com JSON válido, sem markdown.`;

    // Primary: OpenRouter (Claude), Fallback: Gemini
    const useOpenRouter = !!openrouterKey;
    const url = useOpenRouter ? OPENROUTER_URL : `${GEMINI_URL}?key=${geminiKey}`;
    const model = useOpenRouter
      ? "anthropic/claude-sonnet-4"
      : "gemini-2.5-flash";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (useOpenRouter) {
      headers["Authorization"] = `Bearer ${openrouterKey}`;
      headers["HTTP-Referer"] = "https://dqef.app";
      headers["X-Title"] = "DQEF Studio";
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: imageUrl } },
              {
                type: "text",
                text: "Categorize esta imagem usando a taxonomia DQEF.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "Erro na IA" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const aiData = await response.json();
    const rawText = aiData.choices?.[0]?.message?.content ?? "";

    let parsed: {
      category: string;
      subcategory?: string;
      tags: string[];
      description: string;
      dignity_check?: boolean;
    };
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
    } catch {
      throw new Error("Failed to parse AI response as JSON");
    }

    const finalTags = parsed.tags || [];
    if (parsed.subcategory && !finalTags.includes(parsed.subcategory)) {
      finalTags.unshift(parsed.subcategory);
    }

    // Update media_library record
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: updateError } = await supabaseAdmin
      .from("media_library")
      .update({
        category: parsed.category,
        tags: finalTags,
        ai_description: parsed.description,
        tagging_status: "done",
      })
      .eq("id", mediaId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        category: parsed.category,
        subcategory: parsed.subcategory,
        tags: finalTags,
        description: parsed.description,
        dignity_check: parsed.dignity_check ?? true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("categorize-media error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
