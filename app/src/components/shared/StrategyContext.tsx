import { useState } from 'react';
import { Brain, ChevronDown, ChevronUp, Target, MessageSquare, Users, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StrategyContextProps {
  compact?: boolean;
  onInjectContext?: (context: string) => void;
}

interface ContextSection {
  id: string;
  icon: typeof Brain;
  label: string;
  color: string;
  placeholder: string;
}

const SECTIONS: ContextSection[] = [
  { id: 'brand', icon: Target, label: 'Posicionamento', color: 'text-brand', placeholder: 'Essência e posicionamento da marca...' },
  { id: 'persona', icon: Users, label: 'Persona', color: 'text-teal', placeholder: 'Perfil do público-alvo, dores e desejos...' },
  { id: 'tone', icon: MessageSquare, label: 'Tom de Voz', color: 'text-amber-400', placeholder: 'Regras de tom e comunicação da marca...' },
  { id: 'differentials', icon: Zap, label: 'Diferenciais', color: 'text-emerald-400', placeholder: 'Vantagens competitivas e mensagens-chave...' },
];

export function StrategyContext({ compact, onInjectContext }: StrategyContextProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeFields, setActiveFields] = useState<Set<string>>(new Set());

  const toggleField = (id: string) => {
    setActiveFields(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const hasStrategy = false; // Will be true when connected to real strategy data

  return (
    <div className={cn(
      'rounded-lg border transition-all',
      hasStrategy ? 'border-brand/20 bg-brand/5' : 'border-border bg-surface-hover',
    )}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
      >
        <div className={cn('rounded-md p-1', hasStrategy ? 'bg-brand/15' : 'bg-surface-active')}>
          <Brain className={cn('w-3.5 h-3.5', hasStrategy ? 'text-brand' : 'text-text-muted')} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-text-primary">Contexto Estratégico</p>
          {!expanded && (
            <p className="text-[10px] text-text-muted truncate">
              {hasStrategy
                ? `${activeFields.size} campos ativos · Playbook conectado`
                : 'Configure o playbook na aba Estratégia para enriquecer a IA'}
            </p>
          )}
        </div>
        {hasStrategy && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-400/10 text-emerald-400">ON</span>
        )}
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-text-muted" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {!hasStrategy ? (
            <div className="rounded-md bg-surface-active/50 p-2.5 text-center">
              <p className="text-[11px] text-text-muted">
                Preencha o <span className="text-brand font-semibold">Playbook Estratégico</span> na aba Estratégia.
                A IA usará automaticamente seus dados de marca, persona e tom de voz.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                {SECTIONS.map(s => {
                  const Icon = s.icon;
                  const active = activeFields.has(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleField(s.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-2.5 py-2 rounded-md border text-left transition-all',
                        active ? 'border-brand/30 bg-brand/5' : 'border-border/50 hover:border-border',
                      )}
                    >
                      <Icon className={cn('w-3.5 h-3.5 shrink-0', active ? s.color : 'text-text-muted')} />
                      <span className={cn('text-[11px] font-medium flex-1', active ? 'text-text-primary' : 'text-text-muted')}>
                        {s.label}
                      </span>
                      <div className={cn(
                        'w-3 h-3 rounded-sm border transition-all',
                        active ? 'bg-brand border-brand' : 'border-border',
                      )} />
                    </button>
                  );
                })}
              </div>
              {activeFields.size > 0 && onInjectContext && (
                <button
                  onClick={() => onInjectContext('')}
                  className="w-full text-[10px] font-semibold text-brand hover:text-brand-light transition-colors py-1"
                >
                  Injetar {activeFields.size} campo(s) no briefing
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
