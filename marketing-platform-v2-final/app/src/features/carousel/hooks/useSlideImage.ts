import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface GenerateImageOptions {
  prompt: string;
  translateFirst?: boolean;
}

interface UseSlideImageReturn {
  isGenerating: boolean;
  isUploading: boolean;
  error: string | null;
  generate: (opts: GenerateImageOptions) => Promise<string | null>;
  upload: (file: File) => Promise<string | null>;
  clearError: () => void;
}

export function useSlideImage(): UseSlideImageReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async ({ prompt, translateFirst = true }: GenerateImageOptions): Promise<string | null> => {
    setIsGenerating(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('generate-slide-image', {
        body: { imagePrompt: prompt, translateFirst },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      return data?.imageDataUrl ?? data?.imageUrl ?? (data?.imageBase64 ? `data:image/png;base64,${data.imageBase64}` : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar imagem');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const upload = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    setError(null);
    try {
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) ?? null);
        reader.onerror = () => { setError('Erro ao ler arquivo'); resolve(null); };
        reader.readAsDataURL(file);
      });
    } finally {
      setIsUploading(false);
    }
  };

  return { isGenerating, isUploading, error, generate, upload, clearError: () => setError(null) };
}
