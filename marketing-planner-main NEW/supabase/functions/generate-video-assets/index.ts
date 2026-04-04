import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Load video playbook knowledge from database
async function loadVideoPlaybook(): Promise<string> {
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data } = await supabase
      .from("generative_playbooks")
      .select("knowledge_json")
      .eq("playbook_type", "video")
      .limit(1)
      .single();
    if (!data?.knowledge_json) return "";
    const k = data.knowledge_json as Record<string, unknown>;
    const laws = (k.laws as string[]) || [];
    const goldenRules = k.golden_rules as Record<string, string> || {};
    const cameraRules = k.camera_rules as Record<string, string[]> || {};
    const motionStructure = (k.motion_prompt_structure as string[]) || [];
    const antiPatterns = (k.anti_patterns as string[]) || [];

    return `
PLAYBOOK DE PRODUÇÃO GENERATIVA (pesquisa profunda — Veo 3.1, Sora 2, Seedance):

PRINCÍPIO: ${k.fundamental_principle || ""}

LEIS INEGOCIÁVEIS:
${laws.map((l, i) => `${i+1}. ${l}`).join("\n")}

FÓRMULA UNIVERSAL: ${k.universal_formula || ""}

REGRAS DE OURO:
- CÂMERA: ${goldenRules.camera || ""}
- TIMING: ${goldenRules.timing || ""}
- AÇÃO: ${goldenRules.action || ""}
- MICRO-MOVIMENTOS: ${goldenRules.micro_movements || ""}
- GATE: ${goldenRules.gate || ""}

CÂMERA PERMITIDA: ${(cameraRules.allowed || []).join(" | ")}
CÂMERA PROIBIDA: ${(cameraRules.forbidden || []).join(" | ")}

ESTRUTURA MOTION PROMPT: ${motionStructure.join(" → ")}

ANTI-PADRÕES: ${antiPatterns.join(" | ")}`;
  } catch (e) {
    console.error("Failed to load video playbook:", e);
    return "";
  }
}

// Load image playbook for frame generation
async function loadImagePlaybookForFrames(): Promise<string> {
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data } = await supabase
      .from("generative_playbooks")
      .select("knowledge_json")
      .eq("playbook_type", "image")
      .limit(1)
      .single();
    if (!data?.knowledge_json) return "";
    const k = data.knowledge_json as Record<string, unknown>;
    const brand = k.dqef_brand_visual as Record<string, string> || {};
    const rules = k.photorealism_rules as Record<string, string[]> || {};

    return `
PLAYBOOK DE IMAGEM (para frames iniciais):
SUJEITO DQEF: ${brand.target_audience || ""}
COR MARCA: ${brand.brand_color || ""}
OBRIGATÓRIO: ${brand.must_have || ""}
PROIBIDO: ${brand.forbidden || ""}
DO: ${(rules.do || []).join(" | ")}
DON'T: ${(rules.dont || []).join(" | ")}`;
  } catch { return ""; }
}

function extractJSON(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try { return JSON.parse(cleaned); } catch (_) { /* continue */ }
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch (_) { /* continue */ }
  }
  throw new SyntaxError(`Could not extract JSON. Preview: ${raw.slice(0, 200)}`);
}

// ─── DQEF Brand Context ────────────────────────────────────────────────────────
const DQEF_BRAND_CONTEXT = `
═══════════════════════════════════════════════════
BRAND DNA: DEIXA QUE EU FAÇO (DQEF)
Brazilian local services marketplace — Florianópolis, SC.
Tagline: "pronto. resolvido." — the brand lives in that moment of transition.
═══════════════════════════════════════════════════

BRAND VISUAL LANGUAGE (translate to cinematography):
The brand's visual identity is built on a warm, cream/beige ambient atmosphere with
deep orange-coral (#E8603C) as the accent of emotion and energy. This is NOT a neutral palette —
it's the color of Brazilian summer afternoons, of terracotta walls, of sunbaked concrete
in Floripa. The background is always warm, never cool. The orange only appears at the
PEAK MOMENT — it's the color of resolution, of the PIX notification, of the satisfied smile.

CINEMATOGRAPHIC TRANSLATION OF THE BRAND:
- AMBIENT BASE: creamy warm beige-white light, like indirect summer light through a muslin curtain
- ACCENT LIGHT: deep coral/orange practicals — the screen glow of a PIX notification, a setting sun rim light on dark skin
- TEXTURE: the brand values texture — rough hands, wet pool tiles, damp polo fabric, dusty work boots
- TYPOGRAPHY feel in motion: BOLD, CLEAN, DIRECT — no flourishes, no tricks — same in the camera work

NARRATIVE ARC (every DQEF video lives in this arc):
BEFORE: A real problem exists — broken pipe, dirty pool, overgrown garden — WIDE SHOT, warm natural light, slight tension in subject's posture
DURING: Expertise in action — the skilled hands working — MEDIUM/CLOSE, camera follows the TOOL, not the face
AFTER: "pronto. resolvido." — the PIX arrives, the subject allows a quiet private satisfaction — NOT a theatrical smile — CLOSE-UP of phone screen or the cleaned surface, then cut to face with half-smile

CHARACTER ARCHETYPES (always photorealistic, never advertising-clean):
- Brazilian service providers aged 25–48: dark skin common, broad shoulders from real work, calloused hands, slight sweat sheen, wearing varied casual work clothing (plain t-shirts, tank tops, button-up shirts, coveralls — NOT always blue polo), professional pride WITHOUT arrogance
- Clients (secondary): upper-middle class Floripa residents, relieved, grateful but not condescending
- The TOOL is always a supporting character: pool skimmer, pipe wrench, garden shears — always shown with respect

VISUAL PHILOSOPHY: "silêncio e verdade" — no exaggeration, no theatrical emotion
The camera witnesses, it does not perform. Subjects are caught mid-task, not posed.
Think: documentary precision with advertising color grading. Sebastião Salgado composition + Brazilian Golden Hour color.

LOCATION DNA: Florianópolis condominiums, infinity pools overlooking the ocean,
luxury residences with tropical gardens, coastal outdoor spaces with pine and palm mix,
tile-and-stone service areas — always REAL locations, never studio-clean.

KEY EMOTIONAL BEATS (cinematic gold for DQEF):
1. The PIX notification arriving — phone screen glow orange in ambient light
2. Skilled hands performing a precise technical action — the expertise moment
3. The before/after of a surface: dirty pool → crystal blue, dry garden → lush green
4. Eye contact between provider and client: respect and gratitude, equals
5. The tool put down after completion — the exhale moment

COLOR GRADING TARGET:
- Shadows: warm dark brown (never cool blue-black)
- Midtones: creamy sand, terracotta, warm beige
- Highlights: blown-out warm white or coral orange
- Skin tones: always warm, dark Brazilian skin in golden light = copper and amber
- Reference: "City of God" outdoor scenes + Renner Brazilian advertising warm grade
`;

// ─── Image Prompt System ──────────────────────────────────────────────────────
const IMAGE_PROMPT_SYSTEM = `You are a world-class director of photography specializing in Brazilian advertising and AI-generated video frames for Higgsfield.

${DQEF_BRAND_CONTEXT}

YOUR TASK: Create a hyper-detailed image prompt for the INITIAL FRAME of a video.

OUTPUT FORMAT (JSON only):
{
  "imagePrompt": "hyper-detailed EN prompt, minimum 100 words",
  "imagePromptPtBr": "tradução explicativa detalhada em PT-BR",
  "visualNotes": "diretor notes",
  "animationPotential": "what will animate"
}

CRITICAL RULE: Return ONLY raw JSON.`;

// ─── Video Prompt Systems by Model ────────────────────────────────────────────
const VIDEO_PROMPT_SYSTEMS: Record<string, string> = {
"VEO 3.1": `You are a film director for VEO 3.1. ${DQEF_BRAND_CONTEXT}
Write a director's treatment (up to 4000 chars) with 7 blocks: Primary Motion, Secondary Motion, Camera, Audio (4-6 layers), Emotional Arc, Color Grade Evolution, Technical Specs.
OUTPUT: JSON only with videoPrompt, videoPromptPtBr, directorNotes, audioInstructions {ambientSound, dialogue, musicSuggestion}, lensMode, technicalSpecs, warningsAndTips[], promptConfidenceScore.`,

"Seedance 1.5 Pro": `You are a motion director for Seedance 1.5 Pro. ${DQEF_BRAND_CONTEXT}
Use Seedance native grammar: Subject+Features → 3 Chained Actions+Degree Adverbs → Camera (8 terms only: surround|aerial|zoom in|zoom out|pan left|pan right|follow|handheld) → Environment → Lighting → Shot switch → Close-up.
OUTPUT: JSON only with videoPrompt, videoPromptPtBr, directorNotes, audioInstructions: null, lensMode, technicalSpecs, warningsAndTips[], promptConfidenceScore.`,

"Sora 2 Pro Max": `You are a screenplay writer for Sora 2 Pro Max. ${DQEF_BRAND_CONTEXT}
Use screenplay format: Location+Time header → Director/Cinematography credits → BEFORE/DURING/AFTER emotional states → Multi-beat timing [0.0-2.5s|2.5-5.0s|5.0-Xs] → Color as emotional language. 6-8 sentences minimum.
OUTPUT: JSON only with videoPrompt, videoPromptPtBr, directorNotes, audioInstructions {ambientSound, dialogue, musicSuggestion}, lensMode, technicalSpecs, warningsAndTips[], promptConfidenceScore.`,
};

// ─── Express System Prompt ────────────────────────────────────────────────────
function buildExpressSystem(targetModel: string, targetAspect: string, targetDuration: number): string {
  const modelSystem = VIDEO_PROMPT_SYSTEMS[targetModel] ?? VIDEO_PROMPT_SYSTEMS["Seedance 1.5 Pro"];

  return `You are a world-class Brazilian advertising director. Convert raw ideas into precise AI video prompts.

${DQEF_BRAND_CONTEXT}

TARGET: ${targetModel} | ${targetAspect} | ${targetDuration}s

MODEL-SPECIFIC RULES:
${modelSystem}

PIPELINE:
1. EXTRACT the visual essence from the input
2. GENERATE an animatable image prompt (80+ words)
3. GENERATE a ${targetModel}-native video prompt
4. CALCULATE confidence score (0-100)

OUTPUT FORMAT (JSON only):
{
  "imagePrompt": "detailed EN frame prompt",
  "imagePromptPtBr": "tradução PT-BR",
  "visualNotes": "composition notes",
  "animationPotential": "what animates",
  "videoPrompt": "${targetModel}-native prompt",
  "videoPromptPtBr": "tradução + análise",
  "directorNotes": "technical rationale",
  "audioInstructions": ${targetModel === "Seedance 1.5 Pro" ? "null" : '{"ambientSound":"...","dialogue":null,"musicSuggestion":null}'},
  "lensMode": "${targetModel === "Seedance 1.5 Pro" ? "unfixed" : "fixed"}",
  "technicalSpecs": {"model":"${targetModel}","duration":"${targetDuration}s","aspectRatio":"${targetAspect}","fixedLens":${targetModel !== "Sora 2 Pro Max"},"audio":${targetModel !== "Seedance 1.5 Pro"},"resolution":"1080p"},
  "warningsAndTips": ["3-5 specific tips"],
  "extractedScene": "one sentence scene summary",
  "suggestedAngle": "best emotional angle",
  "promptConfidenceScore": 0
}

CRITICAL: Return ONLY raw JSON.`;
}

// ─── Storyboard System Prompt ─────────────────────────────────────────────────
function buildStoryboardSystem(targetModel: string, targetAspect: string, targetDuration: number): string {
  return `You are a world-class creative director specializing in multi-shot video production for Brazilian advertising.

${DQEF_BRAND_CONTEXT}

YOUR TASK: Create a multi-shot video storyboard from the briefing.

⚠️ CRITICAL PRIORITY RULE:
The USER'S BRIEFING IS THE PRIMARY CREATIVE DIRECTION. If the user describes a specific narrative, characters, dialogue, humor, or tone — you MUST preserve them EXACTLY as described.
DO NOT reinterpret comedy as documentary. DO NOT remove dialogue. DO NOT replace user's characters with brand archetypes.
The brand context above is a SECONDARY guide for visual style only — it should NOT override the user's creative intent.
If the user writes a funny video, output a funny storyboard. If they write dramatic, output dramatic.

TARGET: ${targetModel} | ${targetAspect} | Total duration: ${targetDuration}s

SHOT STRUCTURE RULES:
- Analyze the user's briefing to determine the RIGHT number of shots (2-8 shots)
- If the user describes distinct scenes/moments, create ONE shot per scene
- Each shot duration should match the narrative pacing (2s-10s per shot)
- Total duration of all shots should roughly equal ${targetDuration}s
- For narratives with dialogue: allocate enough time per shot for the lines to be spoken naturally
- For comedy: preserve timing — the pause before the punchline IS the comedy

SHOT TYPES:
- setup: establishing the scene/problem
- conflict: the tension/challenge moment  
- disaster: something goes wrong (comedy/drama)
- resolution: the solution in action
- hero: the peak brand moment
- cta: call to action / closing

CHARACTER HANDLING:
- If the user describes specific characters, preserve their descriptions verbatim
- Include character names if provided
- Note dialogue lines PER SHOT with timing
- Specify character positioning and expressions

OUTPUT FORMAT (JSON only):
{
  "videoTitle": "compelling video title",
  "narrativeConcept": "one paragraph describing the narrative arc — preserve the user's tone (comedy, drama, etc.)",
  "captionSuggestion": "social media caption in PT-BR",
  "viralTrigger": "the one element that makes this shareable",
  "shots": [
    {
      "id": 1,
      "title": "Shot title",
      "duration": "8s",
      "description": "EXTREMELY DETAILED scene description: characters (name, appearance, clothing, expression), specific actions with timing, dialogue lines in quotes, camera position, environment details, lighting, emotional tone. Minimum 80 words per shot.",
      "type": "setup|conflict|disaster|resolution|hero|cta",
      "recommendedModel": "${targetModel}",
      "dialogue": ["Character: \\"Line in PT-BR\\""] 
    }
  ]
}

RULES:
- PRESERVE the user's narrative arc, scenes, and dialogue EXACTLY
- Each shot description must be detailed enough to generate a frame prompt AND a motion prompt
- Descriptions should include specific character actions, expressions, and body language
- Include dialogue lines with character attribution
- Specify camera position per shot (wide, medium, close-up, etc.)
- For humor/comedy: describe the comedic timing and physical comedy precisely

CRITICAL: Return ONLY raw JSON.`;
}


// ─── Request Interface ─────────────────────────────────────────────────────────
interface GenerateRequest {
  operation: "image_prompt" | "video_prompt" | "generate_image" | "express_prompts" | "storyboard" | "shot_frame_prompt" | "shot_motion_prompt";
  persona?: string;
  scene?: string;
  contentAngle?: string;
  videoModel?: string;
  aspectRatio?: string;
  duration?: number;
  additionalContext?: string;
  imagePrompt?: string;
  freeText?: string;
  strategyContext?: string;
  shotContext?: {
    shotNumber: number;
    totalShots: number;
    shotType: string;
    shotTitle: string;
  };
}

// ─── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
      },
    });
  }

  const CORS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

  try {
    const body: GenerateRequest = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), { status: 500, headers: CORS });
    }

    const { operation, persona, scene, contentAngle, videoModel, aspectRatio, duration, additionalContext, imagePrompt, freeText, strategyContext, shotContext } = body;

    // Load playbook knowledge from database (parallel)
    const [videoPlaybook, imagePlaybook] = await Promise.all([
      loadVideoPlaybook(),
      loadImagePlaybookForFrames(),
    ]);

    const strategyBlock = strategyContext ? `\n\n=== STRATEGIC CONTEXT (from brand strategy, campaigns, and approved ideas) ===\n${strategyContext}\n===` : "";

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callAI = async (model: string, messages: { role: string; content: string }[], temperature = 0.75) => {
      const res = await fetch(AI_GATEWAY, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, temperature }),
      });
      if (!res.ok) {
        const status = res.status;
        if (status === 429) throw Object.assign(new Error("Rate limit atingido. Aguarde e tente novamente."), { status: 429 });
        if (status === 402) throw Object.assign(new Error("Créditos insuficientes. Adicione créditos ao workspace."), { status: 402 });
        throw new Error("Erro no serviço de IA");
      }
      const data = await res.json();
      return (data.choices?.[0]?.message?.content ?? "") as string;
    };

    // Route through ai-router for Claude Sonnet (storyboard, frame, motion)
    const callSonnet = async (messages: { role: string; content: string }[], temperature = 0.72, fnName = "generate-video-assets") => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-router`, {
        method: "POST",
        headers: { Authorization: `Bearer ${ANON_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          task_type: "analyze",
          messages,
          options: { temperature, response_format: { type: "json_object" } },
          function_name: fnName,
        }),
      });
      if (!res.ok) {
        const status = res.status;
        if (status === 429) throw Object.assign(new Error("Rate limit atingido. Aguarde e tente novamente."), { status: 429 });
        if (status === 402) throw Object.assign(new Error("Créditos insuficientes. Adicione créditos ao workspace."), { status: 402 });
        throw new Error("Erro no serviço de IA");
      }
      const data = await res.json();
      return (data.choices?.[0]?.message?.content ?? "") as string;
    };

    // ─── STORYBOARD ───────────────────────────────────────────────────────────
    if (operation === "storyboard") {
      const targetModel = videoModel ?? "Seedance 1.5 Pro";
      const targetAspect = aspectRatio ?? "9:16";
      const targetDuration = duration ?? 10;

      const systemPrompt = buildStoryboardSystem(targetModel, targetAspect, targetDuration) + (videoPlaybook ? `\n\n${videoPlaybook}` : "") + strategyBlock;
      const userContent = `BRIEFING:\n${freeText}\n\n${contentAngle ? `Emotional angle: ${contentAngle}` : ""}\n${persona ? `Character: ${persona}` : ""}\n\nGenerate the storyboard. JSON only.`;

      try {
        const raw = await callSonnet([
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ], 0.72, "video-storyboard");
        const parsed = extractJSON(raw);
        return new Response(JSON.stringify(parsed), { headers: CORS });
      } catch (e: unknown) {
        const err = e as { status?: number; message?: string };
        return new Response(JSON.stringify({ error: err.message ?? String(e) }), { status: err.status ?? 500, headers: CORS });
      }
    }

    // ─── SHOT FRAME PROMPT ────────────────────────────────────────────────────
    if (operation === "shot_frame_prompt") {
      const enhancedSystem = IMAGE_PROMPT_SYSTEM + (imagePlaybook ? `\n\n${imagePlaybook}` : "") + strategyBlock;
      const shotInfo = shotContext ? `\nShot ${shotContext.shotNumber}/${shotContext.totalShots}: "${shotContext.shotTitle}" (type: ${shotContext.shotType})` : "";

      const userMsg = `SCENE TO FRAME:${shotInfo}
Scene: ${scene}
Target model: ${videoModel} | Aspect: ${aspectRatio} | Duration: ${duration}s
${contentAngle ? `Content angle: ${contentAngle}` : ""}
${additionalContext ? `Additional context: ${additionalContext}` : ""}

Generate the animatable Start Frame image prompt. ONLY JSON.`;

      try {
        const raw = await callSonnet([
          { role: "system", content: enhancedSystem },
          { role: "user", content: userMsg },
        ], 0.7, "video-frame-prompt");
        const parsed = extractJSON(raw);
        return new Response(JSON.stringify(parsed), { headers: CORS });
      } catch (e: unknown) {
        const err = e as { status?: number; message?: string };
        return new Response(JSON.stringify({ error: err.message ?? String(e) }), { status: err.status ?? 500, headers: CORS });
      }
    }

    // ─── SHOT MOTION PROMPT ───────────────────────────────────────────────────
    if (operation === "shot_motion_prompt") {
      const targetModel = videoModel ?? "Seedance 1.5 Pro";
      const modelSystem = VIDEO_PROMPT_SYSTEMS[targetModel] ?? VIDEO_PROMPT_SYSTEMS["Seedance 1.5 Pro"];
      const enhancedSystem = modelSystem + (videoPlaybook ? `\n\n${videoPlaybook}` : "") + strategyBlock;
      const shotInfo = shotContext ? `\nShot ${shotContext.shotNumber}/${shotContext.totalShots}: "${shotContext.shotTitle}" (type: ${shotContext.shotType})` : "";

      const userMsg = `SCENE TO DIRECT:${shotInfo}
Scene: ${scene}
Model: ${targetModel} | Aspect: ${aspectRatio} | Duration: ${duration}s
${imagePrompt ? `Start frame prompt: ${imagePrompt}` : ""}
${contentAngle ? `Content angle: ${contentAngle}` : ""}

Apply the ${targetModel} native grammar. JSON only.`;

      try {
        const raw = await callSonnet([
          { role: "system", content: enhancedSystem },
          { role: "user", content: userMsg },
        ], 0.73, "video-motion-prompt");
        const parsed = extractJSON(raw);
        return new Response(JSON.stringify(parsed), { headers: CORS });
      } catch (e: unknown) {
        const err = e as { status?: number; message?: string };
        return new Response(JSON.stringify({ error: err.message ?? String(e) }), { status: err.status ?? 500, headers: CORS });
      }
    }

    // ─── EXPRESS MODE ─────────────────────────────────────────────────────────
    if (operation === "express_prompts") {
      const targetModel = videoModel ?? "Seedance 1.5 Pro";
      const targetAspect = aspectRatio ?? "9:16";
      const targetDuration = duration ?? 10;

      const systemPrompt = buildExpressSystem(targetModel, targetAspect, targetDuration) + (videoPlaybook ? `\n\n${videoPlaybook}` : "") + (imagePlaybook ? `\n\n${imagePlaybook}` : "") + strategyBlock;
      const userContent = `INPUT FROM TEAM:\n---\n${freeText}\n---\n\n${persona ? `Character reference: ${persona}` : ""}\n${contentAngle ? `Emotional angle requested: ${contentAngle}` : ""}\n\nNow produce the JSON output.`;

      try {
        const raw = await callAI("google/gemini-2.5-pro", [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ], 0.72);
        const parsed = extractJSON(raw);
        return new Response(JSON.stringify(parsed), { headers: CORS });
      } catch (e: unknown) {
        const err = e as { status?: number; message?: string };
        return new Response(JSON.stringify({ error: err.message ?? String(e) }), { status: err.status ?? 500, headers: CORS });
      }
    }

    // ─── IMAGE PROMPT ─────────────────────────────────────────────────────────
    if (operation === "image_prompt") {
      const userMsg = `SCENE TO FRAME:
Persona: ${persona}
Scene: ${scene}
Content angle: ${contentAngle}
Target model: ${videoModel} | Aspect: ${aspectRatio} | Duration: ${duration}s
${additionalContext ? `Additional context: ${additionalContext}` : ""}

Generate the animatable Start Frame image prompt. ONLY JSON.`;

      try {
        const enhancedSystem = IMAGE_PROMPT_SYSTEM + (imagePlaybook ? `\n\n${imagePlaybook}` : "") + strategyBlock;
        const raw = await callAI("google/gemini-2.5-flash", [
          { role: "system", content: enhancedSystem },
          { role: "user", content: userMsg },
        ], 0.7);
        const parsed = extractJSON(raw);
        return new Response(JSON.stringify(parsed), { headers: CORS });
      } catch (e: unknown) {
        const err = e as { status?: number; message?: string };
        return new Response(JSON.stringify({ error: err.message ?? String(e) }), { status: err.status ?? 500, headers: CORS });
      }
    }

    // ─── GENERATE IMAGE ───────────────────────────────────────────────────────
    if (operation === "generate_image") {
      if (!imagePrompt) return new Response(JSON.stringify({ error: "imagePrompt required" }), { status: 400, headers: CORS });

      const res = await fetch(AI_GATEWAY, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [{ role: "user", content: imagePrompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!res.ok) {
        const status = res.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limit atingido." }), { status: 429, headers: CORS });
        if (status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: CORS });
        const errText = await res.text();
        return new Response(JSON.stringify({ error: `Erro na geração: ${errText}` }), { status: 500, headers: CORS });
      }

      const data = await res.json();
      const images = data.choices?.[0]?.message?.images;
      if (!images || images.length === 0) {
        return new Response(JSON.stringify({ error: "Nenhuma imagem gerada" }), { status: 500, headers: CORS });
      }
      return new Response(JSON.stringify({ imageUrl: images[0].image_url.url }), { headers: CORS });
    }

    // ─── VIDEO PROMPT ─────────────────────────────────────────────────────────
    if (operation === "video_prompt") {
      const targetModel = videoModel ?? "Seedance 1.5 Pro";
      const modelSystem = VIDEO_PROMPT_SYSTEMS[targetModel] ?? VIDEO_PROMPT_SYSTEMS["Seedance 1.5 Pro"];

      const userMsg = `SCENE TO DIRECT:
Persona: ${persona}
Scene: ${scene}
Content angle: ${contentAngle}
Model: ${targetModel} | Aspect: ${aspectRatio} | Duration: ${duration}s
${additionalContext ? `Director notes: ${additionalContext}` : ""}
${imagePrompt ? `Start frame: ${imagePrompt}` : ""}

Apply the ${targetModel} native grammar. JSON only.`;

      try {
        const enhancedSystem = modelSystem + (videoPlaybook ? `\n\n${videoPlaybook}` : "") + strategyBlock;
        const raw = await callAI("google/gemini-2.5-pro", [
          { role: "system", content: enhancedSystem },
          { role: "user", content: userMsg },
        ], 0.73);
        const parsed = extractJSON(raw);
        return new Response(JSON.stringify(parsed), { headers: CORS });
      } catch (e: unknown) {
        const err = e as { status?: number; message?: string };
        return new Response(JSON.stringify({ error: err.message ?? String(e) }), { status: err.status ?? 500, headers: CORS });
      }
    }

    return new Response(JSON.stringify({ error: "Invalid operation" }), { status: 400, headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    });
  }
});
