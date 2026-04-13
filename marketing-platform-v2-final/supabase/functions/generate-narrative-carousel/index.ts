import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { getStrategyContext, getUserId } from '../_shared/strategy.ts';

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-sonnet-4-6";

function extractJSON(raw: string): Record<string, unknown> {
  // Strip markdown code fences from start and end only
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  }
  cleaned = cleaned.trim();

  // Direct parse
  try { return JSON.parse(cleaned); } catch { /* continue */ }

  // Find outermost { ... }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(cleaned.substring(start, end + 1)); } catch { /* continue */ }
  }

  const preview = raw.substring(0, 300).replace(/\n/g, '\\n');
  throw new Error(`JSON inválido (${raw.length} chars). Preview: "${preview}"`);
}

async function callOpenRouter(
  messages: Array<{ role: string; content: string }>,
  options: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
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
    body: JSON.stringify({ model: MODEL, messages, ...options }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  return res.json();
}

const NARRATIVE_RULES = `
ESTRATEGISTA DE CONTEÚDO NARRATIVO — Carrosséis editoriais 7-10 slides.
Storytelling profundo que gera SAVE e SHARE.

ESTRUTURA NARRATIVA: HOOK → CONTEXTO → TENSÃO/DADOS → VIRADA → PROVA → INSIGHT → CTA
Cada slide deve avançar a narrativa. Nunca repita ângulos. Crie tensão crescente até o CTA.

COPY RULES:
- Headlines: CAIXA ALTA, máx 8 palavras, impactantes e diretos
- bodyText: 2-4 frases densas, use **negrito** para dados e destaques
- Dados reais: "(Fonte, Ano)" | sem fonte real: "~estimativa"
- Nunca use jargão corporativo — fale como par para par, brasileiro autônomo
- ESCAPE corretamente todos os caracteres especiais no JSON

LAYOUTS (escolha o mais impactante por slide):
- full-image: hero image full-bleed, copy embaixo — use em hook e pivot
- split: imagem em 50%, texto em 50% — use em evidência e proof
- text-heavy: texto com borda esquerda laranja, sem imagem — use em contexto e dados
- quote: citação centralizada em itálico — use em insight ou prova social
- clean-card: headline ENORME em cor accent, body abaixo, imagem como card inset — use em CTA ou número impactante
- cta: centrado com pill "pronto. resolvido." — slide final

IMAGE PROMPTS: inglês, mín 80 palavras, fotojornalismo documental profissional.

PERSONAGEM — escolha UMA profissão por slide (varie entre slides):
consultant, graphic designer, lawyer, executive coach, nutritionist, accountant, photographer, architect, therapist, physician, engineer, university professor, marketing manager, financial analyst, dentist, veterinarian, psychologist, physiotherapist, audiovisual producer, real estate agent.

MAPEAMENTO PROFISSÃO → CENÁRIO (use exatamente):
- consultant / coach / analyst → modern meeting room, laptop open, business casual attire, glass walls
- designer / photographer / producer → creative studio, iMac or camera gear, clean workspace
- architect / engineer → drafting table with blueprints, scale model, bright office
- lawyer / accountant → professional office, legal books or spreadsheets on screen, formal attire
- therapist / psychologist / physician / dentist → well-lit clinic or consultation room, professional coat
- nutritionist / physiotherapist → clean clinical space or gym, white coat or athletic professional wear
- professor → university classroom or library, books, projector light

TOKENS ABSOLUTAMENTE PROIBIDOS no imagePrompt:
"calloused hands", "worn table", "kitchen table", "humble", "modest home", "simple tiles",
"worn-out", "shanty", "stained walls", "poverty", "favela", "cracked walls", "plastic chair",
"worker" (use the specific profession instead), "laborer", "handyman".

Câmera: Canon R5, 35mm f/2.8, luz natural ou difusa de janela. SEM TEXTO, SEM LOGOS.

JSON:
{
  "title": "string", "theme": "editorial-dark|editorial-cream|brand-bold",
  "narrative_arc": "string", "target_connection": "string",
  "shareability_hook": "string", "caption": "string", "bestTime": "string",
  "slides": [{
    "number": 1, "type": "hook", "layout": "full-image",
    "headline": "HEADLINE EM CAIXA ALTA",
    "bodyText": "Texto com **destaques** em negrito.",
    "sourceLabel": "IBGE, 2024",
    "imagePrompt": "Documentary photography prompt in English, 60+ words...",
    "imageSide": "full"
  }]
}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { topic = '', audience_angle = '', tone = 'editorial', channel = 'Instagram Feed', num_slides = 10, researchData = '' } = body;
    const [brandContext, userId] = await Promise.all([getStrategyContext(req), getUserId(req)]);

    const systemPrompt = `${NARRATIVE_RULES}\n${brandContext ? `KNOWLEDGE BASE:\n${brandContext}` : ''}`;
    const userPrompt = topic
      ? `Crie carrossel narrativo:\nTEMA: ${topic}\nÂNGULO: ${audience_angle || 'mais relevante'}\nTOM: ${tone}\nCANAL: ${channel}\nSLIDES: ${Math.min(Math.max(num_slides, 7), 10)}\n${researchData ? `DADOS:\n${researchData}` : 'Marque dados como ~estimativa.'}\nRetorne JSON.`
      : `Modo autônomo: escolha tema trending, crie ${num_slides} slides narrativos. Marque dados como ~estimativa.`;

    const data = await callOpenRouter(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      { temperature: 0.9, max_tokens: 8192, response_format: { type: "json_object" } },
    );

    const content = (data as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content ?? '';
    console.log('RAW_CONTENT_LENGTH:', content.length);
    console.log('RAW_CONTENT_PREVIEW:', content.substring(0, 500));
    console.log('RAW_CONTENT_END:', content.substring(content.length - 200));

    if (!content) {
      // OpenRouter returned an error structure
      console.error('NO_CONTENT, full data:', JSON.stringify(data).substring(0, 1000));
      throw new Error(`OpenRouter sem conteúdo: ${JSON.stringify(data).substring(0, 300)}`);
    }

    const carousel = extractJSON(content);

    // Fire-and-forget usage log
    if (userId) {
      const { createClient } = await import('jsr:@supabase/supabase-js@2');
      const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      sb.from('ai_usage_log').insert({
        user_id: userId, function_name: 'generate-narrative-carousel', task_type: 'strategy',
        model_used: MODEL, provider: 'openrouter', success: true,
      }).then(() => {});
    }

    return new Response(JSON.stringify({ carousel, autonomous: !topic }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro interno';
    console.error('generate-narrative-carousel error:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
