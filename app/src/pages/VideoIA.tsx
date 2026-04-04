import { Video } from 'lucide-react';

export default function VideoIA() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Video className="w-6 h-6 text-brand" />
        <div>
          <h1 className="font-heading font-black text-xl uppercase text-text-primary">Video IA</h1>
          <p className="text-sm text-text-secondary">Produção de vídeo com IA generativa</p>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-surface-elevated p-12 text-center">
        <Video className="w-10 h-10 text-text-muted mx-auto mb-3" />
        <p className="text-text-secondary text-sm">Crie storyboards, gere frames iniciais e monte vídeos com IA.</p>
        <p className="text-text-muted text-xs mt-1">Em breve — pipeline de vídeo multi-shot com cinematografia DQEF.</p>
      </div>
    </div>
  );
}
