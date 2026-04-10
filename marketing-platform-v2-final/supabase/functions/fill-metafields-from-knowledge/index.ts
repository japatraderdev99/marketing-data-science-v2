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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ws = await resolveWorkspace(req);
    if (!ws) return errorResponse("Não autorizado", 401);

    const { currentMetafields = {}, strategyData = {} } = await req.json();

    // Load KB context
    const { data: kbDocs } = await ws.supabase
      .from("strategy_knowledge")
      .select("extracted_knowledge, document_name")
      .eq("user_id", ws.userId)
      .eq("status", "done")
      .limit(5);

    if (!kbDocs?.length) return errorResponse("Nenhum documento no Knowledge Base", 400);

    const kbContext = kbDocs.map((d: { extracted_knowledge: Record<string, unknown> | null; document_name: string }) => {
      const k = d.extracted_knowledge;
      if (!k) return "";
      const parts = [`[${d.document_name}]`];
      if (k.promptContext) parts.push(String(k.promptContext));
      if (k.toneOfVoice) parts.push(`Tom: ${JSON.stringify(k.toneOfVoice)}`);
      if (k.competitiveEdge) parts.push(`Edge: ${JSON.stringify(k.competitiveEdge)}`);
      if (k.keyMessages) parts.push(`Mensagens: ${JSON.stringify(k.keyMessages)}`);
      return parts.join("\n");
    }).filter(Boolean).join("\n\n");

    // Identify weak/missing fields
    const missing = Object.entries(currentMetafields as Record<string, unknown>)
      .filter(([, v]) => {
        if (Array.isArray(v)) return v.length === 0;
        if (typeof v === "string") return v.length < 20;
        if (typeof v === "object" && v !== null) {
          return Object.values(v).every(x => !x || (typeof x === "string" && x.length < 10));
        }
        return false;
      })
      .map(([k]) => k);

    const PROMPT = `Você é um especialista em estratégia de marca. Preencha APENAS os campos fracos ou vazios dos meta-fields, usando o Knowledge Base como fonte de verdade.

Campos a preencher: ${missing.join(", ") || "nenhum identificado — melhore todos onde possível"}

KNOWLEDGE BASE:
${kbContext}

PLAYBOOK MANUAL:
${JSON.stringify(strategyData, null, 2)}

META-FIELDS ATUAIS:
${JSON.stringify(currentMetafields, null, 2)}

Retorne o JSON completo de meta-fields com os campos preenchidos/melhorados. Inclua também:
- "filledFromKB": lista dos campos que foram preenchidos/melhorados
- "confidenceNotes": objeto com notas de confiança por campo

Mantenha a estrutura exata do meta-fields atual, apenas enriquecendo o conteúdo.`;

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
    const result = extractJSON(content);

    return jsonResponse({ success: true, metafields: result });
  } catch (e) {
    console.error("fill-metafields-from-knowledge:", e);
    return errorResponse(e instanceof Error ? e.message : "Erro interno");
  }
});
