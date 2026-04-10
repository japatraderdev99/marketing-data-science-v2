import { useState, useMemo } from 'react';
import { X, Search, Image, Loader2, Check, Sparkles } from 'lucide-react';
import { useMediaItems } from '@/features/media/hooks/useMediaLibrary';
import type { MediaItem, MediaMood } from '@/types';
import { cn } from '@/lib/utils';

const MOOD_OPTIONS: { value: MediaMood | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'determinação', label: 'Determinação' },
  { value: 'alívio', label: 'Alívio' },
  { value: 'orgulho', label: 'Orgulho' },
  { value: 'urgência', label: 'Urgência' },
  { value: 'raiva', label: 'Raiva' },
  { value: 'foco', label: 'Foco' },
];

interface MediaPickerModalProps {
  onSelect: (url: string) => void;
  onClose: () => void;
  currentUrl?: string | null;
  context?: { headline?: string; slideType?: string; topic?: string };
}

// Score an item for relevance to context
function scoreItem(item: MediaItem, keywords: string[]): number {
  if (!keywords.length) return 0;
  let score = 0;
  const haystack = [
    ...(item.ai_tags ?? []),
    item.ai_description ?? '',
    item.ai_mood ?? '',
    item.ai_style ?? '',
    ...(item.ai_subjects ?? []),
  ].join(' ').toLowerCase();
  for (const kw of keywords) {
    if (haystack.includes(kw)) score += 1;
  }
  // Bonus from fit_score_map (take max)
  const fitScores = Object.values(item.ai_fit_score_map ?? {}) as number[];
  if (fitScores.length) score += Math.max(...fitScores) * 2;
  return score;
}

export function MediaPickerModal({ onSelect, onClose, currentUrl, context }: MediaPickerModalProps) {
  const [search, setSearch] = useState('');
  const [mood, setMood] = useState<MediaMood | ''>('');
  const [hovered, setHovered] = useState<string | null>(null);

  const { data: items = [], isLoading } = useMediaItems({ search, mood });

  // Context keywords derived from headline + topic
  const contextKeywords = useMemo(() => {
    if (!context) return [];
    const raw = `${context.headline ?? ''} ${context.topic ?? ''} ${context.slideType ?? ''}`;
    return raw.toLowerCase().split(/[\s,]+/).filter(w => w.length > 3);
  }, [context]);

  // Suggested items: tagged items scored by relevance, top 6
  const suggestions = useMemo(() => {
    if (!contextKeywords.length) return [];
    return items
      .filter(i => i.tagging_status === 'done')
      .map(i => ({ item: i, score: scoreItem(i, contextKeywords) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(({ item }) => item);
  }, [items, contextKeywords]);

  const handleSelect = (url: string) => {
    onSelect(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[85vh] bg-surface-elevated border border-border rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Image className="w-4 h-4 text-brand" />
            <h2 className="font-heading font-black text-sm uppercase text-text-primary">Biblioteca de Mídia</h2>
            <span className="text-xs text-text-muted">({items.length} itens)</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 border-b border-border shrink-0 space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar por nome ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-hover border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand outline-none"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {MOOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMood(opt.value)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium border transition-all',
                  mood === opt.value
                    ? 'border-brand bg-brand/10 text-brand'
                    : 'border-border text-text-muted hover:border-text-muted',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Smart suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-brand" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand">Sugestões para esta copy</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {suggestions.map((item) => {
                  const isSelected = item.public_url === currentUrl;
                  return (
                    <button
                      key={`sug-${item.id}`}
                      onClick={() => { onSelect(item.public_url); onClose(); }}
                      className={cn(
                        'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                        isSelected ? 'border-brand ring-2 ring-brand/30' : 'border-brand/30 hover:border-brand',
                      )}
                    >
                      <img src={item.public_url} alt={item.file_name} className="w-full h-full object-cover" loading="lazy" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-brand/30 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="h-px bg-border" />
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-brand" />
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Image className="w-10 h-10 text-text-muted mb-3 opacity-40" />
              <p className="text-sm text-text-muted">Nenhuma imagem encontrada.</p>
              <p className="text-xs text-text-muted mt-1 opacity-60">
                Faça upload na Biblioteca de Mídia primeiro.
              </p>
            </div>
          )}

          {!isLoading && items.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {items.map((item) => {
                const isSelected = item.public_url === currentUrl;
                const isHov = hovered === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.public_url)}
                    onMouseEnter={() => setHovered(item.id)}
                    onMouseLeave={() => setHovered(null)}
                    className={cn(
                      'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                      isSelected
                        ? 'border-brand ring-2 ring-brand/30'
                        : 'border-transparent hover:border-brand/50',
                    )}
                  >
                    <img
                      src={item.public_url}
                      alt={item.file_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Hover overlay */}
                    {(isHov || isSelected) && (
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1 p-1.5">
                        {isSelected && (
                          <Check className="w-5 h-5 text-brand" />
                        )}
                        {item.ai_mood && (
                          <span className="text-[9px] font-bold uppercase text-white/80 bg-black/40 px-1.5 py-0.5 rounded">
                            {item.ai_mood}
                          </span>
                        )}
                        <p className="text-[9px] text-white/70 text-center line-clamp-2 leading-tight">
                          {item.ai_description || item.file_name}
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary text-sm transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
