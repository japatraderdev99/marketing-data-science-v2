import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

type Provider = "openrouter" | "gemini";

interface TaskConfig {
  model: string;
  provider: Provider;
  fallbackModel?: string;
  fallbackProvider?: Provider;
}

// OpenRouter primary (Claude models), Gemini API fallback
// Image generation via Nano Banana Pro (google/gemini-3-pro-image-preview) on OpenRouter
const TASK_CONFIG: Record<string, TaskConfig> = {
  copy:       { model: "anthropic/claude-sonnet-4", provider: "openrouter", fallbackModel: "gemini-2.5-flash", fallbackProvider: "gemini" },
  strategy:   { model: "anthropic/claude-opus-4", provider: "openrouter", fallbackModel: "gemini-2.5-pro", fallbackProvider: "gemini" },
  classify:   { model: "gemini-2.5-flash", provider: "gemini", fallbackModel: "anthropic/claude-sonnet-4", fallbackProvider: "openrouter" },
  suggest:    { model: "gemini-2.5-flash", provider: "gemini", fallbackModel: "anthropic/claude-sonnet-4", fallbackProvider: "openrouter" },
  image:      { model: "google/gemini-3-pro-image-preview", provider: "openrouter" },
  image_hq:   { model: "google/gemini-3-pro-image-preview", provider: "openrouter" },
  analyze:    { model: "anthropic/claude-sonnet-4", provider: "openrouter", fallbackModel: "gemini-2.5-flash", fallbackProvider: "gemini" },
  tag_image:  { model: "gemini-2.5-flash", provider: "gemini", fallbackModel: "google/gemini-2.5-flash", fallbackProvider: "openrouter" },
  video:      { model: "anthropic/claude-sonnet-4", provider: "openrouter", fallbackModel: "gemini-2.5-pro", fallbackProvider: "gemini" },
  reference:  { model: "anthropic/claude-sonnet-4", provider: "openrouter", fallbackModel: "gemini-2.5-flash", fallbackProvider: "gemini" },
  auto:       { model: "openrouter/auto", provider: "openrouter", fallbackModel: "gemini-2.5-flash", fallbackProvider: "gemini" },
};

const COST_MAP: Record<string, { input: number; output: number }> = {
  "anthropic/claude-sonnet-4": { input: 3, output: 15 },
  "anthropic/claude-opus-4": { input: 15, output: 75 },
  "openrouter/auto": { input: 2, output: 8 },
  "google/gemini-3-pro-image-preview": { input: 2, output: 12 },
  "google/gemini-2.5-flash": { input: 0.15, output: 0.6 },
  "google/gemini-2.5-pro": { input: 1.25, output: 10 },
  "gemini-2.5-flash": { input: 0.15, output: 0.6 },
  "gemini-2.5-pro": { input: 1.25, output: 10 },
};

function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  const rates = COST_MAP[model] || { input: 1, output: 4 };
  return (tokensIn * rates.input + tokensOut * rates.output) / 1_000_000;
}

async function callProvider(
  provider: Provider,
  model: string,
  messages: unknown[],
  options: Record<string, unknown> = {},
): Promise<Response> {
  if (provider === "openrouter") {
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) throw new Error("OPENROUTER_API_KEY não configurada");
    return fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://dqef.app",
        "X-Title": "DQEF Studio",
      },
      body: JSON.stringify({ model, messages, ...options }),
    });
  }

  // Gemini API (OpenAI-compatible endpoint)
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");
  return fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, ...options }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (token !== serviceRoleKey) {
      const supabaseAuth = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { error: authError } = await supabaseAuth.auth.getUser();
      if (authError) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { task_type, messages, options = {}, user_id, function_name = "ai-router" } = await req.json();
    if (!task_type || !messages) {
      return new Response(JSON.stringify({ error: "task_type e messages são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = TASK_CONFIG[task_type] || TASK_CONFIG["auto"];
    let usedModel = config.model;
    let usedProvider: Provider = config.provider;
    let response: Response;

    try {
      response = await callProvider(config.provider, config.model, messages, options);
      if (!response.ok && config.fallbackModel && config.fallbackProvider) {
        console.warn(`Primary ${config.provider}/${config.model} failed (${response.status}), trying fallback`);
        response = await callProvider(config.fallbackProvider, config.fallbackModel, messages, options);
        usedModel = config.fallbackModel;
        usedProvider = config.fallbackProvider;
      }
    } catch (primaryError) {
      if (config.fallbackModel && config.fallbackProvider) {
        console.warn(`Primary ${config.provider} error, trying fallback:`, primaryError);
        response = await callProvider(config.fallbackProvider, config.fallbackModel, messages, options);
        usedModel = config.fallbackModel;
        usedProvider = config.fallbackProvider;
      } else throw primaryError;
    }

    if (!response!.ok) {
      const status = response!.status;
      if (status === 429)
        return new Response(JSON.stringify({ error: "Rate limit atingido. Aguarde." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (status === 402)
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      const errBody = await response!.text().catch(() => "");
      return new Response(JSON.stringify({ error: `Erro IA (${usedProvider}): ${status}`, detail: errBody }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response!.json();
    const latencyMs = Date.now() - startTime;
    const tokensIn = data.usage?.prompt_tokens || 0;
    const tokensOut = data.usage?.completion_tokens || 0;
    const costEstimate = estimateCost(usedModel, tokensIn, tokensOut);

    // Log usage async
    if (user_id) {
      const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      supabaseAdmin
        .from("ai_usage_log")
        .insert({
          user_id,
          function_name,
          task_type,
          model_used: usedModel,
          provider: usedProvider,
          tokens_input: tokensIn,
          tokens_output: tokensOut,
          cost_estimate: costEstimate,
          latency_ms: latencyMs,
          success: true,
        })
        .then(({ error }) => { if (error) console.error("Log error:", error); });
    }

    return new Response(
      JSON.stringify({
        ...data,
        _meta: { model: usedModel, provider: usedProvider, task_type, latency_ms: latencyMs, cost_estimate: costEstimate },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
