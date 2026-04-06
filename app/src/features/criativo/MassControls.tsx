import { useState } from 'react';
import {
  CheckSquare, Square, Download, Trash2,
  Wand2, BookImage, Loader2, ImageIcon,
} from 'lucide-react';
import type { SlideSettings, CreativeFormat } from '@/types';
import { AdjSlider } from '@/features/carousel/components/AdjSlider';
import { HIGHLIGHT_STYLES, SHAPE_STYLES, FONT_OPTIONS, CREATIVE_FORMATS } from '@/features/carousel/constants';
import { cn } from '@/lib/utils';

interface ImageGenProgress {
  current: number;
  total: number;
  matches?: number;
}

interface MassControlsProps {
  totalCount: number;
  selectedCount: number;
  format: CreativeFormat;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onApplyToAll: (updates: Partial<SlideSettings>) => void;
  onApplyCtaToAll: (cta: string) => void;
  onExportSelected: () => void;
  onDeleteSelected: () => void;
  onFormatChange: (format: CreativeFormat) => void;
  onSearchLibrary: () => void;
  onGenerateAllImages: () => void;
  isExporting: boolean;
  exportProgress?: { current: number; total: number } | null;
  generatingAll: boolean;
  searchingLibrary: boolean;
  imageGenProgress: ImageGenProgress | null;
  libraryProgress: ImageGenProgress | null;
}

export function MassControls({
  totalCount, selectedCount, format, onSelectAll, onDeselectAll,
  onApplyToAll, onApplyCtaToAll, onExportSelected, onDeleteSelected,
  onFormatChange, onSearchLibrary, onGenerateAllImages,
  isExporting, exportProgress, generatingAll, searchingLibrary,
  imageGenProgress, libraryProgress,
}: MassControlsProps) {
  const [ctaText, setCtaText] = useState('');
  const allSelected = selectedCount === totalCount;

  return (
    <div className="border border-border rounded-xl bg-surface-elevated p-3 space-y-3">
      {/* Header + Format Selector */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-[11px] font-bold text-text-primary uppercase tracking-wider">Controles em Massa</h3>
          <div className="flex items-center gap-1">
            <ImageIcon className="w-3 h-3 text-text-muted" />
            <select
              value={format.id}
              onChange={(e) => {
                const f = CREATIVE_FORMATS.find(x => x.id === e.target.value);
                if (f) onFormatChange(f);
              }}
              className="bg-surface-hover border border-border rounded px-1.5 py-0.5 text-[10px] text-text-primary focus:border-brand outline-none"
            >
              {CREATIVE_FORMATS.map(f => (
                <option key={f.id} value={f.id}>{f.label} ({f.ratio})</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="flex items-center gap-1 text-[10px] text-text-muted hover:text-brand transition-colors"
          >
            {allSelected ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
            {allSelected ? 'Desmarcar' : 'Selecionar'} Todos
          </button>
          <span className="text-[10px] text-text-muted">{selectedCount}/{totalCount}</span>
        </div>
      </div>

      {/* Image Operations */}
      <div className="flex flex-wrap gap-2 p-2 bg-surface-hover/50 rounded-lg border border-border/50">
        <button
          onClick={onSearchLibrary}
          disabled={searchingLibrary || generatingAll}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-[11px] font-semibold text-text-primary hover:border-brand hover:text-brand disabled:opacity-50 transition-all"
        >
          {searchingLibrary
            ? <><Loader2 className="w-3 h-3 animate-spin" />{libraryProgress ? `${libraryProgress.current}/${libraryProgress.total} (${libraryProgress.matches || 0} matches)` : 'Buscando...'}</>
            : <><BookImage className="w-3 h-3" />Buscar Biblioteca</>}
        </button>
        <button
          onClick={onGenerateAllImages}
          disabled={generatingAll || searchingLibrary}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand/10 border border-brand/30 rounded-lg text-[11px] font-semibold text-brand hover:bg-brand/20 disabled:opacity-50 transition-all"
        >
          {generatingAll
            ? <><Loader2 className="w-3 h-3 animate-spin" />{imageGenProgress ? `${imageGenProgress.current}/${imageGenProgress.total}` : 'Gerando...'}</>
            : <><Wand2 className="w-3 h-3" />Gerar Todas Imagens</>}
        </button>
        <span className="text-[9px] text-text-muted self-center">
          Busque na biblioteca antes de gerar (economiza custos)
        </span>
      </div>

      {/* Sliders Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdjSlider label="Texto" value={1.0} min={0.5} max={2.0} step={0.1} onValueChange={(v) => onApplyToAll({ textScale: v })} />
        <AdjSlider label="CTA" value={1.0} min={0.5} max={2.0} step={0.1} onValueChange={(v) => onApplyToAll({ ctaScale: v })} />
        <AdjSlider label="Pos X" value={6} min={2} max={80} step={1} display="—" onValueChange={(v) => onApplyToAll({ textPositionX: v })} />
        <AdjSlider label="Pos Y" value={70} min={15} max={95} step={1} display="—" onValueChange={(v) => onApplyToAll({ textPositionY: v })} />
      </div>

      {/* CTA + Shape + Highlight + Font row */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">CTA em massa</p>
          <div className="flex gap-1">
            <input
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && ctaText) { onApplyCtaToAll(ctaText); setCtaText(''); } }}
              placeholder="SAIBA MAIS"
              className="w-28 bg-surface-hover border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:border-brand outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Shape</p>
          <div className="flex gap-0.5">
            {SHAPE_STYLES.slice(0, 4).map(s => (
              <button key={s.id} onClick={() => onApplyToAll({ shape: s.id })} className="px-1.5 py-1 rounded text-[9px] border border-border text-text-muted hover:border-brand hover:text-brand transition-all">
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Destaque</p>
          <div className="flex gap-0.5">
            {HIGHLIGHT_STYLES.map(h => (
              <button key={h.id} onClick={() => onApplyToAll({ highlightStyle: h.id })} className="px-1.5 py-1 rounded text-[9px] border border-border text-text-muted hover:border-brand hover:text-brand transition-all">
                {h.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Fonte</p>
          <div className="flex gap-0.5">
            {FONT_OPTIONS.slice(0, 4).map(f => (
              <button key={f} onClick={() => onApplyToAll({ fontFamily: f })} className="px-1.5 py-1 rounded text-[9px] border border-border text-text-muted hover:border-brand hover:text-brand transition-all" style={{ fontFamily: f }}>
                {f.slice(0, 4)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 pt-1 border-t border-border/50">
          <button
            onClick={onExportSelected}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-brand-dark text-white rounded-lg text-[11px] font-semibold disabled:opacity-50 transition-all"
          >
            <Download className="w-3 h-3" />
            {isExporting
              ? `Exportando ${exportProgress?.current || 0}/${exportProgress?.total || selectedCount}...`
              : `Exportar ${selectedCount} selecionados`}
          </button>
          <button
            onClick={onDeleteSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-red-500/30 text-red-400 rounded-lg text-[11px] font-semibold hover:bg-red-500/10 transition-all"
          >
            <Trash2 className="w-3 h-3" />
            Remover
          </button>
        </div>
      )}
    </div>
  );
}
