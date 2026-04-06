import { useState, useCallback } from 'react';
import { generateNarrativeCarousel } from '@/lib/ai';
import type { NarrativeCarouselOutput } from '@/types';

interface NarrativeParams {
  topic: string;
  audience_angle: string;
  tone: string;
  channel: string;
  num_slides: number;
}

export function useNarrativeGeneration() {
  const [carousel, setCarousel] = useState<NarrativeCarouselOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (params: NarrativeParams) => {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateNarrativeCarousel(params);
      const data = result.carousel as NarrativeCarouselOutput;
      setCarousel(data);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao gerar carrossel narrativo';
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
