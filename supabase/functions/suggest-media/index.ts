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

async function getUserId(req: Request): Promise<string | null> {
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return null;
    const c = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await c.auth.getUser();
    return user?.id ?? null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { headline, subtext, imagePrompt, angle, userId: bodyUserId } = await req.json();
    const userId = bodyUserId || await getUserId(req);
    if (!userId) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch user's media library (tagged images only)
    const { data: media, error: mediaErr } = await supabase
      .from("media_library")
      .select("id, public_url, ai_tags, ai_description, ai_mood, ai_fit_score_map, ai_subjects, ai_style")
      .eq("workspace_id", userId)
      .eq("tagging_status", "done")
      .limit(100);

    if (mediaErr || !media?.length) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build context for AI scoring
    const context = [
      headline && `HEADLINE: ${headline}`,
      subtext && `SUBTEXTO: ${subtext}`,
      imagePrompt && `IMAGE PROMPT: ${imagePrompt}`,
      angle && `ÂNGULO EMOCIONAL: ${angle}`,
    ].filter(Boolean).join('\n');

    const mediaList = media.map((m, i) => {
      const parts = [`[${i}] ID=${m.id}`];
      if (m.ai_description) parts.push(`desc="${m.ai_description}"`);
      if (m.ai_tags?.length) parts.push(`tags=[${m.ai_tags.join(',')}]`);
      if (m.ai_mood) parts.push(`mood=${m.ai_mood}`);
      if (m.ai_subjects?.length) parts.push(`subjects=[${m.ai_subjects.join(',')}]`);
      if (m.ai_style) parts.push(`style=${m.ai_style}`);
      if (m.ai_fit_score_map && angle) {
        const score = m.ai_fit_score_map[angle];
        if (score !== undefined) parts.push(`fit_${angle}=${score}`);
      }
      return parts.join(' | ');
    }).join('\n');

    // Use AI to rank images by relevance
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const aiResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-router`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SRK}` },
      body: JSON.stringify({
        task_type: "classify",
        messages: [
          {
            role: 'system',
            content: `Você é um curador de imagens para criativos de marketing.
Dado o contexto do criativo e a lista de imagens disponíveis, retorne as 5 melhores matches.
JSON: { "matches": [{ "index": 0, "score": 8.5, "reason": "motivo curto" }] }
Score de 0-10 (10 = match perfeito). Só retorne matches com score >= 5.`,
          },
          {
            role: 'user',
            content: `CONTEXTO DO CRIATIVO:\n${context}\n\nIMAGENS DISPONÍVEIS:\n${mediaList}`,
          },
        ],
        options: { temperature: 0.3, max_tokens: 500 },
        user_id: userId,
        function_name: "suggest-media",
      }),
    });

    if (!aiResponse.ok) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const raw = aiData.choices?.[0]?.message?.content ?? '';
    const parsed = extractJSON(raw) as { matches?: Array<{ index: number; score: number; reason: string }> };
    const matches = parsed.matches || [];

    const suggestions = matches
      .filter(m => m.score >= 5 && media[m.index])
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(m => ({
        id: media[m.index].id,
        url: media[m.index].public_url,
        score: m.score,
        reason: m.reason,
        mood: media[m.index].ai_mood,
        tags: media[m.index].ai_tags,
      }));

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno', suggestions: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
