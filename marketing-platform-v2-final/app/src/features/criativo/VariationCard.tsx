import { useState } from 'react';
import { toPng } from 'html-to-image';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Download, SlidersHorizontal, Copy, Trash2, Pencil, Check, ImagePlus, ImageOff, Loader2 } from 'lucide-react';
import type { BatchVariation, CarouselTheme, SlideSettings, SlideOutput } from '@/types';
import { MediaPickerModal } from './components/MediaPickerModal';
import { DEFAULT_SLIDE_SETTINGS } from '@/types';
import { SlidePreview } from '@/features/carousel/components/SlidePreview';
import { SlideControls } from '@/features/carousel/components/SlideControls';
import { VISUAL_STYLES } from '@/features/carousel/constants';
import { cn } from '@/lib/utils';

interface VariationCardProps {
  variation: BatchVariation;
  theme: CarouselTheme;
  settings: SlideSettings;
  isSelected: boolean;
  onToggleSelect: () => void;
  onUpdateVariation: (updates: Partial<BatchVariation>) => void;
  onUpdateSettings: (updates: Partial<SlideSettings>) => void;
  onRemove: () => void;
}

export function VariationCard({
  variation, theme, settings, isSelected, onToggleSelect,
  onUpdateVariation, onUpdateSettings, onRemove,
}: VariationCardProps) {
  const [showControls, setShowControls] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const slide: SlideOutput = {
    number: 1, type: 'hook', headline: variation.headline,
    subtext: variation.subtext, headlineHighlight: undefined,
    logic: '', visualDirection: '', needsMedia: false,
    bgStyle: 'dark', layout: 'text-only',
  };

  // Pixel-perfect export: render at 1080px in off-screen container
  const handleExportPng = async () => {
    setIsExporting(true);
    try {
      const div = document.createElement('div');
      div.style.cssText = 'position:fixed;top:-9999px;left:-9999px;pointer-events:none;';
      document.body.appendChild(div);
      const root = createRoot(div);
      flushSync(() => root.render(
        <SlidePreview slide={slide} theme={theme} width={1080} height={1350}
          settings={settings} imageUrl={variation.mediaUrl} isExport />
      ));
      await document.fonts.ready;
      await new Promise(r => setTimeout(r, 100));
      const dataUrl = await toPng(div.firstElementChild as HTMLElement, {
        width: 1080, height: 1350, pixelRatio: 1,
      });
      root.unmount();
      document.body.removeChild(div);
      const a = document.createElement('a');
      a.download = `criativo-${variation.id.slice(0, 8)}.png`;
      a.href = dataUrl;
      a.click();
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${variation.headline}\n${variation.subtext || ''}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const styleLabel = VISUAL_STYLES.find(s => s.id === variation.style)?.label || variation.style;

  return (
    <div className={cn('group rounded-xl border transition-all', isSelected ? 'border-brand bg-brand/5' : 'border-border hover:border-text-muted')}>
      {/* Header: select + actions */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/50">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={isSelected} onChange={onToggleSelect} className="accent-brand w-3 h-3" />
          <span className="text-[10px] text-text-muted">{styleLabel}</span>
        </label>
        <div className="flex gap-0.5">
          <button onClick={() => setShowControls(!showControls)} className={cn('p-1 rounded text-text-muted hover:text-brand transition-colors', showControls && 'text-brand bg-brand/10')} title="Controles">
            <SlidersHorizontal className="w-3 h-3" />
          </button>
          <button onClick={() => setIsEditing(!isEditing)} className={cn('p-1 rounded text-text-muted hover:text-brand transition-colors', isEditing && 'text-brand bg-brand/10')} title="Editar">
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={handleExportPng} disabled={isExporting} className="p-1 rounded text-text-muted hover:text-brand transition-colors disabled:opacity-40" title="PNG">
            {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
          </button>
          <button onClick={handleCopy} className="p-1 rounded text-text-muted hover:text-brand transition-colors" title="Copiar">
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
          </button>
          <button onClick={() => setShowMediaPicker(true)} className="p-1 rounded text-text-muted hover:text-brand transition-colors" title="Trocar imagem da biblioteca">
            <ImagePlus className="w-3 h-3" />
          </button>
          {variation.mediaUrl && (
            <button onClick={() => onUpdateVariation({ mediaUrl: null })} className="p-1 rounded text-text-muted hover:text-red-400 transition-colors" title="Remover imagem">
              <ImageOff className="w-3 h-3" />
            </button>
          )}
          <button onClick={onRemove} className="p-1 rounded text-text-muted hover:text-red-400 transition-colors" title="Remover">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className={cn('relative', variation.status === 'error' && 'opacity-50')}>
        <SlidePreview slide={slide} theme={theme} settings={settings} imageUrl={variation.mediaUrl} />
        {variation.status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
            <span className="text-xs text-red-400 font-medium">Erro na geração</span>
          </div>
        )}
      </div>

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

      {showMediaPicker && (
        <MediaPickerModal
          currentUrl={variation.mediaUrl}
          onSelect={(url) => onUpdateVariation({ mediaUrl: url })}
          onClose={() => setShowMediaPicker(false)}
        />
      )}
    </div>
  );
}
