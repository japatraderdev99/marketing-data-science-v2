import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
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
  const slideRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<ActivePanel>('none');
  const [copied, setCopied] = useState(false);
  const typeLabel = TYPE_LABELS[slide.type] || slide.type;
  const s = settings || DEFAULT_SLIDE_SETTINGS;

  const togglePanel = (p: ActivePanel) => setPanel(prev => prev === p ? 'none' : p);

  const handleExportPng = async () => {
    if (!slideRef.current) return;
    const dataUrl = await toPng(slideRef.current, {
      width: 1080, height: 1350, pixelRatio: 1,
      style: { transform: `scale(${1080 / 340})`, transformOrigin: 'top left' },
    });
    const link = document.createElement('a');
    link.download = `slide-${slide.number}-${slide.type}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(`${slide.headline}\n${slide.subtext || ''}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-1.5">
      {/* Preview */}
      <div className="relative">
        <SlidePreview ref={slideRef} slide={slide} theme={theme} imageUrl={imageUrl} settings={s} />
        {/* Slide badge */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-brand bg-black/60 px-1.5 py-0.5 rounded">
            {typeLabel}
          </span>
          {imageUrl && (
            <span className="text-[9px] text-emerald-400 bg-black/60 px-1.5 py-0.5 rounded">● img</span>
          )}
        </div>
      </div>

      {/* Persistent action bar */}
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
          onClick={() => { togglePanel('controls'); if (isEditing) onToggleEdit?.(); }}
          title="Controles de edição"
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
        <button onClick={handleExportPng} title="Download PNG" className="p-1 rounded text-text-muted hover:text-brand transition-colors">
          <Download className="w-3 h-3" />
        </button>
      </div>

      {/* Image controls panel */}
      {panel === 'image' && onUpdateImage && (
        <SlideImageControls
          slideNumber={slide.number}
          imagePromptSuggestion={slide.visualDirection || ''}
          currentImageUrl={imageUrl}
          onImageChange={onUpdateImage}
        />
      )}

      {/* Style controls panel */}
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

      {/* Inline text editing */}
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
