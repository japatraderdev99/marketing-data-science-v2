import { Kanban } from 'lucide-react';

export default function KanbanPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Kanban className="w-6 h-6 text-brand" />
        <div>
          <h1 className="font-heading font-black text-xl uppercase text-text-primary">Kanban</h1>
          <p className="text-sm text-text-secondary">Gestão visual de tarefas e criativos</p>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-surface-elevated p-12 text-center">
        <Kanban className="w-10 h-10 text-text-muted mx-auto mb-3" />
        <p className="text-text-secondary text-sm">Board Kanban para acompanhar o fluxo de produção criativa.</p>
        <p className="text-text-muted text-xs mt-1">Em breve — colunas: Pendente, Em Produção, Revisão, Aprovado, Publicado.</p>
      </div>
    </div>
  );
}
