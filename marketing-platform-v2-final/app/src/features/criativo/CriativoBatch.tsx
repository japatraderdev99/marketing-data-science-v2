import { useState, useCallback } from 'react';
import { Sparkles, Loader2, RotateCcw } from 'lucide-react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { BatchVariation, VisualStyleId, CarouselThemeId, SlideSettings } from '@/types';
import { DEFAULT_SLIDE_SETTINGS } from '@/types';
import { CAROUSEL_THEMES, VISUAL_STYLES, ANGLES, CHANNELS } from '@/features/carousel/constants';
import { NicheSelector } from '@/components/shared/NicheSelector';
import { SlidePreview } from '@/features/carousel/components/SlidePreview';
import { VariationCard } from './VariationCard';
import { MassControls } from './MassControls';
import { StrategyContext } from '@/components/shared/StrategyContext';
import { generateId, cn } from '@/lib/utils';
import { generateCarouselVisual } from '@/lib/ai';
import { supabase } from '@/lib/supabase';
import { useSaveDraft } from './hooks/useCreativeDrafts';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';

const VARIATION_COUNTS = [2, 3, 4, 6];

export function CriativoBatch() {
  const [briefing, setBriefing] = useState('');
  const [angle, setAngle] = useState('');
  const [channel, setChannel] = useState('Instagram Feed');
  const [nicheMode, setNicheMode] = useState('');
  const [niches, setNiches] = useState<string[]>([]);
  const [style, setStyle] = useState<VisualStyleId>('impact-direct');
  const [count, setCount] = useState(3);
  const [themeId, setThemeId] = useState<CarouselThemeId>('brand-orange');
  const [variations, setVariations] = useState<BatchVariation[]>([]);
  const [settingsMap, setSettingsMap] = useState<Record<string, SlideSettings>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);

  const theme = CAROUSEL_THEMES.find((t) => t.id === themeId) || CAROUSEL_THEMES[0];
  const saveDraft = useSaveDraft();

  const getSettings = (id: string): SlideSettings => settingsMap[id] || { ...DEFAULT_SLIDE_SETTINGS };

  const updateSettings = (id: string, updates: Partial<SlideSettings>) => {
    setSettingsMap(prev => ({ ...prev, [id]: { ...getSettings(id), ...updates } }));
  };

  const toggleSelect = (id: string) => setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true); setError(null); setVariations([]); setSettingsMap({});
    const results: BatchVariation[] = [];
    const chunks: number[][] = [];
    for (let i = 0; i < count; i += 3) chunks.push(Array.from({ length: Math.min(3, count - i) }, (_, j) => i + j));
    try {
      for (const chunk of chunks) {
        setProgress(`Gerando ${results.length + 1} de ${count}...`);
        const promises = chunk.map(async (idx) => {
          try {
            const result = await generateCarouselVisual({ context: `${briefing}. Variação ${idx + 1}/${count}. Estilo: ${style}. Nichos: ${niches.join(', ')}`, angle, channel, tone: 'Peer-to-peer' });
            const hookSlide = result.carousel?.slides?.[0];
            if (!hookSlide) throw new Error('Sem slides');
            return { id: generateId(), headline: hookSlide.headline || 'SEM TÍTULO', subtext: hookSlide.subtext || '', cta: result.carousel.slides?.[result.carousel.slides.length - 1]?.headline || 'CTA', style, imagePrompt: hookSlide.imagePrompt || undefined, suggested_tags: [], mediaUrl: null, status: 'done' as const };
          } catch { return { id: generateId(), headline: 'ERRO NA GERAÇÃO', subtext: 'Tente novamente', cta: '', style, status: 'error' as const }; }
        });
        const batchResults = await Promise.allSettled(promises);
        for (const r of batchResults) if (r.status === 'fulfilled') results.push(r.value);
        setVariations([...results]);
      }
      // Fetch images in parallel chunks of 3 for variations that have imagePrompts
      const withPrompts = results.filter(v => v.status === 'done' && v.imagePrompt);
      if (withPrompts.length > 0) {
        setProgress('Gerando imagens...');
        const imgChunks: (typeof withPrompts)[] = [];
        for (let i = 0; i < withPrompts.length; i += 3) imgChunks.push(withPrompts.slice(i, i + 3));
        for (const chunk of imgChunks) {
          await Promise.allSettled(chunk.map(async (v) => {
            try {
              const { data } = await supabase.functions.invoke('generate-slide-image', {
                body: { imagePrompt: v.imagePrompt, translateFirst: true },
              });
              const url: string | null = data?.imageDataUrl ?? data?.imageUrl ?? (data?.imageBase64 ? `data:image/png;base64,${data.imageBase64}` : null);
              if (url) {
                setVariations(prev => prev.map(x => x.id === v.id ? { ...x, mediaUrl: url } : x));
              }
            } catch { /* image is optional — skip silently */ }
          }));
        }
      }
      const done = results.filter(v => v.status === 'done');
      if (done.length > 0) {
        saveDraft.mutate({
          type: 'batch',
          title: `Batch ${new Date().toLocaleDateString('pt-BR')} — ${done.length} variações`,
          data: { briefing, angle, channel, style, variations: done } as unknown as Record<string, unknown>,
        });
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Erro na geração batch'); }
    finally { setIsGenerating(false); setProgress(''); }
  }, [briefing, angle, channel, niches, style, count]);

  const handleExportSelected = async () => {
    const toExport = variations.filter(v => v.status === 'done' && (selected.size === 0 || selected.has(v.id)));
    if (!toExport.length) return;
    setExporting(true); setExportProgress({ current: 0, total: toExport.length });
    const zip = new JSZip();
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:-9999px;z-index:-1;';
    document.body.appendChild(container);
    try {
      for (let i = 0; i < toExport.length; i++) {
        const v = toExport[i];
        setExportProgress({ current: i + 1, total: toExport.length });
        const el = document.createElement('div'); container.appendChild(el);
        const slide = { number: 1, type: 'hook' as const, headline: v.headline, subtext: v.subtext, logic: '', visualDirection: '', needsMedia: false, bgStyle: 'dark' as const, layout: 'text-only' as const };
        const root = createRoot(el);
        flushSync(() => { root.render(<SlidePreview slide={slide} theme={theme} width={1080} height={1350} settings={getSettings(v.id)} isExport />); });
        await document.fonts.ready;
        await new Promise(r => setTimeout(r, 100));
        const dataUrl = await toPng(el.firstElementChild as HTMLElement, { width: 1080, height: 1350, pixelRatio: 1 });
        zip.file(`criativo-${v.id.slice(0, 8)}.png`, dataUrl.split(',')[1], { base64: true });
        root.unmount(); el.remove();
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `batch_criativos_${new Date().toISOString().slice(0, 10)}.zip`);
    } finally { document.body.removeChild(container); setExporting(false); setExportProgress(null); }
  };

  const applyToAll = (updates: Partial<SlideSettings>) => {
    const targets = selected.size > 0 ? variations.filter(v => selected.has(v.id)) : variations;
    setSettingsMap(prev => {
      const next = { ...prev };
      for (const v of targets) next[v.id] = { ...getSettings(v.id), ...updates };
      return next;
    });
  };

  const applyCtaToAll = (cta: string) => {
    const targets = selected.size > 0 ? variations.filter(v => selected.has(v.id)) : variations;
    setVariations(prev => prev.map(v => targets.some(t => t.id === v.id) ? { ...v, cta } : v));
  };

  const deleteSelected = () => {
    setVariations(prev => prev.filter(v => !selected.has(v.id)));
    setSelected(new Set());
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Left: Controls */}
      <div className="w-80 shrink-0 space-y-4 overflow-y-auto pr-2 scrollbar-thin">
        <StrategyContext />

        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Briefing</label>
          <textarea value={briefing} onChange={(e) => setBriefing(e.target.value)} placeholder="O que você quer comunicar..." className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted resize-none focus:border-brand outline-none" rows={3} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Ângulo</label>
          <div className="flex flex-wrap gap-1.5">
            {ANGLES.map((a) => (<button key={a.id} onClick={() => setAngle(a.id)} className={cn('px-2 py-1.5 rounded-md text-xs font-medium border transition-all', angle === a.id ? `${a.color} bg-white/5 border-current` : 'border-border text-text-muted hover:border-text-muted')}>{a.emoji} {a.label}</button>))}
          </div>
        </div>
        <NicheSelector value={nicheMode} onChange={setNicheMode} multi multiValue={niches} onMultiChange={setNiches} />
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Estilo Visual</label>
          <div className="grid grid-cols-2 gap-1.5">
            {VISUAL_STYLES.map((s) => (<button key={s.id} onClick={() => setStyle(s.id as VisualStyleId)} className={cn('px-2 py-2 rounded-lg border text-left transition-all', style === s.id ? 'border-brand bg-brand/10' : 'border-border hover:border-text-muted')}><span className="text-xs font-medium text-text-primary block">{s.label}</span><span className="text-[10px] text-text-muted">{s.desc}</span></button>))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Variações</label>
            <div className="flex gap-1">{VARIATION_COUNTS.map((n) => (<button key={n} onClick={() => setCount(n)} className={cn('flex-1 py-2 rounded-lg text-sm font-medium border transition-all', count === n ? 'border-brand text-brand bg-brand/10' : 'border-border text-text-muted hover:border-text-muted')}>{n}</button>))}</div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Canal</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-brand outline-none">{CHANNELS.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
        </div>
        <button onClick={handleGenerate} disabled={isGenerating} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand hover:bg-brand-dark text-white rounded-lg text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50">
          {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" />{progress || 'Gerando...'}</> : <><Sparkles className="w-4 h-4" />Gerar {count} Variações</>}
        </button>
        {variations.length > 0 && (<button onClick={() => { setVariations([]); setSettingsMap({}); setSelected(new Set()); }} className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-border rounded-lg text-text-secondary hover:text-text-primary text-sm"><RotateCcw className="w-3.5 h-3.5" />Limpar tudo</button>)}
        {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
      </div>

      {/* Right: Mass Controls + Grid */}
      <div className="flex-1 overflow-y-auto pb-8 space-y-4">
        {variations.length === 0 && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-brand/10 flex items-center justify-center mb-4"><span className="text-4xl">⚡</span></div>
            <h2 className="font-heading font-bold text-lg text-text-primary mb-1">Criativo Batch</h2>
            <p className="text-sm text-text-muted max-w-sm">Gere múltiplas variações de criativos em lote. Perfeito para testes A/B e escala.</p>
          </div>
        )}
        {isGenerating && variations.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <div className="w-16 h-16 rounded-2xl bg-brand/20 flex items-center justify-center mb-4 animate-pulse"><span className="text-3xl">⚡</span></div>
            <p className="text-sm text-text-secondary animate-pulse">{progress || 'Preparando variações...'}</p>
          </div>
        )}
        {variations.length > 0 && (
          <>
            <MassControls
              totalCount={variations.length} selectedCount={selected.size}
              onSelectAll={() => setSelected(new Set(variations.map(v => v.id)))}
              onDeselectAll={() => setSelected(new Set())}
              onApplyToAll={applyToAll} onApplyCtaToAll={applyCtaToAll}
              onExportSelected={handleExportSelected} onDeleteSelected={deleteSelected}
              isExporting={exporting} exportProgress={exportProgress}
            />
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {variations.map((v) => (
                <VariationCard key={v.id} variation={v} theme={theme}
                  settings={getSettings(v.id)} isSelected={selected.has(v.id)}
                  onToggleSelect={() => toggleSelect(v.id)}
                  onUpdateVariation={(updates) => setVariations(prev => prev.map(x => x.id === v.id ? { ...x, ...updates } : x))}
                  onUpdateSettings={(updates) => updateSettings(v.id, updates)}
                  onRemove={() => { setVariations(prev => prev.filter(x => x.id !== v.id)); setSelected(prev => { const n = new Set(prev); n.delete(v.id); return n; }); }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
