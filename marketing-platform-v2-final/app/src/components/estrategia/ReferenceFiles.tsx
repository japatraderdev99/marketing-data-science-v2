import { FileText, PlusCircle, Eye, Download, Trash2 } from 'lucide-react';

const MOCK_FILES = [
  { id: '1', name: 'PLAYBOOK DE MARKETING DEIXA QUE EU FACO.pdf', size: '638.3 KB', date: '20/02/2026', type: 'pdf' },
  { id: '2', name: 'brand-book-dqf-novembro2025-compactado.pdf', size: '5.5 MB', date: '20/02/2026', type: 'pdf' },
  { id: '3', name: 'Captura de Tela 2026-02-20 às 07.20.02 (2).png', size: '608.4 KB', date: '20/02/2026', type: 'image' },
  { id: '4', name: 'Captura de Tela 2026-02-20 às 07.20.06.png', size: '149.0 KB', date: '20/02/2026', type: 'image' },
  { id: '5', name: 'Captura de Tela 2026-02-20 às 07.20.11.png', size: '73.4 KB', date: '20/02/2026', type: 'image' },
  { id: '6', name: 'Captura de Tela 2026-02-20 às 07.20.35.png', size: '115.0 KB', date: '20/02/2026', type: 'image' },
];

export default function ReferenceFiles() {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-5 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-text-muted" />
        <span className="font-bold text-sm text-text-primary">Arquivos de Referência</span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-hover text-text-secondary">6</span>
      </div>
      <p className="text-[11px] text-text-muted">Decks, guides de marca, pesquisas, briefings, referências visuais</p>

      <div className="space-y-2">
        {MOCK_FILES.map((f) => (
          <div key={f.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
            <FileText className={`w-4 h-4 shrink-0 ${f.type === 'pdf' ? 'text-red-400' : 'text-blue-400'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-text-primary truncate">{f.name}</p>
              <p className="text-[10px] text-text-muted">{f.size} · {f.date}</p>
            </div>
            {f.type === 'image' && (
              <Eye className="w-3.5 h-3.5 text-text-muted hover:text-text-primary cursor-pointer shrink-0" />
            )}
            <Download className="w-3.5 h-3.5 text-text-muted hover:text-text-primary cursor-pointer shrink-0" />
            <Trash2 className="w-3.5 h-3.5 text-text-muted hover:text-danger cursor-pointer shrink-0" />
          </div>
        ))}
      </div>

      <button className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-3 text-xs text-text-muted hover:border-brand/50 hover:text-text-secondary transition-colors cursor-pointer">
        <PlusCircle className="w-4 h-4" /> Adicionar arquivo de referência
      </button>
    </div>
  );
}
