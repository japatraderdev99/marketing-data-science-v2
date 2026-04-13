import { useState } from 'react';
import { Sparkles, Layers } from 'lucide-react';
import { ArteUnica } from '@/features/criativo/ArteUnica';
import { CriativoBatch } from '@/features/criativo/CriativoBatch';
import { cn } from '@/lib/utils';

type Mode = 'unica' | 'batch';

const MODES: { id: Mode; label: string; icon: typeof Sparkles; desc: string }[] = [
  { id: 'unica', label: 'Arte Única', icon: Sparkles, desc: 'Uma peça criativa com IA' },
  { id: 'batch', label: 'Batch', icon: Layers, desc: 'Múltiplas variações em lote' },
];

export default function Criativo() {
  const [mode, setMode] = useState<Mode>('unica');

  return (
    <div className="min-h-screen lg:h-screen flex flex-col">
      {/* Top bar */}
      <div className="min-h-14 border-b border-border flex flex-wrap items-center px-4 sm:px-6 gap-3 sm:gap-6 py-2 shrink-0">
        <h1 className="font-heading font-black text-sm uppercase tracking-wider text-text-primary">
          IA Criativo
        </h1>
        <div className="flex bg-surface-hover rounded-lg p-0.5">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all',
                mode === m.id
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary',
              )}
            >
              <m.icon className="w-3.5 h-3.5" />
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-text-muted sm:ml-auto hidden sm:block">
          {MODES.find(m => m.id === mode)?.desc}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-4 sm:p-6">
        {mode === 'unica' ? <ArteUnica /> : <CriativoBatch />}
      </div>
    </div>
  );
}
