import { useRef } from 'react';
import { FileText, Trash2, Image, Loader2 } from 'lucide-react';
import type { KbDoc } from '@/features/estrategia/useStrategyData';

function formatBytes(bytes: number | null) {
  if (!bytes) return '';
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface Props {
  docs: KbDoc[];
  uploading: boolean;
  onUpload: (file: File, docType: 'reference') => Promise<void>;
  onDelete: (id: string, storagePath: string | null) => Promise<void>;
}

export default function ReferenceFiles({ docs, uploading, onUpload, onDelete }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const refDocs = docs.filter(d => d.doc_type === 'reference');

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-5 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-text-muted" />
        <span className="font-bold text-sm text-text-primary">Arquivos de Referência</span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-hover text-text-secondary">{refDocs.length}</span>
      </div>
      <p className="text-[11px] text-text-muted">Decks, guides de marca, pesquisas, briefings, referências visuais</p>

      {refDocs.length > 0 && (
        <div className="space-y-2">
          {refDocs.map(f => {
            const isImage = /\.(png|jpe?g|webp|gif)$/i.test(f.document_name);
            return (
              <div key={f.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
                {isImage
                  ? <Image className="w-4 h-4 text-blue-400 shrink-0" />
                  : <FileText className="w-4 h-4 text-red-400 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-text-primary truncate">{f.document_name}</p>
                  <p className="text-[10px] text-text-muted">
                    {formatBytes(f.file_size)}
                    {f.file_size ? ' · ' : ''}
                    {new Date(f.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <button onClick={() => onDelete(f.id, f.document_url)} className="text-text-muted hover:text-danger transition-colors shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-3 text-xs text-text-muted hover:border-brand/50 hover:text-text-secondary transition-colors disabled:opacity-50"
      >
        {uploading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
          : <><FileText className="w-4 h-4" /> Adicionar arquivo de referência</>}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp"
          multiple
          onChange={e => {
            if (!e.target.files) return;
            Array.from(e.target.files).forEach(f => onUpload(f, 'reference'));
          }}
        />
      </button>
    </div>
  );
}
