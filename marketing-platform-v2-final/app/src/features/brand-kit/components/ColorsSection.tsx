import { useState } from 'react';
import { Palette, Plus, Trash2, Copy, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBrandColors, useAddBrandColor, useDeleteBrandColor } from '../hooks/useBrandKit';

const COLOR_CATEGORIES = ['primary', 'secondary', 'accent', 'neutral', 'gradient'];

export function ColorsSection() {
  const { data: colors = [], isLoading } = useBrandColors();
  const addColor = useAddBrandColor();
  const deleteColor = useDeleteBrandColor();

  const [showDialog, setShowDialog] = useState(false);
  const [name, setName] = useState('');
  const [hex, setHex] = useState('#E8603C');
  const [category, setCategory] = useState('primary');

  const handleSubmit = async () => {
    if (!name) return;
    await addColor.mutateAsync({ name, hexValue: hex, category });
    setShowDialog(false);
    setName('');
    setHex('#E8603C');
  };

  const copyHex = (val: string) => {
    navigator.clipboard.writeText(val);
  };

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-brand" />
          <h2 className="font-heading font-bold text-base text-text-primary">Paleta de Cores</h2>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-hover text-text-secondary">{colors.length}</span>
        </div>
        <button onClick={() => setShowDialog(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-brand text-white text-xs font-bold">
          <Plus className="w-3.5 h-3.5" /> Cor
        </button>
      </div>

      {isLoading && <div className="py-8 text-center"><Loader2 className="w-6 h-6 text-brand animate-spin mx-auto" /></div>}

      {!isLoading && colors.length === 0 && (
        <div className="border-2 border-dashed border-border rounded-xl p-10 text-center">
          <Palette className="w-8 h-8 mx-auto text-text-muted mb-2 opacity-30" />
          <p className="text-sm text-text-muted">Adicione as cores da sua marca</p>
        </div>
      )}

      {colors.length > 0 && (
        <div className="flex flex-wrap gap-5">
          {colors.map((color) => (
            <div key={color.id} className="group flex flex-col items-center gap-2">
              <button
                className="w-16 h-16 rounded-full border-2 border-border shadow-md transition-transform hover:scale-110"
                style={{ backgroundColor: color.hex_value }}
                onClick={() => copyHex(color.hex_value)}
                title="Clique para copiar"
              />
              <p className="text-xs font-bold text-text-primary">{color.name}</p>
              <p className="text-[10px] text-text-muted">{color.hex_value}</p>
              {color.category && (
                <span className="text-[9px] px-1.5 py-0.5 rounded border border-border text-text-muted capitalize">{color.category}</span>
              )}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => copyHex(color.hex_value)} className="p-1 text-text-muted hover:text-text-primary"><Copy className="w-3 h-3" /></button>
                <button onClick={() => deleteColor.mutate(color.id)} className="p-1 text-text-muted hover:text-danger"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Color Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowDialog(false)}>
          <div className="bg-surface-elevated border border-border rounded-xl p-6 w-full max-w-xs space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm text-text-primary">Nova Cor</h3>
              <button onClick={() => setShowDialog(false)} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
            </div>
            <input
              placeholder="Nome da cor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand outline-none"
            />
            <div className="flex items-center gap-3">
              <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="w-10 h-10 cursor-pointer rounded border-0 bg-transparent" />
              <input
                value={hex}
                onChange={(e) => setHex(e.target.value)}
                className="flex-1 bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-brand outline-none"
              />
            </div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary">
              {COLOR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              onClick={handleSubmit}
              disabled={!name || addColor.isPending}
              className={cn('w-full py-2 rounded-lg text-sm font-bold text-white', !name ? 'bg-text-muted cursor-not-allowed' : 'gradient-brand')}
            >
              {addColor.isPending ? 'Adicionando...' : 'Adicionar Cor'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
