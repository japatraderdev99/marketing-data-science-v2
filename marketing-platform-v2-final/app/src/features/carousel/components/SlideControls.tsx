import type { SlideSettings, ShapeStyle, HighlightStyle } from '@/types';
import { AdjSlider } from './AdjSlider';
import { WordSelector, HighlightStylePicker } from './WordHighlight';
import { SHAPE_STYLES, FONT_OPTIONS } from '../constants';
import { cn } from '@/lib/utils';

interface SlideControlsProps {
  settings: SlideSettings;
  headline: string;
  onUpdate: (updates: Partial<SlideSettings>) => void;
  compact?: boolean;
}

export function SlideControls({ settings, headline, onUpdate, compact }: SlideControlsProps) {
  const toggleWord = (word: string) => {
    const current = settings.highlightWords ? settings.highlightWords.split('|') : [];
    const exists = current.some(w => w.toLowerCase() === word.toLowerCase());
    const next = exists
      ? current.filter(w => w.toLowerCase() !== word.toLowerCase())
      : [...current, word];
    onUpdate({ highlightWords: next.join('|') });
  };

  const selectedWords = settings.highlightWords ? settings.highlightWords.split('|').filter(Boolean) : [];

  return (
    <div className={cn('space-y-3', compact && 'space-y-2')}>
      {/* Text Sliders */}
      <div className="space-y-2">
        <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Texto</p>
        <AdjSlider label="Headline" value={settings.headlineScale ?? settings.textScale} min={0.5} max={2.5} step={0.05} onValueChange={(v) => onUpdate({ headlineScale: v })} />
        <AdjSlider label="Body" value={settings.subtextScale ?? settings.textScale} min={0.5} max={2.5} step={0.05} onValueChange={(v) => onUpdate({ subtextScale: v })} />
        <AdjSlider label="Escala CTA" value={settings.ctaScale} min={0.5} max={2.0} step={0.1} onValueChange={(v) => onUpdate({ ctaScale: v })} />
        <AdjSlider label="Posição X" value={settings.textPositionX} min={2} max={80} step={1} display={`${Math.round(settings.textPositionX)}%`} onValueChange={(v) => onUpdate({ textPositionX: v })} />
        <AdjSlider label="Posição Y" value={settings.textPositionY} min={15} max={95} step={1} display={`${Math.round(settings.textPositionY)}%`} onValueChange={(v) => onUpdate({ textPositionY: v })} />
      </div>

      {/* Image Sliders */}
      <div className="space-y-2">
        <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Imagem</p>
        <AdjSlider label="Opacidade" value={settings.imageOpacity} min={0} max={1} step={0.05} onValueChange={(v) => onUpdate({ imageOpacity: v })} />
        <AdjSlider label="Zoom" value={settings.imageZoom} min={1} max={2.5} step={0.1} onValueChange={(v) => onUpdate({ imageZoom: v })} />
        <AdjSlider label="Offset Y" value={settings.imageOffsetY} min={-30} max={30} step={1} display={`${settings.imageOffsetY > 0 ? '+' : ''}${settings.imageOffsetY}px`} onValueChange={(v) => onUpdate({ imageOffsetY: v })} />
      </div>

      {/* Shape Picker */}
      <div className="space-y-2">
        <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Shape Overlay</p>
        <div className="grid grid-cols-3 gap-1">
          {SHAPE_STYLES.map(s => (
            <button
              key={s.id}
              onClick={() => onUpdate({ shape: s.id })}
              className={cn(
                'py-1.5 px-1 rounded-md text-[10px] font-medium border transition-all text-center',
                settings.shape === s.id
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-border text-text-muted hover:border-text-muted'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Font Picker */}
      <div className="space-y-2">
        <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Fonte</p>
        <div className="grid grid-cols-3 gap-1">
          {FONT_OPTIONS.map(f => (
            <button
              key={f}
              onClick={() => onUpdate({ fontFamily: f })}
              className={cn(
                'py-1.5 rounded-md text-[10px] font-medium border transition-all',
                settings.fontFamily === f
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-border text-text-muted hover:border-text-muted'
              )}
              style={{ fontFamily: f }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Highlight */}
      <WordSelector headline={headline} selectedWords={selectedWords} onToggleWord={toggleWord} />
      <HighlightStylePicker
        selected={settings.highlightStyle}
        onChange={(s) => onUpdate({ highlightStyle: s })}
        highlightColor={settings.highlightColor}
        onColorChange={(c) => onUpdate({ highlightColor: c })}
      />
    </div>
  );
}
