import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getStrategyContext } from "../_shared/strategy.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-sonnet-4-6";

const FORMAT_SPECS: Record<string, { dims: string; copyRules: string; imgComp: string }> = {
  "ig-feed":     { dims: "1080×1080 (1:1)",   copyRules: "Headline 4-6 PALAVRAS em caixa alta. Subtext 1-2 linhas curtas. CTA ativo.",                            imgComp: "square composition, subject centered, balanced framing" },
  "ig-stories":  { dims: "1080×1920 (9:16)",  copyRules: "Headline MÁXIMO 4 PALAVRAS em caixa alta. Texto mínimo. Impacto visual extremo. CTA direto.",            imgComp: "vertical 9:16 composition, close-up or full-body centered vertically" },
  "fb-stories":  { dims: "1080×1920 (9:16)",  copyRules: "Headline MÁXIMO 4 PALAVRAS. Visual dominante. CTA de ação imediata.",                                    imgComp: "vertical 9:16 composition, subject centered" },
  "fb-feed":     { dims: "1080×1350 (4:5)",   copyRules: "Headline 5-7 palavras. Subtext até 2 linhas. Benefício claro em destaque.",                             imgComp: "portrait 4:5 composition, subject upper-center" },
  "linkedin":    { dims: "1200×628 (1.91:1)", copyRules: "Tom profissional. Dado ou resultado concreto no headline. Subtext consultivo. CTA de autoridade.",       imgComp: "landscape 1.91:1, professional environment, wide shot" },
  "pinterest":   { dims: "1000×1500 (2:3)",   copyRules: "Título informativo e descritivo. Visual aspiracional. CTA de descoberta.",                              imgComp: "tall portrait 2:3, aspirational composition, detailed environment" },
  "twitter":     { dims: "1200×675 (16:9)",   copyRules: "Tom conversacional e direto. Headline como afirmação direta. CTA simples.",                             imgComp: "landscape 16:9, wide environmental or contextual shot" },
  "gdn-rect":    { dims: "300×250",           copyRules: "Headline MÁXIMO 4 PALAVRAS. Subtext MÁXIMO 8 palavras. CTA 1-2 palavras. Extremamente direto.",          imgComp: "tight close-up, simple clean background, single strong subject" },
  "gdn-lead":    { dims: "728×90",            copyRules: "Headline MÁXIMO 3 PALAVRAS. Subtext MÁXIMO 5 palavras. CTA 1 palavra. Ultra-conciso.",                   imgComp: "horizontal banner crop, face or icon only, minimal background" },
};

function extractJSON(raw: string): Record<string, unknown> {
  let s = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try { return JSON.parse(s); } catch { /* */ }
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a !== -1 && b > a) try { return JSON.parse(s.substring(a, b + 1)); } catch { /* */ }
  throw new Error(`JSON inválido (${raw.length} chars)`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { briefing = "", format = "ig-feed", angle = "", objective = "", persona = "", userId } = body;

    const brandContext = await getStrategyContext(req, userId);
    const spec = FORMAT_SPECS[format] ?? FORMAT_SPECS["ig-feed"];

    const SYSTEM = `Você é um diretor criativo de performance marketing, especialista em anúncios paid.
Crie copy cirúrgica e prompts de imagem impactantes e relacionados ao texto gerado.${brandContext ? `\n\nKNOWLEDGE BASE DA MARCA:\n${brandContext}` : ""}`;

    const USER = `Gere UM anúncio completo e otimizado para:
FORMATO: ${spec.dims}
REGRAS DE COPY: ${spec.copyRules}
${angle ? `ÂNGULO EMOCIONAL: ${angle}` : ""}
${objective ? `OBJETIVO: ${objective}` : ""}
${persona ? `PERSONA ALVO: ${persona}` : ""}
${briefing ? `BRIEFING: ${briefing}` : "Modo autônomo: escolha o melhor ângulo para conversão máxima."}

COMPOSIÇÃO DE IMAGEM obrigatória: ${spec.imgComp}
A imagem deve ser DIRETAMENTE RELACIONADA ao headline e subtexto gerados — não genérica.
Profissional liberal autônomo brasileiro, sem estereótipos. Estilo documentário, luz natural.

Retorne APENAS JSON:
{
  "headline": "HEADLINE EM CAIXA ALTA",
  "headlineHighlight": "PALAVRA PARA DESTACAR",
  "subtext": "subtexto de suporte complementar",
  "cta": "AÇÃO CURTA",
  "caption": "caption completo para redes sociais com emojis e hashtags relevantes",
  "hashtags": ["tag1","tag2","tag3"],
  "imagePrompt": "detailed english image prompt 70+ words directly related to the ad copy, ${spec.imgComp}, documentary style, natural light, authentic professional, no text no logos",
  "layout": "text-only|text-photo-split|full-image|cta-clean",
  "bgStyle": "dark|orange",
  "copyRationale": "nota estratégica breve de por que esse ângulo converte"
}`;

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) throw new Error("OPENROUTER_API_KEY não configurada");

    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://dqef.app",
        "X-Title": "DQEF Studio",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: USER }],
        temperature: 0.85,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
    const aiData = await res.json();
    const content = (aiData as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content ?? "";
    const result = extractJSON(content);

    const slide = {
      number: 1,
      type: "hook",
      layout: result.layout ?? "text-photo-split",
      bgStyle: result.bgStyle ?? "dark",
      headline: result.headline ?? "",
      headlineHighlight: result.headlineHighlight ?? "",
      subtext: result.subtext ?? "",
      cta: result.cta ?? "",
      caption: result.caption ?? "",
      hashtags: result.hashtags ?? [],
      imagePrompt: result.imagePrompt ?? null,
      copyRationale: result.copyRationale ?? "",
      needsMedia: true,
      logic: result.copyRationale ?? "",
      visualDirection: result.imagePrompt ?? "",
    };

    return jsonResponse({ success: true, slide, format });
  } catch (e) {
    console.error("generate-single-ad:", e);
    return errorResponse(e instanceof Error ? e.message : "Erro interno");
  }
});
