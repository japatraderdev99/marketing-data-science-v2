import { supabase } from './supabase';
import type { AITaskType } from '@/types';

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

  const { data, error } = await supabase.functions.invoke('ai-router', {
    body: {
      task_type: taskType,
      messages,
      options,
      user_id: session?.user?.id,
    },
  });

  if (error) throw new Error(error.message || 'Erro na chamada de IA');
  if (data?.error) throw new Error(data.error);
  return data as AIResponse;
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
  const { data, error } = await supabase.functions.invoke('generate-carousel-visual', {
    body: params,
  });

  if (error) { console.error('[generate-carousel-visual]', error); throw new Error(await extractFunctionError(error)); }
  if (data?.error) throw new Error(data.error);
  return data;
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
  const { data, error } = await supabase.functions.invoke('generate-narrative-carousel', {
    body: params,
  });

  if (error) { console.error('[generate-narrative-carousel]', error); throw new Error(await extractFunctionError(error)); }
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function generateCreativeBatch(params: {
  briefing?: string;
  angle?: string;
  channel?: string;
  niches?: string[];
  style?: string;
  count?: number;
}) {
  const { data, error } = await supabase.functions.invoke('generate-creative-batch', {
    body: params,
  });

  if (error) { console.error('[generate-creative-batch]', error); throw new Error(await extractFunctionError(error)); }
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function generateSlideImage(params: {
  imagePrompt: string;
  quality?: 'standard' | 'hq';
  translateFirst?: boolean;
}): Promise<{ imageUrl: string | null; imageBase64: string | null }> {
  const { data, error } = await supabase.functions.invoke('generate-slide-image', {
    body: params,
  });

  if (error) { console.error('[generate-slide-image]', error); throw new Error(await extractFunctionError(error)); }
  if (data?.error) throw new Error(data.error);
  return data;
}
