import { supabase } from './supabase';
import type { AITaskType } from '@/types';

/** Ensure the session is fresh before calling edge functions. */
async function ensureFreshSession(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  // If access token expires in less than 60 seconds, refresh proactively
  const expiresAt = session.expires_at ?? 0;
  if (expiresAt - Math.floor(Date.now() / 1000) < 60) {
    await supabase.auth.refreshSession();
  }
}

/** Invoke an edge function with automatic session refresh on JWT errors. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function invokeWithRetry<T = any>(
  fn: string,
  body: Record<string, unknown>,
): Promise<T> {
  await ensureFreshSession();

  const { data, error } = await supabase.functions.invoke(fn, { body });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('Invalid JWT') || msg.includes('JWT') || error.status === 401) {
      // Refresh session and retry once
      await supabase.auth.refreshSession();
      const { data: data2, error: error2 } = await supabase.functions.invoke(fn, { body });
      if (error2) throw new Error(await extractFunctionError(error2));
      if ((data2 as Record<string, unknown>)?.error) throw new Error(String((data2 as Record<string, unknown>).error));
      return data2 as T;
    }
    throw new Error(await extractFunctionError(error));
  }

  if ((data as Record<string, unknown>)?.error) throw new Error(String((data as Record<string, unknown>).error));
  return data as T;
}

interface AICallOptions {
  temperature?: number;
  max_tokens?: number;
}

interface AIResponse {
  choices: Array<{ message: { content: string } }>;
  _meta?: {
    model: string;
    provider: string;
    task_type: string;
    latency_ms: number;
    cost_estimate: number;
  };
}

export async function callAI(
  taskType: AITaskType,
  messages: Array<{ role: string; content: string }>,
  options: AICallOptions = {},
): Promise<AIResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  return invokeWithRetry<AIResponse>('ai-router', {
    task_type: taskType,
    messages,
    options,
    user_id: session?.user?.id,
  });
}

async function extractFunctionError(error: unknown): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = (error as any)?.context;
    if (ctx) {
      // FunctionsHttpError: context is a Response object
      if (typeof ctx.json === 'function') {
        const body = await ctx.json();
        return body?.error || body?.message || JSON.stringify(body);
      }
      // Sometimes context is already the parsed body
      if (typeof ctx === 'object' && (ctx.error || ctx.message)) {
        return ctx.error || ctx.message;
      }
    }
  } catch { /* fall through */ }
  return (error as Error)?.message || 'Erro desconhecido';
}

export async function generateCarouselVisual(params: {
  context?: string;
  angle?: string;
  persona?: string;
  channel?: string;
  tone?: string;
}) {
  return invokeWithRetry('generate-carousel-visual', params as Record<string, unknown>);
}

export async function generateNarrativeCarousel(params: {
  topic?: string;
  audience_angle?: string;
  tone?: string;
  channel?: string;
  num_slides?: number;
  researchData?: string;
  researchCitations?: string[];
}) {
  return invokeWithRetry('generate-narrative-carousel', params as Record<string, unknown>);
}

export async function generateCreativeBatch(params: {
  briefing?: string;
  angle?: string;
  channel?: string;
  niches?: string[];
  style?: string;
  count?: number;
}) {
  return invokeWithRetry('generate-creative-batch', params as Record<string, unknown>);
}

export async function generateSlideImage(params: {
  imagePrompt: string;
  quality?: 'standard' | 'hq';
  translateFirst?: boolean;
}): Promise<{ imageUrl: string | null; imageBase64: string | null }> {
  return invokeWithRetry('generate-slide-image', params as Record<string, unknown>);
}

export async function generateSingleAd(params: {
  briefing?: string;
  format?: string;
  angle?: string;
  objective?: string;
  persona?: string;
  userId?: string;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  return invokeWithRetry<{ slide: import('@/types').SlideOutput & { caption: string; hashtags: string[]; cta: string; copyRationale: string }; format: string }>(
    'generate-single-ad',
    { ...params as Record<string, unknown>, userId: params.userId ?? session?.user?.id },
  );
}
