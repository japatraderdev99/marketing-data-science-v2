import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ResearchFact {
  claim: string;
  source: string;
  year: number;
  url: string;
  country: string;
}

interface SlideToVerify {
  number: number;
  headline: string;
  bodyText?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slides, facts }: { slides: SlideToVerify[]; facts: ResearchFact[] } = await req.json();

    if (!slides?.length || !facts?.length) {
      return new Response(
        JSON.stringify({
          success: true,
          verification: slides?.map((s: SlideToVerify) => ({
            slideNumber: s.number,
            status: 'no-data',
            claims: [],
          })) || [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the verification prompt
    const factsRef = facts.map((f, i) =>
      `[FACT-${i + 1}] "${f.claim}" — ${f.source}, ${f.year}`
    ).join('\n');

    const slidesText = slides.map(s => {
      const text = [s.headline, s.bodyText].filter(Boolean).join(' | ');
      return `SLIDE ${s.number}: ${text}`;
    }).join('\n\n');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a fact-checking assistant. You receive RESEARCH FACTS (verified data) and SLIDES (generated content). Your job is to cross-reference every claim/statistic in each slide against the research facts.

For each slide, extract every data claim or statistic mentioned and classify it:
- "verified": The claim matches a research fact closely (same number, same source, same meaning)
- "modified": The claim is based on a research fact but numbers or attribution were changed
- "ungrounded": The claim contains data/statistics not found in any research fact

IMPORTANT:
- Slides without data claims (purely narrative/emotional) should have an empty claims array
- Be strict: if a number is changed even slightly (73% vs 78%), it's "modified"
- If a source is misattributed, it's "modified"
- If a statistic appears that has NO corresponding research fact at all, it's "ungrounded"`
          },
          {
            role: 'user',
            content: `RESEARCH FACTS:\n${factsRef}\n\n---\n\nSLIDES TO VERIFY:\n${slidesText}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'submit_verification',
              description: 'Submit the verification results for all slides',
              parameters: {
                type: 'object',
                properties: {
                  slides: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        slideNumber: { type: 'number' },
                        claims: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              text: { type: 'string', description: 'The claim text from the slide' },
                              status: { type: 'string', enum: ['verified', 'modified', 'ungrounded'] },
                              matchedFactIndex: { type: 'number', description: 'Index of matched FACT (1-based), or 0 if ungrounded' },
                              note: { type: 'string', description: 'Brief explanation of the verification result' }
                            },
                            required: ['text', 'status', 'matchedFactIndex', 'note'],
                            additionalProperties: false
                          }
                        }
                      },
                      required: ['slideNumber', 'claims'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['slides'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'submit_verification' } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errText = await response.text();
      console.error('Verification AI error:', status, errText);

      if (status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit. Tente novamente em instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Créditos insuficientes.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: `Verification error: ${status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error('No tool call in verification response');
      return new Response(
        JSON.stringify({ success: false, error: 'Verificação não retornou dados estruturados.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verification = JSON.parse(toolCall.function.arguments);

    // Compute per-slide status
    const enriched = verification.slides.map((s: any) => {
      const hasUngrounded = s.claims.some((c: any) => c.status === 'ungrounded');
      const hasModified = s.claims.some((c: any) => c.status === 'modified');
      const noClaims = s.claims.length === 0;
      return {
        ...s,
        overallStatus: noClaims ? 'no-data' : hasUngrounded ? 'ungrounded' : hasModified ? 'modified' : 'verified',
      };
    });

    return new Response(
      JSON.stringify({ success: true, verification: enriched }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Verify error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
