import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import {
  Download, SlidersHorizontal, Copy, Trash2, Pencil, Check,
  Wand2, ImageIcon, Loader2, BookImage, X, Upload,
} from 'lucide-react';
import type { BatchVariation, CarouselTheme, SlideSettings, SlideOutput, CreativeFormat } from '@/types';
import { DEFAULT_SLIDE_SETTINGS } from '@/types';
import { SlidePreview } from '@/features/carousel/components/SlidePreview';
import { SlideControls } from '@/features/carousel/components/SlideControls';
import { VISUAL_STYLES } from '@/features/carousel/constants';
import { cn } from '@/lib/utils';
import type { MediaSuggestion } from '@/lib/ai';

interface VariationCardProps {
  variation: BatchVariation;
  theme: CarouselTheme;
  format: CreativeFormat;
  settings: SlideSettings;
  isSelected: boolean;
  isGeneratingImage: boolean;
  onToggleSelect: () => void;
  onUpdateVariation: (updates: Partial<BatchVariation>) => void;
  onUpdateSettings: (updates: Partial<SlideSettings>) => void;
  onRemove: () => void;
  onGenerateImage: (prompt: string) => void;
  onSearchLibrary: () => Promise<MediaSuggestion[]>;
}

export function VariationCard({
  variation, theme, format, settings, isSelected, isGeneratingImage,
  onToggleSelect, onUpdateVariation, onUpdateSettings, onRemove,
  onGenerateImage, onSearchLibrary,
}: VariationCardProps) {
  const slideRef = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editPrompt, setEditPrompt] = useState(variation.imagePrompt || '');
  const [showPrompt, setShowPrompt] = useState(false);
  const [suggestions, setSuggestions] = useState<MediaSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const previewWidth = 300;
  const previewHeight = Math.round(previewWidth * (format.height / format.width));

  const slide: SlideOutput = {
    number: 1, type: 'hook', headline: variation.headline,
    subtext: variation.subtext, headlineHighlight: undefined,
    logic: '', visualDirection: '', needsMedia: false,
    bgStyle: 'dark', layout: 'text-only',
  };

  const handleExportPng = async () => {
    if (!slideRef.current) return;
    const dataUrl = await toPng(slideRef.current, {
      width: format.width, height: format.height, pixelRatio: 1,
      style: { transform: `scale(${format.width / previewWidth})`, transformOrigin: 'top left' },
    });
    const link = document.createElement('a');
    link.download = `criativo-${variation.id.slice(0, 8)}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${variation.headline}\n${variation.subtext || ''}\n${variation.cta || ''}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSearchLibrary = async () => {
    setLoadingSuggestions(true);
    setShowSuggestions(true);
    const results = await onSearchLibrary();
    setSuggestions(results);
    setLoadingSuggestions(false);
  };

  const handleApplySuggestion = (url: string) => {
    onUpdateVariation({ mediaUrl: url });
    setShowSuggestions(false);
  };

  const styleLabel = VISUAL_STYLES.find(s => s.id === variation.style)?.label || variation.style;

  return (
    <div className={cn(
      'group rounded-xl border transition-all',
      isSelected ? 'border-brand bg-brand/5' : 'border-border hover:border-text-muted',
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/50">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={isSelected} onChange={onToggleSelect} className="accent-brand w-3 h-3" />
          <span className="text-[10px] text-text-muted">{styleLabel}</span>
        </label>
        <div className="flex gap-0.5">
          <button onClick={() => { setShowPrompt(!showPrompt); setShowSuggestions(false); }} className={cn('p-1 rounded text-text-muted hover:text-brand transition-colors', showPrompt && 'text-brand bg-brand/10')} title="Imagem IA">
            <ImageIcon className="w-3 h-3" />
          </button>
          <button onClick={() => setShowControls(!showControls)} className={cn('p-1 rounded text-text-muted hover:text-brand transition-colors', showControls && 'text-brand bg-brand/10')} title="Controles">
            <SlidersHorizontal className="w-3 h-3" />
          </button>
          <button onClick={() => setIsEditing(!isEditing)} className={cn('p-1 rounded text-text-muted hover:text-brand transition-colors', isEditing && 'text-brand bg-brand/10')} title="Editar">
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={handleExportPng} className="p-1 rounded text-text-muted hover:text-brand transition-colors" title="PNG">
            <Download className="w-3 h-3" />
          </button>
          <button onClick={handleCopy} className="p-1 rounded text-text-muted hover:text-brand transition-colors" title="Copiar">
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
          </button>
          <button onClick={onRemove} className="p-1 rounded text-text-muted hover:text-red-400 transition-colors" title="Remover">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className={cn('relative', variation.status === 'error' && 'opacity-50')}>
        <SlidePreview
          ref={slideRef} slide={slide} theme={theme}
          width={previewWidth} height={previewHeight}
          settings={settings} imageUrl={variation.mediaUrl}
        />

        {/* Image generation overlay */}
        {isGeneratingImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-20">
            <Loader2 className="w-6 h-6 text-brand animate-spin mb-2" />
            <span className="text-xs text-white/80 font-medium">Gerando imagem...</span>
          </div>
        )}

        {/* No image indicator */}
        {!variation.mediaUrl && !isGeneratingImage && (
          <div className="absolute bottom-2 right-2 z-20">
            <button
              onClick={() => onGenerateImage(editPrompt || variation.imagePrompt || variation.headline)}
              className="flex items-center gap-1 px-2 py-1 bg-brand/90 hover:bg-brand text-white rounded-md text-[9px] font-semibold transition-all shadow-lg"
            >
              <Wand2 className="w-3 h-3" /> Gerar Imagem
            </button>
          </div>
        )}

        {/* Has image: show replace button */}
        {variation.mediaUrl && !isGeneratingImage && (
          <div className="absolute bottom-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onUpdateVariation({ mediaUrl: null })}
              className="flex items-center gap-1 px-2 py-1 bg-black/70 hover:bg-black/90 text-white rounded-md text-[9px] font-medium transition-all"
            >
              <X className="w-2.5 h-2.5" /> Remover Img
            </button>
          </div>
        )}

        {variation.status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
            <span className="text-xs text-red-400 font-medium">Erro na geração</span>
          </div>
        )}
      </div>

      {/* Image prompt panel */}
      {showPrompt && (
        <div className="px-2 py-2 border-t border-border/50 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Prompt de Imagem</p>
            <button onClick={handleSearchLibrary} disabled={loadingSuggestions} className="flex items-center gap-1 text-[9px] text-text-muted hover:text-brand transition-colors">
              {loadingSuggestions ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <BookImage className="w-2.5 h-2.5" />}
              Buscar biblioteca
            </button>
          </div>
          <textarea
            className="w-full bg-surface-hover border border-border rounded px-2 py-1.5 text-[10px] text-text-primary resize-none focus:border-brand outline-none"
            rows={3}
            value={editPrompt}
            onChange={(e) => { setEditPrompt(e.target.value); onUpdateVariation({ imagePrompt: e.target.value }); }}
            placeholder="Describe the image you want..."
          />
          <div className="flex gap-1">
            <button
              onClick={() => onGenerateImage(editPrompt || variation.headline)}
              disabled={isGeneratingImage}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-brand hover:bg-brand-dark text-white rounded text-[10px] font-semibold disabled:opacity-50 transition-all"
            >
              {isGeneratingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
              {isGeneratingImage ? 'Gerando...' : 'Gerar com IA'}
            </button>
          </div>

          {/* Library suggestions */}
          {showSuggestions && (
            <div className="space-y-1">
              <p className="text-[9px] text-text-muted">
                {loadingSuggestions ? 'Buscando...' : suggestions.length ? `${suggestions.length} sugestões:` : 'Nenhuma imagem compatível'}
              </p>
              {suggestions.length > 0 && (
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {suggestions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleApplySuggestion(s.url)}
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
        </div>
      )}

      {/* Inline editing */}
      {isEditing && (
        <div className="px-2 py-2 border-t border-border/50 space-y-1.5">
          <input
            className="w-full bg-surface-hover border border-border rounded px-2 py-1 text-[11px] font-heading font-bold uppercase text-text-primary focus:border-brand outline-none"
            value={variation.headline}
            onChange={(e) => onUpdateVariation({ headline: e.target.value })}
            placeholder="Headline"
          />
          <textarea
            className="w-full bg-surface-hover border border-border rounded px-2 py-1 text-[11px] text-text-secondary resize-none focus:border-brand outline-none"
            rows={2}
            value={variation.subtext}
            onChange={(e) => onUpdateVariation({ subtext: e.target.value })}
            placeholder="Subtexto"
          />
          <input
            className="w-full bg-surface-hover border border-border rounded px-2 py-1 text-[11px] text-text-secondary focus:border-brand outline-none"
            value={variation.cta}
            onChange={(e) => onUpdateVariation({ cta: e.target.value })}
            placeholder="CTA"
          />
        </div>
      )}

      {/* Controls panel */}
      {showControls && (
        <div className="px-2 py-2 border-t border-border/50 max-h-80 overflow-y-auto">
          <SlideControls settings={settings} headline={variation.headline} onUpdate={onUpdateSettings} compact />
        </div>
      )}
    </div>
  );
}
