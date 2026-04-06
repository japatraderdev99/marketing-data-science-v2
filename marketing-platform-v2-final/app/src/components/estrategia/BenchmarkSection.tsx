import { Search, PlusCircle, Lightbulb, ExternalLink, Trash2 } from 'lucide-react';

const MOCK_BENCHMARKS = [
  {
    id: '1', name: 'Captura de Tela 2026-03-24 às 01.49.30',
    platform: 'Facebook Ads', format: 'image',
    hasInsights: true,
  },
  {
    id: '2', name: 'Captura de Tela 2026-03-15 às 16.08.49',
    platform: 'Facebook Ads', format: 'image',
    hasInsights: true,
  },
];

export default function BenchmarkSection() {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-yellow-400/10 p-1.5 border border-yellow-400/20">
          <Search className="h-4 w-4 text-yellow-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-text-primary">Benchmark de Concorrentes</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-400/15 text-yellow-400">2</span>
          </div>
          <p className="text-[11px] text-text-muted">Envie materiais de concorrentes — a IA analisa e gera insights adaptados à comunicação da sua marca</p>
        </div>
      </div>

      {/* Upload Form */}
      <div className="rounded-lg border border-border bg-surface-hover p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Nome do concorrente *"
            className="bg-surface-elevated border border-border rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted"
          />
          <select className="bg-surface-elevated border border-border rounded-lg px-3 py-2 text-xs text-text-muted">
            <option>Plataforma (opcional)</option>
          </select>
          <select className="bg-surface-elevated border border-border rounded-lg px-3 py-2 text-xs text-text-muted">
            <option>Formato (opcional)</option>
          </select>
        </div>
        <div className="rounded-lg border-2 border-dashed border-border p-3 text-center cursor-pointer hover:border-brand/50 transition-colors">
          <p className="text-xs text-text-muted">
            <Search className="w-3.5 h-3.5 inline mr-1" />
            <span className="text-text-secondary font-bold">Upload de material do concorrente</span> · Print, anúncio, carrossel · máx 20MB
          </p>
        </div>
      </div>

      {/* Benchmark Items */}
      <div className="space-y-2">
        {MOCK_BENCHMARKS.map((b) => (
          <div key={b.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
            <div className="w-10 h-10 rounded-lg bg-surface-hover flex items-center justify-center shrink-0">
              <div className="w-8 h-8 rounded bg-surface-active" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-text-primary truncate">{b.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-text-muted">{b.platform}</span>
                <span className="text-[10px] text-text-muted">{b.format}</span>
              </div>
            </div>
            {b.hasInsights && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-amber-400 bg-amber-400/10 cursor-pointer">
                <Lightbulb className="w-3 h-3" /> Insights · Ver
              </span>
            )}
            <ExternalLink className="w-3.5 h-3.5 text-text-muted hover:text-text-primary cursor-pointer shrink-0" />
            <Trash2 className="w-3.5 h-3.5 text-text-muted hover:text-danger cursor-pointer shrink-0" />
          </div>
        ))}
      </div>

      <p className="text-xs text-text-muted text-center">
        A IA analisa o material do concorrente e gera insights com a comunicação e marca pessoal da Deixa Que Eu Faço
      </p>
    </div>
  );
}
