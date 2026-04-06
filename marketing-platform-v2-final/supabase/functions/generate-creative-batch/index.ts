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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const INTERNAL_SECRET = Deno.env.get("INTERNAL_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-router`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${INTERNAL_SECRET}` },
      body: JSON.stringify({
        task_type: "copy",
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        options: { temperature: 0.9 },
        user_id: userId,
        function_name: "generate-creative-batch",
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
