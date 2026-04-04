import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um diretor criativo sênior de marketing digital. O usuário vai enviar materiais de referência que podem incluir:
- Texto livre (ideias, copies, prompts, conceitos)
- Imagens (screenshots, referências visuais, posts de concorrentes)
- PDFs (documentos estratégicos, briefings, apresentações)
- HTML/URLs (páginas web, landing pages, anúncios)

Sua tarefa é analisar TODO o input (texto + arquivos visuais/documentos) e gerar de 3 a 6 sugestões criativas CONCRETAS e ACIONÁVEIS. Cada sugestão deve ser de um tipo diferente quando possível.

Ao analisar IMAGENS: extraia cores, composição, estilo, tom, copy visível, formato e use como referência criativa.
Ao analisar PDFs/DOCUMENTOS: extraia dados-chave, insights, métricas e argumentos para fundamentar as sugestões.
Ao analisar URLs/HTML: analise a estrutura, copy, CTAs, design patterns e tom de comunicação.

TIPOS de sugestão permitidos:
- "carousel" — Carrossel para Instagram/LinkedIn
- "post" — Post estático (imagem única)
- "video" — Vídeo curto (Reels/TikTok/Shorts)
- "copy" — Copy para legenda ou anúncio
- "reels" — Reels específico com roteiro

IMPORTANTE: Para cada sugestão do tipo "post", inclua um array "channel_formats" com TODAS as variações de canal/formato possíveis. Use estas dimensões exatas:

FORMATOS POR CANAL:
- Instagram Feed 4:5 → 1080x1350
- Instagram Feed 1:1 → 1080x1080
- Instagram Stories 9:16 → 1080x1920
- Facebook Feed 1:1 → 1080x1080
- Facebook Stories 9:16 → 1080x1920
- TikTok 9:16 → 1080x1920
- TikTok 1:1 → 1080x1080
- LinkedIn Feed 1:1 → 1200x1200
- LinkedIn Landscape 1.91:1 → 1200x628
- YouTube Thumbnail 16:9 → 1280x720
- YouTube Shorts 9:16 → 1080x1920
- Google Display Medium Rectangle → 300x250
- Google Display Leaderboard → 728x90
- Google Display Half Page → 300x600
- Google Display Responsive 1.91:1 → 1200x628
- Pinterest Pin 2:3 → 1000x1500
- X/Twitter 16:9 → 1200x675

Para CADA sugestão, retorne:
- suggestion_type: um dos tipos acima
- title: título curto e impactante (max 60 chars)
- description: descrição do conceito criativo (2-3 frases)
- copy_text: copy pronta para uso (se aplicável), ou null
- visual_direction: direção visual/estética (1-2 frases)
- channel: canal principal (Instagram, TikTok, LinkedIn, YouTube, Facebook, Google Display, Pinterest, X)
- format: formato específico (ex: "Post 4:5", "Reels 9:16", "Carrossel 5 lâminas")
- ai_reasoning: por que esta ideia tem potencial (1 frase)
- channel_formats: array de objetos com { channel: string, format_label: string, width: number, height: number, ratio: string, adapted_copy: string }. Adapte a copy para cada canal (tom e comprimento). Inclua de 3 a 6 canais relevantes. APENAS para suggestion_type "post".

Responda APENAS com um JSON válido no formato:
{ "suggestions": [ { ... }, { ... } ] }

Não inclua markdown, apenas JSON puro.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { input_text, input_type = "mixed", user_id, files = [], urls = [] } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!input_text && files.length === 0 && urls.length === 0) {
      return new Response(
        JSON.stringify({ error: "Provide input_text, files, or urls" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Build multimodal message content array for Claude Sonnet 4 (vision-capable)
    const userContent: any[] = [];

    // Add text context
    const textParts: string[] = [];
    if (input_text) textParts.push(input_text);
    if (urls.length > 0) textParts.push(`\n\nURLs de referência:\n${urls.join("\n")}`);
    
    if (textParts.length > 0) {
      userContent.push({
        type: "text",
        text: `TIPO DE INPUT: ${input_type}\n\nMATERIAL:\n${textParts.join("\n")}`,
      });
    }

    // Add file attachments as base64 images or text
    for (const file of files) {
      if (file.type === "image") {
        // Image: send as base64 for vision analysis
        userContent.push({
          type: "image_url",
          image_url: {
            url: file.data.startsWith("data:") ? file.data : `data:${file.mime};base64,${file.data}`,
          },
        });
        userContent.push({
          type: "text",
          text: `[Arquivo de imagem: ${file.name}]`,
        });
      } else if (file.type === "pdf") {
        // PDF: send extracted text or as base64 image of pages
        if (file.extracted_text) {
          userContent.push({
            type: "text",
            text: `[Documento PDF: ${file.name}]\n\nConteúdo extraído:\n${file.extracted_text}`,
          });
        }
        // Also include page images if available
        if (file.page_images && file.page_images.length > 0) {
          for (const pageImg of file.page_images.slice(0, 5)) {
            userContent.push({
              type: "image_url",
              image_url: { url: pageImg },
            });
          }
        }
      } else if (file.type === "html") {
        userContent.push({
          type: "text",
          text: `[Conteúdo HTML: ${file.name}]\n\n${file.data}`,
        });
      } else {
        // Generic text-based file
        userContent.push({
          type: "text",
          text: `[Arquivo: ${file.name}]\n\n${file.data}`,
        });
      }
    }

    // If no content parts were added, add a fallback
    if (userContent.length === 0) {
      userContent.push({ type: "text", text: "Analise o material fornecido e gere sugestões criativas." });
    }

    // Use "analyze" task_type which routes to Claude Sonnet 4 (vision-capable via OpenRouter)
    const aiResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-router`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        task_type: "analyze",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        user_id,
        function_name: "analyze-creative-input",
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI router error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit atingido. Aguarde alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: `AI error: ${aiResponse.status}` }),
        { status: aiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let suggestions;
    try {
      const cleaned = content.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      suggestions = parsed.suggestions || parsed;
    } catch (parseErr) {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI suggestions", raw: content }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save suggestions to database
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const inputSummary = [input_text, ...urls].filter(Boolean).join(" | ").slice(0, 500);

    const rows = suggestions.map((s: any) => ({
      user_id,
      input_text: inputSummary || files.map((f: any) => f.name).join(", "),
      input_type,
      suggestion_type: s.suggestion_type || "post",
      title: s.title || "Sem título",
      description: s.description || null,
      copy_text: s.copy_text || null,
      visual_direction: s.visual_direction || null,
      channel: s.channel || null,
      format: s.format || null,
      ai_reasoning: s.ai_reasoning || null,
      metadata: s.channel_formats ? { channel_formats: s.channel_formats } : {},
      status: "pending",
    }));

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("creative_suggestions")
      .insert(rows)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save suggestions", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ suggestions: inserted, _meta: aiData._meta }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyze-creative-input error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
