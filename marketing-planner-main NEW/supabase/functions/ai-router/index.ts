import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Model routing matrix
const TASK_CONFIG: Record<
  string,
  { model: string; provider: "openrouter" | "lovable"; fallbackModel?: string }
> = {
  copy: {
    model: "anthropic/claude-sonnet-4",
    provider: "openrouter",
    fallbackModel: "google/gemini-2.5-flash",
  },
  strategy: {
    model: "anthropic/claude-opus-4",
    provider: "openrouter",
    fallbackModel: "google/gemini-2.5-pro",
  },
  classify: {
    model: "google/gemini-2.5-flash",
    provider: "lovable",
    fallbackModel: "google/gemini-2.5-flash-lite",
  },
  suggest: {
    model: "google/gemini-2.5-flash",
    provider: "lovable",
    fallbackModel: "google/gemini-2.5-flash-lite",
  },
  image: {
    model: "black-forest-labs/flux-1.1-pro",
    provider: "openrouter",
  },
  image_hq: {
    model: "google/gemini-3-pro-image-preview",
    provider: "lovable",
  },
  image_edit: {
    model: "google/gemini-2.5-flash-image",
    provider: "lovable",
  },
  video: {
    model: "google/gemini-2.5-flash",
    provider: "lovable",
  },
  auto: {
    model: "openrouter/auto",
    provider: "openrouter",
    fallbackModel: "google/gemini-3-flash-preview",
  },
  analyze: {
    model: "anthropic/claude-sonnet-4",
    provider: "openrouter",
    fallbackModel: "google/gemini-2.5-flash",
  },
  frame: {
    model: "google/gemini-2.5-flash-image",
    provider: "lovable",
  },
  weekly_strategy: {
    model: "anthropic/claude-opus-4",
    provider: "openrouter",
    fallbackModel: "google/gemini-2.5-pro",
  },
};

// Cost estimates per 1M tokens (input/output) for logging
const COST_MAP: Record<string, { input: number; output: number }> = {
  "anthropic/claude-sonnet-4": { input: 3, output: 15 },
  "anthropic/claude-opus-4": { input: 15, output: 75 },
  "deepseek/deepseek-chat-v3-0324": { input: 0.14, output: 0.28 },
  "openrouter/auto": { input: 2, output: 8 },
  "black-forest-labs/flux-1.1-pro": { input: 0, output: 0 },
  "google/gemini-2.5-flash": { input: 0.15, output: 0.6 },
  "google/gemini-2.5-flash-lite": { input: 0.075, output: 0.3 },
  "google/gemini-2.5-pro": { input: 1.25, output: 10 },
  "google/gemini-3-flash-preview": { input: 0.15, output: 0.6 },
  "google/gemini-3-pro-image-preview": { input: 1.25, output: 10 },
  "google/gemini-2.5-flash-image": { input: 0.15, output: 0.6 },
};

function estimateCost(
  model: string,
  tokensIn: number,
  tokensOut: number
): number {
  const rates = COST_MAP[model] || { input: 1, output: 4 };
  return (tokensIn * rates.input + tokensOut * rates.output) / 1_000_000;
}

async function callProvider(
  provider: "openrouter" | "lovable",
  model: string,
  messages: unknown[],
  options: Record<string, unknown> = {}
): Promise<Response> {
  const isOpenRouter = provider === "openrouter";
  const url = isOpenRouter ? OPENROUTER_URL : LOVABLE_AI_URL;
  const apiKey = isOpenRouter
    ? Deno.env.get("OPENROUTER_API_KEY")
    : Deno.env.get("LOVABLE_API_KEY");

  if (!apiKey) {
    throw new Error(
      `${isOpenRouter ? "OPENROUTER_API_KEY" : "LOVABLE_API_KEY"} not configured`
    );
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    ...options,
  };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  if (isOpenRouter) {
    headers["HTTP-Referer"] = "https://dqef.lovable.app";
    headers["X-Title"] = "DQEF Marketing Hub";
  }

  return fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // --- Authentication: require valid user JWT or service-role key ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.replace("Bearer ", "");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const isServiceRole = token === serviceRoleKey;

    if (!isServiceRole) {
      const supabaseAuth = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data, error: authError } = await supabaseAuth.auth.getUser();
      if (authError || !data?.user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const {
      task_type,
      messages,
      options = {},
      user_id,
      function_name = "ai-router",
    } = await req.json();

    if (!task_type || !messages) {
      return new Response(
        JSON.stringify({ error: "task_type and messages are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const config = TASK_CONFIG[task_type] || TASK_CONFIG["auto"];
    let usedModel = config.model;
    let usedProvider = config.provider;
    let response: Response;

    // Try primary provider
    try {
      response = await callProvider(
        config.provider,
        config.model,
        messages,
        options
      );

      // If primary fails, try fallback
      if (!response.ok && config.fallbackModel) {
        console.warn(
          `Primary provider ${config.provider}/${config.model} failed (${response.status}), falling back to Lovable AI`
        );
        response = await callProvider(
          "lovable",
          config.fallbackModel,
          messages,
          options
        );
        usedModel = config.fallbackModel;
        usedProvider = "lovable";
      }
    } catch (primaryError) {
      console.error("Primary provider error:", primaryError);
      if (config.fallbackModel) {
        response = await callProvider(
          "lovable",
          config.fallbackModel,
          messages,
          options
        );
        usedModel = config.fallbackModel;
        usedProvider = "lovable";
      } else {
        throw primaryError;
      }
    }

    if (!response!.ok) {
      const status = response!.status;
      const errText = await response!.text();
      console.error(`AI error (${usedProvider}/${usedModel}):`, status, errText);

      if (status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit atingido. Aguarde alguns segundos.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: `AI error: ${status}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response!.json();
    const latencyMs = Date.now() - startTime;
    const tokensIn = data.usage?.prompt_tokens || 0;
    const tokensOut = data.usage?.completion_tokens || 0;
    const costEstimate = estimateCost(usedModel, tokensIn, tokensOut);

    // Log usage asynchronously (don't block response)
    if (user_id) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

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
        .then(({ error }) => {
          if (error) console.error("Failed to log AI usage:", error);
        });
    }

    // Return enriched response
    return new Response(
      JSON.stringify({
        ...data,
        _meta: {
          model: usedModel,
          provider: usedProvider,
          task_type,
          latency_ms: latencyMs,
          cost_estimate: costEstimate,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("ai-router error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
