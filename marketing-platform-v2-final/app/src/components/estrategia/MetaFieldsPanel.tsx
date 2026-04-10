import { Brain, RefreshCw, BookMarked, Copy, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MetaFields } from '@/features/estrategia/useStrategyData';

function MetaTag({ label, value }: { label: string; value: string }) {
  const copy = () => navigator.clipboard.writeText(value).catch(() => {});
  return (
    <div
      onClick={copy}
      className="rounded-lg border border-border/60 bg-surface-hover px-3 py-2.5 group cursor-pointer hover:bg-surface-active transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-0.5">{label}</p>
          <p className="text-xs text-text-primary leading-relaxed">{value || '—'}</p>
        </div>
        <Copy className="h-3 w-3 text-text-muted group-hover:text-brand shrink-0 mt-0.5 transition-colors" />
      </div>
    </div>
  );
}

function TagList({ label, items }: { label: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={i} className="rounded-full border border-border/50 bg-surface-hover px-2.5 py-1 text-[11px] text-text-primary/80">{item}</span>
        ))}
      </div>
    </div>
  );
}

interface Props {
  metafields: MetaFields | null;
  extracting: boolean;
  filling: boolean;
  onExtract: () => Promise<void>;
  onFillFromKb: () => Promise<void>;
  kbDoneCount: number;
}

export default function MetaFieldsPanel({ metafields: m, extracting, filling, onExtract, onFillFromKb, kbDoneCount }: Props) {
  const score = m?.completenessScore ?? 0;
  const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-text-muted';
  const barColor = score >= 80 ? 'bg-emerald-400' : score >= 50 ? 'bg-amber-400' : 'bg-surface-active';

  return (
    <div className="space-y-5">
      {/* Extract button */}
      <button
        onClick={onExtract}
        disabled={extracting}
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-brand/30 bg-brand/5 px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand/10 transition-colors disabled:opacity-50"
      >
        {extracting ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Extraindo meta-fields com IA...</>
        ) : m ? (
          <><RefreshCw className="h-4 w-4" /> Regenerar meta-fields da IA</>
        ) : (
          <><Brain className="h-4 w-4" /> Extrair meta-fields com IA</>
        )}
      </button>

      {!m && !extracting && (
        <div className="rounded-xl border border-border/50 bg-surface-elevated/60 p-6 text-center space-y-2">
          <Brain className="h-8 w-8 text-text-muted mx-auto" />
          <p className="text-sm font-semibold text-text-secondary">Meta-Fields não extraídos</p>
          <p className="text-[11px] text-text-muted max-w-xs mx-auto">
            Preencha o playbook ou envie documentos ao Knowledge Base, depois clique em "Extrair meta-fields" para gerar os campos que alimentam todas as ferramentas de IA.
          </p>
        </div>
      )}

      {m && (
        <div className="rounded-xl border border-brand/20 bg-gradient-to-br from-brand/5 to-transparent p-5 space-y-5">
          {/* Header + score */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-brand/15 p-1.5 border border-brand/20">
                <Brain className="h-4 w-4 text-brand" />
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary">Meta-Fields Extraídos pela IA</p>
                <p className="text-[11px] text-text-muted">Alimentam campanhas, copies e carrosséis automaticamente</p>
              </div>
            </div>
            <span className={cn('text-lg font-black font-mono', scoreColor)}>{score}%</span>
          </div>

          {/* Fill from KB */}
          <button
            onClick={onFillFromKb}
            disabled={filling || kbDoneCount === 0}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-teal/30 bg-teal/5 px-4 py-2.5 text-sm font-semibold text-teal hover:bg-teal/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {filling ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Enriquecendo com Knowledge Base...</>
            ) : (
              <><BookMarked className="h-4 w-4" /> Preencher campos faltantes com Knowledge Base</>
            )}
          </button>

          <div className="h-1.5 w-full rounded-full bg-surface-hover overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${score}%` }} />
          </div>

          {/* Missing critical */}
          {m.missingCritical?.length > 0 && (
            <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2">
              <p className="text-[10px] font-bold text-amber-400 mb-1">⚠ Campos críticos faltantes</p>
              <div className="flex flex-wrap gap-1">
                {m.missingCritical.map((f, i) => (
                  <span key={i} className="text-[10px] bg-amber-400/15 text-amber-300 px-2 py-0.5 rounded-full">{f}</span>
                ))}
              </div>
            </div>
          )}

          {/* System Prompt */}
          {m.promptContext && (
            <div className="rounded-lg border border-brand/15 bg-brand/5 p-3 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand/70">🎯 SYSTEM PROMPT DA MARCA</p>
              <p className="text-xs text-text-primary/90 leading-relaxed">{m.promptContext}</p>
            </div>
          )}

          {/* Meta Tags Grid */}
          <div className="grid grid-cols-2 gap-3">
            <MetaTag label="ESSÊNCIA DA MARCA" value={m.brandEssence} />
            <MetaTag label="PROPOSTA DE VALOR ÚNICA" value={m.uniqueValueProp} />
            <MetaTag label="PERSONA" value={m.targetPersona?.profile ?? ''} />
            <MetaTag label="MAIOR DOR" value={m.targetPersona?.biggestPain ?? ''} />
            <MetaTag label="SONHO DO PÚBLICO" value={m.targetPersona?.dream ?? ''} />
            <MetaTag label="FOCO ATUAL DE CAMPANHA" value={m.currentCampaignFocus} />
          </div>

          <TagList label="Dores Mapeadas" items={m.painPoints} />
          <TagList label="Vantagens Competitivas" items={m.competitiveEdge} />
          <TagList label="KPIs Prioritários" items={m.kpiPriorities} />
          <TagList label="Ângulos de Conteúdo" items={m.contentAngles} />

          {/* Tone Rules */}
          {(m.toneRules?.use?.length || m.toneRules?.avoid?.length) ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/70 mb-1.5">✅ TOM — PODE USAR</p>
                <div className="space-y-1">
                  {(m.toneRules?.use ?? []).map((r, i) => (
                    <p key={i} className="text-[11px] text-text-primary/75 pl-2 border-l border-emerald-400/30">{r}</p>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-400/70 mb-1.5">❌ TOM — PROIBIDO</p>
                <div className="space-y-1">
                  {(m.toneRules?.avoid ?? []).map((r, i) => (
                    <p key={i} className="text-[11px] text-text-primary/75 pl-2 border-l border-red-400/30">{r}</p>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <TagList label="TÓPICOS PROIBIDOS" items={m.forbiddenTopics} />
        </div>
      )}
    </div>
  );
}
