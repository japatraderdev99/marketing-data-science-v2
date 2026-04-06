import { useState } from 'react';
import { Type, Plus, Trash2, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBrandFonts, useAddBrandFont, useDeleteBrandFont } from '../hooks/useBrandKit';

const FONT_WEIGHTS = ['Black', 'Bold', 'SemiBold', 'Medium', 'Regular', 'Light'];
const FONT_USAGES = ['headlines', 'body', 'caption', 'accent'];

export function FontsSection() {
  const { data: fonts = [], isLoading } = useBrandFonts();
  const addFont = useAddBrandFont();
  const deleteFont = useDeleteBrandFont();

  const [showDialog, setShowDialog] = useState(false);
  const [fontName, setFontName] = useState('');
  const [fontWeight, setFontWeight] = useState('Regular');
  const [usage, setUsage] = useState('body');

  const handleSubmit = async () => {
    if (!fontName) return;
    await addFont.mutateAsync({ fontName, fontWeight, usage });
    setShowDialog(false);
    setFontName('');
    setFontWeight('Regular');
    setUsage('body');
  };

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Type className="w-5 h-5 text-brand" />
          <h2 className="font-heading font-bold text-base text-text-primary">Tipografia</h2>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-hover text-text-secondary">{fonts.length}</span>
        </div>
        <button onClick={() => setShowDialog(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-brand text-white text-xs font-bold">
          <Plus className="w-3.5 h-3.5" /> Fonte
        </button>
      </div>

      {isLoading && <div className="py-8 text-center"><Loader2 className="w-6 h-6 text-brand animate-spin mx-auto" /></div>}

      {!isLoading && fonts.length === 0 && (
        <div className="border-2 border-dashed border-border rounded-xl p-10 text-center">
          <Type className="w-8 h-8 mx-auto text-text-muted mb-2 opacity-30" />
          <p className="text-sm text-text-muted">Defina a tipografia da sua marca</p>
        </div>
      )}

      {fonts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {fonts.map((font) => (
            <div key={font.id} className="p-4 rounded-xl border border-border bg-surface-elevated">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-bold text-text-primary">{font.font_name}</p>
                  <div className="flex gap-1 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-text-muted">{font.font_weight}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-text-muted capitalize">{font.usage}</span>
                  </div>
                </div>
                <button onClick={() => deleteFont.mutate(font.id)} className="p-1 text-text-muted hover:text-danger">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="mt-3 text-sm text-text-secondary">
                {font.sample_text || 'O rápido cão marrom saltou sobre a cerca.'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add Font Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowDialog(false)}>
          <div className="bg-surface-elevated border border-border rounded-xl p-6 w-full max-w-xs space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm text-text-primary">Nova Fonte</h3>
              <button onClick={() => setShowDialog(false)} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
            </div>
            <input
              placeholder="Nome da fonte (ex: Montserrat)"
              value={fontName}
              onChange={(e) => setFontName(e.target.value)}
              className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand outline-none"
            />
            <div className="flex gap-2">
              <select value={fontWeight} onChange={(e) => setFontWeight(e.target.value)} className="flex-1 bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary">
                {FONT_WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
              <select value={usage} onChange={(e) => setUsage(e.target.value)} className="flex-1 bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary">
                {FONT_USAGES.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!fontName || addFont.isPending}
              className={cn('w-full py-2 rounded-lg text-sm font-bold text-white', !fontName ? 'bg-text-muted cursor-not-allowed' : 'gradient-brand')}
            >
              {addFont.isPending ? 'Adicionando...' : 'Adicionar Fonte'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
