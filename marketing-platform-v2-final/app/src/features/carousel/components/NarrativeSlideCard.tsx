import { useState } from 'react';
import { Download, Loader2, Minimize2, RefreshCw, ImagePlus, SlidersHorizontal, Pencil } from 'lucide-react';
import { toPng } from 'html-to-image';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import type { NarrativeSlide, NarrativeThemeId } from '@/types';
import { callAI } from '@/lib/ai';
import { cn } from '@/lib/utils';
import { NarrativeSlidePreview } from './NarrativeSlidePreview';
import type { NarrativeSlideSettings } from './NarrativeSlidePreview';
import { SlideImageControls } from './SlideImageControls';
import { AdjSlider } from './AdjSlider';
import { TYPE_LABELS } from '../constants';

// ── Type badge colors ─────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  hook:     'text-red-400 bg-red-400/10 border-red-400/20',
  context:  'text-blue-400 bg-blue-400/10 border-blue-400/20',
  data:     'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  tension:  'text-orange-400 bg-orange-400/10 border-orange-400/20',
  pivot:    'text-purple-400 bg-purple-400/10 border-purple-400/20',
  proof:    'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  evidence: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  insight:  'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
  cta:      'text-brand bg-brand/10 border-brand/20',
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  slide: NarrativeSlide;
  slideIndex: number;
  theme: NarrativeThemeId;
  totalSlides: number;
  settings: NarrativeSlideSettings;
  imageUrl: string | null;
  onUpdateSlide: (index: number, updates: Partial<NarrativeSlide>) => void;
  onUpdateSettings: (n: number, updates: Partial<NarrativeSlideSettings>) => void;
  onImageChange: (n: number, url: string | null) => void;
}

export function NarrativeSlideCard({
  slide, slideIndex, theme, totalSlides, settings, imageUrl,
  onUpdateSlide, onUpdateSettings, onImageChange,
}: Props) {
  const [showImg,  setShowImg]  = useState(false);
  const [showAdj,  setShowAdj]  = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [isRegen,  setIsRegen]  = useState(false);
  const [isExport, setIsExport] = useState(false);

  // ── AI copy regeneration ──────────────────────────────────────────────────

  const handleRegenCopy = async () => {
    setIsRegen(true);
    try {
      const res = await callAI('strategy', [
        {
          role: 'system',
          content: `Você é um copywriter editorial brasileiro. Reescreva o slide com uma ABORDAGEM COMPLETAMENTE DIFERENTE.
Mude ângulo e estrutura — mantenha o mesmo tema. Headlines em CAIXA ALTA, máx 8 palavras.
Retorne APENAS JSON: { "headline": "NOVA HEADLINE", "bodyText": "Novo texto com **negrito** (2-3 frases)" }`,
        },
        {
          role: 'user',
          content: `Tipo: ${slide.type}\nHeadline: ${slide.headline}\nBody: ${slide.bodyText || '(sem body)'}`,
        },
      ], { temperature: 1.1 });
      const raw = res.choices?.[0]?.message?.content?.trim() || '';
      const match = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        onUpdateSlide(slideIndex, {
          headline: parsed.headline || slide.headline,
          bodyText: parsed.bodyText ?? slide.bodyText,
        });
      }
    } catch (e) {
      console.error('[regen-copy]', e);
    } finally {
      setIsRegen(false);
    }
  };

  // ── Less text ─────────────────────────────────────────────────────────────

  const handleLessText = () => {
    const words = slide.headline.split(' ');
    if (words.length > 3) {
      onUpdateSlide(slideIndex, { headline: words.slice(0, Math.max(3, Math.ceil(words.length * 0.65))).join(' ') });
    }
  };

  // ── Per-slide PNG export ──────────────────────────────────────────────────

  const handleExportSlide = async () => {
    setIsExport(true);
    try {
      const div = document.createElement('div');
      div.style.cssText = 'position:fixed;top:-9999px;left:-9999px;pointer-events:none;';
      document.body.appendChild(div);
      const root = createRoot(div);
      flushSync(() => root.render(
        <NarrativeSlidePreview
          slide={slide} theme={theme} imageUrl={imageUrl} settings={settings}
          totalSlides={totalSlides} width={1080} height={1350} isExport
        />
      ));
      await document.fonts.ready;
      await new Promise(r => setTimeout(r, 100));
      const dataUrl = await toPng(div.firstElementChild as HTMLElement, {
        width: 1080, height: 1350, pixelRatio: 1,
      });
      root.unmount();
      document.body.removeChild(div);
      const a = document.createElement('a');
      a.download = `dqef-${String(slide.number).padStart(2,'0')}-${slide.type}.png`;
      a.href = dataUrl;
      a.click();
    } finally {
      setIsExport(false);
    }
  };

  const typeColor = TYPE_COLORS[slide.type] || 'text-text-muted bg-surface-hover border-border';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-1.5">
      {/* Preview */}
      <div className="relative">
        <NarrativeSlidePreview
          slide={slide} theme={theme} imageUrl={imageUrl}
          settings={settings} totalSlides={totalSlides}
        />
        {imageUrl && (
          <span className="absolute bottom-2 left-2 text-[9px] text-emerald-400 bg-black/60 px-1.5 py-0.5 rounded">
            ● img
          </span>
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-1 bg-surface-elevated rounded-lg border border-border p-1">
        {/* Type badge */}
        <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0', typeColor)}>
          {TYPE_LABELS[slide.type] || slide.type.toUpperCase()}
        </span>
        <div className="flex-1" />
        {/* Less text */}
        <button
          onClick={handleLessText}
          title="Menos texto"
          className="p-1 rounded text-text-muted hover:text-brand hover:bg-brand/10 transition-colors"
        >
          <Minimize2 className="w-3 h-3" />
        </button>
        {/* Image */}
        <button
          onClick={() => { setShowImg(!showImg); setShowAdj(false); setShowEdit(false); }}
          className={cn('flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-medium transition-colors',
            showImg ? 'bg-brand/20 text-brand' : 'text-text-muted hover:text-brand hover:bg-brand/10')}
        >
          <ImagePlus className="w-3 h-3" />
        </button>
        {/* Adjustments */}
        <button
          onClick={() => { setShowAdj(!showAdj); setShowImg(false); setShowEdit(false); }}
          className={cn('flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-medium transition-colors',
            showAdj ? 'bg-brand/20 text-brand' : 'text-text-muted hover:text-brand hover:bg-brand/10')}
        >
          <SlidersHorizontal className="w-3 h-3" />
        </button>
        {/* Edit text */}
        <button
          onClick={() => { setShowEdit(!showEdit); setShowImg(false); setShowAdj(false); }}
          className={cn('flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-medium transition-colors',
            showEdit ? 'bg-brand/20 text-brand' : 'text-text-muted hover:text-brand hover:bg-brand/10')}
        >
          <Pencil className="w-3 h-3" />
        </button>
        {/* AI regen copy */}
        <button
          onClick={handleRegenCopy}
          disabled={isRegen}
          title="Nova copy (IA)"
          className="p-1 rounded text-text-muted hover:text-purple-400 hover:bg-purple-400/10 transition-colors disabled:opacity-40"
        >
          {isRegen ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
        </button>
        <div className="w-px h-4 bg-border mx-0.5" />
        {/* PNG export */}
        <button
          onClick={handleExportSlide}
          disabled={isExport}
          title="Download PNG"
          className="p-1 rounded text-text-muted hover:text-brand transition-colors disabled:opacity-40"
        >
          {isExport ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
        </button>
      </div>

      {/* Image controls */}
      {showImg && (
        <SlideImageControls
          slideNumber={slide.number}
          imagePromptSuggestion={slide.imagePrompt || ''}
          currentImageUrl={imageUrl}
          onImageChange={(url) => onImageChange(slide.number, url)}
          slideContext={{ headline: slide.headline, slideType: slide.type }}
        />
      )}

      {/* Adjustment sliders */}
      {showAdj && (
        <div className="p-3 bg-surface-elevated rounded-lg border border-border space-y-2.5">
          <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Tipografia</p>
          <AdjSlider label="Headline" value={settings.headlineScale ?? 1}
            min={0.5} max={2.0} step={0.05}
            onValueChange={(v) => onUpdateSettings(slide.number, { headlineScale: v })} />
          <AdjSlider label="Body" value={settings.bodyScale ?? 1}
            min={0.5} max={2.0} step={0.05}
            onValueChange={(v) => onUpdateSettings(slide.number, { bodyScale: v })} />
          <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider pt-1">Imagem</p>
          <AdjSlider label="Opacidade" value={settings.imageOpacity ?? 1}
            min={0} max={1} step={0.05}
            onValueChange={(v) => onUpdateSettings(slide.number, { imageOpacity: v })} />
          <AdjSlider label="Zoom" value={settings.imageZoom ?? 1}
            min={1} max={2.5} step={0.1}
            onValueChange={(v) => onUpdateSettings(slide.number, { imageZoom: v })} />
          <AdjSlider label="Offset Y" value={settings.imageOffsetY ?? 0}
            min={-30} max={30} step={1}
            display={`${(settings.imageOffsetY ?? 0) > 0 ? '+' : ''}${settings.imageOffsetY ?? 0}px`}
            onValueChange={(v) => onUpdateSettings(slide.number, { imageOffsetY: v })} />
        </div>
      )}

      {/* Inline text editing */}
      {showEdit && (
        <div className="space-y-2 p-3 bg-surface-elevated rounded-lg border border-border">
          <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Editar Copy</p>
          <textarea
            className="w-full bg-surface-hover border border-border rounded-md px-2.5 py-2 text-xs font-bold uppercase text-text-primary resize-none focus:border-brand outline-none leading-snug"
            value={slide.headline}
            rows={2}
            onChange={(e) => onUpdateSlide(slideIndex, { headline: e.target.value })}
            placeholder="Headline..."
          />
          <textarea
            className="w-full bg-surface-hover border border-border rounded-md px-2.5 py-2 text-xs text-text-secondary resize-none focus:border-brand outline-none leading-relaxed"
            rows={3}
            value={slide.bodyText || ''}
            onChange={(e) => onUpdateSlide(slideIndex, { bodyText: e.target.value || null })}
            placeholder="Body — use **negrito** para destaques"
          />
          <input
            className="w-full bg-surface-hover border border-border rounded-md px-2.5 py-1.5 text-xs text-text-muted focus:border-brand outline-none"
            value={slide.sourceLabel || ''}
            onChange={(e) => onUpdateSlide(slideIndex, { sourceLabel: e.target.value || null })}
            placeholder="Fonte (ex: IBGE, 2024)"
          />
        </div>
      )}
    </div>
  );
}
