import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

// Load generative playbook knowledge from database
async function loadImagePlaybook(): Promise<string> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data } = await supabase
      .from("generative_playbooks")
      .select("knowledge_json")
      .eq("playbook_type", "image")
      .limit(1)
      .single();

    if (!data?.knowledge_json) return "";

    const k = data.knowledge_json as Record<string, unknown>;
    const brand = k.dqef_brand_visual as Record<string, string> || {};
    const formula = k.universal_formula || "";
    const elements = k.formula_elements as Record<string, Record<string, string>> || {};
    const rules = k.photorealism_rules as Record<string, string[]> || {};

    return `
PLAYBOOK DE IMAGEM GENERATIVA (conhecimento extraído de pesquisa profunda):

FÓRMULA UNIVERSAL DE PROMPT: ${formula}

ELEMENTOS OBRIGATÓRIOS DO PROMPT:
- CÂMERA: ${elements.camera?.vocabulary || ""}
- SUJEITO DQEF: ${brand.target_audience || ""}. Cor da marca: ${brand.brand_color || ""}. ${brand.must_have || ""}
- AMBIENTE: ${elements.environment?.dqef_contexts ? JSON.stringify((elements.environment as Record<string, unknown>).dqef_contexts) : ""}
- ILUMINAÇÃO: ${elements.lighting?.dqef_default || ""}
- ESTILO: ${elements.style?.dqef_default || ""}

REGRAS DE FOTORREALISMO:
DO: ${(rules.do || []).join(" | ")}
DON'T: ${(rules.dont || []).join(" | ")}

PROIBIDO: ${brand.forbidden || ""}
OBRIGATÓRIO: ${brand.must_have || ""}`;
  } catch (e) {
    console.error("Failed to load image playbook:", e);
    return "";
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { imagePrompt, quality = 'fast' } = await req.json();

    if (!imagePrompt) {
      return new Response(JSON.stringify({ error: 'imagePrompt is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use fast model for preview, high quality for final
    const model = quality === 'high'
      ? 'google/gemini-3-pro-image-preview'
      : 'google/gemini-2.5-flash-image';

    console.log(`Generating image with model: ${model}`);
    console.log(`Prompt: ${imagePrompt.slice(0, 100)}...`);

    // Load playbook knowledge (keep short to not overwhelm image model)
    const playbookKnowledge = await loadImagePlaybook();
    
    // DQEF brand context: autonomous Brazilian service providers (electricians, plumbers, painters, etc.)
    const brandContext = `Brazilian autonomous service provider (prestador de serviço autônomo), aged 30-50, weathered hands, real job site environment (construction, repair, installation). CLOTHING VARIETY IS MANDATORY: randomly vary between plain t-shirts (white, gray, black, green, red, yellow), tank tops, button-up work shirts, coveralls, hi-vis vests, rolled-up sleeves casual shirts — NEVER default to blue polo shirts. Each image must have DIFFERENT clothing. Documentary photography style, natural warm lighting, photorealistic 4K, raw authenticity. ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO LOGOS, NO OVERLAYS in the image. NOT stock photo, NOT corporate, NOT studio. Real Brazilian neighborhoods, homes, workshops. IMPORTANT DIVERSITY RULES: Show diverse workers in PROFESSIONAL, DIGNIFIED settings. NO favelas, NO poverty imagery, NO racial stereotypes. Clean workshops, organized job sites, modern residential areas. Represent competence and professional pride. ${playbookKnowledge ? playbookKnowledge.slice(0, 300) : ''}`;

    // Use system message for guidelines, user message for the actual image request
    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: `Generate this image (DO NOT include ANY text, words, letters, numbers or logos in the image — ONLY visual content): ${imagePrompt}\n\nStyle context: ${brandContext}`,
          },
        ],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit atingido. Aguarde alguns segundos e tente novamente.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos na sua conta Lovable.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errText = await response.text();
      console.error('AI gateway error:', response.status, errText);
      return new Response(JSON.stringify({ error: 'Erro na API de IA. Tente novamente.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = await response.json();
    console.log('AI response structure:', JSON.stringify({
      hasImages: !!aiResponse.choices?.[0]?.message?.images,
      imageCount: aiResponse.choices?.[0]?.message?.images?.length || 0,
      contentLength: aiResponse.choices?.[0]?.message?.content?.length || 0,
      contentPreview: aiResponse.choices?.[0]?.message?.content?.slice(0, 100),
    }));

    // Extract image URL - check multiple possible paths
    const message = aiResponse.choices?.[0]?.message;
    let imageUrl = message?.images?.[0]?.image_url?.url;
    
    // Fallback: check if image is embedded in content as base64
    if (!imageUrl && message?.content) {
      const base64Match = message.content.match(/(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)/);
      if (base64Match) {
        imageUrl = base64Match[1];
      }
    }

    if (!imageUrl) {
      console.error('No image in response. Full message keys:', Object.keys(message || {}));
      console.error('Full response:', JSON.stringify(aiResponse).slice(0, 1000));
      return new Response(JSON.stringify({ error: 'Nenhuma imagem gerada. O modelo retornou apenas texto. Tente um prompt mais curto e direto.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
