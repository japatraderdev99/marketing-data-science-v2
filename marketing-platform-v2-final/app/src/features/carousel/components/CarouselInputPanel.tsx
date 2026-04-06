import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { AngleSelector } from './AngleSelector';
import { CHANNELS, TONES } from '../constants';
import { StrategyContext } from '@/components/shared/StrategyContext';
import { NicheSelector } from '@/components/shared/NicheSelector';
import { cn } from '@/lib/utils';

interface CarouselInputPanelProps {
  onGenerate: (params: {
    context: string;
    angle: string;
    persona: string;
    channel: string;
    tone: string;
  }) => void;
  isGenerating: boolean;
}

export function CarouselInputPanel({ onGenerate, isGenerating }: CarouselInputPanelProps) {
  const [context, setContext] = useState('');
  const [angle, setAngle] = useState('');
  const [persona, setPersona] = useState('');
  const [channel, setChannel] = useState('Instagram Feed');
  const [tone, setTone] = useState('Peer-to-peer');

  const handleSubmit = () => {
    onGenerate({ context, angle, persona, channel, tone });
  };

  return (
    <div className="space-y-5">
      <StrategyContext />

      {/* Briefing */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          Briefing / Contexto
        </label>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Descreva a ideia do carrossel ou deixe vazio para modo autônomo..."
          className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted resize-none focus:border-brand outline-none transition-colors"
          rows={3}
        />
      </div>

      <AngleSelector value={angle} onChange={setAngle} />

      {/* Persona / Nicho */}
      <NicheSelector value={persona} onChange={setPersona} />

      {/* Channel + Tone row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Canal</label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-brand outline-none"
          >
            {CHANNELS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Tom</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-brand outline-none"
          >
            {TONES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleSubmit}
        disabled={isGenerating}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand hover:bg-brand-dark text-white rounded-lg text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Gerando carrossel...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            {context ? 'Gerar Carrossel' : 'Modo Autônomo'}
          </>
        )}
      </button>
    </div>
  );
}
