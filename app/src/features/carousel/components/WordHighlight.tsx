import type { HighlightStyle } from '@/types';
import { cn } from '@/lib/utils';

// ─── Highlight Text Renderer ────────────────────────────────────────────────

export function renderHighlightedText(
  text: string,
  highlightWords: string | undefined,
  highlightStyle: HighlightStyle,
  headlineColor: string,
  highlightColor: string,
  isExport = false,
) {
  if (!highlightWords || highlightStyle === 'none' || !text) {
    return <span style={{ color: headlineColor }}>{text}</span>;
  }

  const words = highlightWords.split('|').map(w => w.trim()).filter(Boolean);
  if (words.length === 0) return <span style={{ color: headlineColor }}>{text}</span>;

  const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  const isHighlighted = (part: string) =>
    words.some(w => w.toLowerCase() === part.toLowerCase());

  const getStyle = (): React.CSSProperties => {
    switch (highlightStyle) {
      case 'color':
        return { color: highlightColor };
      case 'bold':
        return {
          color: highlightColor,
          textShadow: `0 2px 14px ${highlightColor}88, 0 0 6px ${highlightColor}44`,
          WebkitTextStroke: '0.5px currentColor',
        };
      case 'box':
        return {
          color: '#FFFFFF',
          backgroundColor: highlightColor,
          borderRadius: isExport ? '6px' : '4px',
          padding: isExport ? '4px 12px' : '2px 8px',
          display: 'inline',
          boxDecorationBreak: 'clone' as React.CSSProperties['boxDecorationBreak'],
        };
      default:
        return { color: headlineColor };
    }
  };

  return (
    <>
      {parts.map((part, i) =>
        isHighlighted(part)
          ? <span key={i} style={getStyle()}>{part}</span>
          : <span key={i} style={{ color: headlineColor }}>{part}</span>
      )}
    </>
  );
}

// ─── Word Selector ──────────────────────────────────────────────────────────

interface WordSelectorProps {
  headline: string;
  selectedWords: string[];
  onToggleWord: (word: string) => void;
}

export function WordSelector({ headline, selectedWords, onToggleWord }: WordSelectorProps) {
  const words = headline.split(/\s+/).filter(w => w.length > 1);
  const uniqueWords = [...new Set(words.map(w => w.replace(/[^a-zA-ZÀ-ÿ0-9%$,]/g, '')))].filter(Boolean);

  return (
    <div className="space-y-1.5">
      <p className="text-[9px] text-text-muted">Clique nas palavras para destacar:</p>
      <div className="flex flex-wrap gap-1">
        {uniqueWords.map((word, i) => {
          const isSelected = selectedWords.some(sw => sw.toLowerCase() === word.toLowerCase());
          return (
            <button
              key={`${word}-${i}`}
              onClick={() => onToggleWord(word)}
              className={cn(
                'text-[10px] px-2 py-0.5 rounded-md border transition-all font-bold uppercase tracking-wide',
                isSelected
                  ? 'bg-brand/20 text-brand border-brand shadow-sm shadow-brand/30'
                  : 'bg-surface-hover border-border text-text-muted hover:border-brand/50 hover:text-text-primary'
              )}
            >
              {word}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Highlight Style Picker ─────────────────────────────────────────────────

interface HighlightStylePickerProps {
  selected: HighlightStyle;
  onChange: (s: HighlightStyle) => void;
  highlightColor: string;
  onColorChange: (c: string) => void;
}

const STYLES: { id: HighlightStyle; label: string; icon: string }[] = [
  { id: 'none', label: 'Nenhum', icon: '—' },
  { id: 'color', label: 'Cor', icon: '✨' },
  { id: 'bold', label: 'Bold+', icon: 'B' },
  { id: 'box', label: 'Caixa', icon: '▮' },
];

export function HighlightStylePicker({ selected, onChange, highlightColor, onColorChange }: HighlightStylePickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Estilo do destaque</p>
      <div className="grid grid-cols-4 gap-1">
        {STYLES.map(s => (
          <button
            key={s.id}
            onClick={() => onChange(s.id)}
            className={cn(
              'py-1.5 rounded-md text-[10px] font-medium border transition-all text-center',
              selected === s.id
                ? 'border-brand bg-brand/10 text-brand'
                : 'border-border text-text-muted hover:border-text-muted'
            )}
          >
            <span className="block text-sm">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>
      {selected !== 'none' && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={highlightColor}
            onChange={(e) => onColorChange(e.target.value)}
            className="w-6 h-6 rounded border-none cursor-pointer bg-transparent"
          />
          <span className="text-[10px] font-mono text-text-muted">{highlightColor}</span>
        </div>
      )}
    </div>
  );
}
