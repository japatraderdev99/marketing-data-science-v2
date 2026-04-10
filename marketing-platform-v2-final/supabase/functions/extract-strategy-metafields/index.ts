import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { resolveWorkspace } from "../_shared/workspace.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-sonnet-4-6";

function extractJSON(raw: string): Record<string, unknown> {
  let s = raw.trim();
  if (s.startsWith("```")) s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  s = s.trim();
  try { return JSON.parse(s); } catch { /* */ }
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a !== -1 && b > a) try { return JSON.parse(s.substring(a, b + 1)); } catch { /* */ }
  throw new Error(`JSON inválido (${raw.length} chars)`);
}

const META_SCHEMA = `{
  "brandEssence": "string",
  "uniqueValueProp": "string",
  "targetPersona": {
    "profile": "string",
    "demographics": "string",
    "digitalBehavior": "string",
    "biggestPain": "string",
    "dream": "string"
  },
  "toneRules": { "use": ["string"], "avoid": ["string"] },
  "keyMessages": ["string"],
  "painPoints": ["string"],
  "competitiveEdge": ["string"],
  "forbiddenTopics": ["string"],
  "currentCampaignFocus": "string",
  "contentAngles": ["string"],
  "ctaStyle": "string",
  "kpiPriorities": ["string"],
  "promptContext": "Parágrafo único e denso (mín 150 palavras) com TUDO que a IA precisa saber para gerar conteúdo perfeito para esta marca.",
  "completenessScore": 0,
  "missingCritical": ["campo faltante"]
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ws = await resolveWorkspace(req);
    if (!ws) return errorResponse("Não autorizado", 401);

    const { strategyData = {} } = await req.json();

    // Load KB context
    const { data: kbDocs } = await ws.supabase
      .from("strategy_knowledge")
      .select("extracted_knowledge, document_name")
      .eq("user_id", ws.userId)
      .eq("status", "done")
      .limit(5);

    const kbContext = (kbDocs ?? []).map((d: { extracted_knowledge: Record<string, unknown> | null; document_name: string }) => {
      const k = d.extracted_knowledge;
      if (!k) return "";
      return k.promptContext ? `[${d.document_name}]\n${k.promptContext}` : "";
    }).filter(Boolean).join("\n\n");

    const PROMPT = `Você é um estrategista sênior especializado em extração de meta-dados estratégicos de marca.

Com base no Playbook Manual e no Knowledge Base abaixo, extraia os meta-campos que alimentarão AUTOMATICAMENTE todas as ferramentas de IA: criação de criativos, carrosséis, campanhas e conteúdo.

${kbContext ? `KNOWLEDGE BASE:\n${kbContext}\n\n` : ""}PLAYBOOK MANUAL:
${JSON.stringify(strategyData, null, 2)}

Calcule o completenessScore (0-100) baseado na riqueza e completude dos dados fornecidos.
Liste em missingCritical os campos que estão vazios ou fracos e são críticos para IA gerar conteúdo de qualidade.

Retorne APENAS o JSON com este schema exato:
${META_SCHEMA}`;

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
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: PROMPT }],
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
    const aiData = await res.json();
    const content = (aiData as { choices?: Array<{ message?: { content?: string } }> })
      .choices?.[0]?.message?.content ?? "";
    const metafields = extractJSON(content);

    return jsonResponse({ success: true, metafields });
  } catch (e) {
    console.error("extract-strategy-metafields:", e);
    return errorResponse(e instanceof Error ? e.message : "Erro interno");
  }
});
