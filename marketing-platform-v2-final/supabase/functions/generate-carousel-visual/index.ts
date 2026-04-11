import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { getStrategyContext, getUserId } from '../_shared/strategy.ts';

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-sonnet-4-6";

function extractJSON(raw: string): Record<string, unknown> {
  const cleaned = raw.trim().replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
  try { return JSON.parse(cleaned); } catch { /* continue */ }
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch { /* continue */ } }
  throw new Error('JSON não encontrado na resposta da IA');
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

const VISUAL_RULES = `
IDENTIDADE VISUAL OBRIGATÓRIA:
- Fundo: #E8603C (laranja coral) — bgStyle sempre 'dark'
- Texto: #FFFFFF
- Fonte: Montserrat 900, UPPERCASE
- Watermark "DQEF" discreto canto inferior direito
- EXATAMENTE 5 slides

COPY:
- Headlines 3-7 palavras, CAIXA ALTA
- Máx 2-3 linhas por slide
- Zero jargão corporativo
- Números reais quando disponíveis
- PROIBIDO mencionar cidades/estados

SLOGAN NO CTA: último slide deve ter "pronto. resolvido." no subtext.

TIPOS DE SLIDE:
- hook: TEXTO puro, impacto máximo. layout: 'text-only'
- setup: Texto + foto real. layout: 'text-photo-split'
- data: Número GIGANTE. layout: 'number-dominant'
- contrast/validation: Headline contrastante. layout: 'text-only'
- cta: Ação + link na bio. layout: 'cta-clean'

IMAGE PROMPTS (em inglês, mín 80 palavras):
- Sujeito: profissional liberal autônomo brasileiro, 30-50 anos — diverso em área (consultor, designer, advogado, coach, nutricionista, contador, fotógrafo, arquiteto, terapeuta). NÃO restringir a trabalhos braçais
- Vestimenta e ambiente condizentes com a profissão (home office, estúdio, escritório compartilhado, clínica, ateliê — não apenas ambientes de obra)
- Variar roupas e perfil profissional entre slides (NUNCA polo azul genérico, roupas de trabalho sujas)
- Estilo: documentary truth, raw authenticity, natural light
- PROIBIDO: estereótipos raciais ou socioeconômicos, ambientes de pobreza, roupas sujas, cenários de favela, modelos posando artificialmente, cenários de estúdio

JSON EXATO:
{
  "title": "TÍTULO",
  "angle": "ORGULHO|DINHEIRO|URGÊNCIA|RAIVA|ALÍVIO",
  "angleEmoji": "emoji",
  "angleRationale": "razão estratégica",
  "targetProfile": "perfil-alvo",
  "channel": "canal",
  "viralLogic": "por que vai viralizar",
  "designNotes": "notas de design",
  "bestTime": "melhor horário",
  "caption": "caption com emojis e hashtags",
  "slides": [{ "number": 1, "type": "hook", "headline": "TEXTO", "headlineHighlight": "PALAVRA", "subtext": "suporte", "logic": "raciocínio", "visualDirection": "direção visual", "needsMedia": false, "mediaType": null, "imagePrompt": null, "bgStyle": "dark", "layout": "text-only" }]
}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { context = '', angle = '', persona = '', channel = '', tone = '' } = body;
    const [brandContext, userId] = await Promise.all([getStrategyContext(req), getUserId(req)]);

    const systemPrompt = `Você é o estrategista criativo especialista em carrosséis virais para Instagram.\n${brandContext ? `KNOWLEDGE BASE DA MARCA:\n${brandContext}\n` : ''}${VISUAL_RULES}`;
    const isAutonomous = !context && !angle && !persona;
    const userPrompt = isAutonomous
      ? `Modo autônomo: analise o contexto da marca, escolha o melhor ângulo para conversão agora, gere EXATAMENTE 5 slides.`
      : `Gere carrossel com EXATAMENTE 5 slides:\n${context ? `CONTEXTO: ${context}` : ''}\n${angle ? `ÂNGULO: ${angle}` : ''}\n${persona ? `PERSONA: ${persona}` : ''}\n${channel ? `CANAL: ${channel}` : ''}\n${tone ? `TOM: ${tone}` : ''}\nRetorne o JSON completo.`;

    const data = await callOpenRouter(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      { temperature: 0.85, max_tokens: 4096 },
    );

    const rawContent = (data as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content ?? '';
    const carousel = extractJSON(rawContent);

    // Fire-and-forget usage log
    if (userId) {
      const { createClient } = await import('jsr:@supabase/supabase-js@2');
      const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      sb.from('ai_usage_log').insert({
        user_id: userId, function_name: 'generate-carousel-visual', task_type: 'copy',
        model_used: MODEL, provider: 'openrouter', success: true,
      }).then(() => {});
    }

    return new Response(JSON.stringify({ carousel, autonomous: isAutonomous }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-carousel-visual error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
