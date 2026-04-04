import { ImagePlus } from 'lucide-react';

export default function CriativosAtivos() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <ImagePlus className="w-6 h-6 text-brand" />
        <div>
          <h1 className="font-heading font-black text-xl uppercase text-text-primary">Criativos Ativos</h1>
          <p className="text-sm text-text-secondary">Criativos em veiculação nas campanhas</p>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-surface-elevated p-12 text-center">
        <ImagePlus className="w-10 h-10 text-text-muted mx-auto mb-3" />
        <p className="text-text-secondary text-sm">Grid de criativos ativos com métricas de performance em tempo real.</p>
        <p className="text-text-muted text-xs mt-1">Em breve — drag & drop, filtros por canal, status e performance.</p>
      </div>
    </div>
  );
}
