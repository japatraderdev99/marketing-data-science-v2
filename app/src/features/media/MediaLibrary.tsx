import { useState, useCallback } from 'react';
import { Upload, Search, Image, Filter, X, Tag } from 'lucide-react';
import type { MediaItem, MediaMood } from '@/types';
import { cn, generateId } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const MOODS: MediaMood[] = ['determinação', 'alívio', 'orgulho', 'urgência', 'raiva', 'foco'];
const STYLES = ['documentário', 'editorial', 'publicitário', 'casual'];

export function MediaLibrary() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [search, setSearch] = useState('');
  const [moodFilter, setMoodFilter] = useState<string>('');
  const [styleFilter, setStyleFilter] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);

    const newItems: MediaItem[] = [];
    for (const file of Array.from(files)) {
      const id = generateId();
      const url = URL.createObjectURL(file);
      newItems.push({
        id,
        workspace_id: 'local',
        file_name: file.name,
        storage_path: `media/${id}`,
        public_url: url,
        file_size: file.size,
        mime_type: file.type,
        tagging_status: 'pending',
        created_at: new Date().toISOString(),
      });
    }

    setItems((prev) => [...newItems, ...prev]);
    setUploading(false);

    // Simulate tagging after 2s
    setTimeout(() => {
      setItems((prev) =>
        prev.map((item) =>
          newItems.find((n) => n.id === item.id)
            ? {
                ...item,
                tagging_status: 'done' as const,
                ai_tags: ['pessoa', 'trabalho', 'ferramenta'],
                ai_mood: 'determinação' as const,
                ai_description: 'Profissional autônomo em ambiente de trabalho real',
                ai_subjects: ['pessoa', 'ferramenta'],
                ai_colors: ['laranja', 'bege'],
                ai_style: 'documentário',
                ai_fit_score_map: { RAIVA: 0.3, DINHEIRO: 0.5, ORGULHO: 0.8, URGÊNCIA: 0.4, ALÍVIO: 0.6 },
              }
            : item,
        ),
      );
    }, 2000);
  }, []);

  const filteredItems = items.filter((item) => {
    if (search && !item.ai_tags?.some((t) => t.includes(search.toLowerCase())) && !item.file_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (moodFilter && item.ai_mood !== moodFilter) return false;
    if (styleFilter && item.ai_style !== styleFilter) return false;
    return true;
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

  return (
    <div className="flex gap-6 h-full">
      {/* Left: Filters */}
      <div className="w-64 shrink-0 space-y-5 overflow-y-auto pr-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por tag, nome..."
            className="w-full bg-surface-hover border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand outline-none"
          />
        </div>

        {/* Mood filter */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3 h-3" /> Mood
          </label>
          <div className="flex flex-wrap gap-1.5">
            {MOODS.map((m) => (
              <button
                key={m}
                onClick={() => setMoodFilter(moodFilter === m ? '' : m)}
                className={cn('px-2 py-1 rounded-md text-[11px] font-medium border transition-all capitalize', moodFilter === m ? 'border-brand text-brand bg-brand/10' : 'border-border text-text-muted hover:border-text-muted')}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Style filter */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Estilo</label>
          <div className="flex flex-wrap gap-1.5">
            {STYLES.map((s) => (
              <button
                key={s}
                onClick={() => setStyleFilter(styleFilter === s ? '' : s)}
                className={cn('px-2 py-1 rounded-md text-[11px] font-medium border transition-all capitalize', styleFilter === s ? 'border-brand text-brand bg-brand/10' : 'border-border text-text-muted hover:border-text-muted')}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Upload */}
        <div
          className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-brand/50 transition-colors cursor-pointer"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <Upload className="w-8 h-8 mx-auto text-text-muted mb-2" />
          <p className="text-xs text-text-muted">Arraste imagens ou clique</p>
          <input
            id="file-upload"
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>

        <p className="text-[10px] text-text-muted text-center">
          {items.length} imagens na biblioteca
        </p>
      </div>

      {/* Right: Grid */}
      <div className="flex-1 overflow-y-auto pb-8">
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-brand/10 flex items-center justify-center mb-4">
              <Image className="w-10 h-10 text-brand/40" />
            </div>
            <h2 className="font-heading font-bold text-lg text-text-primary mb-1">Biblioteca de Mídia</h2>
            <p className="text-sm text-text-muted max-w-sm">
              Faça upload de imagens para auto-tagging por IA. Suas imagens serão reutilizadas inteligentemente nos criativos.
            </p>
          </div>
        )}

        {filteredItems.length > 0 && (
          <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={cn(
                  'group relative aspect-square rounded-xl overflow-hidden border border-border cursor-pointer hover:border-brand/50 transition-all',
                  selectedItem?.id === item.id && 'ring-2 ring-brand',
                )}
              >
                <img src={item.public_url} alt={item.file_name} className="w-full h-full object-cover" />

                {/* Tagging status overlay */}
                {item.tagging_status === 'pending' && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                      <span className="text-[10px] text-white/70">Analisando...</span>
                    </div>
                  </div>
                )}

                {/* Info overlay on hover */}
                {item.tagging_status === 'done' && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-white/80 truncate">{item.ai_description}</p>
                    {item.ai_mood && (
                      <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded mt-1 inline-block capitalize">
                        {item.ai_mood}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Detail panel */}
        {selectedItem && selectedItem.tagging_status === 'done' && (
          <div className="fixed right-0 top-0 h-screen w-80 bg-surface-elevated border-l border-border p-5 space-y-4 overflow-y-auto z-50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Detalhes</span>
              <button onClick={() => setSelectedItem(null)} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
            </div>

            <img src={selectedItem.public_url} alt="" className="w-full aspect-square object-cover rounded-xl" />

            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-text-muted uppercase tracking-wider">Descrição IA</span>
                <p className="text-xs text-text-primary mt-0.5">{selectedItem.ai_description}</p>
              </div>

              {selectedItem.ai_mood && (
                <div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider">Mood</span>
                  <p className="text-xs text-text-primary mt-0.5 capitalize">{selectedItem.ai_mood}</p>
                </div>
              )}

              {selectedItem.ai_tags && (
                <div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider flex items-center gap-1"><Tag className="w-3 h-3" /> Tags</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedItem.ai_tags.map((tag) => (
                      <span key={tag} className="text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedItem.ai_fit_score_map && (
                <div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider">Fit Score por Ângulo</span>
                  <div className="space-y-1 mt-1">
                    {Object.entries(selectedItem.ai_fit_score_map).map(([angle, score]) => (
                      <div key={angle} className="flex items-center gap-2">
                        <span className="text-[10px] text-text-muted w-16">{angle}</span>
                        <div className="flex-1 h-1.5 bg-surface-hover rounded-full">
                          <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${score * 100}%` }} />
                        </div>
                        <span className="text-[10px] text-text-muted w-8 text-right">{(score * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
