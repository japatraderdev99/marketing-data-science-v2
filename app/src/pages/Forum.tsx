import { MessageSquare } from 'lucide-react';

export default function Forum() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="w-6 h-6 text-brand" />
        <div>
          <h1 className="font-heading font-black text-xl uppercase text-text-primary">Fórum</h1>
          <p className="text-sm text-text-secondary">Chat da equipe em tempo real</p>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-surface-elevated p-12 text-center">
        <MessageSquare className="w-10 h-10 text-text-muted mx-auto mb-3" />
        <p className="text-text-secondary text-sm">Chat em tempo real com a equipe e IA assistente.</p>
        <p className="text-text-muted text-xs mt-1">Em breve — mensagens, tarefas e decisões estratégicas.</p>
      </div>
    </div>
  );
}
