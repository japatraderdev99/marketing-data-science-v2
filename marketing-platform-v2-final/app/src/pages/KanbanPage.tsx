import { useState } from 'react';
import { Kanban, GripVertical, Trash2, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useCreativeDrafts,
  useUpdateDraftStatus,
  useDeleteDraft,
  TYPE_LABELS,
  type CreativeDraft,
  type DraftStatus,
} from '@/features/campaigns/hooks/useCreativeDrafts';

interface Column {
  id: DraftStatus;
  label: string;
  color: string;
  dot: string;
}

const COLUMNS: Column[] = [
  { id: 'draft', label: 'Rascunho', color: 'border-t-border', dot: 'bg-text-muted' },
  { id: 'approved', label: 'Aprovado', color: 'border-t-green-500', dot: 'bg-green-400' },
  { id: 'published', label: 'Publicado', color: 'border-t-brand', dot: 'bg-brand' },
  { id: 'archived', label: 'Arquivado', color: 'border-t-text-muted', dot: 'bg-text-muted/40' },
];

function DraftCard({ draft, onDelete, deleting }: {
  draft: CreativeDraft;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  return (
    <div
      draggable
      onDragStart={e => e.dataTransfer.setData('draftId', draft.id)}
      className="group bg-surface border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-brand/30 transition-colors"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-text-primary truncate">
            {draft.title || 'Sem título'}
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">{TYPE_LABELS[draft.type] ?? draft.type}</p>
          <p className="text-[10px] text-text-muted mt-1">
            {new Date(draft.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </p>
        </div>
        <button
          onClick={() => onDelete(draft.id)}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-red-400 transition-all disabled:opacity-20"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function KanbanColumn({ column, drafts, onDrop, onDelete, deleting }: {
  column: Column;
  drafts: CreativeDraft[];
  onDrop: (id: string, status: DraftStatus) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const [over, setOver] = useState(false);

  return (
    <div
      className={cn('flex flex-col gap-3 flex-1 min-w-[200px] max-w-[280px]')}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => {
        e.preventDefault();
        setOver(false);
        const id = e.dataTransfer.getData('draftId');
        if (id) onDrop(id, column.id);
      }}
    >
      {/* Column header */}
      <div className={cn('bg-surface-elevated border border-border border-t-2 rounded-lg p-3', column.color)}>
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full', column.dot)} />
          <span className="font-heading font-bold text-xs text-text-primary uppercase tracking-wide">{column.label}</span>
          <span className="ml-auto text-[10px] font-bold text-text-muted bg-surface-hover px-1.5 py-0.5 rounded">
            {drafts.length}
          </span>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={cn(
          'flex-1 min-h-[200px] rounded-lg border-2 border-dashed transition-colors p-2 space-y-2',
          over ? 'border-brand bg-brand/5' : 'border-border/50'
        )}
      >
        {drafts.map(d => (
          <DraftCard key={d.id} draft={d} onDelete={onDelete} deleting={deleting} />
        ))}
        {drafts.length === 0 && (
          <div className="flex items-center justify-center h-20">
            <p className="text-[10px] text-text-muted">Arraste cards aqui</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const { data: drafts = [], isLoading } = useCreativeDrafts();
  const updateStatus = useUpdateDraftStatus();
  const deleteDraft = useDeleteDraft();

  const handleDrop = (id: string, status: DraftStatus) => {
    const draft = drafts.find(d => d.id === id);
    if (draft && draft.status !== status) {
      updateStatus.mutate({ id, status });
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center px-6 shrink-0 gap-3">
        <Kanban className="w-4 h-4 text-brand" />
        <h1 className="font-heading font-black text-sm uppercase tracking-wider text-text-primary">Kanban</h1>
        <span className="text-xs text-text-muted">— fluxo de criativos</span>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-brand animate-spin" />
          </div>
        )}

        {!isLoading && drafts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-14 h-14 rounded-xl gradient-brand opacity-30 flex items-center justify-center">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <p className="text-sm text-text-muted">Nenhum criativo ainda.</p>
            <p className="text-xs text-text-muted">Gere carrosséis ou criativos em lote para ver aqui.</p>
          </div>
        )}

        {!isLoading && drafts.length > 0 && (
          <div className="flex gap-4 h-full min-w-max">
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.id}
                column={col}
                drafts={drafts.filter(d => d.status === col.id)}
                onDrop={handleDrop}
                onDelete={id => deleteDraft.mutate(id)}
                deleting={deleteDraft.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
