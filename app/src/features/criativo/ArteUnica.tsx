import { useState, useCallback } from 'react';
import { Sparkles, Loader2, RotateCcw, Download, Copy, Check } from 'lucide-react';
import type { CarouselThemeId, SlideOutput, SlideSettings } from '@/types';
import { DEFAULT_SLIDE_SETTINGS } from '@/types';
import { CAROUSEL_THEMES, ANGLES, CHANNELS } from '@/features/carousel/constants';
import { SlidePreview } from '@/features/carousel/components/SlidePreview';
import { SlideControls } from '@/features/carousel/components/SlideControls';
import { ThemeSelector } from '@/features/carousel/components/ThemeSelector';
import { StrategyContext } from '@/components/shared/StrategyContext';
import { NicheSelector } from '@/components/shared/NicheSelector';
import { generateCarouselVisual } from '@/lib/ai';
import { cn } from '@/lib/utils';

/* NicheSelector replaces old flat PERSONAS buttons */
const OBJECTIVES = [
  { id: 'awareness', label: 'Awareness', emoji: '📢' },
  { id: 'engagement', label: 'Engajamento', emoji: '💬' },
  { id: 'conversion', label: 'Conversão', emoji: '🎯' },
  { id: 'retention', label: 'Retenção', emoji: '🔄' },
];

export function ArteUnica() {
  const [briefing, setBriefing] = useState('');
  const [angle, setAngle] = useState('');
  const [persona, setPersona] = useState('');
  const [channel, setChannel] = useState('Instagram Feed');
  const [objective, setObjective] = useState('');
  const [themeId, setThemeId] = useState<CarouselThemeId>('brand-orange');
  const [settings, setSettings] = useState<SlideSettings>({ ...DEFAULT_SLIDE_SETTINGS });
  const [slide, setSlide] = useState<SlideOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const theme = CAROUSEL_THEMES.find(t => t.id === themeId) || CAROUSEL_THEMES[0];

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateCarouselVisual({
        context: `${briefing}. Objetivo: ${objective}. Arte única estática.`,
        angle,
        persona,
        channel,
        tone: 'Peer-to-peer',
      });
      const hookSlide = result.carousel?.slides?.[0];
      if (!hookSlide) throw new Error('Sem resultado');
      setSlide(hookSlide);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na geração');
    } finally {
      setIsGenerating(false);
    }
  }, [briefing, angle, persona, channel, objective]);

  const handleReset = () => {
    setSlide(null);
    setSettings({ ...DEFAULT_SLIDE_SETTINGS });
    setError(null);
  };

  const handleCopy = () => {
    if (!slide) return;
    navigator.clipboard.writeText(`${slide.headline}\n${slide.subtext || ''}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Left: Briefing Panel */}
      <div className="w-80 shrink-0 space-y-4 overflow-y-auto pr-2 scrollbar-thin">
        <StrategyContext />

        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Briefing</label>
          <textarea
            value={briefing}
            onChange={e => setBriefing(e.target.value)}
            placeholder="Descreva a peça que você quer criar ou deixe vazio para a IA decidir..."
            className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted resize-none focus:border-brand outline-none"
            rows={3}
          />
        </div>

        {/* Angle */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Ângulo Emocional</label>
          <div className="grid grid-cols-3 gap-1.5">
            {ANGLES.map(a => (
              <button
                key={a.id}
                onClick={() => setAngle(a.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium transition-all',
                  angle === a.id ? `${a.color} bg-white/5 border-current` : 'border-border text-text-muted hover:border-text-muted',
                )}
              >
                <span className="text-sm">{a.emoji}</span>
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Persona / Nicho */}
        <NicheSelector value={persona} onChange={setPersona} />

        {/* Objective */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Objetivo</label>
          <div className="grid grid-cols-2 gap-1.5">
            {OBJECTIVES.map(o => (
              <button
                key={o.id}
                onClick={() => setObjective(objective === o.id ? '' : o.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all',
                  objective === o.id ? 'border-brand bg-brand/10 text-brand' : 'border-border text-text-muted hover:border-text-muted',
                )}
              >
                <span>{o.emoji}</span> {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Channel */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Canal</label>
          <select
            value={channel}
            onChange={e => setChannel(e.target.value)}
            className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-brand outline-none"
          >
            {CHANNELS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Generate */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand hover:bg-brand-dark text-white rounded-lg text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50"
        >
          {isGenerating
            ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando arte...</>
            : <><Sparkles className="w-4 h-4" />{briefing ? 'Gerar Arte' : 'Modo Autônomo'}</>}
        </button>

        {slide && (
          <button onClick={handleReset} className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-border rounded-lg text-text-secondary hover:text-text-primary text-sm">
            <RotateCcw className="w-3.5 h-3.5" /> Nova arte
          </button>
        )}

        {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
      </div>

      {/* Right: Canvas + Controls */}
      <div className="flex-1 overflow-y-auto pb-8 scrollbar-thin">
        {!slide && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-brand/10 flex items-center justify-center mb-4">
              <span className="text-4xl">🎨</span>
            </div>
            <h2 className="font-heading font-bold text-lg text-text-primary mb-1">Arte Única</h2>
            <p className="text-sm text-text-muted max-w-sm">
              Gere uma peça criativa estática com IA. Ajuste tema, tipografia, shapes e exporte em alta resolução.
            </p>
          </div>
        )}

        {isGenerating && (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <div className="w-16 h-16 rounded-2xl bg-brand/20 flex items-center justify-center mb-4 animate-pulse">
              <span className="text-3xl">✨</span>
            </div>
            <p className="text-sm text-text-secondary animate-pulse">Criando sua arte com IA...</p>
          </div>
        )}

        {slide && (
          <div className="space-y-5">
            {/* Canvas header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading font-black text-lg uppercase text-text-primary">{slide.headline}</h2>
                {slide.subtext && <p className="text-xs text-text-muted mt-0.5">{slide.subtext}</p>}
              </div>
              <div className="flex gap-1.5">
                <button onClick={handleCopy} className="p-2 rounded-lg border border-border text-text-muted hover:text-text-primary hover:border-text-muted transition-colors">
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button className="p-2 rounded-lg border border-border text-text-muted hover:text-text-primary hover:border-text-muted transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Canvas + Side Controls */}
            <div className="flex gap-5">
              {/* Preview */}
              <div className="shrink-0">
                <SlidePreview slide={slide} theme={theme} settings={settings} width={400} height={500} />
              </div>

              {/* Controls Panel */}
              <div className="flex-1 min-w-0 space-y-4">
                <ThemeSelector value={themeId} onChange={setThemeId} />
                <div className="rounded-xl border border-border bg-surface-elevated p-3">
                  <SlideControls
                    settings={settings}
                    headline={slide.headline}
                    onUpdate={updates => setSettings(prev => ({ ...prev, ...updates }))}
                  />
                </div>
              </div>
            </div>

            {/* Inline edit */}
            <div className="rounded-xl border border-border bg-surface-elevated p-4 space-y-3">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Editar Textos</p>
              <input
                className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm font-heading font-bold uppercase text-text-primary focus:border-brand outline-none"
                value={slide.headline}
                onChange={e => setSlide({ ...slide, headline: e.target.value })}
                placeholder="Headline"
              />
              <textarea
                className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-secondary resize-none focus:border-brand outline-none"
                rows={2}
                value={slide.subtext || ''}
                onChange={e => setSlide({ ...slide, subtext: e.target.value })}
                placeholder="Subtexto"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
