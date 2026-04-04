import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function extractJSON(raw: string): Record<string, unknown> {
  let cleaned = raw.trim().replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
  try { return JSON.parse(cleaned); } catch { /* continue */ }
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch { /* continue */ } }
  throw new Error('JSON não encontrado na resposta da IA');
}

async function getStrategyContext(req: Request): Promise<string> {
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return '';
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return '';
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: docs } = await supabase.from("strategy_knowledge").select("extracted_knowledge").eq("user_id", user.id).eq("status", "done").limit(3);
    if (!docs?.length) return '';
    return docs.map((d: { extracted_knowledge: Record<string, unknown> | null }) => {
      const k = d.extracted_knowledge; if (!k) return "";
      const parts: string[] = [];
      if (k.brandName) parts.push(`MARCA: ${k.brandName}`);
      if (k.brandEssence) parts.push(`ESSÊNCIA: ${k.brandEssence}`);
      if (k.positioning) parts.push(`POSICIONAMENTO: ${k.positioning}`);
      if (k.toneOfVoice) parts.push(`TOM: ${JSON.stringify(k.toneOfVoice)}`);
      return parts.join("\n");
    }).filter(Boolean).join("\n---\n");
  } catch { return ''; }
}

async function getUserId(req: Request): Promise<string | null> {
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return null;
    const c = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await c.auth.getUser();
    return user?.id ?? null;
  } catch { return null; }
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
    const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-router`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SRK}` },
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
