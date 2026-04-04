import { Ruler } from 'lucide-react';

export default function Formatos() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Ruler className="w-6 h-6 text-brand" />
        <div>
          <h1 className="font-heading font-black text-xl uppercase text-text-primary">Formatos</h1>
          <p className="text-sm text-text-secondary">Templates por plataforma e dimensão</p>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-surface-elevated p-12 text-center">
        <Ruler className="w-10 h-10 text-text-muted mx-auto mb-3" />
        <p className="text-text-secondary text-sm">Biblioteca de formatos: Instagram, TikTok, Facebook, LinkedIn, Google Display.</p>
        <p className="text-text-muted text-xs mt-1">Em breve — selecione formato e aplique automaticamente nos criativos.</p>
      </div>
    </div>
  );
}
