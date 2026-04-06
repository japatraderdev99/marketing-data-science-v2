import { useState, useCallback } from 'react';
import {
  Target, TrendingUp, Users, AlertTriangle, Megaphone,
  BookOpen, Shield, Zap, ChevronDown, ChevronUp, Info, Check, Pencil, Save,
} from 'lucide-react';
import { usePlaybook, useSavePlaybook } from '@/hooks/useWorkspace';
import { cn } from '@/lib/utils';

interface SectionDef {
  key: string;
  label: string;
  icon: typeof Target;
  color: string;
  bgColor: string;
  description: string;
  weight: 'critical' | 'high' | 'medium';
  placeholder: string;
}

const SECTIONS: SectionDef[] = [
  { key: 'positioning', label: 'Posicionamento', icon: Target, color: 'text-orange-400', bgColor: 'bg-orange-400/10 border-orange-400/20', description: 'A âncora de tudo. Define como a marca ocupa espaço único na mente do cliente.', weight: 'critical', placeholder: 'Como sua marca se posiciona no mercado...' },
  { key: 'differentials', label: 'Diferenciais Competitivos', icon: TrendingUp, color: 'text-emerald-400', bgColor: 'bg-emerald-400/10 border-emerald-400/20', description: 'Diferenciais com números convertem. Adjetivos não.', weight: 'critical', placeholder: 'O que diferencia você dos concorrentes...' },
  { key: 'targetAudience', label: 'Público-Alvo', icon: Users, color: 'text-blue-400', bgColor: 'bg-blue-400/10 border-blue-400/20', description: 'Fale para uma pessoa, não para "todo mundo".', weight: 'critical', placeholder: 'Descreva seu público ideal...' },
  { key: 'pains', label: 'Dores e Frustrações', icon: AlertTriangle, color: 'text-red-400', bgColor: 'bg-red-400/10 border-red-400/20', description: 'Copie a voz do cliente. Quem escreve como o cliente, vende.', weight: 'high', placeholder: 'Quais são as maiores dores do seu público...' },
  { key: 'toneOfVoice', label: 'Tom de Voz', icon: Megaphone, color: 'text-purple-400', bgColor: 'bg-purple-400/10 border-purple-400/20', description: 'O tom que a IA deve imitar.', weight: 'high', placeholder: 'Como sua marca fala com o público...' },
  { key: 'competitors', label: 'Concorrentes', icon: BookOpen, color: 'text-yellow-400', bgColor: 'bg-yellow-400/10 border-yellow-400/20', description: 'Comparativos geram conteúdo viral.', weight: 'medium', placeholder: 'Liste seus principais concorrentes...' },
  { key: 'forbiddenTopics', label: 'Tópicos Proibidos', icon: Shield, color: 'text-rose-400', bgColor: 'bg-rose-400/10 border-rose-400/20', description: 'Limites claros evitam crises de comunicação.', weight: 'high', placeholder: 'O que a IA nunca deve dizer ou sugerir...' },
  { key: 'currentObjective', label: 'Objetivo Atual (30–90 dias)', icon: Zap, color: 'text-amber-400', bgColor: 'bg-amber-400/10 border-amber-400/20', description: 'O objetivo muda o tipo de conteúdo e o CTA.', weight: 'critical', placeholder: 'Qual o foco da comunicação agora...' },
  { key: 'kpis', label: 'KPIs e Metas', icon: TrendingUp, color: 'text-cyan-400', bgColor: 'bg-cyan-400/10 border-cyan-400/20', description: 'KPIs guiam o tipo de CTA e o ângulo do conteúdo.', weight: 'medium', placeholder: 'Metas numéricas de conteúdo e marketing...' },
];

const WEIGHT_LABELS: Record<string, { label: string; color: string }> = {
  critical: { label: 'Crítico', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  high: { label: 'Alto impacto', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  medium: { label: 'Importante', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
};

function SectionCard({ section, value, onSave }: { section: SectionDef; value: string; onSave: (val: string) => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const filled = value.length > 0;
  const Icon = section.icon;
  const weight = WEIGHT_LABELS[section.weight];

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  return (
    <div className={cn('rounded-xl border transition-all', filled ? 'border-border bg-surface-elevated' : 'border-border/50 bg-surface-elevated/60')}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', section.bgColor)}>
          <Icon className={cn('h-4 w-4', section.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-text-primary">{section.label}</span>
            <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px] font-bold', weight.color)}>{weight.label}</span>
            {filled && (
              <span className="rounded-full bg-brand/15 px-1.5 py-0.5 text-[9px] font-bold text-brand flex items-center gap-0.5">
                <Check className="h-2.5 w-2.5" /> Preenchido
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-text-muted">{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2.5">
          <div className="flex items-start gap-1.5 rounded-lg bg-surface-hover px-3 py-2">
            <Info className="h-3 w-3 text-text-muted shrink-0 mt-0.5" />
            <p className="text-[11px] text-text-muted leading-relaxed">{section.description}</p>
          </div>
          {editing ? (
            <div className="space-y-2">
              <textarea
                className="w-full bg-surface-hover border border-brand/30 rounded-lg px-3 py-3 text-sm text-text-primary placeholder:text-text-muted resize-none focus:border-brand outline-none"
                rows={4}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder={section.placeholder}
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white rounded-lg text-[11px] font-semibold">
                  <Save className="w-3 h-3" /> Salvar
                </button>
                <button onClick={() => { setEditing(false); setDraft(value); }} className="px-3 py-1.5 border border-border text-text-muted rounded-lg text-[11px]">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div
              className="rounded-lg bg-surface-hover border border-border/60 px-3 py-3 group cursor-pointer"
              onClick={() => { setEditing(true); setDraft(value); }}
            >
              {filled ? (
                <p className="text-sm text-text-primary leading-relaxed">{value}</p>
              ) : (
                <p className="text-sm text-text-muted italic">{section.placeholder}</p>
              )}
              <div className="flex justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-brand flex items-center gap-1"><Pencil className="w-2.5 h-2.5" /> Editar</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PlaybookSections() {
  const { data: playbook, isLoading } = usePlaybook('copy');
  const savePlaybook = useSavePlaybook();

  const knowledgeJson = (playbook?.knowledge_json ?? {}) as Record<string, string>;

  const getValue = (key: string) => knowledgeJson[key] || '';

  const handleSaveField = useCallback((key: string, value: string) => {
    const updated = { ...knowledgeJson, [key]: value };
    savePlaybook.mutate({ type: 'copy', knowledgeJson: updated });
  }, [knowledgeJson, savePlaybook]);

  const filledCount = SECTIONS.filter(s => getValue(s.key).length > 0).length;
  const criticalFilled = SECTIONS.filter(s => s.weight === 'critical' && getValue(s.key).length > 0).length;
  const totalCritical = SECTIONS.filter(s => s.weight === 'critical').length;

  if (isLoading) {
    return <div className="text-xs text-text-muted py-4 text-center">Carregando playbook...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-text-muted">
        Preenchimento do playbook
        <span className="float-right font-bold text-brand">{Math.round((filledCount / SECTIONS.length) * 100)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-hover overflow-hidden">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(filledCount / SECTIONS.length) * 100}%` }} />
      </div>
      <p className="text-[11px] text-text-muted">
        {filledCount} de {SECTIONS.length} seções preenchidas
        <span className="ml-4 text-emerald-400 font-bold">{criticalFilled}/{totalCritical} críticos {criticalFilled === totalCritical ? '✓' : ''}</span>
        {savePlaybook.isPending && <span className="ml-4 text-brand animate-pulse">Salvando...</span>}
      </p>

      <div className="space-y-2">
        {SECTIONS.map(section => (
          <SectionCard
            key={section.key}
            section={section}
            value={getValue(section.key)}
            onSave={(val) => handleSaveField(section.key, val)}
          />
        ))}
      </div>
    </div>
  );
}
