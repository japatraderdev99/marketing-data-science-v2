import { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, Building2, Globe } from 'lucide-react';
import { NICHE_CATEGORIES, SPECIAL_PERSONAS, TOTAL_NICHES } from '@/constants/niches';
import { cn } from '@/lib/utils';

interface NicheSelectorProps {
  value: string;
  onChange: (niche: string) => void;
  /** Allow selecting multiple niches */
  multi?: boolean;
  multiValue?: string[];
  onMultiChange?: (niches: string[]) => void;
}

export function NicheSelector({ value, onChange, multi, multiValue = [], onMultiChange }: NicheSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const q = search.toLowerCase().trim();

  const filteredCategories = NICHE_CATEGORIES.map(cat => ({
    ...cat,
    niches: cat.niches.filter(n => !q || n.toLowerCase().includes(q)),
  })).filter(cat => cat.niches.length > 0);

  const specialFiltered = SPECIAL_PERSONAS.filter(s => !q || s.label.toLowerCase().includes(q));

  const isSpecial = SPECIAL_PERSONAS.some(s => s.id === value);
  const displayLabel = isSpecial
    ? SPECIAL_PERSONAS.find(s => s.id === value)?.label
    : value || undefined;

  const handleSelect = (niche: string) => {
    if (multi && onMultiChange) {
      const exists = multiValue.includes(niche);
      onMultiChange(exists ? multiValue.filter(n => n !== niche) : [...multiValue, niche]);
    } else {
      onChange(niche === value ? '' : niche);
      setOpen(false);
    }
    setSearch('');
  };

  const handleSpecialSelect = (id: string) => {
    if (multi && onMultiChange) {
      onMultiChange([]);
    }
    onChange(id === value ? '' : id);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
        Persona / Nicho
      </label>

      {/* Special quick buttons */}
      <div className="flex gap-1.5">
        <button
          onClick={() => handleSpecialSelect('__geral__')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-all',
            value === '__geral__'
              ? 'border-teal bg-teal/10 text-teal'
              : 'border-border text-text-muted hover:border-text-muted',
          )}
        >
          <Globe className="w-3.5 h-3.5" /> Geral
        </button>
        <button
          onClick={() => handleSpecialSelect('__institucional__')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-all',
            value === '__institucional__'
              ? 'border-brand bg-brand/10 text-brand'
              : 'border-border text-text-muted hover:border-text-muted',
          )}
        >
          <Building2 className="w-3.5 h-3.5" /> Institucional
        </button>
      </div>

      {/* Dropdown trigger */}
      <div ref={containerRef} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all',
            open ? 'border-brand bg-surface-hover' : 'border-border hover:border-text-muted',
            (displayLabel && !isSpecial) ? 'text-text-primary' : 'text-text-muted',
          )}
        >
          {multi && multiValue.length > 0 ? (
            <div className="flex-1 flex flex-wrap gap-1 min-w-0">
              {multiValue.slice(0, 3).map(n => (
                <span key={n} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand/10 text-brand text-[10px] font-medium">
                  {n}
                  <X className="w-2.5 h-2.5 cursor-pointer hover:text-brand-light" onClick={(e) => { e.stopPropagation(); onMultiChange?.(multiValue.filter(x => x !== n)); }} />
                </span>
              ))}
              {multiValue.length > 3 && (
                <span className="text-[10px] text-text-muted">+{multiValue.length - 3}</span>
              )}
            </div>
          ) : (
            <span className="flex-1 text-xs truncate">
              {isSpecial ? '—' : displayLabel || `Escolher nicho · ${TOTAL_NICHES} disponíveis`}
            </span>
          )}
          <ChevronDown className={cn('w-3.5 h-3.5 text-text-muted transition-transform', open && 'rotate-180')} />
        </button>

        {/* Dropdown panel */}
        {open && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border border-border bg-surface-elevated shadow-2xl overflow-hidden max-h-80 flex flex-col">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
              <Search className="w-3.5 h-3.5 text-text-muted shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar nicho..."
                className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-muted outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')}>
                  <X className="w-3 h-3 text-text-muted hover:text-text-primary" />
                </button>
              )}
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {/* Special options */}
              {specialFiltered.length > 0 && !multi && (
                <div className="px-2 pt-2 pb-1">
                  {specialFiltered.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSpecialSelect(s.id)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all mb-0.5',
                        value === s.id ? 'bg-brand/10 text-brand' : 'hover:bg-surface-hover text-text-secondary',
                      )}
                    >
                      <span className="text-sm">{s.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold">{s.label}</p>
                        <p className="text-[10px] text-text-muted">{s.desc}</p>
                      </div>
                    </button>
                  ))}
                  <div className="border-b border-border/50 my-1" />
                </div>
              )}

              {/* Categories */}
              {filteredCategories.map(cat => (
                <div key={cat.id} className="px-2 py-1">
                  <p className="px-2.5 py-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <span>{cat.emoji}</span>
                    {cat.label}
                    <span className="ml-auto text-text-muted/60">{cat.niches.length}</span>
                  </p>
                  <div className="grid grid-cols-2 gap-0.5">
                    {cat.niches.map(niche => {
                      const selected = multi ? multiValue.includes(niche) : value === niche;
                      return (
                        <button
                          key={niche}
                          onClick={() => handleSelect(niche)}
                          className={cn(
                            'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] text-left transition-all',
                            selected
                              ? 'bg-brand/10 text-brand font-semibold'
                              : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                          )}
                        >
                          <span className={cn(
                            'w-1.5 h-1.5 rounded-full shrink-0',
                            selected ? 'bg-brand' : 'bg-text-muted/40',
                          )} />
                          <span className="truncate">{niche}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {filteredCategories.length === 0 && specialFiltered.length === 0 && (
                <p className="text-xs text-text-muted text-center py-6">Nenhum nicho encontrado</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
