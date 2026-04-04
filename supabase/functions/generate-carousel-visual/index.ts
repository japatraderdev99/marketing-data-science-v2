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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return '';
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return '';
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: docs } = await supabase.from("strategy_knowledge").select("extracted_knowledge").eq("user_id", user.id).eq("status", "done").limit(3);
    if (!docs?.length) return '';
    return docs.map((d: { extracted_knowledge: Record<string, unknown> | null }) => {
      const k = d.extracted_knowledge;
      if (!k) return "";
      const parts: string[] = [];
      if (k.brandName) parts.push(`MARCA: ${k.brandName}`);
      if (k.brandEssence) parts.push(`ESSÊNCIA: ${k.brandEssence}`);
      if (k.positioning) parts.push(`POSICIONAMENTO: ${k.positioning}`);
      if (k.toneOfVoice) parts.push(`TOM: ${JSON.stringify(k.toneOfVoice)}`);
      if (k.promptContext) parts.push(`CONTEXTO: ${k.promptContext}`);
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
- Sujeito: prestador de serviço autônomo brasileiro, 30-50 anos, mãos calejadas
- Variar roupas entre slides (NUNCA polo azul padrão)
- Estilo: documentary truth, raw authenticity, natural light
- PROIBIDO: modelos jovens, ambientes corporativos, cenários de estúdio

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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-router`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SRK}` },
      body: JSON.stringify({ task_type: "copy", messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], options: { temperature: 0.85 }, user_id: userId, function_name: "generate-carousel-visual" }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Erro na IA" }));
      return new Response(JSON.stringify(err), { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content ?? '';
    const carousel = extractJSON(rawContent);

    return new Response(JSON.stringify({ carousel, autonomous: isAutonomous }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
