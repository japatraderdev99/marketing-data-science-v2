import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { BookOpen, PlusCircle, FileText, Trash2, CheckCircle2, Clock, AlertCircle, Loader2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KbDoc } from '@/features/estrategia/useStrategyData';

const STATUS_MAP = {
  pending:    { label: 'Na fila',   color: 'text-text-muted bg-surface-hover',   icon: Clock },
  processing: { label: 'Analisando',color: 'text-amber-400 bg-amber-400/10',     icon: Loader2 },
  done:       { label: 'Extraído',  color: 'text-emerald-400 bg-emerald-400/10', icon: CheckCircle2 },
  error:      { label: 'Erro',      color: 'text-red-400 bg-red-400/10',         icon: AlertCircle },
};

function formatBytes(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface Props {
  docs: KbDoc[];
  loading: boolean;
  uploading: boolean;
  onUpload: (file: File, docType: 'knowledge' | 'reference') => Promise<void>;
  onDelete: (id: string, storagePath: string | null) => Promise<void>;
  onReprocess: (id: string, storagePath: string, documentName: string) => Promise<void>;
  onFillPlaybook: () => Promise<void>;
  fillingPlaybook: boolean;
}

export default function KnowledgeBaseSection({ docs, loading, uploading, onUpload, onDelete, onReprocess, onFillPlaybook, fillingPlaybook }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const doneCount = docs.filter(d => d.status === 'done').length;
  const kbDocs = docs.filter(d => d.doc_type === 'knowledge' || !d.doc_type);

  const handleReprocess = async (doc: KbDoc) => {
    if (!doc.document_url) {
      toast.error('Documento sem URL — faça upload novamente');
      return;
    }
    setProcessingIds(prev => new Set(prev).add(doc.id));
    try {
      await onReprocess(doc.id, doc.document_url, doc.document_name);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      toast.error(`Falha ao processar "${doc.document_name}": ${msg}`);
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(doc.id); return s; });
    }
  };

  const pendingDocs = kbDocs.filter(d => d.status === 'pending' || d.status === 'error');

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      await onUpload(file, 'knowledge');
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-brand/15 p-1.5 border border-brand/20">
          <BookOpen className="h-4 w-4 text-brand" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-text-primary">Knowledge Base</span>
            {loading ? (
              <Loader2 className="w-3 h-3 text-text-muted animate-spin" />
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal/15 text-teal">
                {doneCount}/{kbDocs.length} analisados
              </span>
            )}
          </div>
          <p className="text-[11px] text-text-muted">Envie seu playbook, brand book, guias de marca. A IA extrai o conhecimento automaticamente.</p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-surface-hover px-3 py-2.5 border border-border/60">
        <span className="text-brand text-xs shrink-0 mt-0.5">💡</span>
        <p className="text-[11px] text-text-muted leading-relaxed">
          <strong>Dica:</strong> Envie PDFs do playbook de marketing, pitch decks, apresentações de brand book, documentos de posicionamento e guias de tom de voz. Quanto mais completa a base, mais precisa será a IA.
        </p>
      </div>

      {/* Upload Zone */}
      <div
        className="rounded-lg border-2 border-dashed border-border bg-surface-hover p-4 text-center cursor-pointer hover:border-brand/50 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-brand">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs font-semibold">Enviando e iniciando análise...</span>
          </div>
        ) : (
          <>
            <PlusCircle className="w-5 h-5 text-text-muted mx-auto mb-1" />
            <p className="text-xs text-text-muted">
              <span className="font-bold text-text-secondary">Enviar documentos estratégicos</span> · PDF, PPT, DOC, Imagem · máx 20MB
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp"
          multiple
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {/* Document List */}
      {kbDocs.length > 0 && (
        <div className="space-y-2">
          {kbDocs.map(doc => {
            const s = STATUS_MAP[doc.status] ?? STATUS_MAP.error;
            const StatusIcon = s.icon;
            return (
              <div key={doc.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
                <FileText className="w-4 h-4 text-red-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-text-primary truncate">{doc.document_name}</p>
                  <p className="text-[10px] text-text-muted">
                    {formatBytes(doc.file_size)}
                    {doc.file_size ? ' · ' : ''}
                    {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold shrink-0', s.color)}>
                  <StatusIcon className={cn('w-3 h-3', (doc.status === 'processing' || processingIds.has(doc.id)) && 'animate-spin')} />
                  {processingIds.has(doc.id) ? 'Processando...' : s.label}
                </span>
                {(doc.status === 'pending' || doc.status === 'error') && !processingIds.has(doc.id) && (
                  <button
                    onClick={() => handleReprocess(doc)}
                    title="Iniciar análise"
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-brand bg-brand/10 hover:bg-brand/20 transition-colors shrink-0"
                  >
                    <Play className="w-2.5 h-2.5" /> Processar
                  </button>
                )}
                <button
                  onClick={() => onDelete(doc.id, doc.document_url)}
                  className="text-text-muted hover:text-danger transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Process all pending */}
      {pendingDocs.length > 0 && (
        <button
          onClick={() => pendingDocs.forEach(d => d.document_url && handleReprocess(d))}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 px-4 py-2 text-xs font-bold text-amber-400 hover:bg-amber-400/10 transition-colors"
        >
          <Play className="h-3.5 w-3.5" />
          Processar {pendingDocs.length} documento{pendingDocs.length > 1 ? 's' : ''} pendente{pendingDocs.length > 1 ? 's' : ''}
        </button>
      )}

      {/* Fill playbook button */}
      <button
        onClick={onFillPlaybook}
        disabled={fillingPlaybook || doneCount === 0}
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-brand/30 bg-brand/5 px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {fillingPlaybook ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Preenchendo playbook com IA...</>
        ) : (
          <><span>✨</span> Preencher playbook automaticamente com Knowledge Base</>
        )}
      </button>
      {doneCount === 0 && kbDocs.length > 0 && (
        <p className="text-[10px] text-text-muted text-center">Aguarde a análise dos documentos para usar esta função</p>
      )}
    </div>
  );
}
