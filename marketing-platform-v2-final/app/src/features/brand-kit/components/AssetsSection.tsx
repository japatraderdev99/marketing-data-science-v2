import { useState } from 'react';
import { Upload, Star, Copy, Trash2, Plus, ImageIcon, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useBrandAssets, useAddBrandAsset, useDeleteBrandAsset, useToggleFavorite,
} from '../hooks/useBrandKit';

const ASSET_TYPES = ['logo', 'logo_variation', 'icon', 'pattern', 'photo', 'illustration'];
const ASSET_CATEGORIES = ['primary', 'secondary', 'monochrome', 'dark', 'light', 'horizontal', 'vertical'];

export function AssetsSection() {
  const { data: assets = [], isLoading } = useBrandAssets();
  const addAsset = useAddBrandAsset();
  const deleteAsset = useDeleteBrandAsset();
  const toggleFav = useToggleFavorite();

  const [showDialog, setShowDialog] = useState(false);
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState('logo');
  const [category, setCategory] = useState('primary');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const handleSubmit = async () => {
    if (!name || !file) return;
    await addAsset.mutateAsync({ name, assetType, category, file });
    setShowDialog(false);
    setName('');
    setFile(null);
    setPreview(null);
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-brand" />
          <h2 className="font-heading font-bold text-base text-text-primary">Logos & Variações</h2>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-hover text-text-secondary">{assets.length}</span>
        </div>
        <button onClick={() => setShowDialog(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-brand text-white text-xs font-bold">
          <Plus className="w-3.5 h-3.5" /> Upload
        </button>
      </div>

      {isLoading && <div className="py-8 text-center"><Loader2 className="w-6 h-6 text-brand animate-spin mx-auto" /></div>}

      {!isLoading && assets.length === 0 && (
        <div className="border-2 border-dashed border-border rounded-xl p-10 text-center">
          <Upload className="w-8 h-8 mx-auto text-text-muted mb-2 opacity-30" />
          <p className="text-sm text-text-muted">Faça upload do seu primeiro logo</p>
        </div>
      )}

      {assets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {assets.map((asset) => (
            <div key={asset.id} className="group rounded-xl border border-border bg-surface-elevated overflow-hidden">
              <div className="relative aspect-square bg-surface-hover p-4">
                <img src={asset.file_url} alt={asset.name} className="w-full h-full object-contain" />
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFav.mutate({ id: asset.id, current: asset.is_favorite }); }}
                  className="absolute right-2 top-2"
                >
                  <Star className={cn('w-4 h-4', asset.is_favorite ? 'fill-warning text-warning' : 'text-text-muted/40')} />
                </button>
              </div>
              <div className="p-3 space-y-1.5">
                <p className="text-sm font-bold text-text-primary truncate">{asset.name}</p>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-text-muted capitalize">{asset.asset_type}</span>
                  {asset.category && <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-text-muted capitalize">{asset.category}</span>}
                </div>
                <div className="flex gap-1 pt-1">
                  <button onClick={() => copyUrl(asset.file_url)} className="p-1 text-text-muted hover:text-text-primary" title="Copiar URL">
                    <Copy className="w-3 h-3" />
                  </button>
                  <button onClick={() => deleteAsset.mutate(asset.id)} className="p-1 text-text-muted hover:text-danger" title="Excluir">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowDialog(false)}>
          <div className="bg-surface-elevated border border-border rounded-xl p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm text-text-primary">Upload de Asset</h3>
              <button onClick={() => setShowDialog(false)} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
            </div>
            <input
              placeholder="Nome do asset"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand outline-none"
            />
            <div className="flex gap-2">
              <select value={assetType} onChange={(e) => setAssetType(e.target.value)} className="flex-1 bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary">
                {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="flex-1 bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary">
                {ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div
              className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-brand/50"
              onClick={() => document.getElementById('asset-file')?.click()}
            >
              {preview ? (
                <img src={preview} alt="" className="w-20 h-20 object-contain mx-auto" />
              ) : (
                <>
                  <Upload className="w-6 h-6 mx-auto text-text-muted mb-1" />
                  <p className="text-xs text-text-muted">Selecionar arquivo</p>
                </>
              )}
              <input id="asset-file" type="file" accept="image/*,.svg" className="hidden" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!name || !file || addAsset.isPending}
              className={cn('w-full py-2 rounded-lg text-sm font-bold text-white', !name || !file ? 'bg-text-muted cursor-not-allowed' : 'gradient-brand')}
            >
              {addAsset.isPending ? 'Enviando...' : 'Upload'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
