import { Palette } from 'lucide-react';

export default function BrandKit() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Palette className="w-6 h-6 text-brand" />
        <div>
          <h1 className="font-heading font-black text-xl uppercase text-text-primary">Brand Kit</h1>
          <p className="text-sm text-text-secondary">Identidade visual da marca</p>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-surface-elevated p-12 text-center">
        <Palette className="w-10 h-10 text-text-muted mx-auto mb-3" />
        <p className="text-text-secondary text-sm">Logos, cores, fontes e assets visuais da marca DQEF.</p>
        <p className="text-text-muted text-xs mt-1">Em breve — upload de logos, paleta de cores, tipografia.</p>
      </div>
    </div>
  );
}
