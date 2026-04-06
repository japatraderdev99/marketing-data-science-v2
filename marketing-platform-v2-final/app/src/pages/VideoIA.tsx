import { Video, Sparkles, Clock } from 'lucide-react';

const MODELS = [
  { name: 'VEO 3.1', company: 'Google' },
  { name: 'Sora 2', company: 'OpenAI' },
  { name: 'Seedance 1.5', company: 'ByteDance' },
];

export default function VideoIA() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-10">
        <Video className="w-5 h-5 text-brand" />
        <div>
          <h1 className="font-heading font-black text-xl uppercase text-text-primary">Geração de Vídeo com IA</h1>
          <p className="text-sm text-text-secondary">Pipeline multi-shot com cinematografia DQEF</p>
        </div>
      </div>

      {/* Coming soon hero */}
      <div className="rounded-2xl border border-border bg-surface-elevated p-10 text-center mb-8">
        <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-5 opacity-60">
          <Video className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-brand" />
          <span className="font-heading font-black text-sm uppercase tracking-wider text-brand">Em breve</span>
        </div>
        <p className="text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
          Estamos desenvolvendo a integração com <strong className="text-text-primary">VEO 3.1</strong>,{' '}
          <strong className="text-text-primary">Sora 2</strong> e{' '}
          <strong className="text-text-primary">Seedance 1.5</strong>. Por enquanto, foque na criação de
          carrosséis e criativos estáticos.
        </p>
      </div>

      {/* Models */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {MODELS.map(m => (
          <div key={m.name} className="rounded-xl border border-border bg-surface-elevated p-4 text-center opacity-50">
            <Sparkles className="w-6 h-6 text-brand mx-auto mb-2" />
            <p className="font-heading font-bold text-sm text-text-primary">{m.name}</p>
            <p className="text-xs text-text-muted">{m.company}</p>
            <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-hover text-text-muted border border-border">
              Em breve
            </span>
          </div>
        ))}
      </div>

      {/* What to use now */}
      <div className="rounded-xl border border-brand/20 bg-brand/5 p-5">
        <p className="text-xs font-bold text-brand uppercase tracking-wide mb-2">Enquanto isso, use:</p>
        <ul className="space-y-1.5 text-sm text-text-secondary">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
            <strong className="text-text-primary">AI Carrosséis</strong> — slides prontos para Stories e Feed
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
            <strong className="text-text-primary">Criativo em Lote</strong> — variações estáticas em segundos
          </li>
        </ul>
      </div>
    </div>
  );
}
