import { BookOpen, PlusCircle, FileText, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const MOCK_KB_DOCS = [
  { id: '1', name: 'BRAND_BOOK DQEF MAR 2026-compactado.pdf', size: '6.3 MB', date: '05/03/2026', status: 'analyzing' as const },
  { id: '2', name: 'dqf-estrategia-prestadores-v1-compactado.pdf', size: '2.4 MB', date: '22/02/2026', status: 'done' as const },
  { id: '3', name: 'PLAYBOOK DE MARKETING DEIXA QUE EU FACO.pdf', size: '638.3 KB', date: '21/02/2026', status: 'done' as const },
];

const STATUS_MAP = {
  analyzing: { label: 'Analisando', color: 'text-amber-400 bg-amber-400/10', icon: Clock },
  done: { label: 'Extraído', color: 'text-emerald-400 bg-emerald-400/10', icon: CheckCircle2 },
};

export default function KnowledgeBaseSection() {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-brand/15 p-1.5 border border-brand/20">
          <BookOpen className="h-4 w-4 text-brand" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-text-primary">Knowledge Base</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal/15 text-teal">2/3 analisados</span>
          </div>
          <p className="text-[11px] text-text-muted">Envie seu playbook de marketing, brand book, guias de marca e documentos estratégicos. A IA extrai e salva o conhecimento automaticamente.</p>
        </div>
      </div>

      {/* Tip */}
      <div className="flex items-start gap-2 rounded-lg bg-surface-hover px-3 py-2.5 border border-border/60">
        <span className="text-brand text-xs">💡</span>
        <p className="text-[11px] text-text-muted leading-relaxed">
          <strong>Dica:</strong> Envie PDFs do playbook de marketing, pitch decks, apresentações de brand book, documentos de posicionamento e guias de tom de voz. Quanto mais completa a base, mais precisa será a IA nas campanhas e criativos.
        </p>
      </div>

      {/* Upload Zone */}
      <div className="rounded-lg border-2 border-dashed border-border bg-surface-hover p-4 text-center cursor-pointer hover:border-brand/50 transition-colors">
        <PlusCircle className="w-5 h-5 text-text-muted mx-auto mb-1" />
        <p className="text-xs text-text-muted">
          <span className="font-bold text-text-secondary">Enviar documentos estratégicos</span> · PDF, PPT, DOC, Imagem · máx 20MB
        </p>
      </div>

      {/* Documents */}
      <div className="space-y-2">
        {MOCK_KB_DOCS.map((doc) => {
          const s = STATUS_MAP[doc.status];
          const StatusIcon = s.icon;
          return (
            <div key={doc.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
              <FileText className="w-4 h-4 text-red-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-text-primary truncate">{doc.name}</p>
                <p className="text-[10px] text-text-muted">{doc.size} · {doc.date}</p>
              </div>
              <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold', s.color)}>
                <StatusIcon className="w-3 h-3" /> {s.label}
              </span>
              <Trash2 className="w-3.5 h-3.5 text-text-muted hover:text-danger cursor-pointer shrink-0" />
            </div>
          );
        })}
      </div>

      {/* Auto-fill button */}
      <button className="w-full flex items-center justify-center gap-2 rounded-lg border border-brand/30 bg-brand/5 px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand/10 transition-colors">
        <span>✨</span> Preencher playbook automaticamente com Knowledge Base
      </button>
    </div>
  );
}
