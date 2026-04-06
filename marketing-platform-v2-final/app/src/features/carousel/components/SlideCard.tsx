import { useState } from 'react';
import { toPng } from 'html-to-image';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Download, Copy, Pencil, SlidersHorizontal, Check, ImagePlus, X } from 'lucide-react';
import type { SlideOutput, CarouselTheme, SlideSettings } from '@/types';
import { DEFAULT_SLIDE_SETTINGS } from '@/types';
import { SlidePreview } from './SlidePreview';
import { SlideControls } from './SlideControls';
import { SlideImageControls } from './SlideImageControls';
import { TYPE_LABELS } from '../constants';
import { cn } from '@/lib/utils';

interface SlideCardProps {
  slide: SlideOutput;
  theme: CarouselTheme;
  imageUrl?: string | null;
  settings?: SlideSettings;
  onUpdateSlide?: (updated: SlideOutput) => void;
  onUpdateSettings?: (updates: Partial<SlideSettings>) => void;
  onUpdateImage?: (url: string | null) => void;
  isEditing?: boolean;
  onToggleEdit?: () => void;
}

type ActivePanel = 'none' | 'image' | 'controls' | 'edit';

export function SlideCard({
  slide, theme, imageUrl, settings, onUpdateSlide,
  onUpdateSettings, onUpdateImage, isEditing, onToggleEdit,
}: SlideCardProps) {
  const [panel, setPanel] = useState<ActivePanel>('none');
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const typeLabel = TYPE_LABELS[slide.type] || slide.type;
  const s = settings || DEFAULT_SLIDE_SETTINGS;

  const togglePanel = (p: ActivePanel) => setPanel(prev => prev === p ? 'none' : p);

  // Off-screen render at full 1080×1350 — WYSIWYG export
  const handleExportPng = async () => {
    setExporting(true);
    try {
      const div = document.createElement('div');
      div.style.cssText = 'position:fixed;top:-9999px;left:-9999px;pointer-events:none;';
      document.body.appendChild(div);
      const root = createRoot(div);
      flushSync(() => root.render(
        <SlidePreview
          slide={slide} theme={theme}
          imageUrl={imageUrl ?? undefined}
          settings={s} width={1080} height={1350}
          showWatermark isExport
        />
      ));
      await document.fonts.ready;
      await new Promise(r => setTimeout(r, 80));
      const dataUrl = await toPng(div.firstElementChild as HTMLElement, { width: 1080, height: 1350, pixelRatio: 1 });
      root.unmount();
      document.body.removeChild(div);
      Object.assign(document.createElement('a'), {
        download: `slide-${slide.number}-${slide.type}.png`,
        href: dataUrl,
      }).click();
    } finally {
      setExporting(false);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(`${slide.headline}\n${slide.subtext || ''}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-1.5">
      {/* Preview — uses CSS scale internally, WYSIWYG */}
      <div className="relative">
        <SlidePreview slide={slide} theme={theme} imageUrl={imageUrl} settings={s} />
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-brand bg-black/60 px-1.5 py-0.5 rounded">
            {typeLabel}
          </span>
          {imageUrl && (
            <span className="text-[9px] text-emerald-400 bg-black/60 px-1.5 py-0.5 rounded">● img</span>
          )}
          {slide.needsMedia && !imageUrl && (
            <span className="text-[9px] text-amber-400 bg-black/60 px-1.5 py-0.5 rounded">📷 sugerida</span>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-1 bg-surface-elevated rounded-lg border border-border p-1">
        <span className="text-[10px] text-text-muted pl-1 shrink-0">#{slide.number}</span>
        <div className="flex-1" />

        <button
          onClick={() => togglePanel('image')}
          title="Imagem de fundo"
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors',
            panel === 'image' ? 'bg-brand/20 text-brand' : 'text-text-muted hover:text-brand hover:bg-brand/10',
          )}
        >
          <ImagePlus className="w-3 h-3" />
          Imagem
        </button>

        <button
          onClick={() => togglePanel('controls')}
          title="Ajustes visuais"
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors',
            panel === 'controls' ? 'bg-brand/20 text-brand' : 'text-text-muted hover:text-brand hover:bg-brand/10',
          )}
        >
          <SlidersHorizontal className="w-3 h-3" />
          Ajustes
        </button>

        <button
          onClick={() => { togglePanel('edit'); onToggleEdit?.(); }}
          title="Editar texto"
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors',
            (panel === 'edit' || isEditing) ? 'bg-brand/20 text-brand' : 'text-text-muted hover:text-brand hover:bg-brand/10',
          )}
        >
          <Pencil className="w-3 h-3" />
          Editar
        </button>

        <div className="w-px h-4 bg-border mx-0.5" />

        <button onClick={handleCopyText} title="Copiar texto" className="p-1 rounded text-text-muted hover:text-brand transition-colors">
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        </button>
        <button onClick={handleExportPng} disabled={exporting} title="Download PNG 1080×1350" className="p-1 rounded text-text-muted hover:text-brand transition-colors disabled:opacity-40">
          <Download className={cn('w-3 h-3', exporting && 'animate-bounce')} />
        </button>
      </div>

      {/* Image panel */}
      {panel === 'image' && onUpdateImage && (
        <SlideImageControls
          slideNumber={slide.number}
          imagePromptSuggestion={slide.imagePrompt || slide.visualDirection || ''}
          currentImageUrl={imageUrl}
          onImageChange={onUpdateImage}
        />
      )}

      {/* Controls panel */}
      {panel === 'controls' && (
        <div className="p-2 bg-surface-elevated rounded-lg border border-border max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Ajustes Visuais</span>
            <button onClick={() => setPanel('none')} className="text-text-muted hover:text-text-primary">
              <X className="w-3 h-3" />
            </button>
          </div>
          <SlideControls settings={s} headline={slide.headline} onUpdate={(u) => onUpdateSettings?.(u)} compact />
        </div>
      )}

      {/* Edit panel */}
      {(panel === 'edit' || isEditing) && onUpdateSlide && (
        <div className="space-y-1.5 p-2 bg-surface-elevated rounded-lg border border-border">
          <input
            className="w-full bg-surface-hover border border-border rounded px-2 py-1 text-[11px] font-heading font-bold uppercase text-text-primary focus:border-brand outline-none"
            value={slide.headline}
            onChange={(e) => onUpdateSlide({ ...slide, headline: e.target.value })}
            placeholder="Headline"
          />
          <textarea
            className="w-full bg-surface-hover border border-border rounded px-2 py-1 text-[11px] text-text-secondary resize-none focus:border-brand outline-none"
            rows={2}
            value={slide.subtext || ''}
            onChange={(e) => onUpdateSlide({ ...slide, subtext: e.target.value })}
            placeholder="Subtexto"
          />
        </div>
      )}

      {/* Logic hint */}
      {panel === 'none' && slide.logic && (
        <p className="text-[10px] text-text-muted leading-snug italic px-1 truncate">{slide.logic}</p>
      )}
    </div>
  );
}
