import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl, mediaId } = await req.json();

    if (!imageUrl || !mediaId) {
      return new Response(JSON.stringify({ error: "imageUrl and mediaId are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!OPENROUTER_API_KEY && !LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "No AI API key configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um sistema de categorização de imagens para uma plataforma marketplace de prestadores de serviço autônomos brasileiros (DQEF - Dá Quem Faz). A plataforma conecta profissionais de diversas áreas a clientes que precisam de seus serviços — como um hub/linkedin de quem presta serviços.

Analise a imagem e retorne APENAS um JSON válido com estes campos:

- category: UMA das categorias primárias abaixo:
  prestador, ambiente, problema, interface, mockup, ferramenta, produto, equipe, ação, abstrato, lifestyle, resultado

- subcategory: sub-categoria específica usando o formato "categoria:detalhe". Exemplos:
  - prestador:eletricista, prestador:encanador, prestador:pintor, prestador:pedreiro, prestador:marceneiro, prestador:mecanico, prestador:jardineiro, prestador:cuidador, prestador:cozinheiro, prestador:costureira, prestador:fotografo, prestador:personal_trainer, prestador:manicure, prestador:barbeiro, prestador:dog_walker, prestador:faxineira, prestador:montador_moveis, prestador:tecnico_ar, prestador:tecnico_celular, prestador:tecnico_informatica, prestador:motorista, prestador:dedetizador, prestador:vidraceiro, prestador:serralheiro, prestador:gesseiro, prestador:marmorista, prestador:aulas_particulares, prestador:musico, prestador:dj, prestador:freelancer_generico, prestador:celular, prestador:generico
  - ambiente:cozinha, ambiente:sala, ambiente:oficina, ambiente:banheiro, ambiente:garagem, ambiente:jardim, ambiente:salao, ambiente:studio, ambiente:escritorio, ambiente:comercial, ambiente:externo, ambiente:veiculo, ambiente:residencial
  - problema:pia_pingando, problema:chuveiro_quebrado, problema:fiacao_exposta, problema:infiltracao, problema:entupimento, problema:ar_quebrado, problema:tela_quebrada, problema:movel_danificado
  - interface:tela_inicial, interface:crm, interface:agenda, interface:chat, interface:dashboard
  - mockup:celular, mockup:notebook, mockup:tablet
  - ferramenta:chave, ferramenta:furadeira, ferramenta:multimetro, ferramenta:tesoura, ferramenta:maquina_costura, ferramenta:camera
  - produto:material_eletrico, produto:material_hidraulico, produto:tinta, produto:cosmético, produto:alimento
  - resultado:antes_depois, resultado:obra_pronta, resultado:cliente_satisfeito
  - lifestyle:profissional_feliz, lifestyle:equipe, lifestyle:ferramentas_organizadas

- tags: array de 6-10 tags descritivas em português. Deve incluir:
  1. A subcategoria (ex: "prestador:barbeiro")
  2. O contexto profissional (ex: "residencial", "comercial", "externo")
  3. Tags semânticas descritivas: sorriso, luz_natural, mãos_trabalhando, uniforme_limpo, ferramenta_na_mão, cliente_presente, ambiente_organizado, concentrado, resultado_visível, antes_depois, equipamento_profissional
  4. Tag de sentimento: positivo, neutro, profissional, inspirador
  5. Tag de uso sugerido: capa_perfil, feed_post, anuncio, carrossel, stories

- description: uma frase em português descrevendo a imagem (max 100 chars)

- dignity_check: boolean - true se a imagem mostra o profissional/ambiente de forma DIGNA e PROFISSIONAL. false se mostra pobreza, favelas, degradação, estereótipos raciais/sociais negativos.

REGRAS DE DIGNIDADE:
- APROVADO: oficinas organizadas, residências em reforma, áreas externas limpas, profissionais competentes, salões bem cuidados, estúdios organizados
- REPROVADO: favelas, ruas degradadas, ambientes precários, estereótipos depreciativos

Responda APENAS com JSON válido, sem markdown, sem explicação.`;

    // Primary: Claude Sonnet 4 via OpenRouter for precise categorization
    // Fallback: Gemini 2.5 Flash via Lovable AI
    const useOpenRouter = !!OPENROUTER_API_KEY;
    const url = useOpenRouter ? OPENROUTER_URL : LOVABLE_AI_URL;
    const apiKey = useOpenRouter ? OPENROUTER_API_KEY : LOVABLE_API_KEY;
    const model = useOpenRouter ? "anthropic/claude-sonnet-4" : "google/gemini-2.5-flash";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(useOpenRouter ? {
          "HTTP-Referer": "https://dqef.lovable.app",
          "X-Title": "DQEF Marketing Hub",
        } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: imageUrl } },
              { type: "text", text: "Categorize esta imagem com precisão usando a taxonomia expandida DQEF para o hub de profissionais." },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Aguarde e tente novamente." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Erro na IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const rawText = aiData.choices?.[0]?.message?.content ?? "";

    let parsed: { category: string; subcategory?: string; tags: string[]; description: string; dignity_check?: boolean };
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
    } catch {
      throw new Error("Failed to parse AI response as JSON");
    }

    // Prepend subcategory to tags if present
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
        description: parsed.description,
      })
      .eq("id", mediaId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({
      category: parsed.category,
      subcategory: parsed.subcategory,
      tags: finalTags,
      description: parsed.description,
      dignity_check: parsed.dignity_check ?? true,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("categorize-media error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
