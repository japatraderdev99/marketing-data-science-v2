import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { getStrategyContext, getUserId } from '../_shared/strategy.ts';

function extractJSON(raw: string): Record<string, unknown> {
  let cleaned = raw.trim().replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
  try { return JSON.parse(cleaned); } catch { /* continue */ }
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch { /* continue */ } }
  throw new Error('JSON não encontrado na resposta da IA');
}

const NARRATIVE_RULES = `
ESTRATEGISTA DE CONTEÚDO NARRATIVO — Carrosséis editoriais 7-10 slides.
Storytelling profundo que gera SAVE e SHARE.

ESTRUTURA: HOOK → CONTEXTO → TENSÃO/DADOS → VIRADA → PROVA → CTA

COPY: Headlines BOLD caixa alta (máx 8 palavras) + parágrafos com **negrito**.
Dados com fonte verificável "(Fonte, Ano)". Se sem fonte real, marcar "~estimativa".

LAYOUTS: full-image | split | text-heavy | quote | cta
TEMAS: editorial-dark (#0F0F0F) | editorial-cream (#F5F0E8) | brand-bold (#E8603C)

IMAGE PROMPTS em inglês, mín 60 palavras, cinematográficos, conectados ao copy.
PROIBIDO: imagens genéricas, modelos posando, fotos stock.

JSON:
{
  "title": "string", "theme": "editorial-dark|editorial-cream|brand-bold",
  "narrative_arc": "string", "target_connection": "string",
  "shareability_hook": "string", "caption": "string", "bestTime": "string",
  "slides": [{ "number": 1, "type": "hook", "layout": "full-image",
    "headline": "HEADLINE", "bodyText": "texto com **bold**",
    "sourceLabel": "fonte", "imagePrompt": "prompt em inglês",
    "imageSide": "full", "bgColor": "#hex", "textColor": "#hex", "accentColor": "#hex" }]
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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const INTERNAL_SECRET = Deno.env.get("INTERNAL_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-router`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${INTERNAL_SECRET}` },
      body: JSON.stringify({ task_type: "strategy", messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], options: { temperature: 0.9 }, user_id: userId, function_name: "generate-narrative-carousel" }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Erro na IA" }));
      return new Response(JSON.stringify(err), { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content ?? '';
    const carousel = extractJSON(content);

    return new Response(JSON.stringify({ carousel, autonomous: !topic }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
