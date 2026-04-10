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

    const { currentData = {} } = await req.json();

    // Load KB docs
    const { data: kbDocs } = await ws.supabase
      .from("strategy_knowledge")
      .select("extracted_knowledge, document_name")
      .eq("user_id", ws.userId)
      .eq("status", "done")
      .limit(5);

    if (!kbDocs?.length) return errorResponse("Nenhum documento no Knowledge Base com status 'done'", 400);

    const kbContext = kbDocs.map((d: { document_name: string; extracted_knowledge: Record<string, unknown> | null }) => {
      const k = d.extracted_knowledge;
      if (!k) return "";
      return [
        `DOCUMENTO: ${d.document_name}`,
        k.brandName ? `Marca: ${k.brandName}` : "",
        k.positioning ? `Posicionamento: ${k.positioning}` : "",
        k.differentials ? `Diferenciais: ${k.differentials}` : "",
        k.targetAudience ? `Público: ${k.targetAudience}` : "",
        k.pains ? `Dores: ${k.pains}` : "",
        k.toneOfVoice ? `Tom: ${JSON.stringify(k.toneOfVoice)}` : "",
        k.competitors ? `Concorrentes: ${k.competitors}` : "",
        k.forbiddenTopics?.length ? `Proibidos: ${JSON.stringify(k.forbiddenTopics)}` : "",
        k.currentObjective ? `Objetivo: ${k.currentObjective}` : "",
        k.kpis?.length ? `KPIs: ${JSON.stringify(k.kpis)}` : "",
        k.promptContext ? `Contexto: ${k.promptContext}` : "",
      ].filter(Boolean).join("\n");
    }).filter(Boolean).join("\n---\n");

    const filledFields = Object.entries(currentData as Record<string, string>)
      .filter(([, v]) => typeof v === "string" && v.length > 30)
      .map(([k]) => k);

    const PROMPT = `Você é um estrategista de marca. Com base no Knowledge Base abaixo, preencha as seções do playbook estratégico.

REGRA CRÍTICA: Não preencha campos que já têm mais de 30 caracteres (listados como preenchidos abaixo).
Campos já preenchidos (NÃO sobrescrever): ${filledFields.join(", ") || "nenhum"}

KNOWLEDGE BASE:
${kbContext}

ESTADO ATUAL DO PLAYBOOK:
${JSON.stringify(currentData, null, 2)}

Retorne JSON com EXATAMENTE estes 9 campos. Para campos preenchidos, retorne o valor atual sem alteração. Para campos vazios, preencha com base no KB:
{
  "positioning": "",
  "differentials": "",
  "targetAudience": "",
  "pains": "",
  "toneOfVoice": "",
  "competitors": "",
  "forbiddenTopics": "",
  "currentObjective": "",
  "kpis": "",
  "filledFields": [],
  "skippedFields": []
}`;

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
        max_tokens: 3000,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
    const aiData = await res.json();
    const content = (aiData as { choices?: Array<{ message?: { content?: string } }> })
      .choices?.[0]?.message?.content ?? "";
    const result = extractJSON(content);

    return jsonResponse({ success: true, playbook: result });
  } catch (e) {
    console.error("fill-playbook-from-knowledge:", e);
    return errorResponse(e instanceof Error ? e.message : "Erro interno");
  }
});
