import { useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Sparkles, Loader2, RotateCcw, Download, Copy, Check, ImagePlus, ImageOff, Image } from 'lucide-react';
import { MediaPickerModal } from './components/MediaPickerModal';
import { toPng } from 'html-to-image';
import { saveAs } from 'file-saver';
import type { CarouselThemeId, SlideOutput, SlideSettings } from '@/types';
import { DEFAULT_SLIDE_SETTINGS } from '@/types';
import { CAROUSEL_THEMES, ANGLES } from '@/features/carousel/constants';
import { SlidePreview } from '@/features/carousel/components/SlidePreview';
import { SlideControls } from '@/features/carousel/components/SlideControls';
import { ThemeSelector } from '@/features/carousel/components/ThemeSelector';
import { StrategyContext } from '@/components/shared/StrategyContext';
import { NicheSelector } from '@/components/shared/NicheSelector';
import { generateSingleAd } from '@/lib/ai';
import { supabase } from '@/lib/supabase';
import { useSaveDraft } from './hooks/useCreativeDrafts';
import { AD_FORMATS, scaleFormat, type AdFormat } from './constants';
import { cn } from '@/lib/utils';

const OBJECTIVES = [
  { id: 'awareness', label: 'Awareness', emoji: '📢' },
  { id: 'engagement', label: 'Engajamento', emoji: '💬' },
  { id: 'conversion', label: 'Conversão', emoji: '🎯' },
  { id: 'retention', label: 'Retenção', emoji: '🔄' },
];

/** Visual aspect-ratio box for format selector */
function FormatShape({ format, size = 28 }: { format: AdFormat; size?: number }) {
  const max = size;
  const sw = max / format.width;
  const sh = max / format.height;
  const s = Math.min(sw, sh);
  const w = Math.max(4, Math.round(format.width * s));
  const h = Math.max(4, Math.round(format.height * s));
  return <div style={{ width: w, height: h, background: 'currentColor', borderRadius: 2, opacity: 0.7 }} />;
}

type SlideWithMeta = SlideOutput & { caption?: string; hashtags?: string[]; cta?: string; copyRationale?: string };

export function ArteUnica() {
  const [briefing, setBriefing] = useState('');
  const [angle, setAngle] = useState('');
  const [persona, setPersona] = useState('');
  const [objective, setObjective] = useState('');
  const [formatId, setFormatId] = useState('ig-feed');
  const [themeId, setThemeId] = useState<CarouselThemeId>('brand-orange');
  const [settings, setSettings] = useState<SlideSettings>({ ...DEFAULT_SLIDE_SETTINGS });
  const [slide, setSlide] = useState<SlideWithMeta | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const saveDraft = useSaveDraft();

  const format = AD_FORMATS.find(f => f.id === formatId) ?? AD_FORMATS[0];
  const theme = CAROUSEL_THEMES.find(t => t.id === themeId) || CAROUSEL_THEMES[0];
  const preview = scaleFormat(format, 380, 520);

  const generateImage = useCallback(async (imagePrompt: string) => {
    setIsGeneratingImage(true);
    try {
      const { data } = await supabase.functions.invoke('generate-slide-image', {
        body: { imagePrompt, translateFirst: true },
      });
      const url: string | null = data?.imageDataUrl ?? data?.imageUrl ?? (data?.imageBase64 ? `data:image/png;base64,${data.imageBase64}` : null);
      if (url) setImageUrl(url);
    } catch { /* imagem é opcional */ }
    finally { setIsGeneratingImage(false); }
  }, []);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true); setError(null); setSlide(null); setImageUrl(null);
    try {
      const result = await generateSingleAd({ briefing, format: formatId, angle, objective, persona });
      setSlide(result.slide as SlideWithMeta);
      saveDraft.mutate({ type: 'static_post', title: result.slide.headline, data: { slide: result.slide, briefing, angle, objective, formatId } as unknown as Record<string, unknown> });
      if (result.slide.imagePrompt) generateImage(result.slide.imagePrompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na geração');
    } finally { setIsGenerating(false); }
  }, [briefing, angle, persona, objective, formatId, generateImage]);

  const handleDownload = useCallback(async () => {
    if (!slide) return;
    setIsDownloading(true);
    try {
      const div = document.createElement('div');
      div.style.cssText = 'position:fixed;top:-9999px;left:-9999px;pointer-events:none;';
      document.body.appendChild(div);
      const root = createRoot(div);
      flushSync(() => root.render(
        <SlidePreview slide={slide} theme={theme} width={format.width} height={format.height}
          nativeWidth={format.width} nativeHeight={format.height}
          settings={settings} imageUrl={imageUrl} isExport />
      ));
      await document.fonts.ready;
      await new Promise(r => setTimeout(r, 120));
      const dataUrl = await toPng(div.firstElementChild as HTMLElement, { width: format.width, height: format.height, pixelRatio: 1 });
      root.unmount(); document.body.removeChild(div);
      saveAs(dataUrl, `arte-${formatId}-${Date.now()}.png`);
    } catch (err) { console.error('Export erro:', err); }
    finally { setIsDownloading(false); }
  }, [slide, theme, settings, imageUrl, format, formatId]);

  const handleCopy = () => {
    if (!slide) return;
    navigator.clipboard.writeText(`${slide.headline}\n${slide.subtext || ''}\n\n${(slide as SlideWithMeta).caption || ''}`);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  // Group formats by channel for the selector
  const channels = Array.from(new Set(AD_FORMATS.map(f => f.channel)));

  return (
    <>
      {showMediaPicker && <MediaPickerModal currentUrl={imageUrl} onSelect={setImageUrl} onClose={() => setShowMediaPicker(false)} />}
      <div className="flex flex-col lg:flex-row gap-6 h-full">
        {/* Left Panel */}
        <div className="w-full lg:w-80 shrink-0 space-y-4 overflow-y-auto pr-2 scrollbar-thin">
          <StrategyContext />

          {/* Format Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Formato do Anúncio</label>
            <div className="space-y-2">
              {channels.map(ch => (
                <div key={ch}>
                  <p className="text-[10px] text-text-muted mb-1 uppercase tracking-widest">{ch}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {AD_FORMATS.filter(f => f.channel === ch).map(f => (
                      <button
                        key={f.id}
                        onClick={() => setFormatId(f.id)}
                        title={`${f.label} ${f.ratio} — ${f.width}×${f.height}px`}
                        className={cn(
                          'flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all',
                          formatId === f.id ? 'border-brand bg-brand/10 text-brand' : 'border-border text-text-muted hover:border-text-muted hover:text-text-primary',
                        )}
                        style={{ color: formatId === f.id ? '#E8603C' : undefined }}
                      >
                        <span className={cn('flex items-center', formatId === f.id ? 'text-brand' : 'text-text-muted')}>
                          <FormatShape format={f} size={24} />
                        </span>
                        <span>{f.label}</span>
                        <span className="text-[9px] opacity-60">{f.ratio}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Briefing */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Briefing</label>
            <textarea value={briefing} onChange={e => setBriefing(e.target.value)}
              placeholder="Descreva o anúncio ou deixe vazio para modo autônomo..."
              className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted resize-none focus:border-brand outline-none" rows={3} />
          </div>

          {/* Angle */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Ângulo Emocional</label>
            <div className="grid grid-cols-3 gap-1.5">
              {ANGLES.map(a => (
                <button key={a.id} onClick={() => setAngle(angle === a.id ? '' : a.id)}
                  className={cn('flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium transition-all',
                    angle === a.id ? `${a.color} bg-white/5 border-current` : 'border-border text-text-muted hover:border-text-muted')}>
                  <span className="text-sm">{a.emoji}</span><span>{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          <NicheSelector value={persona} onChange={setPersona} />

          {/* Objective */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Objetivo</label>
            <div className="grid grid-cols-2 gap-1.5">
              {OBJECTIVES.map(o => (
                <button key={o.id} onClick={() => setObjective(objective === o.id ? '' : o.id)}
                  className={cn('flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all',
                    objective === o.id ? 'border-brand bg-brand/10 text-brand' : 'border-border text-text-muted hover:border-text-muted')}>
                  <span>{o.emoji}</span>{o.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleGenerate} disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand hover:bg-brand-dark text-white rounded-lg text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50">
            {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando...</> : <><Sparkles className="w-4 h-4" />{briefing ? 'Gerar Anúncio' : 'Modo Autônomo'}</>}
          </button>
          {slide && <button onClick={() => { setSlide(null); setImageUrl(null); setSettings({ ...DEFAULT_SLIDE_SETTINGS }); setError(null); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-border rounded-lg text-text-secondary hover:text-text-primary text-sm">
            <RotateCcw className="w-3.5 h-3.5" />Novo anúncio
          </button>}
          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
        </div>

        {/* Right: Canvas */}
        <div className="flex-1 overflow-y-auto pb-8 scrollbar-thin">
          {!slide && !isGenerating && (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-brand/10 flex items-center justify-center mb-4"><span className="text-4xl">🎯</span></div>
              <h2 className="font-heading font-bold text-lg text-text-primary mb-1">Arte Única</h2>
              <p className="text-sm text-text-muted max-w-sm">Selecione o formato, briefing e ângulo. A IA gera copy e imagem relacionados, prontos para o canal escolhido.</p>
            </div>
          )}
          {isGenerating && (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <div className="w-16 h-16 rounded-2xl bg-brand/20 flex items-center justify-center mb-4 animate-pulse"><span className="text-3xl">✨</span></div>
              <p className="text-sm text-text-secondary animate-pulse">Criando anúncio para {format.channel} {format.label}...</p>
            </div>
          )}
          {slide && (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: format.channelHex + '22', color: format.channelHex }}>{format.channel} {format.label}</span>
                    <span className="text-[10px] text-text-muted">{format.width}×{format.height}px · {format.ratio}</span>
                  </div>
                  <h2 className="font-heading font-black text-base uppercase text-text-primary">{slide.headline}</h2>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={handleCopy} className="p-2 rounded-lg border border-border text-text-muted hover:text-text-primary transition-colors" title="Copiar copy + caption">
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setShowMediaPicker(true)} className="p-2 rounded-lg border border-border text-text-muted hover:text-brand hover:border-brand/50 transition-colors" title="Trocar imagem">
                    <ImagePlus className="w-4 h-4" />
                  </button>
                  {imageUrl && <button onClick={() => setImageUrl(null)} className="p-2 rounded-lg border border-border text-text-muted hover:text-red-400 transition-colors" title="Remover imagem">
                    <ImageOff className="w-4 h-4" />
                  </button>}
                  <button onClick={handleDownload} disabled={isDownloading}
                    className="p-2 rounded-lg border border-border text-text-muted hover:text-text-primary transition-colors disabled:opacity-50" title={`Exportar ${format.width}×${format.height}px`}>
                    {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-5 items-start">
                {/* Preview */}
                <div className="shrink-0 relative self-center sm:self-start">
                  <SlidePreview slide={slide} theme={theme} width={preview.w} height={preview.h}
                    nativeWidth={format.width} nativeHeight={format.height}
                    settings={settings} imageUrl={imageUrl} />
                  {isGeneratingImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                      <div className="flex flex-col items-center gap-2">
                        <Image className="w-5 h-5 text-white animate-pulse" />
                        <span className="text-xs text-white/80">Gerando imagem...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex-1 min-w-0 space-y-4">
                  <ThemeSelector value={themeId} onChange={setThemeId} />
                  <div className="rounded-xl border border-border bg-surface-elevated p-3">
                    <SlideControls settings={settings} headline={slide.headline} onUpdate={u => setSettings(p => ({ ...p, ...u }))} />
                  </div>
                  {(slide as SlideWithMeta).copyRationale && (
                    <div className="rounded-xl border border-border bg-surface-elevated p-3">
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Estratégia</p>
                      <p className="text-xs text-text-secondary">{(slide as SlideWithMeta).copyRationale}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Inline edit + Caption */}
              <div className="rounded-xl border border-border bg-surface-elevated p-4 space-y-3">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Editar Textos</p>
                <input className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm font-heading font-bold uppercase text-text-primary focus:border-brand outline-none"
                  value={slide.headline} onChange={e => setSlide({ ...slide, headline: e.target.value })} placeholder="Headline" />
                <textarea className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-secondary resize-none focus:border-brand outline-none"
                  rows={2} value={slide.subtext || ''} onChange={e => setSlide({ ...slide, subtext: e.target.value })} placeholder="Subtexto" />
                {(slide as SlideWithMeta).caption && (
                  <>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider pt-1">Caption para Publicação</p>
                    <textarea className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-xs text-text-secondary resize-none focus:border-brand outline-none"
                      rows={4} value={(slide as SlideWithMeta).caption || ''} onChange={e => setSlide({ ...slide, caption: e.target.value } as SlideWithMeta)} placeholder="Caption..." />
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
