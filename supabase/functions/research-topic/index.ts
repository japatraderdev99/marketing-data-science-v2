import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, audience } = await req.json();

    if (!topic) {
      return new Response(
        JSON.stringify({ success: false, error: "Topic is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const apiKey = Deno.env.get("PERPLEXITY_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Perplexity não configurado. Configure PERPLEXITY_API_KEY.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const audienceContext = audience
      ? `O público-alvo é: ${audience}.`
      : "";

    const searchQuery =
      `Dados estatísticos e pesquisas verificáveis sobre "${topic}" no Brasil e no mundo. ${audienceContext} Buscar dados de fontes como IBGE, SEBRAE, FGV, Datafolha, McKinsey, Deloitte, Statista. Incluir ano da pesquisa e link quando possível.`;

    console.log("Perplexity research query:", searchQuery.slice(0, 100));

    const response = await fetch(
      "https://api.perplexity.ai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar-pro",
          messages: [
            {
              role: "system",
              content: `Você é um pesquisador de dados de mercado. Retorne APENAS dados verificáveis com fontes reais em formato JSON estruturado.

REGRAS ESTRITAS:
- Cada fato deve ser uma estatística CONCRETA e VERIFICÁVEL
- Inclua a fonte EXATA (nome completo da instituição)
- Inclua o ANO exato da publicação
- Inclua o LINK da fonte quando disponível
- Inclua o país de origem do dado
- NÃO invente dados. Se não encontrar, retorne array vazio.
- Mínimo 5, máximo 15 fatos.`,
            },
            { role: "user", content: searchQuery },
          ],
          temperature: 0.1,
          max_tokens: 3000,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "research_facts",
              schema: {
                type: "object",
                properties: {
                  facts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        claim: { type: "string" },
                        source: { type: "string" },
                        year: { type: "number" },
                        url: { type: "string" },
                        country: { type: "string" },
                      },
                      required: ["claim", "source", "year", "url", "country"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["facts"],
                additionalProperties: false,
              },
            },
          },
        }),
      },
    );

    if (!response.ok) {
      const status = response.status;
      const errText = await response.text();
      console.error("Perplexity error:", status, errText);

      if (status === 429) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Rate limit do Perplexity. Aguarde.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: `Erro Perplexity: ${status}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";
    const citations = data.citations || [];

    let facts: Array<{
      claim: string;
      source: string;
      year: number;
      url: string;
      country: string;
    }> = [];
    try {
      const parsed = JSON.parse(rawContent);
      facts = Array.isArray(parsed.facts) ? parsed.facts : [];
    } catch {
      // Fallback: return raw content
      return new Response(
        JSON.stringify({
          success: true,
          facts: [],
          research: rawContent,
          citations,
          model: data.model,
          structured: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(
      `Perplexity OK: ${facts.length} facts, ${citations.length} citations`,
    );

    const researchText = facts
      .map(
        (f, i) =>
          `[FACT-${i + 1}] ${f.claim} (${f.source}, ${f.year}${f.country !== "Brasil" ? ` — ${f.country}` : ""})`,
      )
      .join("\n\n");

    return new Response(
      JSON.stringify({
        success: true,
        facts,
        research: researchText,
        citations,
        model: data.model,
        structured: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Research error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro interno",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
