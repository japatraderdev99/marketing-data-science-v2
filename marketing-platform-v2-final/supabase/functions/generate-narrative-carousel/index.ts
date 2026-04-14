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
- Dados reais: cite "(Fonte, Ano)" em sourceLabel | sem fonte verificada: omita o sourceLabel completamente — NUNCA escreva "~estimativa", "estimativa", "projeção" ou termos vagos
- Nunca use jargão corporativo — fale como par para par, brasileiro autônomo
- ESCAPE corretamente todos os caracteres especiais no JSON

LAYOUTS (escolha o mais impactante por slide):
- full-image: hero image full-bleed, copy embaixo — use em hook e pivot
- split: imagem em 50%, texto em 50% — use em evidência e proof
- text-heavy: texto com borda esquerda laranja, sem imagem — use em contexto e dados
- quote: citação centralizada em itálico — use em insight ou prova social
- clean-card: headline ENORME em cor accent, body abaixo, imagem como card inset — use em CTA ou número impactante
- cta: centrado com pill "pronto. resolvido." — slide final

IMAGE PROMPTS: inglês, mín 80 palavras, fotografia editorial brasileira quente e autêntica.
Color grading obrigatório: âmbar/dourado quente. NÃO stock photo americano, NÃO escritório corporativo.
Dois modos — escolha o mais impactante por slide:
MODO A (DOCUMENTAL): cena real brasileira — apartamento com vista de prédios residenciais pela janela, oficina ou comércio de bairro, rua de paralelepípedo ao entardecer dourado, interior com luz natural quente. Sujeito em ação real, composição candidata.
MODO B (RETRATO EDITORIAL): sujeito de frente segurando ferramenta da profissão, fundo texturizado neutro quente (taupe, reboco antigo, papel kraft), luz difusa quente, leve borda envelhecida estilo fotografia antiga.

PERSONAGEM — escolha UMA profissão por slide (varie entre slides):
consultant, graphic designer, lawyer, executive coach, nutritionist, accountant, photographer, architect, therapist, physician, engineer, university professor, marketing manager, financial analyst, dentist, veterinarian, psychologist, physiotherapist, audiovisual producer, real estate agent.

MAPEAMENTO PROFISSÃO → CENÁRIO BRASILEIRO (use exatamente):
- consultant / coach / analyst → home office in a Brazilian apartment, organized desk near window with view of city buildings, warm afternoon light, laptop and notebook, camiseta casual
- designer / photographer / producer → home studio or apartment workspace, camera gear or drawing tablet, natural window light, casual clothing
- architect / engineer → desk with blueprints and scale models, apartment home office or simple studio, natural light, casual work attire
- lawyer / accountant → simple neighborhood office or home office desk, law books or papers, casual professional clothing, warm lamp light
- therapist / psychologist / physician / dentist → simple welcoming consultation room, warm neutral walls, comfortable chairs, diffused natural light, professional white coat
- nutritionist / physiotherapist → simple clean clinic room or home studio, profession tools on table, natural light, white coat
- professor → home office with bookshelves, or simple classroom with natural light, books and notes, casual attire

TOKENS ABSOLUTAMENTE PROIBIDOS no imagePrompt:
"calloused hands", "worn table", "kitchen table", "humble", "modest home", "simple tiles",
"worn-out", "shanty", "stained walls", "poverty", "favela", "cracked walls", "plastic chair",
"worker" (use the specific profession instead), "laborer", "handyman",
"glass walls", "modern meeting room", "open plan office", "co-working space",
"corporate headquarters", "business casual", "minimalist white desk", "neon coworking".

Câmera: Canon R5 35mm f/2.8 ou estética iPhone 15 Pro, luz natural quente. SEM TEXTO, SEM LOGOS.

JSON:
{
  "title": "string", "theme": "editorial-dark|editorial-cream|brand-bold",
  "narrative_arc": "string", "target_connection": "string",
  "shareability_hook": "string",
  "caption": "Legenda Instagram estratégica: gancho emocional → insight → menção DQEF Studio → CTA contextual + hashtags",
  "bestTime": "string",
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
      ? `Crie carrossel narrativo:\nTEMA: ${topic}\nÂNGULO: ${audience_angle || 'mais relevante'}\nTOM: ${tone}\nCANAL: ${channel}\nSLIDES: ${Math.min(Math.max(num_slides, 7), 10)}\n${researchData ? `DADOS:\n${researchData}` : 'Use apenas dados que você conhece com certeza; omita sourceLabel quando não tiver fonte real.'}\n\nCAMPO caption: escreva uma legenda de Instagram com 3-4 parágrafos estratégicos: (1) gancho emocional ligado ao tema, (2) desenvolvimento do insight principal, (3) menção natural à plataforma DQEF Studio como ferramenta que resolve o problema de criar conteúdo profissional sem equipe, (4) CTA contextual ao tema — pode ser pergunta, convite a comentar, ou ação concreta. Tom: editorial, direto, sem hashtags corporativas. Inclua 5-8 hashtags relevantes no final.\n\nRetorne JSON.`
      : `Modo autônomo: escolha tema trending para empreendedores autônomos brasileiros, crie ${num_slides} slides narrativos. Use apenas dados verificáveis; omita sourceLabel se não tiver fonte real.\n\nCampo caption: legenda estratégica conforme instruções acima.`;

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
