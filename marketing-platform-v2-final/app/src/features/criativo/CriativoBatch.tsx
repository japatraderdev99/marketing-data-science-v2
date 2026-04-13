import { useState, useCallback } from 'react';
import { Sparkles, Loader2, RotateCcw } from 'lucide-react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { BatchVariation, VisualStyleId, CarouselThemeId, SlideSettings } from '@/types';
import { DEFAULT_SLIDE_SETTINGS } from '@/types';
import { CAROUSEL_THEMES, VISUAL_STYLES, ANGLES } from '@/features/carousel/constants';
import { NicheSelector } from '@/components/shared/NicheSelector';
import { SlidePreview } from '@/features/carousel/components/SlidePreview';
import { VariationCard } from './VariationCard';
import { MassControls } from './MassControls';
import { StrategyContext } from '@/components/shared/StrategyContext';
import { AD_FORMATS, scaleFormat, type AdFormat } from './constants';
import { generateId, cn } from '@/lib/utils';
import { generateCreativeBatch } from '@/lib/ai';
import { supabase } from '@/lib/supabase';
import { useSaveDraft } from './hooks/useCreativeDrafts';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';

const VARIATION_COUNTS = [2, 3, 4, 6];

// Only social formats make sense for batch
const BATCH_FORMATS = AD_FORMATS.filter(f => !f.id.startsWith('gdn'));

/** Small aspect-ratio shape */
function FormatShape({ format, size = 22 }: { format: AdFormat; size?: number }) {
  const sw = size / format.width, sh = size / format.height;
  const s = Math.min(sw, sh);
  const w = Math.max(3, Math.round(format.width * s));
  const h = Math.max(3, Math.round(format.height * s));
  return <div style={{ width: w, height: h, background: 'currentColor', borderRadius: 1.5, opacity: 0.7 }} />;
}

export function CriativoBatch() {
  const [briefing, setBriefing] = useState('');
  const [angle, setAngle] = useState('');
  const [formatId, setFormatId] = useState('ig-feed');
  const [nicheMode, setNicheMode] = useState('');
  const [niches, setNiches] = useState<string[]>([]);
  const [style, setStyle] = useState<VisualStyleId>('impact-direct');
  const [count, setCount] = useState(3);
  const [themeId, setThemeId] = useState<CarouselThemeId>('brand-orange');
  const [themesMap, setThemesMap] = useState<Record<string, CarouselThemeId>>({});
  const [variations, setVariations] = useState<BatchVariation[]>([]);
  const [settingsMap, setSettingsMap] = useState<Record<string, SlideSettings>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);

  const format = BATCH_FORMATS.find(f => f.id === formatId) ?? BATCH_FORMATS[0];
  const theme = CAROUSEL_THEMES.find(t => t.id === themeId) || CAROUSEL_THEMES[0];
  const getThemeForVariation = (id: string) =>
    CAROUSEL_THEMES.find(t => t.id === (themesMap[id] ?? themeId)) ?? CAROUSEL_THEMES[0];
  const saveDraft = useSaveDraft();

  const getSettings = (id: string): SlideSettings => settingsMap[id] || { ...DEFAULT_SLIDE_SETTINGS };
  const updateSettings = (id: string, updates: Partial<SlideSettings>) =>
    setSettingsMap(prev => ({ ...prev, [id]: { ...getSettings(id), ...updates } }));
  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true); setError(null); setVariations([]); setSettingsMap({}); setThemesMap({});
    try {
      setProgress(`Gerando ${count} variações...`);
      const result = await generateCreativeBatch({
        briefing,
        angle,
        channel: `${format.channel} ${format.label} (${format.ratio} ${format.width}×${format.height}px)`,
        niches,
        style,
        count,
      });

      const batchVars: BatchVariation[] = (result.variations ?? []).map((v: Partial<BatchVariation>) => ({
        id: generateId(),
        headline: v.headline ?? 'SEM TÍTULO',
        subtext: v.subtext ?? '',
        cta: v.cta ?? '',
        style: (v.style as VisualStyleId) ?? style,
        imagePrompt: v.imagePrompt,
        suggested_tags: v.suggested_tags ?? [],
        mediaUrl: null,
        status: 'done' as const,
      }));
      setVariations(batchVars);

      // Generate images in parallel chunks of 3
      const withPrompts = batchVars.filter(v => v.imagePrompt);
      if (withPrompts.length > 0) {
        setProgress('Gerando imagens...');
        for (let i = 0; i < withPrompts.length; i += 3) {
          await Promise.allSettled(withPrompts.slice(i, i + 3).map(async v => {
            try {
              const { data } = await supabase.functions.invoke('generate-slide-image', {
                body: { imagePrompt: v.imagePrompt, translateFirst: true },
              });
              const url: string | null = data?.imageDataUrl ?? data?.imageUrl ?? (data?.imageBase64 ? `data:image/png;base64,${data.imageBase64}` : null);
              if (url) setVariations(prev => prev.map(x => x.id === v.id ? { ...x, mediaUrl: url } : x));
            } catch { /* imagem opcional */ }
          }));
        }
      }

      if (batchVars.length > 0) {
        saveDraft.mutate({
          type: 'batch',
          title: `Batch ${new Date().toLocaleDateString('pt-BR')} — ${batchVars.length}x ${format.channel} ${format.label}`,
          data: { briefing, angle, formatId, style, variations: batchVars } as unknown as Record<string, unknown>,
        });
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Erro na geração batch'); }
    finally { setIsGenerating(false); setProgress(''); }
  }, [briefing, angle, format, formatId, niches, style, count]);

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
        const slideObj = { number: 1, type: 'hook' as const, headline: v.headline, subtext: v.subtext, logic: '', visualDirection: '', needsMedia: false, bgStyle: 'dark' as const, layout: 'text-only' as const };
        const root = createRoot(el);
        flushSync(() => root.render(
          <SlidePreview slide={slideObj} theme={theme} width={format.width} height={format.height}
            nativeWidth={format.width} nativeHeight={format.height}
            settings={getSettings(v.id)} imageUrl={v.mediaUrl} isExport />
        ));
        await document.fonts.ready;
        await new Promise(r => setTimeout(r, 100));
        const dataUrl = await toPng(el.firstElementChild as HTMLElement, { width: format.width, height: format.height, pixelRatio: 1 });
        zip.file(`${format.id}-${v.id.slice(0, 8)}.png`, dataUrl.split(',')[1], { base64: true });
        root.unmount(); el.remove();
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `batch_${format.id}_${new Date().toISOString().slice(0, 10)}.zip`);
    } finally { document.body.removeChild(container); setExporting(false); setExportProgress(null); }
  };

  const applyToAll = (updates: Partial<SlideSettings>) => {
    const targets = selected.size > 0 ? variations.filter(v => selected.has(v.id)) : variations;
    setSettingsMap(prev => { const next = { ...prev }; for (const v of targets) next[v.id] = { ...getSettings(v.id), ...updates }; return next; });
  };

  const applyThemeToAll = (tid: CarouselThemeId) => {
    const targets = selected.size > 0 ? variations.filter(v => selected.has(v.id)) : variations;
    setThemesMap(prev => { const next = { ...prev }; for (const v of targets) next[v.id] = tid; return next; });
  };

  const applyCtaToAll = (cta: string) => {
    const targets = selected.size > 0 ? variations.filter(v => selected.has(v.id)) : variations;
    setVariations(prev => prev.map(v => targets.some(t => t.id === v.id) ? { ...v, cta } : v));
  };

  const deleteSelected = () => { setVariations(prev => prev.filter(v => !selected.has(v.id))); setSelected(new Set()); };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left Controls */}
      <div className="w-full lg:w-80 shrink-0 space-y-4 overflow-y-auto pr-2 scrollbar-thin">
        <StrategyContext />

        {/* Format Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Formato</label>
          <div className="flex flex-wrap gap-1.5">
            {BATCH_FORMATS.map(f => (
              <button key={f.id} onClick={() => setFormatId(f.id)}
                title={`${f.channel} ${f.label} — ${f.width}×${f.height}px`}
                className={cn('flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all',
                  formatId === f.id ? 'border-brand bg-brand/10 text-brand' : 'border-border text-text-muted hover:border-text-muted')}>
                <FormatShape format={f} />
                <span>{f.channel} {f.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Briefing</label>
          <textarea value={briefing} onChange={e => setBriefing(e.target.value)} placeholder="O que comunicar..."
            className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted resize-none focus:border-brand outline-none" rows={3} />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Ângulo</label>
          <div className="flex flex-wrap gap-1.5">
            {ANGLES.map(a => (
              <button key={a.id} onClick={() => setAngle(angle === a.id ? '' : a.id)}
                className={cn('px-2 py-1.5 rounded-md text-xs font-medium border transition-all',
                  angle === a.id ? `${a.color} bg-white/5 border-current` : 'border-border text-text-muted hover:border-text-muted')}>
                {a.emoji} {a.label}
              </button>
            ))}
          </div>
        </div>

        <NicheSelector value={nicheMode} onChange={setNicheMode} multi multiValue={niches} onMultiChange={setNiches} />

        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Estilo Visual</label>
          <div className="grid grid-cols-2 gap-1.5">
            {VISUAL_STYLES.map(s => (
              <button key={s.id} onClick={() => setStyle(s.id as VisualStyleId)}
                className={cn('px-2 py-2 rounded-lg border text-left transition-all', style === s.id ? 'border-brand bg-brand/10' : 'border-border hover:border-text-muted')}>
                <span className="text-xs font-medium text-text-primary block">{s.label}</span>
                <span className="text-[10px] text-text-muted">{s.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Variações</label>
            <div className="flex gap-1">
              {VARIATION_COUNTS.map(n => (
                <button key={n} onClick={() => setCount(n)}
                  className={cn('flex-1 py-2 rounded-lg text-sm font-medium border transition-all',
                    count === n ? 'border-brand text-brand bg-brand/10' : 'border-border text-text-muted hover:border-text-muted')}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Tema</label>
            <select value={themeId} onChange={e => setThemeId(e.target.value as CarouselThemeId)}
              className="w-full bg-surface-hover border border-border rounded-lg px-2 py-2 text-xs text-text-primary focus:border-brand outline-none">
              {CAROUSEL_THEMES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <button onClick={handleGenerate} disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand hover:bg-brand-dark text-white rounded-lg text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50">
          {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" />{progress || 'Gerando...'}</> : <><Sparkles className="w-4 h-4" />Gerar {count} Variações</>}
        </button>
        {variations.length > 0 && (
          <button onClick={() => { setVariations([]); setSettingsMap({}); setSelected(new Set()); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-border rounded-lg text-text-secondary hover:text-text-primary text-sm">
            <RotateCcw className="w-3.5 h-3.5" />Limpar tudo
          </button>
        )}
        {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
      </div>

      {/* Right Grid */}
      <div className="flex-1 overflow-y-auto pb-8 space-y-4">
        {variations.length === 0 && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-brand/10 flex items-center justify-center mb-4"><span className="text-4xl">⚡</span></div>
            <h2 className="font-heading font-bold text-lg text-text-primary mb-1">Criativo Batch</h2>
            <p className="text-sm text-text-muted max-w-sm">Gere múltiplas variações em lote para testes A/B. Selecione o formato e a IA adapta copy e imagem precisamente.</p>
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
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: format.channelHex + '22', color: format.channelHex }}>
                {format.channel} {format.label} · {format.width}×{format.height}px
              </span>
            </div>
            <MassControls
              totalCount={variations.length} selectedCount={selected.size}
              onSelectAll={() => setSelected(new Set(variations.map(v => v.id)))}
              onDeselectAll={() => setSelected(new Set())}
              onApplyToAll={applyToAll} onApplyCtaToAll={applyCtaToAll}
              onChangeTheme={applyThemeToAll} currentThemeId={themeId}
              onExportSelected={handleExportSelected} onDeleteSelected={deleteSelected}
              isExporting={exporting} exportProgress={exportProgress}
            />
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {variations.map(v => (
                <VariationCard key={v.id} variation={v} theme={getThemeForVariation(v.id)}
                  settings={getSettings(v.id)} isSelected={selected.has(v.id)}
                  nativeWidth={format.width} nativeHeight={format.height}
                  onToggleSelect={() => toggleSelect(v.id)}
                  onUpdateVariation={updates => setVariations(prev => prev.map(x => x.id === v.id ? { ...x, ...updates } : x))}
                  onUpdateSettings={updates => updateSettings(v.id, updates)}
                  onChangeTheme={tid => setThemesMap(prev => ({ ...prev, [v.id]: tid }))}
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
