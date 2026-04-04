import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { initialCopies, initialRoteiros, initialIdeias, initialEstrategias, CopyItem, Roteiro, IdeiaDisruptiva, EstrategiaPublico, Channel, ContentObjective } from '@/data/seedData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Copy, Check, BookOpen, Lightbulb, Users, Film, Sparkles, Upload, X, Image as ImageIcon, FileText, Loader2, RefreshCw, Trash2, Tag, Filter, Grid3X3, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import IdeacaoTab from '@/components/biblioteca/IdeacaoTab';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const OBJECTIVE_COLORS: Record<ContentObjective, string> = {
  Awareness: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  Engajamento: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Conversão: 'bg-primary/15 text-primary border-primary/30',
  Retenção: 'bg-teal/15 text-teal border-teal/30',
};
const IMPACT_COLORS: Record<string, string> = {
  Alto: 'bg-red-500/20 text-red-400',
  Médio: 'bg-primary/20 text-primary',
  Baixo: 'bg-muted text-muted-foreground',
};
const STATUS_COLORS: Record<string, string> = {
  Aprovada: 'bg-green-500/20 text-green-400',
  Pendente: 'bg-primary/20 text-primary',
  Descartada: 'bg-muted text-muted-foreground',
};

// ─── Image compression helper ───
async function compressImage(file: File, maxWidth = 1920, quality = 0.82): Promise<File> {
  // Only compress PNGs > 200KB or any image > 2MB
  const shouldCompress = (file.type === 'image/png' && file.size > 200 * 1024) || file.size > 2 * 1024 * 1024;
  if (!shouldCompress) return file;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w);
        w = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file); // compression didn't help
            return;
          }
          const ext = 'webp';
          const newName = file.name.replace(/\.[^.]+$/, `.${ext}`);
          resolve(new File([blob], newName, { type: 'image/webp' }));
        },
        'image/webp',
        quality
      );
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

// ─── Simple file fingerprint for dedup ───
function fileFingerprint(file: File): string {
  return `${file.name}__${file.size}`;
}

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  category: string | null;
  tags: string[] | null;
  description: string | null;
  file_size: number | null;
  created_at: string;
}

// ─── Mídias Tab component ───
function MidiasTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [recategorizing, setRecategorizing] = useState(false);
  const [gridSize, setGridSize] = useState<'sm' | 'lg'>('sm');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchMedia = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('media_library')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    setMedia((data as MediaItem[]) || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    media.forEach(m => { if (m.category) cats.add(m.category); });
    return Array.from(cats).sort();
  }, [media]);

  // Extract unique tags for quick filter chips
  const topTags = useMemo(() => {
    const tagCount: Record<string, number> = {};
    media.forEach(m => m.tags?.forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; }));
    return Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([t]) => t);
  }, [media]);

  // Filter
  const filtered = useMemo(() => {
    let items = media;
    if (categoryFilter !== 'all') {
      items = items.filter(m => m.category === categoryFilter || m.tags?.some(t => t === categoryFilter));
    }
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      items = items.filter(m =>
        m.filename.toLowerCase().includes(q) ||
        m.category?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        m.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    return items;
  }, [media, categoryFilter, searchQ]);

  const handleRecategorize = async () => {
    if (!user?.id) return;
    const imagesToRecategorize = media.filter(m => m.url.match(/\.(jpg|jpeg|png|webp)/i));
    if (imagesToRecategorize.length === 0) return;
    setRecategorizing(true);
    toast({ title: `Recategorizando ${imagesToRecategorize.length} imagens...` });
    const batchSize = 3;
    for (let i = 0; i < imagesToRecategorize.length; i += batchSize) {
      const batch = imagesToRecategorize.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(m => supabase.functions.invoke('categorize-media', { body: { imageUrl: m.url, mediaId: m.id } }))
      );
    }
    setRecategorizing(false);
    toast({ title: 'Recategorização concluída ✅' });
    fetchMedia();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('media_library').delete().eq('id', id);
    setMedia(prev => prev.filter(m => m.id !== id));
    toast({ title: 'Mídia removida' });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await supabase.from('media_library').delete().eq('id', id);
    }
    setMedia(prev => prev.filter(m => !selectedIds.has(m.id)));
    setSelectedIds(new Set());
    toast({ title: `${ids.length} mídias removidas` });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, tag, categoria..." value={searchQ} onChange={e => setSearchQ(e.target.value)} className="pl-9 bg-card border-border" />
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => setGridSize(g => g === 'sm' ? 'lg' : 'sm')}>
            {gridSize === 'sm' ? <LayoutGrid className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="outline" onClick={handleRecategorize} disabled={recategorizing}>
            <RefreshCw className={cn("h-4 w-4 mr-1", recategorizing && "animate-spin")} />
            Recategorizar
          </Button>
          {selectedIds.size > 0 && (
            <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4 mr-1" /> Excluir {selectedIds.size}
            </Button>
          )}
        </div>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setCategoryFilter('all')} className={cn('rounded-full border px-3 py-1 text-xs font-medium transition-all', categoryFilter === 'all' ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
          Todos ({media.length})
        </button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategoryFilter(cat)} className={cn('rounded-full border px-3 py-1 text-xs font-medium transition-all', categoryFilter === cat ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
            {cat}
          </button>
        ))}
      </div>

      {/* Tag chips */}
      {topTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <Tag className="h-3.5 w-3.5 text-muted-foreground/50 mr-1 mt-0.5" />
          {topTags.map(tag => (
            <button key={tag} onClick={() => setCategoryFilter(tag)} className={cn('rounded border px-2 py-0.5 text-[10px] font-medium transition-all', categoryFilter === tag ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground/70 hover:border-primary/30')}>
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>{filtered.length} mídias</span>
        <span>{formatSize(filtered.reduce((s, m) => s + (m.file_size || 0), 0))} total</span>
        <span>{media.filter(m => m.tags && m.tags.length > 0).length} categorizadas</span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">Nenhuma mídia encontrada</p>
        </div>
      ) : (
        <div className={cn(
          'grid gap-3',
          gridSize === 'sm' ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
        )}>
          {filtered.map(item => (
            <div
              key={item.id}
              onClick={() => toggleSelect(item.id)}
              className={cn(
                'group relative rounded-lg border overflow-hidden cursor-pointer transition-all',
                selectedIds.has(item.id) ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/40'
              )}
            >
              {/* Thumbnail */}
              <div className={cn('bg-muted/30', gridSize === 'sm' ? 'aspect-square' : 'aspect-[4/3]')}>
                {item.url.match(/\.(jpg|jpeg|png|webp)/i) ? (
                  <img src={item.url} alt={item.filename} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              {/* Selection checkbox */}
              <div className={cn(
                'absolute top-1.5 left-1.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                selectedIds.has(item.id) ? 'bg-primary border-primary' : 'border-white/60 bg-black/20 opacity-0 group-hover:opacity-100'
              )}>
                {selectedIds.has(item.id) && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>

              {/* Delete button */}
              <button
                onClick={e => { e.stopPropagation(); handleDelete(item.id); }}
                className="absolute top-1.5 right-1.5 w-5 h-5 rounded bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
              >
                <X className="h-3 w-3 text-white" />
              </button>

              {/* Info overlay */}
              <div className="p-1.5 bg-card">
                {item.category && (
                  <span className="inline-block rounded bg-primary/15 text-primary text-[9px] font-semibold px-1.5 py-0.5 mb-1 truncate max-w-full">
                    {item.category}
                  </span>
                )}
                <p className="text-[10px] text-muted-foreground truncate">{item.filename}</p>
                {item.tags && item.tags.length > 0 && gridSize === 'lg' && (
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {item.tags.slice(0, 3).map(t => (
                      <span key={t} className="text-[8px] bg-muted rounded px-1 py-px text-muted-foreground truncate max-w-[60px]">{t}</span>
                    ))}
                    {item.tags.length > 3 && <span className="text-[8px] text-muted-foreground">+{item.tags.length - 3}</span>}
                  </div>
                )}
                {item.file_size && <span className="text-[9px] text-muted-foreground/50">{formatSize(item.file_size)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CopyCard({ item }: { item: CopyItem }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(item.copy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Card className="border-border bg-card hover:border-primary/30 transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
          <Button size="sm" variant="ghost" onClick={handleCopy} className={cn('shrink-0 h-7 px-2 text-xs', copied ? 'text-green-400' : 'text-muted-foreground')}>
            {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
            {copied ? 'Copiado!' : 'Copiar'}
          </Button>
        </div>
        <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-sans leading-relaxed mb-3 line-clamp-5">{item.copy}</pre>
        <div className="flex flex-wrap gap-1">
          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', OBJECTIVE_COLORS[item.objective])}>{item.objective}</span>
          {item.channel.slice(0, 2).map(ch => (
            <span key={ch} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{ch}</span>
          ))}
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{item.category}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function RoteiroCard({ item }: { item: Roteiro }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="border-border bg-card hover:border-primary/30 transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
            <p className="text-xs text-muted-foreground italic">{item.subtitle}</p>
          </div>
          <div className="flex gap-1 shrink-0">
            <span className="rounded-full bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 text-[10px] font-medium">{item.format}</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{item.concept}</p>
        {open && (
          <div className="mt-3 space-y-2 animate-fade-in">
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cenas</p>
              {item.scenes.map((scene, i) => (
                <p key={i} className="text-xs text-foreground mb-1">• {scene}</p>
              ))}
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Caption</p>
              <p className="text-xs text-foreground">{item.caption}</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Por que viraliza</p>
              <p className="text-xs text-foreground">{item.viralTrigger}</p>
            </div>
            <p className="text-xs text-muted-foreground">👤 {item.persona}</p>
          </div>
        )}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex gap-1">
            {item.channel.map(ch => <span key={ch} className="text-[10px] text-muted-foreground border border-border rounded-full px-1.5 py-0.5">{ch}</span>)}
          </div>
          <button onClick={() => setOpen(o => !o)} className="ml-auto text-[10px] text-primary hover:underline">{open ? 'Fechar ▲' : 'Ver roteiro ▼'}</button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Biblioteca() {
  const [search, setSearch] = useState('');
  const [filterObj, setFilterObj] = useState<string>('all');
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string; id: string }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [existingFingerprints, setExistingFingerprints] = useState<Set<string>>(new Set());

  // Load existing filenames+sizes for dedup
  useEffect(() => {
    if (!user?.id) return;
    supabase.from('media_library').select('filename, file_size').then(({ data }) => {
      if (data) {
        const fps = new Set(data.map(d => `${d.filename}__${d.file_size}`));
        setExistingFingerprints(fps);
      }
    });
  }, [user?.id]);

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || !user?.id) return;
    setUploading(true);
    const results: typeof uploadedFiles = [];
    let skippedDupes = 0;

    for (const rawFile of Array.from(files)) {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4'];
      if (!validTypes.some(t => rawFile.type.startsWith(t.split('/')[0]) || rawFile.type === t)) {
        toast({ title: 'Formato não suportado', description: `${rawFile.name}`, variant: 'destructive' });
        continue;
      }
      if (rawFile.size > 20 * 1024 * 1024) {
        toast({ title: 'Arquivo muito grande', description: `${rawFile.name} excede 20MB.`, variant: 'destructive' });
        continue;
      }

      // Dedup check
      const fp = fileFingerprint(rawFile);
      if (existingFingerprints.has(fp)) {
        skippedDupes++;
        continue;
      }

      // Compress images (PNG→WebP, large images resized)
      const file = rawFile.type.startsWith('image/') ? await compressImage(rawFile) : rawFile;

      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const uuid = crypto.randomUUID();
      const storagePath = `${user.id}/${uuid}.${ext}`;

      const { error: storageError } = await supabase.storage
        .from('media-library')
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (storageError) {
        toast({ title: 'Erro no upload', description: storageError.message, variant: 'destructive' });
        continue;
      }

      const { data: urlData } = supabase.storage.from('media-library').getPublicUrl(storagePath);

      const { data: insertData, error: insertError } = await supabase
        .from('media_library')
        .insert({ user_id: user.id, url: urlData.publicUrl, filename: rawFile.name, file_size: file.size })
        .select('id')
        .single();

      if (insertError) {
        toast({ title: 'Erro ao salvar', description: insertError.message, variant: 'destructive' });
        continue;
      }

      results.push({ name: rawFile.name, url: urlData.publicUrl, id: insertData.id });
      existingFingerprints.add(fp);

      // Auto-categorize images in background
      if (file.type.startsWith('image/')) {
        supabase.functions.invoke('categorize-media', {
          body: { imageUrl: urlData.publicUrl, mediaId: insertData.id },
        });
      }
    }

    setUploadedFiles(prev => [...prev, ...results]);
    setUploading(false);
    const msgs: string[] = [];
    if (results.length > 0) msgs.push(`${results.length} enviado(s)`);
    if (skippedDupes > 0) msgs.push(`${skippedDupes} duplicata(s) ignorada(s)`);
    if (msgs.length > 0) {
      toast({ title: `Upload: ${msgs.join(', ')} ✅`, description: results.length > 0 ? 'Compressão WebP + categorização IA aplicadas.' : undefined });
    }
  }, [user?.id, toast, existingFingerprints]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

  const filteredCopies = initialCopies.filter(c =>
    (filterObj === 'all' || c.objective === filterObj) &&
    (search === '' || c.title.toLowerCase().includes(search.toLowerCase()) || c.copy.toLowerCase().includes(search.toLowerCase()))
  );
  const filteredRoteiros = initialRoteiros.filter(r =>
    search === '' || r.title.toLowerCase().includes(search.toLowerCase()) || r.concept.toLowerCase().includes(search.toLowerCase())
  );
  const filteredIdeias = initialIdeias.filter(i =>
    search === '' || i.title.toLowerCase().includes(search.toLowerCase()) || i.concept.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Upload Zone */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4"
        multiple
        className="hidden"
        onChange={e => handleUpload(e.target.files)}
      />
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 px-4 cursor-pointer transition-all',
          dragOver
            ? 'border-primary bg-primary/10 scale-[1.01]'
            : 'border-border hover:border-primary/50 hover:bg-primary/5',
          uploading && 'pointer-events-none opacity-60'
        )}
      >
        {uploading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Comprimindo e enviando...</span>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">
              Arraste arquivos aqui ou <span className="text-primary underline">clique para enviar</span>
            </p>
            <p className="text-xs text-muted-foreground/50">JPG, PNG, WEBP, PDF, MP4 · Máx 20MB · PNGs convertidos para WebP</p>
          </>
        )}
      </div>

      {/* Recently uploaded */}
      {uploadedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {uploadedFiles.slice(-6).map(f => (
            <div key={f.id} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5">
              {f.url.match(/\.(jpg|jpeg|png|webp)/) ? (
                <img src={f.url} alt={f.name} className="h-6 w-6 rounded object-cover" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-xs text-foreground truncate max-w-[120px]">{f.name}</span>
              <button onClick={(e) => { e.stopPropagation(); setUploadedFiles(prev => prev.filter(x => x.id !== f.id)); }} className="text-muted-foreground/40 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar na biblioteca..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
        </div>
        <div className="flex gap-1">
          {['all', 'Awareness', 'Engajamento', 'Conversão', 'Retenção'].map(obj => (
            <button key={obj} onClick={() => setFilterObj(obj)}
              className={cn('rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                filterObj === obj ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
              {obj === 'all' ? 'Todos' : obj}
            </button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="midias">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="midias" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <ImageIcon className="mr-1.5 h-3.5 w-3.5" /> Mídias
          </TabsTrigger>
          <TabsTrigger value="ideacao" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Ideação IA
          </TabsTrigger>
          <TabsTrigger value="copies" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copies ({filteredCopies.length})
          </TabsTrigger>
          <TabsTrigger value="roteiros" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Film className="mr-1.5 h-3.5 w-3.5" /> Roteiros ({filteredRoteiros.length})
          </TabsTrigger>
          <TabsTrigger value="ideias" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Lightbulb className="mr-1.5 h-3.5 w-3.5" /> Ideias ({filteredIdeias.length})
          </TabsTrigger>
          <TabsTrigger value="estrategia" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Users className="mr-1.5 h-3.5 w-3.5" /> Estratégia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="midias" className="mt-4">
          <MidiasTab />
        </TabsContent>

        <TabsContent value="ideacao" className="mt-4">
          <IdeacaoTab />
        </TabsContent>

        <TabsContent value="copies" className="mt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCopies.map(c => <CopyCard key={c.id} item={c} />)}
          </div>
        </TabsContent>

        <TabsContent value="roteiros" className="mt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredRoteiros.map(r => <RoteiroCard key={r.id} item={r} />)}
          </div>
        </TabsContent>

        <TabsContent value="ideias" className="mt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredIdeias.map(ideia => (
              <Card key={ideia.id} className="border-border bg-card hover:border-primary/30 transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-bold text-foreground">{ideia.title}</h3>
                    <div className="flex flex-col gap-1 items-end shrink-0">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', STATUS_COLORS[ideia.status])}>{ideia.status}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', IMPACT_COLORS[ideia.impact])}>Impacto {ideia.impact}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground bg-muted rounded px-2 py-0.5">{ideia.format}</span>
                  <p className="mt-2 text-xs text-muted-foreground">{ideia.concept}</p>
                  <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-2">
                    <p className="text-[10px] font-bold text-primary mb-1">Por que viraliza</p>
                    <p className="text-[11px] text-foreground">{ideia.whyViral}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {ideia.channel.map(ch => <span key={ch} className="text-[10px] border border-border rounded-full px-1.5 py-0.5 text-muted-foreground">{ch}</span>)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="estrategia" className="mt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {initialEstrategias.map(est => (
              <Card key={est.id} className="border-border bg-card hover:border-primary/30 transition-all duration-200">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{est.icon}</span>
                    <div>
                      <h3 className="text-base font-black text-foreground">{est.persona}</h3>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>{est.ageRange}</span>
                        <span>·</span>
                        <span>{est.avgRate}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{est.profile}</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Dores principais</p>
                      {est.painPoints.map((p, i) => (
                        <p key={i} className="text-xs text-foreground mb-0.5">• {p}</p>
                      ))}
                    </div>
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-2">
                      <p className="text-[10px] font-bold text-primary mb-1">Abordagem</p>
                      <p className="text-xs text-foreground">{est.approach}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Hooks</p>
                      {est.hooks.map((h, i) => (
                        <p key={i} className="text-xs italic text-foreground mb-0.5">"{h}"</p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
