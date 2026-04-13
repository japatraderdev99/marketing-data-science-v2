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

const BATCH_PROMPT = `Você é um diretor criativo sênior especialista em variações de criativos para testes A/B em redes sociais.

REGRAS:
- Cada variação deve ter abordagem DIFERENTE (ângulo, tom, gancho)
- Headlines: CAIXA ALTA, 3-7 palavras, máximo impacto
- Subtexto: 1-2 linhas de suporte
- CTA: curto e direto
- Image prompts em inglês, mín 60 palavras, estilo documentário fotográfico
- REGRA FUNDAMENTAL: a cena SEMPRE mostra o profissional TRABALHANDO ou em seu AMBIENTE DE TRABALHO — nunca em lazer, nunca em casa, nunca em bar, nunca sentado na calçada
- OBRIGATÓRIO no imagePrompt: nomear a profissão + mostrar a ação de trabalho + o ambiente profissional (ex: "a Brazilian electrician in her 30s installing a circuit panel in a clean residential apartment", "a Brazilian chef plating food in a professional kitchen")
- Sujeito: autônomo brasileiro, 25-50 anos — VARIAR gênero, fenótipo e profissão entre variações. Atende qualquer autônomo: consultor, designer, advogado, coach, nutricionista, contador, fotógrafo, arquiteto, terapeuta, eletricista, mecânico, cozinheiro, costureira, personal trainer, professor
- Vestimenta: roupas de trabalho adequadas à profissão — um mecânico usa macacão limpo, uma consultora usa roupa social, um chef usa jaleco. NUNCA: regata, chinelo, roupa de lazer
- Ambiente: local de trabalho real — oficina, escritório, cozinha, obra em andamento, estúdio, consultório. NUNCA: bar de bairro, calçada residencial, cadeira de plástico, ambiente de lazer
- Documentário = autêntico e honesto, NÃO = pobreza, NÃO = aspiracional fake. O foco é a dignidade do trabalho.
- Diversificar profissão, gênero, etnia e tipo de ambiente entre as variações

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

    const data = await callOpenRouter(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      { temperature: 0.9, max_tokens: 4096 },
    );

    const rawContent = (data as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content ?? '';
    const result = extractJSON(rawContent);

    // Fire-and-forget usage log
    if (userId) {
      const { createClient } = await import('jsr:@supabase/supabase-js@2');
      const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      sb.from('ai_usage_log').insert({
        user_id: userId, function_name: 'generate-creative-batch', task_type: 'copy',
        model_used: MODEL, provider: 'openrouter', success: true,
      }).then(() => {});
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-creative-batch error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
