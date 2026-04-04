import { FileText, Upload, Calendar, Brain } from 'lucide-react';

export default function RelatorioCMOTab() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-brand" />
        <span className="font-heading font-black text-base text-text-primary">Relatórios CMO</span>
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-hover text-text-secondary">
          Upload & Análise com IA
        </span>
      </div>

      {/* Upload Zone */}
      <div className="rounded-xl border-2 border-dashed border-border bg-surface-elevated p-12 text-center hover:border-brand/50 transition-colors cursor-pointer">
        <Upload className="w-10 h-10 text-text-muted mx-auto mb-3" />
        <p className="text-sm text-text-primary font-bold">Arraste o relatório mensal aqui</p>
        <p className="text-xs text-text-muted mt-1">PDF, até 10MB — analisado com Claude Sonnet 4</p>
        <div className="flex items-center justify-center gap-4 mt-4">
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
            <Calendar className="w-3 h-3" />
            Relatório mensal
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
            <Brain className="w-3 h-3" />
            Extração automática de KPIs
          </div>
        </div>
      </div>

      {/* Empty State */}
      <div className="rounded-xl border border-border bg-surface-elevated p-8 text-center">
        <FileText className="w-8 h-8 text-text-muted mx-auto mb-2" />
        <p className="text-sm text-text-secondary">Nenhum relatório enviado ainda</p>
        <p className="text-xs text-text-muted mt-1">
          Envie seu primeiro relatório CMO para começar a comparar KPIs mês a mês.
        </p>
      </div>
    </div>
  );
}
