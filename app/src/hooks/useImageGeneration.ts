import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { BatchVariation } from '@/types';
import { generateSlideImage, suggestMedia, saveImageToLibrary } from '@/lib/ai';
import type { MediaSuggestion } from '@/lib/ai';

interface ImageGenProgress {
  current: number;
  total: number;
  matches?: number;
}

interface UseImageGenerationReturn {
  generatingId: string | null;
  generatingAll: boolean;
  searchingLibrary: boolean;
  imageGenProgress: ImageGenProgress | null;
  libraryProgress: ImageGenProgress | null;
  generateForVariation: (id: string, prompt: string, onUpdate: (id: string, url: string) => void) => Promise<void>;
  generateAllImages: (variations: BatchVariation[], onUpdate: (id: string, url: string) => void) => Promise<void>;
  searchLibraryForAll: (variations: BatchVariation[], angle: string, onUpdate: (id: string, url: string) => void) => Promise<number>;
  searchLibraryForOne: (variation: BatchVariation, angle: string) => Promise<MediaSuggestion[]>;
}

const BATCH_SIZE_GEN = 2;
const BATCH_SIZE_SEARCH = 3;
const MIN_MATCH_SCORE = 7;

export function useImageGeneration(): UseImageGenerationReturn {
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [searchingLibrary, setSearchingLibrary] = useState(false);
  const [imageGenProgress, setImageGenProgress] = useState<ImageGenProgress | null>(null);
  const [libraryProgress, setLibraryProgress] = useState<ImageGenProgress | null>(null);

  const buildFullPrompt = (prompt: string) =>
    `Professional marketing social media ad. ${prompt}. Clean, modern, high quality. ` +
    `Show diverse Brazilian workers in professional, dignified settings. ` +
    `Documentary photography style, raw authenticity. ` +
    `NO favelas, NO poverty imagery, NO racial stereotypes. NO text or words in the image.`;

  const resolveImageUrl = (data: { imageUrl: string | null; imageBase64: string | null }): string | null => {
    // Priority: direct URL > data URI already in imageUrl > raw base64
    if (data.imageUrl) return data.imageUrl;
    if (data.imageBase64) return `data:image/png;base64,${data.imageBase64}`;
    return null;
  };

  const generateForVariation = useCallback(async (
    id: string,
    prompt: string,
    onUpdate: (id: string, url: string) => void,
  ) => {
    setGeneratingId(id);
    try {
      const fullPrompt = buildFullPrompt(prompt);
      const data = await generateSlideImage({ imagePrompt: fullPrompt, quality: 'standard' });
      const url = resolveImageUrl(data);
      if (url) {
        onUpdate(id, url);
        saveImageToLibrary(url, prompt).catch(() => {});
        toast.success('Imagem gerada!');
      } else {
        toast.error('Nenhuma imagem retornada pela IA');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao gerar imagem';
      console.error('Image gen error:', msg);
      toast.error(msg);
    } finally {
      setGeneratingId(null);
    }
  }, []);

  const generateAllImages = useCallback(async (
    variations: BatchVariation[],
    onUpdate: (id: string, url: string) => void,
  ) => {
    const pending = variations.filter(v => !v.mediaUrl && v.imagePrompt);
    if (!pending.length) {
      toast.info('Todas as variações já possuem imagem');
      return;
    }

    setGeneratingAll(true);
    setImageGenProgress({ current: 0, total: pending.length });
    let done = 0;

    for (let i = 0; i < pending.length; i += BATCH_SIZE_GEN) {
      const chunk = pending.slice(i, i + BATCH_SIZE_GEN);
      const results = await Promise.allSettled(
        chunk.map(v =>
          generateSlideImage({
            imagePrompt: buildFullPrompt(v.imagePrompt!),
            quality: 'standard',
          }),
        ),
      );

      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        if (r.status === 'fulfilled') {
          const url = resolveImageUrl(r.value);
          if (url) {
            onUpdate(chunk[j].id, url);
            saveImageToLibrary(url, chunk[j].imagePrompt || chunk[j].headline).catch(() => {});
          }
        } else {
          console.warn(`Batch image gen failed for ${chunk[j].id}:`, r.reason);
        }
      }

      done += chunk.length;
      setImageGenProgress({ current: done, total: pending.length });
    }

    setGeneratingAll(false);
    setImageGenProgress(null);
    toast.success(`${pending.length} imagens geradas!`);
  }, []);

  const searchLibraryForAll = useCallback(async (
    variations: BatchVariation[],
    angle: string,
    onUpdate: (id: string, url: string) => void,
  ): Promise<number> => {
    const withoutImage = variations.filter(v => !v.mediaUrl);
    if (!withoutImage.length) {
      toast.info('Todas as variações já possuem imagem');
      return 0;
    }

    setSearchingLibrary(true);
    setLibraryProgress({ current: 0, total: withoutImage.length, matches: 0 });
    let matches = 0;

    for (let i = 0; i < withoutImage.length; i += BATCH_SIZE_SEARCH) {
      const chunk = withoutImage.slice(i, i + BATCH_SIZE_SEARCH);
      const results = await Promise.allSettled(
        chunk.map(v =>
          suggestMedia({
            headline: v.headline,
            subtext: v.subtext,
            imagePrompt: v.imagePrompt,
            angle,
          }),
        ),
      );

      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        if (r.status === 'fulfilled') {
          const top = r.value.suggestions?.[0];
          if (top && top.score >= MIN_MATCH_SCORE) {
            onUpdate(chunk[j].id, top.url);
            matches++;
          }
        }
      }

      setLibraryProgress({
        current: Math.min(i + chunk.length, withoutImage.length),
        total: withoutImage.length,
        matches,
      });
    }

    setSearchingLibrary(false);
    setLibraryProgress(null);

    const remaining = withoutImage.length - matches;
    if (matches > 0) {
      toast.success(`${matches} imagens da biblioteca!`, {
        description: remaining > 0 ? `${remaining} sem match — gere com IA.` : 'Todas preenchidas!',
      });
    } else {
      toast.info('Nenhum match na biblioteca. Use "Gerar Todas" para criar com IA.');
    }

    return matches;
  }, []);

  const searchLibraryForOne = useCallback(async (
    variation: BatchVariation,
    angle: string,
  ): Promise<MediaSuggestion[]> => {
    try {
      const { suggestions } = await suggestMedia({
        headline: variation.headline,
        subtext: variation.subtext,
        imagePrompt: variation.imagePrompt,
        angle,
      });
      return suggestions;
    } catch {
      return [];
    }
  }, []);

  return {
    generatingId,
    generatingAll,
    searchingLibrary,
    imageGenProgress,
    libraryProgress,
    generateForVariation,
    generateAllImages,
    searchLibraryForAll,
    searchLibraryForOne,
  };
}
