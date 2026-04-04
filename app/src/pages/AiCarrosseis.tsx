import { useState } from 'react';
import { LayoutGrid, BookOpen } from 'lucide-react';
import { DirectCarousel } from '@/features/carousel/DirectCarousel';
import { NarrativeCarousel } from '@/features/carousel/NarrativeCarousel';
import { cn } from '@/lib/utils';

type Mode = 'direto' | 'narrativo';

const MODES: { id: Mode; label: string; icon: typeof LayoutGrid; desc: string }[] = [
  { id: 'direto', label: '5 Slides', icon: LayoutGrid, desc: 'Carrossel direto de impacto' },
  { id: 'narrativo', label: 'Narrativo', icon: BookOpen, desc: 'Storytelling editorial 7-10 slides' },
];

export default function AiCarrosseis() {
  const [mode, setMode] = useState<Mode>('direto');

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="h-14 border-b border-border flex items-center px-6 gap-6 shrink-0">
        <h1 className="font-heading font-black text-sm uppercase tracking-wider text-text-primary">
          Carrosséis IA
        </h1>
        <div className="flex bg-surface-hover rounded-lg p-0.5">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all',
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
        <p className="text-[11px] text-text-muted ml-auto">
          {MODES.find(m => m.id === mode)?.desc}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-6">
        {mode === 'direto' ? <DirectCarousel /> : <NarrativeCarousel />}
      </div>
    </div>
  );
}
