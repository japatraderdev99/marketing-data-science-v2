import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Download, Copy, Pencil, SlidersHorizontal, Check } from 'lucide-react';
import type { SlideOutput, CarouselTheme, SlideSettings } from '@/types';
import { DEFAULT_SLIDE_SETTINGS } from '@/types';
import { SlidePreview } from './SlidePreview';
import { SlideControls } from './SlideControls';
import { TYPE_LABELS } from '../constants';
import { cn } from '@/lib/utils';

interface SlideCardProps {
  slide: SlideOutput;
  theme: CarouselTheme;
  imageUrl?: string | null;
  settings?: SlideSettings;
  onUpdateSlide?: (updated: SlideOutput) => void;
  onUpdateSettings?: (updates: Partial<SlideSettings>) => void;
  isEditing?: boolean;
  onToggleEdit?: () => void;
}

export function SlideCard({ slide, theme, imageUrl, settings, onUpdateSlide, onUpdateSettings, isEditing, onToggleEdit }: SlideCardProps) {
  const slideRef = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(false);
  const [copied, setCopied] = useState(false);
  const typeLabel = TYPE_LABELS[slide.type] || slide.type;
  const s = settings || DEFAULT_SLIDE_SETTINGS;

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

  const handleSettingsUpdate = (updates: Partial<SlideSettings>) => {
    if (onUpdateSettings) onUpdateSettings(updates);
  };

  return (
    <div className="group space-y-2">
      {/* Preview */}
      <div className="shrink-0 relative">
        <SlidePreview ref={slideRef} slide={slide} theme={theme} imageUrl={imageUrl} settings={s} />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button onClick={() => setShowControls(!showControls)} className={cn('p-1.5 rounded-md bg-black/60 hover:bg-black/80 text-white', showControls && 'bg-brand/80')} title="Controles">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleExportPng} className="p-1.5 rounded-md bg-black/60 hover:bg-black/80 text-white" title="Download PNG">
            <Download className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleCopyText} className="p-1.5 rounded-md bg-black/60 hover:bg-black/80 text-white" title="Copiar texto">
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {onToggleEdit && (
            <button onClick={onToggleEdit} className={cn('p-1.5 rounded-md bg-black/60 hover:bg-black/80 text-white', isEditing && 'bg-brand/80')} title="Editar texto">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-brand bg-brand/10 px-2 py-0.5 rounded">{typeLabel}</span>
        <span className="text-text-muted text-[10px]">Slide {slide.number}</span>
      </div>

      {/* Inline Editing */}
      {isEditing && onUpdateSlide && (
        <div className="space-y-1.5">
          <input
            className="w-full bg-surface-hover border border-border rounded px-2 py-1 text-[11px] font-heading font-bold uppercase text-text-primary focus:border-brand outline-none"
            value={slide.headline}
            onChange={(e) => onUpdateSlide({ ...slide, headline: e.target.value })}
          />
          <textarea
            className="w-full bg-surface-hover border border-border rounded px-2 py-1 text-[11px] text-text-secondary resize-none focus:border-brand outline-none"
            rows={2}
            value={slide.subtext || ''}
            onChange={(e) => onUpdateSlide({ ...slide, subtext: e.target.value })}
          />
        </div>
      )}

      {/* Controls panel */}
      {showControls && (
        <div className="p-2 bg-surface-elevated rounded-lg border border-border max-h-72 overflow-y-auto">
          <SlideControls settings={s} headline={slide.headline} onUpdate={handleSettingsUpdate} compact />
        </div>
      )}

      {/* Logic */}
      {slide.logic && !showControls && !isEditing && (
        <p className="text-[10px] text-text-muted leading-snug italic truncate">{slide.logic}</p>
      )}
    </div>
  );
}
