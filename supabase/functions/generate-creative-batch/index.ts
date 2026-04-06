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
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return '';
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: docs } = await supabase
      .from("strategy_knowledge")
      .select("extracted_knowledge")
      .eq("user_id", user.id)
      .eq("status", "done")
      .limit(3);
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
    const c = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await c.auth.getUser();
    return user?.id ?? null;
  } catch { return null; }
}

const BATCH_PROMPT = `Você é um diretor criativo sênior especialista em variações de criativos para testes A/B em redes sociais.

REGRAS:
- Cada variação deve ter abordagem DIFERENTE (ângulo, tom, gancho)
- Headlines: CAIXA ALTA, 3-7 palavras, máximo impacto
- Subtexto: 1-2 linhas de suporte
- CTA: curto e direto
- Image prompts em inglês, mín 60 palavras, estilo documentário
- Sujeito: prestador de serviço autônomo brasileiro, 25-50 anos
- PROIBIDO: fotos stock, modelos posando, cenários genéricos de escritório
- Variar composição visual entre variações

JSON:
{
  "briefing_analysis": "análise breve do briefing",
  "variations": [
    {
      "id": "v1",
      "headline": "HEADLINE IMPACTANTE",
      "subtext": "texto de suporte",
      "cta": "SAIBA MAIS",
      "style": "impact-direct|documentary|social-proof|provocation|minimalist",
      "imagePrompt": "detailed english prompt...",
      "suggested_tags": ["tag1", "tag2"]
    }
  ]
}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      briefing = '',
      angle = '',
      channel = 'Instagram Feed',
      niches = [],
      style = 'impact-direct',
      count = 3,
    } = body;

    const [brandContext, userId] = await Promise.all([getStrategyContext(req), getUserId(req)]);

    const systemPrompt = `${BATCH_PROMPT}\n${brandContext ? `\nKNOWLEDGE BASE DA MARCA:\n${brandContext}` : ''}`;
    const userPrompt = `Gere ${count} variações de criativo:
${briefing ? `BRIEFING: ${briefing}` : 'Modo autônomo: escolha o melhor tema'}
${angle ? `ÂNGULO: ${angle}` : ''}
CANAL: ${channel}
${niches.length ? `NICHOS: ${niches.join(', ')}` : ''}
ESTILO BASE: ${style}
Retorne JSON com exatamente ${count} variações.`;

    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY")!;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterKey}`,
        'HTTP-Referer': 'https://dqef.app',
        'X-Title': 'DQEF Studio',
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4.6",
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Erro na IA" }));
      return new Response(JSON.stringify(err), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content ?? '';
    const result = extractJSON(rawContent);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
