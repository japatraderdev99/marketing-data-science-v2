import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Eye, Upload, Loader2, ChevronDown, ChevronUp,
  Check, Trash2, ExternalLink
} from 'lucide-react';

interface BenchmarkItem {
  id: string;
  competitor_name: string;
  file_url: string | null;
  thumbnail_url: string | null;
  format_type: string | null;
  platform: string | null;
  notes: string | null;
  ai_insights: Record<string, unknown> | null;
  tags: string[] | null;
}

interface Props {
  userId: string | null;
  onSelectBenchmark: (benchmark: BenchmarkItem | null) => void;
  selectedBenchmark: BenchmarkItem | null;
}

export default function BenchmarkPanel({ userId, onSelectBenchmark, selectedBenchmark }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [benchmarks, setBenchmarks] = useState<BenchmarkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !userId || benchmarks.length > 0) return;
    setLoading(true);
    supabase
      .from('competitor_benchmarks')
      .select('id, competitor_name, file_url, thumbnail_url, format_type, platform, notes, ai_insights, tags')
      .eq('user_id', userId)
      .eq('status', 'done')
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setBenchmarks((data as BenchmarkItem[]) || []);
        setLoading(false);
      });
  }, [open, userId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${userId}/benchmarks/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('benchmarks').upload(path, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('benchmarks').getPublicUrl(path);

      const { data: inserted, error: insErr } = await supabase
        .from('competitor_benchmarks')
        .insert({
          user_id: userId,
          competitor_name: file.name.replace(/\.[^.]+$/, ''),
          file_url: publicUrl,
          thumbnail_url: publicUrl,
          platform: 'Facebook Ads',
          status: 'done',
          format_type: 'image',
        })
        .select()
        .single();

      if (insErr) throw insErr;
      setBenchmarks(prev => [inserted as BenchmarkItem, ...prev]);
      toast({ title: '📎 Benchmark adicionado' });
    } catch (err) {
      toast({ title: 'Erro ao enviar', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between p-3">
        <div className="flex items-center gap-2.5">
          <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', selectedBenchmark ? 'bg-primary/20' : 'bg-muted')}>
            <Eye className={cn('h-3.5 w-3.5', selectedBenchmark ? 'text-primary' : 'text-muted-foreground')} />
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-foreground">Benchmark de Concorrentes</p>
            <p className="text-[10px] text-muted-foreground">
              {selectedBenchmark ? selectedBenchmark.competitor_name : 'Upload ou selecione referência'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedBenchmark && <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px]">Ativo</Badge>}
          {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border p-3 space-y-2">
          {/* Upload */}
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1.5 flex-1"
              onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              Upload do Gerenciador de Anúncios
            </Button>
          </div>

          {selectedBenchmark && (
            <button onClick={() => onSelectBenchmark(null)}
              className="w-full rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 py-1.5 text-left text-[11px] text-destructive hover:bg-destructive/10 transition-all">
              ✕ Remover referência
            </button>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground py-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Carregando benchmarks...
            </div>
          )}

          <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
            {benchmarks.map(b => (
              <button key={b.id} onClick={() => { onSelectBenchmark(b); setOpen(false); }}
                className={cn(
                  'relative rounded-lg border overflow-hidden transition-all aspect-square group',
                  selectedBenchmark?.id === b.id
                    ? 'border-primary ring-1 ring-primary/30'
                    : 'border-border hover:border-primary/40'
                )}>
                {(b.thumbnail_url || b.file_url) ? (
                  <img src={b.thumbnail_url || b.file_url!} alt={b.competitor_name}
                    className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center text-[9px] text-muted-foreground">
                    {b.competitor_name.slice(0, 8)}
                  </div>
                )}
                {selectedBenchmark?.id === b.id && (
                  <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 text-primary-foreground" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[8px] text-white truncate">{b.competitor_name}</p>
                </div>
              </button>
            ))}
          </div>

          {!loading && benchmarks.length === 0 && (
            <p className="text-[10px] text-muted-foreground italic text-center py-2">
              Nenhum benchmark analisado. Faça upload de screenshots do Facebook Ads Manager.
            </p>
          )}

          {/* Selected preview */}
          {selectedBenchmark && (selectedBenchmark.thumbnail_url || selectedBenchmark.file_url) && (
            <div className="rounded-lg border border-primary/20 overflow-hidden">
              <img src={selectedBenchmark.thumbnail_url || selectedBenchmark.file_url!}
                alt={selectedBenchmark.competitor_name}
                className="w-full h-32 object-contain bg-black/5" />
              <div className="p-2">
                <p className="text-[10px] font-bold text-foreground">{selectedBenchmark.competitor_name}</p>
                {selectedBenchmark.platform && (
                  <Badge variant="outline" className="text-[8px] mt-0.5">{selectedBenchmark.platform}</Badge>
                )}
                {selectedBenchmark.ai_insights && (
                  <p className="text-[9px] text-muted-foreground mt-1 line-clamp-2">
                    {JSON.stringify(selectedBenchmark.ai_insights).slice(0, 120)}...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
