import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slides, facts }: {
      slides: SlideToVerify[];
      facts: ResearchFact[];
    } = await req.json();

    if (!slides?.length || !facts?.length) {
      return new Response(
        JSON.stringify({
          success: true,
          verification: slides?.map((s: SlideToVerify) => ({
            slideNumber: s.number,
            status: "no-data",
            claims: [],
          })) || [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!openrouterKey && !geminiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "No AI key configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const factsRef = facts
      .map((f, i) => `[FACT-${i + 1}] "${f.claim}" — ${f.source}, ${f.year}`)
      .join("\n");

    const slidesText = slides
      .map((s) => {
        const text = [s.headline, s.bodyText].filter(Boolean).join(" | ");
        return `SLIDE ${s.number}: ${text}`;
      })
      .join("\n\n");

    // Use OpenRouter (Claude) or Gemini for verification
    const useOpenRouter = !!openrouterKey;
    const url = useOpenRouter
      ? OPENROUTER_URL
      : `${GEMINI_URL}?key=${geminiKey}`;
    const model = useOpenRouter
      ? "anthropic/claude-sonnet-4"
      : "gemini-2.5-flash";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (useOpenRouter) {
      headers["Authorization"] = `Bearer ${openrouterKey}`;
      headers["HTTP-Referer"] = "https://dqef.app";
      headers["X-Title"] = "DQEF Studio";
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `You are a fact-checking assistant. Cross-reference every claim in each slide against the research facts.

For each slide, classify each data claim:
- "verified": matches a research fact closely
- "modified": based on a fact but numbers/attribution changed
- "ungrounded": not found in any research fact

Slides without data claims should have an empty claims array.
Be strict: if a number is changed even slightly, it's "modified".`,
          },
          {
            role: "user",
            content:
              `RESEARCH FACTS:\n${factsRef}\n\n---\n\nSLIDES TO VERIFY:\n${slidesText}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_verification",
              description: "Submit verification results for all slides",
              parameters: {
                type: "object",
                properties: {
                  slides: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        slideNumber: { type: "number" },
                        claims: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              text: { type: "string" },
                              status: {
                                type: "string",
                                enum: ["verified", "modified", "ungrounded"],
                              },
                              matchedFactIndex: { type: "number" },
                              note: { type: "string" },
                            },
                            required: [
                              "text",
                              "status",
                              "matchedFactIndex",
                              "note",
                            ],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["slideNumber", "claims"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["slides"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "submit_verification" },
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Verification AI error:", response.status, errText);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Verification error: ${response.status}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Verificação não retornou dados estruturados.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const verification = JSON.parse(toolCall.function.arguments);

    // deno-lint-ignore no-explicit-any
    const enriched = verification.slides.map((s: any) => {
      // deno-lint-ignore no-explicit-any
      const hasUngrounded = s.claims.some(
        (c: any) => c.status === "ungrounded",
      );
      // deno-lint-ignore no-explicit-any
      const hasModified = s.claims.some((c: any) => c.status === "modified");
      const noClaims = s.claims.length === 0;
      return {
        ...s,
        overallStatus: noClaims
          ? "no-data"
          : hasUngrounded
            ? "ungrounded"
            : hasModified
              ? "modified"
              : "verified",
      };
    });

    return new Response(
      JSON.stringify({ success: true, verification: enriched }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Verify error:", error);
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
