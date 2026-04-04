import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Upload, Star, Copy, Trash2, Plus, Palette, Type, ImageIcon, Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandAsset {
  id: string;
  asset_type: string;
  name: string;
  file_url: string;
  category: string | null;
  file_format: string | null;
  width: number | null;
  height: number | null;
  is_favorite: boolean;
}

interface BrandColor {
  id: string;
  name: string;
  hex_value: string;
  rgb_value: string | null;
  category: string | null;
}

interface BrandFont {
  id: string;
  font_name: string;
  font_weight: string | null;
  usage: string | null;
  sample_text: string | null;
}

export default function BrandKit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [colors, setColors] = useState<BrandColor[]>([]);
  const [fonts, setFonts] = useState<BrandFont[]>([]);
  const [loading, setLoading] = useState(true);

  // Add dialogs
  const [showAssetDialog, setShowAssetDialog] = useState(false);
  const [showColorDialog, setShowColorDialog] = useState(false);
  const [showFontDialog, setShowFontDialog] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Asset form
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState('logo');
  const [assetCategory, setAssetCategory] = useState('primary');
  const [assetFile, setAssetFile] = useState<File | null>(null);

  // Color form
  const [colorName, setColorName] = useState('');
  const [colorHex, setColorHex] = useState('#FF8C00');
  const [colorCategory, setColorCategory] = useState('primary');

  // Font form
  const [fontName, setFontName] = useState('');
  const [fontWeight, setFontWeight] = useState('Regular');
  const [fontUsage, setFontUsage] = useState('body');

  useEffect(() => { if (user) fetchAll(); }, [user]);

  async function fetchAll() {
    const [a, c, f] = await Promise.all([
      supabase.from('brand_assets').select('*').order('sort_order'),
      supabase.from('brand_colors').select('*').order('sort_order'),
      supabase.from('brand_fonts').select('*').order('sort_order'),
    ]);
    if (a.data) setAssets(a.data as BrandAsset[]);
    if (c.data) setColors(c.data as BrandColor[]);
    if (f.data) setFonts(f.data as BrandFont[]);
    setLoading(false);
  }

  async function handleUploadAsset() {
    if (!user || !assetFile || !assetName) return;
    setUploading(true);
    const ext = assetFile.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('brand-assets').upload(path, assetFile);
    if (upErr) { toast({ title: 'Erro', description: upErr.message, variant: 'destructive' }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('brand-assets').getPublicUrl(path);
    await supabase.from('brand_assets').insert({
      user_id: user.id,
      name: assetName,
      asset_type: assetType,
      category: assetCategory,
      file_url: urlData.publicUrl,
      file_format: ext || null,
    });
    toast({ title: 'Asset adicionado!' });
    setShowAssetDialog(false);
    setAssetName('');
    setAssetFile(null);
    fetchAll();
    setUploading(false);
  }

  async function handleAddColor() {
    if (!user || !colorName) return;
    const hex = colorHex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    await supabase.from('brand_colors').insert({
      user_id: user.id,
      name: colorName,
      hex_value: hex,
      rgb_value: `${r}, ${g}, ${b}`,
      category: colorCategory,
    });
    toast({ title: 'Cor adicionada!' });
    setShowColorDialog(false);
    setColorName('');
    fetchAll();
  }

  async function handleAddFont() {
    if (!user || !fontName) return;
    await supabase.from('brand_fonts').insert({
      user_id: user.id,
      font_name: fontName,
      font_weight: fontWeight,
      usage: fontUsage,
    });
    toast({ title: 'Fonte adicionada!' });
    setShowFontDialog(false);
    setFontName('');
    fetchAll();
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!' });
  }

  async function deleteAsset(id: string) {
    await supabase.from('brand_assets').delete().eq('id', id);
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }

  async function deleteColor(id: string) {
    await supabase.from('brand_colors').delete().eq('id', id);
    setColors((prev) => prev.filter((c) => c.id !== id));
  }

  async function deleteFont(id: string) {
    await supabase.from('brand_fonts').delete().eq('id', id);
    setFonts((prev) => prev.filter((f) => f.id !== id));
  }

  async function toggleFavorite(id: string, current: boolean) {
    await supabase.from('brand_assets').update({ is_favorite: !current }).eq('id', id);
    setAssets((prev) => prev.map((a) => a.id === id ? { ...a, is_favorite: !current } : a));
  }

  if (loading) return <div className="py-20 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-8">
      {/* Section 1: Logos & Assets */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Logos & Variações</h2>
            <Badge variant="secondary">{assets.length}</Badge>
          </div>
          <Button size="sm" onClick={() => setShowAssetDialog(true)}><Plus className="mr-1 h-3.5 w-3.5" /> Upload</Button>
        </div>
        {assets.length === 0 ? (
          <Card className="border-dashed border-border bg-card/50">
            <CardContent className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <Upload className="h-8 w-8 opacity-30" />
              <p className="text-sm">Faça upload do seu primeiro logo</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {assets.map((asset) => (
              <Card key={asset.id} className="group border-border bg-card">
                <div className="relative aspect-square overflow-hidden rounded-t-lg bg-muted/30 p-4">
                  <img src={asset.file_url} alt={asset.name} className="h-full w-full object-contain" />
                  <button
                    onClick={() => toggleFavorite(asset.id, asset.is_favorite)}
                    className="absolute right-2 top-2"
                  >
                    <Star className={cn('h-4 w-4', asset.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40')} />
                  </button>
                </div>
                <CardContent className="space-y-1 p-3">
                  <p className="truncate text-sm font-semibold text-foreground">{asset.name}</p>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px] capitalize">{asset.asset_type}</Badge>
                    {asset.category && <Badge variant="outline" className="text-[10px] capitalize">{asset.category}</Badge>}
                  </div>
                  <div className="flex gap-1 pt-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyToClipboard(asset.file_url)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteAsset(asset.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Colors */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Paleta de Cores</h2>
            <Badge variant="secondary">{colors.length}</Badge>
          </div>
          <Button size="sm" onClick={() => setShowColorDialog(true)}><Plus className="mr-1 h-3.5 w-3.5" /> Cor</Button>
        </div>
        {colors.length === 0 ? (
          <Card className="border-dashed border-border bg-card/50">
            <CardContent className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <Palette className="h-8 w-8 opacity-30" />
              <p className="text-sm">Adicione as cores da sua marca</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-wrap gap-4">
            {colors.map((color) => (
              <div key={color.id} className="group flex flex-col items-center gap-2">
                <button
                  className="h-16 w-16 rounded-full border-2 border-border shadow-md transition-transform hover:scale-110"
                  style={{ backgroundColor: color.hex_value }}
                  onClick={() => copyToClipboard(color.hex_value)}
                  title="Clique para copiar"
                />
                <p className="text-xs font-semibold text-foreground">{color.name}</p>
                <p className="text-[10px] text-muted-foreground">{color.hex_value}</p>
                <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteColor(color.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 3: Typography */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Tipografia</h2>
            <Badge variant="secondary">{fonts.length}</Badge>
          </div>
          <Button size="sm" onClick={() => setShowFontDialog(true)}><Plus className="mr-1 h-3.5 w-3.5" /> Fonte</Button>
        </div>
        {fonts.length === 0 ? (
          <Card className="border-dashed border-border bg-card/50">
            <CardContent className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <Type className="h-8 w-8 opacity-30" />
              <p className="text-sm">Defina a tipografia da sua marca</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {fonts.map((font) => (
              <Card key={font.id} className="border-border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg font-bold text-foreground">{font.font_name}</p>
                      <div className="mt-1 flex gap-1">
                        <Badge variant="outline" className="text-[10px]">{font.font_weight}</Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">{font.usage}</Badge>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteFont(font.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{font.sample_text || 'O rápido cão marrom saltou sobre a cerca.'}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Templates placeholder */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Templates Rápidos</h2>
          <Badge variant="secondary">Em breve</Badge>
        </div>
        <Card className="border-dashed border-border bg-card/50">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
            <p className="text-sm">Pré-definições de layouts combinando logo + cor + fonte</p>
          </CardContent>
        </Card>
      </section>

      {/* Asset Upload Dialog */}
      <Dialog open={showAssetDialog} onOpenChange={setShowAssetDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Upload de Asset</DialogTitle>
            <DialogDescription>Adicione logos, ícones ou patterns</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome do asset" value={assetName} onChange={(e) => setAssetName(e.target.value)} />
            <div className="flex gap-2">
              <select value={assetType} onChange={(e) => setAssetType(e.target.value)} className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                {['logo', 'logo_variation', 'icon', 'pattern', 'photo', 'illustration'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={assetCategory} onChange={(e) => setAssetCategory(e.target.value)} className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                {['primary', 'secondary', 'monochrome', 'dark', 'light', 'horizontal', 'vertical'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="rounded-lg border border-dashed border-border p-4 text-center">
              <input type="file" accept="image/*,.svg,.ai,.eps" onChange={(e) => setAssetFile(e.target.files?.[0] || null)} className="hidden" id="asset-upload" />
              <label htmlFor="asset-upload" className="cursor-pointer text-sm text-muted-foreground hover:text-primary">
                <Upload className="mx-auto mb-1 h-6 w-6" />
                {assetFile ? assetFile.name : 'Selecionar arquivo'}
              </label>
            </div>
            <Button className="w-full" onClick={handleUploadAsset} disabled={!assetName || !assetFile || uploading}>
              {uploading ? 'Enviando...' : 'Upload'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Color Dialog */}
      <Dialog open={showColorDialog} onOpenChange={setShowColorDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Nova Cor</DialogTitle>
            <DialogDescription>Adicione à paleta da marca</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome da cor" value={colorName} onChange={(e) => setColorName(e.target.value)} />
            <div className="flex items-center gap-3">
              <input type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)} className="h-10 w-10 cursor-pointer rounded border-0" />
              <Input value={colorHex} onChange={(e) => setColorHex(e.target.value)} className="flex-1" />
            </div>
            <select value={colorCategory} onChange={(e) => setColorCategory(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {['primary', 'secondary', 'accent', 'neutral', 'gradient'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <Button className="w-full" onClick={handleAddColor} disabled={!colorName}>Adicionar Cor</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Font Dialog */}
      <Dialog open={showFontDialog} onOpenChange={setShowFontDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Nova Fonte</DialogTitle>
            <DialogDescription>Defina a tipografia oficial</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome da fonte (ex: Montserrat)" value={fontName} onChange={(e) => setFontName(e.target.value)} />
            <div className="flex gap-2">
              <select value={fontWeight} onChange={(e) => setFontWeight(e.target.value)} className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                {['Bold', 'Regular', 'Light', 'Medium', 'SemiBold'].map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
              <select value={fontUsage} onChange={(e) => setFontUsage(e.target.value)} className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                {['headlines', 'body', 'caption', 'accent'].map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <Button className="w-full" onClick={handleAddFont} disabled={!fontName}>Adicionar Fonte</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
