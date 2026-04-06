import { useState } from 'react';
import {
  Sparkles, Loader2, Copy, RotateCcw, Download,
  SlidersHorizontal, Search, ImageIcon, CheckCircle2, AlertTriangle, XCircle,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import type { NarrativeThemeId, NarrativeSlide } from '@/types';
import { NarrativeSlidePreview } from './components/NarrativeSlidePreview';
import { AdjSlider } from './components/AdjSlider';
import { StrategyContext } from '@/components/shared/StrategyContext';
import { useNarrativeGeneration } from '@/hooks/useNarrativeGeneration';
import { researchTopic, verifyCarouselFacts, generateSlideImage, saveImageToLibrary } from '@/lib/ai';
import { cn } from '@/lib/utils';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';

const THEMES: { id: NarrativeThemeId; label: string; swatch: string }[] = [
  { id: 'editorial-dark', label: 'Dark', swatch: '#0F0F0F' },
  { id: 'editorial-cream', label: 'Cream', swatch: '#F5F0E8' },
  { id: 'brand-bold', label: 'Bold', swatch: '#E8603C' },
];

interface NarrativeSettings {
  textScale: number;
  imageOpacity: number;
  imageZoom: number;
}

const DEFAULT_NS: NarrativeSettings = { textScale: 1.0, imageOpacity: 1.0, imageZoom: 1.0 };

type VerificationStatus = 'verified' | 'modified' | 'ungrounded' | 'no-data';

export function NarrativeCarousel() {
  const { carousel, setCarousel, isGenerating, error, generate, reset } = useNarrativeGeneration();
  const [topic, setTopic] = useState('');
  const [audienceAngle, setAudienceAngle] = useState('');
  const [numSlides, setNumSlides] = useState(10);
  const [themeOverride, setThemeOverride] = useState<NarrativeThemeId | ''>('');
  const [editingSlide, setEditingSlide] = useState<number | null>(null);
  const [controlsSlide, setControlsSlide] = useState<number | null>(null);
  const [settingsMap, setSettingsMap] = useState<Record<number, NarrativeSettings>>({});
  const [exporting, setExporting] = useState(false);

  // Research state
  const [isResearching, setIsResearching] = useState(false);
  const [researchData, setResearchData] = useState<{ research: string; citations: string[]; facts: Array<{ claim: string; source: string; year: number; url: string; country: string }> } | null>(null);

  // Verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verification, setVerification] = useState<Record<number, { overallStatus: VerificationStatus; claims: Array<Record<string, unknown>> }>>({});

  // Per-slide image state
  const [slideImages, setSlideImages] = useState<Record<number, string>>({});
  const [generatingImageSlide, setGeneratingImageSlide] = useState<number | null>(null);

  const activeTheme = themeOverride || carousel?.theme || 'editorial-dark';
  const getSettings = (num: number) => settingsMap[num] || { ...DEFAULT_NS };
  const updateSettings = (num: number, updates: Partial<NarrativeSettings>) => {
    setSettingsMap(prev => ({ ...prev, [num]: { ...getSettings(num), ...updates } }));
  };

  // Research topic before generation
  const handleResearch = async () => {
    if (!topic.trim()) { toast.error('Informe um tópico'); return; }
    setIsResearching(true);
    try {
      const data = await researchTopic({ topic, audience: audienceAngle });
      setResearchData(data);
      toast.success(`${data.facts.length} fatos encontrados!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro na pesquisa');
    } finally {
      setIsResearching(false);
    }
  };

  const handleGenerate = () => {
    generate({
      topic,
      audience_angle: audienceAngle,
      tone: 'editorial',
      channel: 'Instagram Feed',
      num_slides: numSlides,
      ...(researchData ? { researchData: researchData.research, researchCitations: researchData.citations } : {}),
    } as Parameters<typeof generate>[0]);
    setSettingsMap({});
    setVerification({});
    setSlideImages({});
  };

  // Fact-check slides
  const handleVerify = async () => {
    if (!carousel || !researchData?.facts.length) { toast.info('Pesquise um tópico primeiro'); return; }
    setIsVerifying(true);
    try {
      const result = await verifyCarouselFacts({
        slides: carousel.slides.map(s => ({ number: s.number, headline: s.headline, bodyText: s.bodyText })),
        facts: researchData.facts,
      });
      const map: Record<number, { overallStatus: VerificationStatus; claims: Array<Record<string, unknown>> }> = {};
      for (const v of result.verification) {
        map[v.slideNumber] = { overallStatus: v.overallStatus as VerificationStatus, claims: v.claims };
      }
      setVerification(map);
      toast.success('Verificação concluída!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro na verificação');
    } finally {
      setIsVerifying(false);
    }
  };

  // Per-slide image generation
  const handleGenerateSlideImage = async (slide: NarrativeSlide) => {
    const prompt = slide.imagePrompt || `Editorial photo for: "${slide.headline}". Documentary Brazilian photography, natural lighting.`;
    setGeneratingImageSlide(slide.number);
    try {
      const data = await generateSlideImage({ imagePrompt: prompt, quality: 'standard' });
      const url = data.imageUrl || (data.imageBase64 ? `data:image/png;base64,${data.imageBase64}` : null);
      if (url) {
        setSlideImages(prev => ({ ...prev, [slide.number]: url }));
        saveImageToLibrary(url, prompt).catch(() => {});
        toast.success(`Imagem slide ${slide.number}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar imagem');
    } finally {
      setGeneratingImageSlide(null);
    }
  };

  const handleUpdateSlide = (index: number, field: keyof NarrativeSlide, value: string) => {
    if (!carousel) return;
    const slides = [...carousel.slides];
    slides[index] = { ...slides[index], [field]: value };
    setCarousel({ ...carousel, slides });
  };

  const handleExportZip = async () => {
    if (!carousel) return;
    setExporting(true);
    const zip = new JSZip();
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:-9999px;z-index:-1;';
    document.body.appendChild(container);
    try {
      for (const slide of carousel.slides) {
        const el = document.createElement('div');
        container.appendChild(el);
        const root = createRoot(el);
        flushSync(() => { root.render(<NarrativeSlidePreview slide={slide} theme={activeTheme} width={1080} height={1350} imageUrl={slideImages[slide.number]} />); });
        await document.fonts.ready;
        await new Promise((r) => setTimeout(r, 100));
        const dataUrl = await toPng(el.firstElementChild as HTMLElement, { width: 1080, height: 1350, pixelRatio: 1 });
        zip.file(`${slide.number}-${slide.type}.png`, dataUrl.split(',')[1], { base64: true });
        root.unmount(); el.remove();
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `narrativa_${carousel.title.slice(0, 30).replace(/\s/g, '_')}.zip`);
    } finally { document.body.removeChild(container); setExporting(false); }
  };

  const verIcon = (status: VerificationStatus) => {
    if (status === 'verified') return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
    if (status === 'modified') return <AlertTriangle className="w-3 h-3 text-amber-400" />;
    if (status === 'ungrounded') return <XCircle className="w-3 h-3 text-red-400" />;
    return null;
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Left: Input */}
      <div className="w-80 shrink-0 space-y-5 overflow-y-auto pr-2 scrollbar-thin">
        <StrategyContext />

        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Tema / Tópico</label>
          <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex: Por que profissionais autônomos precisam de presença digital..." className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted resize-none focus:border-brand outline-none" rows={3} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Ângulo de Audiência</label>
          <input value={audienceAngle} onChange={(e) => setAudienceAngle(e.target.value)} placeholder="Ex: dor do autônomo que não tem clientes..." className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand outline-none" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Slides</label>
          <div className="flex gap-2">
            {[7, 8, 9, 10].map((n) => (
              <button key={n} onClick={() => setNumSlides(n)} className={cn('flex-1 py-2 rounded-lg text-sm font-medium border transition-all', numSlides === n ? 'border-brand text-brand bg-brand/10' : 'border-border text-text-muted hover:border-text-muted')}>{n}</button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Tema Visual</label>
          <div className="flex gap-2">
            {THEMES.map((t) => (
              <button key={t.id} onClick={() => setThemeOverride(t.id === themeOverride ? '' : t.id)} className={cn('flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all', activeTheme === t.id ? 'border-brand bg-brand/10 text-brand' : 'border-border text-text-muted hover:border-text-muted')}>
                <div className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: t.swatch }} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Research button */}
        <button onClick={handleResearch} disabled={isResearching || !topic.trim()} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-brand/30 text-brand rounded-lg text-xs font-semibold uppercase tracking-wider transition-all hover:bg-brand/10 disabled:opacity-50">
          {isResearching ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Pesquisando...</> : <><Search className="w-3.5 h-3.5" />Pesquisar Dados</>}
        </button>
        {researchData && (
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400">
            {researchData.facts.length} fatos • {researchData.citations.length} fontes
          </div>
        )}

        {/* Generate button */}
        <button onClick={handleGenerate} disabled={isGenerating} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand hover:bg-brand-dark text-white rounded-lg text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50">
          {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando narrativa...</> : <><Sparkles className="w-4 h-4" />Gerar Narrativa</>}
        </button>

        {carousel && (
          <div className="space-y-2">
            {/* Verify button */}
            {researchData && (
              <button onClick={handleVerify} disabled={isVerifying} className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-semibold transition-colors hover:bg-amber-500/10 disabled:opacity-50">
                {isVerifying ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Verificando...</> : <><CheckCircle2 className="w-3.5 h-3.5" />Verificar Fatos</>}
              </button>
            )}
            <div className="flex gap-2">
              <button onClick={handleExportZip} disabled={exporting} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {exporting ? 'Exportando...' : 'ZIP'}
              </button>
              <button onClick={() => { reset(); setSettingsMap({}); setVerification({}); setSlideImages({}); setResearchData(null); }} className="px-3 py-2.5 border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"><RotateCcw className="w-4 h-4" /></button>
            </div>
          </div>
        )}
        {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
      </div>

      {/* Right: Preview */}
      <div className="flex-1 overflow-y-auto pb-8">
        {!carousel && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-brand/10 flex items-center justify-center mb-4"><span className="text-4xl">📖</span></div>
            <h2 className="font-heading font-bold text-lg text-text-primary mb-1">Carrossel Narrativo</h2>
            <p className="text-sm text-text-muted max-w-sm">7-10 slides editoriais com storytelling profundo. Pesquise dados reais, verifique fatos e gere imagens por slide.</p>
          </div>
        )}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <div className="w-16 h-16 rounded-2xl bg-brand/20 flex items-center justify-center mb-4 animate-pulse"><span className="text-3xl">✍️</span></div>
            <p className="text-sm text-text-secondary animate-pulse">Construindo narrativa editorial...</p>
          </div>
        )}
        {carousel && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="font-heading font-black text-xl uppercase text-text-primary">{carousel.title}</h2>
              <p className="text-xs text-text-secondary">{carousel.narrative_arc}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded font-medium">{carousel.shareability_hook}</span>
                <span className="text-[10px] text-text-muted">{carousel.bestTime}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              {carousel.slides.map((slide, i) => {
                const ns = getSettings(slide.number);
                const ver = verification[slide.number];
                return (
                  <div key={slide.number} className="group space-y-2">
                    <div className="relative">
                      <NarrativeSlidePreview slide={slide} theme={activeTheme} imageUrl={slideImages[slide.number]} />
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {ver && verIcon(ver.overallStatus)}
                        <button
                          onClick={() => handleGenerateSlideImage(slide)}
                          disabled={generatingImageSlide === slide.number}
                          className="p-1.5 rounded-md bg-black/60 hover:bg-black/80 text-white transition-colors"
                        >
                          {generatingImageSlide === slide.number ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => setControlsSlide(controlsSlide === slide.number ? null : slide.number)}
                          className={cn('p-1.5 rounded-md bg-black/60 hover:bg-black/80 text-white transition-colors', controlsSlide === slide.number && 'bg-brand/80')}
                        >
                          <SlidersHorizontal className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {controlsSlide === slide.number && (
                      <div className="p-2 bg-surface-elevated rounded-lg border border-border space-y-2">
                        <AdjSlider label="Escala Texto" value={ns.textScale} min={0.5} max={2.0} step={0.1} onValueChange={(v) => updateSettings(slide.number, { textScale: v })} />
                        <AdjSlider label="Opacidade Img" value={ns.imageOpacity} min={0} max={1} step={0.05} onValueChange={(v) => updateSettings(slide.number, { imageOpacity: v })} />
                        <AdjSlider label="Zoom Img" value={ns.imageZoom} min={1} max={2.5} step={0.1} onValueChange={(v) => updateSettings(slide.number, { imageZoom: v })} />
                      </div>
                    )}
                    {editingSlide === slide.number ? (
                      <div className="space-y-1.5 p-2 bg-surface-elevated rounded-lg border border-border">
                        <input className="w-full bg-surface-hover border border-border rounded px-2 py-1 text-xs font-heading font-bold uppercase text-text-primary focus:border-brand outline-none" value={slide.headline} onChange={(e) => handleUpdateSlide(i, 'headline', e.target.value)} />
                        <textarea className="w-full bg-surface-hover border border-border rounded px-2 py-1 text-xs text-text-secondary resize-none focus:border-brand outline-none" rows={2} value={slide.bodyText || ''} onChange={(e) => handleUpdateSlide(i, 'bodyText', e.target.value)} />
                        <button onClick={() => setEditingSlide(null)} className="text-[10px] text-brand hover:underline">Fechar</button>
                      </div>
                    ) : (
                      <button onClick={() => setEditingSlide(slide.number)} className="text-[10px] text-text-muted hover:text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity">Editar slide</button>
                    )}
                  </div>
                );
              })}
            </div>
            {carousel.caption && (
              <div className="bg-surface-elevated rounded-xl border border-border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Caption</span>
                  <button onClick={() => navigator.clipboard.writeText(carousel.caption)} className="text-text-muted hover:text-brand p-1"><Copy className="w-3.5 h-3.5" /></button>
                </div>
                <p className="text-sm text-text-primary whitespace-pre-line leading-relaxed">{carousel.caption}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
