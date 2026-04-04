import { CalendarDays } from 'lucide-react';

export default function Calendario() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <CalendarDays className="w-6 h-6 text-brand" />
        <div>
          <h1 className="font-heading font-black text-xl uppercase text-text-primary">Calendário</h1>
          <p className="text-sm text-text-secondary">Planejamento de conteúdo por data</p>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-surface-elevated p-12 text-center">
        <CalendarDays className="w-10 h-10 text-text-muted mx-auto mb-3" />
        <p className="text-text-secondary text-sm">Calendário editorial com datas de publicação e prazos.</p>
        <p className="text-text-muted text-xs mt-1">Em breve — arraste criativos para agendar publicações.</p>
      </div>
    </div>
  );
}
