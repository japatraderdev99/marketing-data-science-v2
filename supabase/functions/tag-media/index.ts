import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function extractJSON(raw: string): Record<string, unknown> {
  let cleaned = raw.trim().replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
  try { return JSON.parse(cleaned); } catch { /* continue */ }
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch { /* continue */ } }
  throw new Error('JSON não encontrado');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { media_id, image_url } = await req.json();
    if (!media_id || !image_url) {
      return new Response(JSON.stringify({ error: "media_id e image_url são obrigatórios" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Update status to processing
    await supabase.from("media_library").update({ tagging_status: "processing" }).eq("id", media_id);

    // Call AI for tagging via Gemini Vision
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-router`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SRK}` },
      body: JSON.stringify({
        task_type: "tag_image",
        messages: [
          { role: 'system', content: `Analise esta imagem e retorne JSON com:
{
  "tags": ["tag1", "tag2", ...],
  "description": "descrição em português, 1-2 frases",
  "mood": "determinação|alívio|orgulho|urgência|raiva|foco",
  "subjects": ["pessoa", "ferramenta", ...],
  "colors": ["laranja", "bege", ...],
  "style": "documentário|editorial|publicitário|casual",
  "fit_score_map": { "RAIVA": 0.0-1.0, "DINHEIRO": 0.0-1.0, "ORGULHO": 0.0-1.0, "URGÊNCIA": 0.0-1.0, "ALÍVIO": 0.0-1.0 }
}
Contexto: plataforma de marketing para autônomos brasileiros.` },
          { role: 'user', content: [{ type: 'image_url', image_url: { url: image_url } }] },
        ],
        function_name: "tag-media",
      }),
    });

    if (!response.ok) {
      await supabase.from("media_library").update({ tagging_status: "error" }).eq("id", media_id);
      return new Response(JSON.stringify({ error: "Erro ao analisar imagem" }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content ?? '';
    const tags = extractJSON(content);

    await supabase.from("media_library").update({
      ai_tags: tags.tags,
      ai_description: tags.description,
      ai_mood: tags.mood,
      ai_subjects: tags.subjects,
      ai_colors: tags.colors,
      ai_style: tags.style,
      ai_fit_score_map: tags.fit_score_map,
      tagging_status: "done",
    }).eq("id", media_id);

    return new Response(JSON.stringify({ success: true, tags }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
