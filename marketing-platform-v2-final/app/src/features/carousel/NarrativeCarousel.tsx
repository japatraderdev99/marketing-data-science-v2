import { useState, useEffect, useRef } from 'react';
import { Sparkles, Loader2, Copy, RotateCcw, Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import type { NarrativeThemeId, NarrativeSlide } from '@/types';
import { NarrativeSlidePreview } from './components/NarrativeSlidePreview';
import type { NarrativeSlideSettings } from './components/NarrativeSlidePreview';
import { NarrativeSlideCard } from './components/NarrativeSlideCard';
import { StrategyContext } from '@/components/shared/StrategyContext';
import { useNarrativeGeneration } from '@/hooks/useNarrativeGeneration';
import { useSaveDraft } from '@/features/criativo/hooks/useCreativeDrafts';
import { cn } from '@/lib/utils';

const THEMES: { id: NarrativeThemeId; label: string; swatch: string; desc: string }[] = [
  { id: 'dqef-editorial', label: 'DQEF',  swatch: '#F7F2EB', desc: 'Editorial alternado' },
  { id: 'editorial-dark', label: 'Dark',  swatch: '#0F0F0F', desc: 'Escuro premium' },
  { id: 'editorial-cream',label: 'Cream', swatch: '#F5F0E8', desc: 'Editorial claro' },
  { id: 'brand-bold',     label: 'Bold',  swatch: '#E8603C', desc: 'Laranja impacto' },
];

const DEFAULT_SS: NarrativeSlideSettings = {
  headlineScale: 1.0, bodyScale: 1.0,
  imageOpacity: 1.0, imageZoom: 1.0, imageOffsetY: 0,
};

export function NarrativeCarousel() {
  const { carousel, setCarousel, isGenerating, error, generate, reset } = useNarrativeGeneration();
  const saveDraft = useSaveDraft();
  const savedTitleRef = useRef<string | null>(null);

  const [topic, setTopic]               = useState('');
  const [audienceAngle, setAudienceAngle] = useState('');
  const [numSlides, setNumSlides]       = useState(10);
  const [themeOverride, setThemeOverride] = useState<NarrativeThemeId>('dqef-editorial');
  const [settingsMap, setSettingsMap]   = useState<Record<number, NarrativeSlideSettings>>({});
  const [imageMap, setImageMap]         = useState<Record<number, string | null>>({});
  const [exporting, setExporting]       = useState(false);

  const activeTheme = (themeOverride || carousel?.theme || 'dqef-editorial') as NarrativeThemeId;
  const totalSlides = carousel?.slides.length ?? 0;

  // Auto-save draft when title changes
  useEffect(() => {
    if (!carousel || savedTitleRef.current === carousel.title) return;
    savedTitleRef.current = carousel.title;
    saveDraft.mutate({
      type: 'carousel_narrative', title: carousel.title,
      data: carousel as unknown as Record<string, unknown>,
    });
  }, [carousel?.title]); // eslint-disable-line react-hooks/exhaustive-deps

  const getSettings = (n: number): NarrativeSlideSettings => settingsMap[n] || { ...DEFAULT_SS };

  const updateSettings = (n: number, updates: Partial<NarrativeSlideSettings>) =>
    setSettingsMap(prev => ({ ...prev, [n]: { ...getSettings(n), ...updates } }));

  const updateImage = (n: number, url: string | null) =>
    setImageMap(prev => ({ ...prev, [n]: url }));

  const updateSlide = (index: number, updates: Partial<NarrativeSlide>) => {
    if (!carousel) return;
    const slides = [...carousel.slides];
    slides[index] = { ...slides[index], ...updates };
    setCarousel({ ...carousel, slides });
  };

  const handleGenerate = () => {
    generate({ topic, audience_angle: audienceAngle, tone: 'editorial', channel: 'Instagram Feed', num_slides: numSlides });
    setSettingsMap({});
    setImageMap({});
  };

  const handleExportZip = async () => {
    if (!carousel) return;
    setExporting(true);
    const zip = new JSZip();
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;pointer-events:none;';
    document.body.appendChild(container);
    try {
      for (const slide of carousel.slides) {
        const el = document.createElement('div');
        container.appendChild(el);
        const root = createRoot(el);
        flushSync(() => root.render(
          <NarrativeSlidePreview
            slide={slide} theme={activeTheme}
            imageUrl={imageMap[slide.number]} settings={getSettings(slide.number)}
            totalSlides={totalSlides} width={1080} height={1350} isExport
          />
        ));
        await document.fonts.ready;
        await new Promise(r => setTimeout(r, 100));
        const dataUrl = await toPng(el.firstElementChild as HTMLElement, {
          width: 1080, height: 1350, pixelRatio: 1,
        });
        zip.file(`${String(slide.number).padStart(2,'0')}-${slide.type}.png`, dataUrl.split(',')[1], { base64: true });
        root.unmount();
        el.remove();
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `narrativa_${carousel.title.slice(0, 30).replace(/\s/g, '_')}.zip`);
    } finally {
      document.body.removeChild(container);
      setExporting(false);
    }
  };

  return (
    <div className="flex gap-6 h-full">
      {/* ── Left panel ────────────────────────────────────────────────────── */}
      <div className="w-80 shrink-0 space-y-5 overflow-y-auto pr-2 scrollbar-thin">
        <StrategyContext />

        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Tema / Tópico</label>
          <textarea value={topic} onChange={(e) => setTopic(e.target.value)}
            placeholder="Ex: Por que autônomos perdem clientes sem presença digital..."
            className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted resize-none focus:border-brand outline-none"
            rows={3} />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Ângulo de Audiência</label>
          <input value={audienceAngle} onChange={(e) => setAudienceAngle(e.target.value)}
            placeholder="Ex: dor do autônomo sem clientes..."
            className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand outline-none" />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Slides</label>
          <div className="flex gap-2">
            {[7, 8, 9, 10].map((n) => (
              <button key={n} onClick={() => setNumSlides(n)}
                className={cn('flex-1 py-2 rounded-lg text-sm font-medium border transition-all',
                  numSlides === n ? 'border-brand text-brand bg-brand/10' : 'border-border text-text-muted hover:border-text-muted')}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Template Visual</label>
          <div className="grid grid-cols-2 gap-1.5">
            {THEMES.map((t) => (
              <button key={t.id} onClick={() => setThemeOverride(t.id)}
                className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all',
                  activeTheme === t.id ? 'border-brand bg-brand/10 text-brand' : 'border-border text-text-muted hover:border-text-muted')}>
                <div className="w-3.5 h-3.5 rounded-full border border-white/10 shrink-0" style={{ backgroundColor: t.swatch }} />
                <div className="text-left">
                  <div>{t.label}</div>
                  <div className="text-[9px] opacity-60">{t.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleGenerate} disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand hover:bg-brand-dark text-white rounded-lg text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50">
          {isGenerating
            ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando...</>
            : <><Sparkles className="w-4 h-4" />Gerar Narrativa</>}
        </button>

        {carousel && (
          <div className="flex gap-2">
            <button onClick={handleExportZip} disabled={exporting}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exporting ? 'Exportando...' : 'Export ZIP'}
            </button>
            <button onClick={() => { reset(); setSettingsMap({}); setImageMap({}); }}
              className="px-3 py-2.5 border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
        )}
      </div>

      {/* ── Right: slide grid ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-8">
        {!carousel && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-brand/10 flex items-center justify-center mb-4">
              <span className="text-4xl">📖</span>
            </div>
            <h2 className="font-heading font-bold text-lg text-text-primary mb-1">Carrossel Narrativo</h2>
            <p className="text-sm text-text-muted max-w-sm">
              7-10 slides editoriais com storytelling profundo. Conteúdo que gera save e share.
            </p>
          </div>
        )}

        {isGenerating && (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <div className="w-16 h-16 rounded-2xl bg-brand/20 flex items-center justify-center mb-4 animate-pulse">
              <span className="text-3xl">✍️</span>
            </div>
            <p className="text-sm text-text-secondary animate-pulse">Construindo narrativa editorial...</p>
          </div>
        )}

        {carousel && (
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-1.5">
              <h2 className="font-heading font-black text-xl uppercase text-text-primary">{carousel.title}</h2>
              <p className="text-xs text-text-secondary">{carousel.narrative_arc}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded font-medium">
                  {carousel.shareability_hook}
                </span>
                <span className="text-[10px] text-text-muted">{carousel.bestTime}</span>
              </div>
            </div>

            {/* Slide grid */}
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              {carousel.slides.map((slide, i) => (
                <NarrativeSlideCard
                  key={slide.number}
                  slide={slide}
                  slideIndex={i}
                  theme={activeTheme}
                  totalSlides={totalSlides}
                  settings={getSettings(slide.number)}
                  imageUrl={imageMap[slide.number] ?? null}
                  onUpdateSlide={updateSlide}
                  onUpdateSettings={updateSettings}
                  onImageChange={updateImage}
                />
              ))}
            </div>

            {/* Caption */}
            {carousel.caption && (
              <div className="bg-surface-elevated rounded-xl border border-border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Caption</span>
                  <button onClick={() => navigator.clipboard.writeText(carousel.caption)}
                    className="text-text-muted hover:text-brand p-1">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-sm text-text-primary whitespace-pre-line leading-relaxed">{carousel.caption}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
