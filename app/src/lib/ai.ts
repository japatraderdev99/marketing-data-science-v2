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
  return data as AIResponse;
}

export async function generateCarouselVisual(params: {
  context?: string;
  angle?: string;
  persona?: string;
  channel?: string;
  tone?: string;
}) {
  const { data: { session } } = await supabase.auth.getSession();

  const { data, error } = await supabase.functions.invoke('generate-carousel-visual', {
    body: params,
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
  });

  if (error) throw new Error(error.message || 'Erro ao gerar carrossel');
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
  const { data: { session } } = await supabase.auth.getSession();

  const { data, error } = await supabase.functions.invoke('generate-narrative-carousel', {
    body: params,
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
  });

  if (error) throw new Error(error.message || 'Erro ao gerar carrossel narrativo');
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
  const { data: { session } } = await supabase.auth.getSession();

  const { data, error } = await supabase.functions.invoke('generate-creative-batch', {
    body: params,
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
  });

  if (error) throw new Error(error.message || 'Erro ao gerar variações');
  return data;
}

export async function generateSlideImage(params: {
  imagePrompt: string;
  quality?: 'standard' | 'hq';
}): Promise<{ imageUrl: string | null; imageBase64: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();

  const { data, error } = await supabase.functions.invoke('generate-slide-image', {
    body: params,
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
  });

  if (error) throw new Error(error.message || 'Erro ao gerar imagem');
  if (data?.error) throw new Error(data.error);

  // Normalize response — ensure we always have a usable image
  const imageUrl = data?.imageUrl || null;
  const imageBase64 = data?.imageBase64 || null;

  if (!imageUrl && !imageBase64) {
    throw new Error(data?.details?.join('; ') || 'Nenhuma imagem retornada');
  }

  return { imageUrl, imageBase64 };
}

export interface MediaSuggestion {
  id: string;
  url: string;
  score: number;
  reason: string;
  mood?: string;
  tags?: string[];
}

export async function suggestMedia(params: {
  headline: string;
  subtext?: string;
  imagePrompt?: string;
  angle?: string;
}): Promise<{ suggestions: MediaSuggestion[] }> {
  const { data: { session } } = await supabase.auth.getSession();

  const { data, error } = await supabase.functions.invoke('suggest-media', {
    body: { ...params, userId: session?.user?.id },
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
  });

  if (error) return { suggestions: [] };
  return data ?? { suggestions: [] };
}

export async function analyzeReference(params: {
  referenceText: string;
  referenceImageUrl?: string;
  count: number;
  angles: string[];
  channel: string;
  objective: string;
  persona: string;
  styles: { label: string; racional: string }[];
}): Promise<{ success: boolean; result: { analysis: Record<string, string>; variations: Array<Record<string, unknown>> }; _meta?: Record<string, unknown> }> {
  const { data: { session } } = await supabase.auth.getSession();

  const { data, error } = await supabase.functions.invoke('analyze-reference', {
    body: params,
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
  });

  if (error) throw new Error(error.message || 'Erro ao analisar referência');
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function categorizeMedia(params: {
  imageUrl: string;
  mediaId: string;
}): Promise<{ category: string; subcategory?: string; tags: string[]; description: string; dignity_check: boolean }> {
  const { data, error } = await supabase.functions.invoke('categorize-media', {
    body: params,
  });

  if (error) throw new Error(error.message || 'Erro ao categorizar mídia');
  return data;
}

export async function researchTopic(params: {
  topic: string;
  audience?: string;
}): Promise<{ success: boolean; facts: Array<{ claim: string; source: string; year: number; url: string; country: string }>; research: string; citations: string[]; structured: boolean }> {
  const { data: { session } } = await supabase.auth.getSession();

  const { data, error } = await supabase.functions.invoke('research-topic', {
    body: params,
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
  });

  if (error) throw new Error(error.message || 'Erro na pesquisa');
  if (!data?.success) throw new Error(data?.error || 'Pesquisa falhou');
  return data;
}

export async function verifyCarouselFacts(params: {
  slides: Array<{ number: number; headline: string; bodyText?: string | null }>;
  facts: Array<{ claim: string; source: string; year: number; url: string; country: string }>;
}): Promise<{ success: boolean; verification: Array<{ slideNumber: number; overallStatus: string; claims: Array<Record<string, unknown>> }> }> {
  const { data: { session } } = await supabase.auth.getSession();

  const { data, error } = await supabase.functions.invoke('verify-carousel-facts', {
    body: params,
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
  });

  if (error) throw new Error(error.message || 'Erro na verificação');
  return data;
}

export async function saveImageToLibrary(imageUrl: string, context: string): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return null;

  try {
    let finalUrl = imageUrl;

    // If base64, upload to storage for persistence
    if (imageUrl.startsWith('data:image/')) {
      const mimeMatch = imageUrl.match(/^data:(image\/\w+);base64,/);
      const ext = mimeMatch ? mimeMatch[1].split('/')[1] : 'png';
      const base64Data = imageUrl.split(',')[1];
      const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const blob = new Blob([byteArray], { type: mimeMatch?.[1] || 'image/png' });
      const storagePath = `${session.user.id}/ai-gen-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('media-library')
        .upload(storagePath, blob, { contentType: blob.type, upsert: false });
      if (upErr) return null;

      const { data: urlData } = supabase.storage.from('media-library').getPublicUrl(storagePath);
      finalUrl = urlData.publicUrl;
    }

    const { data: insertData, error: insertError } = await supabase
      .from('media_library')
      .insert({
        workspace_id: session.user.id,
        file_name: `ai-gen-${Date.now()}.png`,
        storage_path: finalUrl,
        public_url: finalUrl,
        file_size: 0,
        mime_type: 'image/png',
        ai_description: context.slice(0, 200),
        tagging_status: 'pending',
      })
      .select('id')
      .single();

    if (insertError || !insertData?.id) return null;

    // Trigger auto-tagging in background
    supabase.functions.invoke('tag-media', {
      body: { media_id: insertData.id, image_url: finalUrl },
    }).catch(() => {});

    return insertData.id;
  } catch {
    return null;
  }
}
