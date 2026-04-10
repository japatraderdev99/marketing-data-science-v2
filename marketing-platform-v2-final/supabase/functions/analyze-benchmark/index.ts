import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { resolveWorkspace } from "../_shared/workspace.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-sonnet-4-6";

function chunkBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

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

    const { benchmarkId, storagePath, competitorName, platform = "", formatType = "" } = await req.json();
    if (!benchmarkId || !storagePath) return errorResponse("benchmarkId e storagePath obrigatórios", 400);

    await ws.supabase.from("competitor_benchmarks").update({ status: "processing" }).eq("id", benchmarkId);

    // Load brand KB context
    const { data: kbDocs } = await ws.supabase
      .from("strategy_knowledge")
      .select("extracted_knowledge")
      .eq("user_id", ws.userId)
      .eq("status", "done")
      .limit(3);

    const brandContext = (kbDocs ?? []).map((d: { extracted_knowledge: Record<string, unknown> | null }) => {
      const k = d.extracted_knowledge;
      return k?.promptContext ? String(k.promptContext) : "";
    }).filter(Boolean).join("\n\n");

    // Download benchmark file
    const ext = storagePath.split(".").pop()?.toLowerCase() ?? "";
    const isPdf = ext === "pdf";
    const isImage = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);

    let fileContentPart: unknown;

    if (isPdf || isImage) {
      const { data: blob, error: dlErr } = await ws.supabase.storage.from("benchmarks").download(storagePath);
      if (dlErr || !blob) {
        await ws.supabase.from("competitor_benchmarks").update({ status: "error" }).eq("id", benchmarkId);
        return errorResponse(`Download falhou: ${dlErr?.message}`, 500);
      }
      const b64 = chunkBase64(await blob.arrayBuffer());
      const mime = isPdf ? "application/pdf" : blob.type || "image/jpeg";
      fileContentPart = isPdf
        ? { type: "document", source: { type: "base64", media_type: mime, data: b64 }, title: competitorName }
        : { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } };
    } else {
      fileContentPart = { type: "text", text: `[Arquivo não suportado para análise visual: ${storagePath}]` };
    }

    const PROMPT = `Você é um analista de marketing especializado em análise competitiva.

Analise este material do concorrente "${competitorName}"${platform ? ` (${platform})` : ""}${formatType ? ` — formato: ${formatType}` : ""}.

${brandContext ? `CONTEXTO DA NOSSA MARCA:\n${brandContext}\n\n` : ""}Analise profundamente e retorne JSON com:
{
  "competitorAnalysis": {
    "overallStrategy": "estratégia geral identificada",
    "copyStyle": "estilo de copy",
    "visualStyle": "estilo visual",
    "hooks": ["gancho 1", "gancho 2"],
    "cta": "CTA identificado",
    "targetAudience": "público alvo identificado",
    "keyMessage": "mensagem principal",
    "weaknesses": ["fraqueza 1"],
    "strengths": ["força 1"]
  },
  "adaptationInsights": [
    "Como adaptar este ângulo para nossa marca...",
    "O que copiar da estratégia visual..."
  ],
  "actionItems": [
    "Ação concreta 1 para a nossa comunicação",
    "Ação concreta 2"
  ],
  "overallScore": 75,
  "threatLevel": "low|medium|high",
  "opportunityNote": "Oportunidade identificada baseada nas fraquezas do concorrente"
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
        messages: [{ role: "user", content: [fileContentPart, { type: "text", text: PROMPT }] }],
        temperature: 0.4,
        max_tokens: 3000,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      await ws.supabase.from("competitor_benchmarks").update({ status: "error" }).eq("id", benchmarkId);
      throw new Error(`OpenRouter ${res.status}: ${err}`);
    }

    const aiData = await res.json();
    const content = (aiData as { choices?: Array<{ message?: { content?: string } }> })
      .choices?.[0]?.message?.content ?? "";
    const insights = extractJSON(content);

    await ws.supabase.from("competitor_benchmarks").update({
      status: "done",
      ai_insights: insights,
    }).eq("id", benchmarkId);

    return jsonResponse({ success: true, insights });
  } catch (e) {
    console.error("analyze-benchmark:", e);
    return errorResponse(e instanceof Error ? e.message : "Erro interno");
  }
});
