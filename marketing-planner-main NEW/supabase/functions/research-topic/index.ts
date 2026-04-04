import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, audience, locale = 'pt-BR' } = await req.json();

    if (!topic) {
      return new Response(
        JSON.stringify({ success: false, error: 'Topic is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!apiKey) {
      console.error('PERPLEXITY_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Perplexity não configurado. Conecte nas configurações.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const audienceContext = audience ? `O público-alvo é: ${audience}.` : '';

    const searchQuery = `Dados estatísticos e pesquisas verificáveis sobre "${topic}" no Brasil e no mundo. ${audienceContext} Buscar dados de fontes como IBGE, SEBRAE, FGV, Datafolha, McKinsey, Deloitte, Pew Research, Harvard Business Review, Statista. Incluir ano da pesquisa e link quando possível.`;

    console.log('Perplexity structured research query:', searchQuery);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: `Você é um pesquisador de dados de mercado. Retorne APENAS dados verificáveis com fontes reais em formato JSON estruturado.

REGRAS ESTRITAS:
- Cada fato deve ser uma estatística ou dado CONCRETO e VERIFICÁVEL
- Inclua a fonte EXATA (nome completo da instituição/empresa que publicou)
- Inclua o ANO exato da publicação
- Inclua o LINK da fonte quando disponível (URL real e funcional)
- Inclua o país de origem do dado
- NÃO invente dados. Se não encontrar dados específicos, retorne um array vazio.
- Foque em dados relevantes para marketing e criação de conteúdo.
- Mínimo 5, máximo 15 fatos.`
          },
          {
            role: 'user',
            content: searchQuery
          }
        ],
        temperature: 0.1,
        max_tokens: 3000,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'research_facts',
            schema: {
              type: 'object',
              properties: {
                facts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      claim: { type: 'string', description: 'A estatística ou dado exato, em português' },
                      source: { type: 'string', description: 'Nome completo da instituição/empresa que publicou' },
                      year: { type: 'number', description: 'Ano da publicação do dado' },
                      url: { type: 'string', description: 'URL da fonte original, ou string vazia se indisponível' },
                      country: { type: 'string', description: 'País de origem do dado (ex: Brasil, EUA, Global)' }
                    },
                    required: ['claim', 'source', 'year', 'url', 'country'],
                    additionalProperties: false
                  }
                }
              },
              required: ['facts'],
              additionalProperties: false
            }
          }
        },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errText = await response.text();
      console.error('Perplexity API error:', status, errText);

      if (status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit do Perplexity. Aguarde alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Créditos insuficientes no Perplexity.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: `Erro Perplexity: ${status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    // Parse structured facts
    let facts: Array<{ claim: string; source: string; year: number; url: string; country: string }> = [];
    try {
      const parsed = JSON.parse(rawContent);
      facts = Array.isArray(parsed.facts) ? parsed.facts : [];
    } catch (e) {
      console.warn('Failed to parse structured output, falling back to raw:', e);
      // Fallback: return raw content as a single unstructured block
      return new Response(
        JSON.stringify({
          success: true,
          facts: [],
          research: rawContent,
          citations,
          model: data.model,
          structured: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Perplexity structured research successful:', facts.length, 'facts, citations:', citations.length);

    // Build legacy research text for backward compatibility
    const researchText = facts.map((f, i) => 
      `[FACT-${i + 1}] ${f.claim} (${f.source}, ${f.year}${f.country !== 'Brasil' ? ` — ${f.country}` : ''})`
    ).join('\n\n');

    return new Response(
      JSON.stringify({
        success: true,
        facts,
        research: researchText,
        citations,
        model: data.model,
        structured: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Research error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
