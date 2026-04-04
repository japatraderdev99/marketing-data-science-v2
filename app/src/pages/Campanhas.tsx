import { Megaphone } from 'lucide-react';

export default function Campanhas() {
  return (
    <div className="h-screen flex flex-col">
      <div className="h-14 border-b border-border flex items-center px-6 shrink-0">
        <h1 className="font-heading font-black text-sm uppercase tracking-wider text-text-primary">
          Campanhas
        </h1>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto">
            <Megaphone className="w-8 h-8 text-amber-500/40" />
          </div>
          <h2 className="font-heading font-bold text-lg text-text-primary">Em breve</h2>
          <p className="text-sm text-text-muted max-w-sm">
            Organize suas campanhas com briefing, objetivos e vincule aos criativos gerados.
          </p>
        </div>
      </div>
    </div>
  );
}
