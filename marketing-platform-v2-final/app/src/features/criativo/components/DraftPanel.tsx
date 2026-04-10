import { useState } from 'react';
import { Save, FolderOpen, Loader2, Check, Clock } from 'lucide-react';
import { useMyDrafts, useSaveDraft } from '../hooks/useCreativeDrafts';
import type { DraftType } from '@/types';
import { cn } from '@/lib/utils';

interface DraftPanelProps {
  type: DraftType;
  currentData?: Record<string, unknown>;
  currentTitle?: string;
  onLoad: (data: Record<string, unknown>) => void;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now.getTime() - d.getTime()) / 3600000;
  if (diffH < 1) return 'Agora há pouco';
  if (diffH < 24) return `${Math.floor(diffH)}h atrás`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function DraftPanel({ type, currentData, currentTitle, onLoad }: DraftPanelProps) {
  const [savedOk, setSavedOk] = useState(false);
  const { data: drafts = [], isLoading } = useMyDrafts(type);
  const saveDraft = useSaveDraft();

  const handleSave = async () => {
    if (!currentData) return;
    setSavedOk(false);
    await saveDraft.mutateAsync({
      type,
      title: currentTitle || `Draft ${new Date().toLocaleTimeString('pt-BR')}`,
      data: currentData,
    });
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 3000);
  };

  return (
    <div className="space-y-2.5 p-3 bg-surface-elevated rounded-lg border border-border">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <Save className="w-3 h-3 text-brand" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Rascunhos</span>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!currentData || saveDraft.isPending || savedOk}
        className={cn(
          'w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all',
          savedOk
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            : 'bg-brand hover:bg-brand-dark text-white disabled:opacity-40',
        )}
      >
        {saveDraft.isPending
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : savedOk
            ? <Check className="w-3 h-3" />
            : <Save className="w-3 h-3" />}
        {savedOk ? 'Salvo!' : 'Salvar rascunho agora'}
      </button>

      {/* Draft list */}
      {isLoading && (
        <div className="flex justify-center py-2">
          <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
        </div>
      )}

      {!isLoading && drafts.length === 0 && (
        <p className="text-[10px] text-text-muted text-center py-1">Nenhum rascunho salvo</p>
      )}

      {drafts.length > 0 && (
        <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
          {drafts.slice(0, 8).map((draft) => (
            <div
              key={draft.id}
              className="flex items-center gap-2 p-2 rounded-md bg-surface-hover hover:bg-brand/5 group transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-text-primary font-medium truncate">
                  {draft.title || `Draft sem título`}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="w-2.5 h-2.5 text-text-muted" />
                  <span className="text-[9px] text-text-muted">{formatDate(draft.created_at)}</span>
                </div>
              </div>
              <button
                onClick={() => onLoad(draft.data as Record<string, unknown>)}
                title="Carregar este rascunho"
                className="p-1 rounded text-text-muted hover:text-brand hover:bg-brand/10 transition-colors opacity-0 group-hover:opacity-100"
              >
                <FolderOpen className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
