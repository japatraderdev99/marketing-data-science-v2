import { useState, useCallback } from 'react';
import { generateCarouselVisual } from '@/lib/ai';
import type { CarouselOutput } from '@/types';

interface GenerationParams {
  context: string;
  angle: string;
  persona: string;
  channel: string;
  tone: string;
}

export function useCarouselGeneration() {
  const [carousel, setCarousel] = useState<CarouselOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (params: GenerationParams) => {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateCarouselVisual(params);
      const data = result.carousel as CarouselOutput;
      setCarousel(data);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao gerar carrossel';
      setError(msg);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setCarousel(null);
    setError(null);
  }, []);

  return { carousel, setCarousel, isGenerating, error, generate, reset };
}
