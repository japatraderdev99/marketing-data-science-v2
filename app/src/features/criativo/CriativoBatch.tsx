import { useState, useCallback } from 'react';
import { Sparkles, Loader2, RotateCcw } from 'lucide-react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { BatchVariation, VisualStyleId, CarouselThemeId, SlideSettings, CreativeFormat } from '@/types';
import { DEFAULT_SLIDE_SETTINGS } from '@/types';
import { CAROUSEL_THEMES, VISUAL_STYLES, ANGLES, CHANNELS, CREATIVE_FORMATS } from '@/features/carousel/constants';
import { NicheSelector } from '@/components/shared/NicheSelector';
import { SlidePreview } from '@/features/carousel/components/SlidePreview';
import { VariationCard } from './VariationCard';
import { MassControls } from './MassControls';
import { StrategyContext } from '@/components/shared/StrategyContext';
import { generateId, cn } from '@/lib/utils';
import { generateCreativeBatch } from '@/lib/ai';
import { useImageGeneration } from '@/hooks/useImageGeneration';
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
  const [format, setFormat] = useState<CreativeFormat>(CREATIVE_FORMATS[0]);
  const [variations, setVariations] = useState<BatchVariation[]>([]);
  const [settingsMap, setSettingsMap] = useState<Record<string, SlideSettings>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);

  const theme = CAROUSEL_THEMES.find((t) => t.id === themeId) || CAROUSEL_THEMES[0];

  const {
    generatingId, generatingAll, searchingLibrary,
    imageGenProgress, libraryProgress,
    generateForVariation, generateAllImages,
    searchLibraryForAll, searchLibraryForOne,
  } = useImageGeneration();

  const getSettings = (id: string): SlideSettings => settingsMap[id] || { ...DEFAULT_SLIDE_SETTINGS };
  const updateSettings = (id: string, updates: Partial<SlideSettings>) => {
    setSettingsMap(prev => ({ ...prev, [id]: { ...getSettings(id), ...updates } }));
  };
  const toggleSelect = (id: string) => setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const updateVariationImage = useCallback((id: string, url: string) => {
    setVariations(prev => prev.map(v => v.id === id ? { ...v, mediaUrl: url } : v));
  }, []);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true); setError(null); setVariations([]); setSettingsMap({});
    setProgress('Gerando variações com IA...');
    try {
      const result = await generateCreativeBatch({
        briefing, angle, channel, niches, style, count,
      });

      const newVariations: BatchVariation[] = (result.variations || []).map((v: Record<string, unknown>) => ({
        id: generateId(),
        headline: (v.headline as string) || 'SEM TÍTULO',
        subtext: (v.subtext as string) || '',
        cta: (v.cta as string) || 'SAIBA MAIS',
        style: (v.style as VisualStyleId) || style,
        imagePrompt: (v.imagePrompt as string) || undefined,
        suggested_tags: (v.suggested_tags as string[]) || [],
        mediaUrl: null,
        status: 'done' as const,
      }));

      if (!newVariations.length) throw new Error('IA não retornou variações');
      setVariations(newVariations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na geração batch');
    } finally {
      setIsGenerating(false); setProgress('');
    }
  }, [briefing, angle, channel, niches, style, count]);

  const handleExportSelected = async () => {
    const toExport = variations.filter(v => v.status === 'done' && (selected.size === 0 || selected.has(v.id)));
    if (!toExport.length) return;
    setExporting(true); setExportProgress({ current: 0, total: toExport.length });
    const zip = new JSZip();
    const legendas: string[] = [];
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
        flushSync(() => {
          root.render(
            <SlidePreview
              slide={slide} theme={theme}
              width={format.width} height={format.height}
              settings={getSettings(v.id)} imageUrl={v.mediaUrl}
              isExport
            />,
          );
        });
        await document.fonts.ready;
        await new Promise(r => setTimeout(r, 150));
        const dataUrl = await toPng(el.firstElementChild as HTMLElement, {
          width: format.width, height: format.height, pixelRatio: 1,
        });
        const fileName = `DQEF-${v.style}-${i + 1}.png`;
        zip.file(fileName, dataUrl.split(',')[1], { base64: true });
        legendas.push(`--- ${fileName} ---\nHeadline: ${v.headline}\nSubtexto: ${v.subtext}\nCTA: ${v.cta}\n`);
        root.unmount(); el.remove();
      }
      zip.file('legendas.txt', legendas.join('\n'));
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `DQEF-criativos-${toExport.length}x-${Date.now()}.zip`);
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
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Tema</label>
          <div className="flex gap-1.5">
            {CAROUSEL_THEMES.map(t => (
              <button key={t.id} onClick={() => setThemeId(t.id)} className={cn('flex-1 py-2 rounded-lg border text-center text-xs font-medium transition-all', themeId === t.id ? 'border-brand text-brand bg-brand/10' : 'border-border text-text-muted hover:border-text-muted')}>
                <div className="flex gap-0.5 justify-center mb-1">
                  {t.previewSwatch.map((c, i) => <span key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />)}
                </div>
                {t.label}
              </button>
            ))}
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
              totalCount={variations.length} selectedCount={selected.size} format={format}
              onSelectAll={() => setSelected(new Set(variations.map(v => v.id)))}
              onDeselectAll={() => setSelected(new Set())}
              onApplyToAll={applyToAll} onApplyCtaToAll={applyCtaToAll}
              onExportSelected={handleExportSelected} onDeleteSelected={deleteSelected}
              onFormatChange={setFormat}
              onSearchLibrary={() => searchLibraryForAll(variations, angle, updateVariationImage)}
              onGenerateAllImages={() => generateAllImages(variations, updateVariationImage)}
              isExporting={exporting} exportProgress={exportProgress}
              generatingAll={generatingAll} searchingLibrary={searchingLibrary}
              imageGenProgress={imageGenProgress} libraryProgress={libraryProgress}
            />
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {variations.map((v) => (
                <VariationCard key={v.id} variation={v} theme={theme} format={format}
                  settings={getSettings(v.id)}
                  isSelected={selected.has(v.id)}
                  isGeneratingImage={generatingId === v.id}
                  onToggleSelect={() => toggleSelect(v.id)}
                  onUpdateVariation={(updates) => setVariations(prev => prev.map(x => x.id === v.id ? { ...x, ...updates } : x))}
                  onUpdateSettings={(updates) => updateSettings(v.id, updates)}
                  onRemove={() => { setVariations(prev => prev.filter(x => x.id !== v.id)); setSelected(prev => { const n = new Set(prev); n.delete(v.id); return n; }); }}
                  onGenerateImage={(prompt) => generateForVariation(v.id, prompt, updateVariationImage)}
                  onSearchLibrary={() => searchLibraryForOne(v, angle)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
