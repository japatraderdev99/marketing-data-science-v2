import { Globe } from 'lucide-react';

export default function CanaisOrganicos() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Globe className="w-6 h-6 text-brand" />
        <div>
          <h1 className="font-heading font-black text-xl uppercase text-text-primary">Canais Orgânicos</h1>
          <p className="text-sm text-text-secondary">Performance dos posts orgânicos</p>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-surface-elevated p-12 text-center">
        <Globe className="w-10 h-10 text-text-muted mx-auto mb-3" />
        <p className="text-text-secondary text-sm">Métricas do Instagram, TikTok e LinkedIn orgânico.</p>
        <p className="text-text-muted text-xs mt-1">Em breve — sync via Meta Graph API, top posts, tendências.</p>
      </div>
    </div>
  );
}
