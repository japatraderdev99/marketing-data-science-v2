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

const PROMPT = `Você é um estrategista de marca sênior. Analise este documento e extraia todo o conhecimento estratégico da marca. Retorne APENAS JSON com exatamente estes campos (preencha o que encontrar, deixe string vazia se não encontrar):

{
  "brandName": "",
  "brandEssence": "",
  "mission": "",
  "vision": "",
  "values": [],
  "positioning": "",
  "differentials": "",
  "targetAudience": "",
  "demographics": "",
  "digitalBehavior": "",
  "biggestPain": "",
  "dream": "",
  "toneOfVoice": { "use": [], "avoid": [] },
  "keyMessages": [],
  "competitiveEdge": [],
  "forbiddenTopics": [],
  "contentAngles": [],
  "ctaStyle": "",
  "currentObjective": "",
  "kpis": [],
  "competitors": "",
  "promptContext": "Parágrafo único e denso com TUDO que a IA precisa saber: marca, público, tom, dores, diferenciais, objetivo e regras. Mín 150 palavras."
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ws = await resolveWorkspace(req);
    if (!ws) return errorResponse("Não autorizado", 401);

    const { knowledgeId, storagePath, documentName } = await req.json();
    if (!knowledgeId || !storagePath) return errorResponse("knowledgeId e storagePath obrigatórios", 400);

    await ws.supabase.from("strategy_knowledge").update({ status: "processing" }).eq("id", knowledgeId);

    // Detect file type from path
    const ext = storagePath.split(".").pop()?.toLowerCase() ?? "";
    const isPdf = ext === "pdf";
    const isImage = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);

    let contentParts: unknown[];

    if (isPdf || isImage) {
      const { data: blob, error: dlErr } = await ws.supabase.storage.from("knowledge").download(storagePath);
      if (dlErr || !blob) {
        await ws.supabase.from("strategy_knowledge").update({ status: "error" }).eq("id", knowledgeId);
        return errorResponse(`Download falhou: ${dlErr?.message}`, 500);
      }
      const b64 = chunkBase64(await blob.arrayBuffer());
      const mime = isPdf ? "application/pdf" : blob.type || "image/jpeg";

      if (isPdf) {
        contentParts = [
          { type: "document", source: { type: "base64", media_type: mime, data: b64 }, title: documentName },
          { type: "text", text: PROMPT },
        ];
      } else {
        contentParts = [
          { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
          { type: "text", text: PROMPT },
        ];
      }
    } else {
      // Text file: read as text
      const { data: blob } = await ws.supabase.storage.from("knowledge").download(storagePath);
      const text = blob ? await blob.text() : "";
      contentParts = [{ type: "text", text: `DOCUMENTO:\n${text}\n\n${PROMPT}` }];
    }

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
        messages: [{ role: "user", content: contentParts }],
        temperature: 0.2,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      await ws.supabase.from("strategy_knowledge").update({ status: "error" }).eq("id", knowledgeId);
      throw new Error(`OpenRouter ${res.status}: ${err}`);
    }

    const aiData = await res.json();
    const content = (aiData as { choices?: Array<{ message?: { content?: string } }> })
      .choices?.[0]?.message?.content ?? "";
    const extracted = extractJSON(content);

    await ws.supabase.from("strategy_knowledge").update({
      status: "done",
      extracted_knowledge: extracted,
    }).eq("id", knowledgeId);

    return jsonResponse({ success: true, extracted });
  } catch (e) {
    console.error("analyze-brand-document:", e);
    return errorResponse(e instanceof Error ? e.message : "Erro interno");
  }
});
