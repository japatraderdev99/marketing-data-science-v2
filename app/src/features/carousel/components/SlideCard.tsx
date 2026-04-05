import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import {
  Download, Copy, Pencil, SlidersHorizontal, Check,
  Wand2, Loader2, BookImage, X, ImageIcon,
} from 'lucide-react';
import type { SlideOutput, CarouselTheme, SlideSettings } from '@/types';
import { DEFAULT_SLIDE_SETTINGS } from '@/types';
import { SlidePreview } from './SlidePreview';
import { SlideControls } from './SlideControls';
import { TYPE_LABELS } from '../constants';
import { cn } from '@/lib/utils';
import type { MediaSuggestion } from '@/lib/ai';

interface SlideCardProps {
  slide: SlideOutput;
  theme: CarouselTheme;
  imageUrl?: string | null;
  settings?: SlideSettings;
  isGeneratingImage?: boolean;
  onUpdateSlide?: (updated: SlideOutput) => void;
  onUpdateSettings?: (updates: Partial<SlideSettings>) => void;
  onUpdateImage?: (url: string | null) => void;
  onGenerateImage?: (prompt: string) => void;
  onSearchLibrary?: () => Promise<MediaSuggestion[]>;
  isEditing?: boolean;
  onToggleEdit?: () => void;
}

export function SlideCard({
  slide, theme, imageUrl, settings, isGeneratingImage,
  onUpdateSlide, onUpdateSettings, onUpdateImage,
  onGenerateImage, onSearchLibrary,
  isEditing, onToggleEdit,
}: SlideCardProps) {
  const slideRef = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(false);
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editPrompt, setEditPrompt] = useState(slide.imagePrompt || '');
  const [suggestions, setSuggestions] = useState<MediaSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
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

  const handleSearchLibrary = async () => {
    if (!onSearchLibrary) return;
    setLoadingSuggestions(true);
    const results = await onSearchLibrary();
    setSuggestions(results);
    setLoadingSuggestions(false);
  };

  return (
    <div className="group space-y-2">
      {/* Preview */}
      <div className="shrink-0 relative">
        <SlidePreview ref={slideRef} slide={slide} theme={theme} imageUrl={imageUrl} settings={s} />

        {/* Image generating overlay */}
        {isGeneratingImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-20 rounded-xl">
            <Loader2 className="w-6 h-6 text-brand animate-spin mb-2" />
            <span className="text-xs text-white/80 font-medium">Gerando imagem...</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          {onGenerateImage && (
            <button
              onClick={() => setShowImagePanel(!showImagePanel)}
              className={cn('p-1.5 rounded-md bg-black/60 hover:bg-black/80 text-white', showImagePanel && 'bg-brand/80')}
              title="Imagem"
            >
              <ImageIcon className="w-3.5 h-3.5" />
            </button>
          )}
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

        {/* Quick generate button when no image */}
        {!imageUrl && !isGeneratingImage && onGenerateImage && (
          <div className="absolute bottom-2 right-2 z-20">
            <button
              onClick={() => onGenerateImage(editPrompt || slide.imagePrompt || slide.headline)}
              className="flex items-center gap-1 px-2 py-1 bg-brand/90 hover:bg-brand text-white rounded-md text-[9px] font-semibold transition-all shadow-lg"
            >
              <Wand2 className="w-3 h-3" /> Gerar Imagem
            </button>
          </div>
        )}

        {/* Remove image button */}
        {imageUrl && !isGeneratingImage && onUpdateImage && (
          <div className="absolute bottom-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onUpdateImage(null)}
              className="flex items-center gap-1 px-2 py-1 bg-black/70 hover:bg-black/90 text-white rounded-md text-[9px] font-medium transition-all"
            >
              <X className="w-2.5 h-2.5" /> Remover
            </button>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-brand bg-brand/10 px-2 py-0.5 rounded">{typeLabel}</span>
        <span className="text-text-muted text-[10px]">Slide {slide.number}</span>
        {imageUrl && <span className="text-[9px] text-green-500">IMG</span>}
      </div>

      {/* Image panel */}
      {showImagePanel && onGenerateImage && (
        <div className="p-2 bg-surface-elevated rounded-lg border border-border space-y-2">
          <textarea
            className="w-full bg-surface-hover border border-border rounded px-2 py-1.5 text-[10px] text-text-primary resize-none focus:border-brand outline-none"
            rows={2}
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            placeholder="Prompt de imagem (inglês recomendado)..."
          />
          <div className="flex gap-1">
            <button
              onClick={() => onGenerateImage(editPrompt || slide.imagePrompt || slide.headline)}
              disabled={isGeneratingImage}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-brand hover:bg-brand-dark text-white rounded text-[10px] font-semibold disabled:opacity-50 transition-all"
            >
              {isGeneratingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
              Gerar IA
            </button>
            {onSearchLibrary && (
              <button
                onClick={handleSearchLibrary}
                disabled={loadingSuggestions}
                className="flex items-center gap-1 px-2 py-1.5 border border-border rounded text-[10px] text-text-muted hover:text-brand hover:border-brand disabled:opacity-50 transition-all"
              >
                {loadingSuggestions ? <Loader2 className="w-3 h-3 animate-spin" /> : <BookImage className="w-3 h-3" />}
                Biblioteca
              </button>
            )}
          </div>
          {suggestions.length > 0 && (
            <div className="flex gap-1 overflow-x-auto pb-1">
              {suggestions.map(s => (
                <button
                  key={s.id}
                  onClick={() => { if (onUpdateImage) onUpdateImage(s.url); setShowImagePanel(false); }}
                  className="shrink-0 relative rounded-md overflow-hidden border border-border hover:border-brand transition-all"
                  title={`Score: ${s.score}/10 — ${s.reason}`}
                >
                  <img src={s.url} alt="" className="w-14 h-14 object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] text-center py-0.5">
                    {s.score.toFixed(0)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
          <SlideControls settings={s} headline={slide.headline} onUpdate={onUpdateSettings || (() => {})} compact />
        </div>
      )}

      {/* Logic */}
      {slide.logic && !showControls && !isEditing && !showImagePanel && (
        <p className="text-[10px] text-text-muted leading-snug italic truncate">{slide.logic}</p>
      )}
    </div>
  );
}
