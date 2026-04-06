import { useState, useCallback } from 'react';
import { Copy, RotateCcw } from 'lucide-react';
import type { CarouselThemeId, SlideOutput, SlideSettings } from '@/types';
import { DEFAULT_SLIDE_SETTINGS } from '@/types';
import { CAROUSEL_THEMES } from './constants';
import { CarouselInputPanel } from './components/CarouselInputPanel';
import { SlideCard } from './components/SlideCard';
import { ThemeSelector } from './components/ThemeSelector';
import { BatchExportButton } from './components/BatchExportButton';
import { useCarouselGeneration } from '@/hooks/useCarouselGeneration';
import { useImageGeneration } from '@/hooks/useImageGeneration';

export function DirectCarousel() {
  const { carousel, setCarousel, isGenerating, error, generate, reset } = useCarouselGeneration();
  const [themeId, setThemeId] = useState<CarouselThemeId>('brand-orange');
  const [editingSlide, setEditingSlide] = useState<number | null>(null);
  const [settingsMap, setSettingsMap] = useState<Record<number, SlideSettings>>({});
  const [slideImages, setSlideImages] = useState<Record<number, string>>({});

  const theme = CAROUSEL_THEMES.find((t) => t.id === themeId) || CAROUSEL_THEMES[0];
  const { generatingId, generateForVariation, searchLibraryForOne } = useImageGeneration();

  const getSettings = (num: number): SlideSettings => settingsMap[num] || { ...DEFAULT_SLIDE_SETTINGS };

  const updateSettings = (num: number, updates: Partial<SlideSettings>) => {
    setSettingsMap(prev => ({ ...prev, [num]: { ...getSettings(num), ...updates } }));
  };

  const handleUpdateSlide = (index: number, updated: SlideOutput) => {
    if (!carousel) return;
    const slides = [...carousel.slides];
    slides[index] = updated;
    setCarousel({ ...carousel, slides });
  };

  const handleSlideImageUpdate = useCallback((slideNum: string, url: string) => {
    setSlideImages(prev => ({ ...prev, [slideNum]: url }));
  }, []);

  const handleReset = () => {
    reset();
    setSettingsMap({});
    setSlideImages({});
    setEditingSlide(null);
  };

  const copyCaption = () => {
    if (carousel?.caption) navigator.clipboard.writeText(carousel.caption);
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Left: Input Panel */}
      <div className="w-80 shrink-0 space-y-5 overflow-y-auto pr-2">
        <CarouselInputPanel onGenerate={generate} isGenerating={isGenerating} />

        {carousel && (
          <>
            <ThemeSelector value={themeId} onChange={setThemeId} />
            <div className="flex gap-2">
              <BatchExportButton slides={carousel.slides} theme={theme} title={carousel.title} settingsMap={settingsMap} slideImages={slideImages} />
              <button onClick={handleReset} className="flex items-center gap-2 px-3 py-2.5 border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors">
                <RotateCcw className="w-4 h-4" />
                Novo
              </button>
            </div>
          </>
        )}

        {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
      </div>

      {/* Right: Preview */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-8">
        {!carousel && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-brand/10 flex items-center justify-center mb-4"><span className="text-4xl">🎨</span></div>
            <h2 className="font-heading font-bold text-lg text-text-primary mb-1">Carrossel Direto</h2>
            <p className="text-sm text-text-muted max-w-sm">5 slides de impacto. Preencha o briefing ou deixe vazio para o modo autônomo decidir.</p>
          </div>
        )}

        {isGenerating && (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <div className="w-16 h-16 rounded-2xl bg-brand/20 flex items-center justify-center mb-4 animate-pulse"><span className="text-3xl">✨</span></div>
            <p className="text-sm text-text-secondary animate-pulse">Criando seu carrossel com IA...</p>
          </div>
        )}

        {carousel && (
          <>
            {/* Header */}
            <div className="space-y-2">
              <h2 className="font-heading font-black text-xl uppercase text-text-primary">{carousel.title}</h2>
              <div className="flex items-center gap-3 text-xs text-text-muted">
                <span>{carousel.angleEmoji} {carousel.angle}</span>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span>{carousel.channel}</span>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span>{carousel.bestTime}</span>
              </div>
              <p className="text-xs text-text-secondary italic">{carousel.angleRationale}</p>
            </div>

            {/* Slides horizontal strip */}
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
              {carousel.slides.map((slide) => (
                <div key={slide.number} className="snap-start shrink-0 w-[340px]">
                  <SlideCard
                    slide={slide}
                    theme={theme}
                    imageUrl={slideImages[slide.number]}
                    settings={getSettings(slide.number)}
                    isEditing={editingSlide === slide.number}
                    isGeneratingImage={generatingId === `slide-${slide.number}`}
                    onToggleEdit={() => setEditingSlide(editingSlide === slide.number ? null : slide.number)}
                    onUpdateSlide={(updated) => handleUpdateSlide(slide.number - 1, updated)}
                    onUpdateSettings={(updates) => updateSettings(slide.number, updates)}
                    onUpdateImage={(url) => {
                      if (url) setSlideImages(prev => ({ ...prev, [slide.number]: url }));
                      else setSlideImages(prev => { const n = { ...prev }; delete n[slide.number]; return n; });
                    }}
                    onGenerateImage={(prompt) =>
                      generateForVariation(`slide-${slide.number}`, prompt, handleSlideImageUpdate)
                    }
                    onSearchLibrary={() =>
                      searchLibraryForOne(
                        { id: `slide-${slide.number}`, headline: slide.headline, subtext: slide.subtext || '', cta: '', style: 'impact-direct', status: 'done', imagePrompt: slide.imagePrompt || undefined },
                        carousel.angle,
                      )
                    }
                  />
                </div>
              ))}
            </div>

            {/* Caption */}
            {carousel.caption && (
              <div className="bg-surface-elevated rounded-xl border border-border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Caption</span>
                  <button onClick={copyCaption} className="text-text-muted hover:text-brand p-1"><Copy className="w-3.5 h-3.5" /></button>
                </div>
                <p className="text-sm text-text-primary whitespace-pre-line leading-relaxed">{carousel.caption}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
