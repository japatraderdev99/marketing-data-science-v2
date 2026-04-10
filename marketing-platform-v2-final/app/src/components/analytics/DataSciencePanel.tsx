import { FlaskConical, Loader2, RefreshCw, TrendingUp, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useContentInsights, getInsightMeta, type ContentInsight } from '@/features/analytics/hooks/useContentInsights';

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? 'bg-emerald-400' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400/60';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-surface-active overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] text-text-muted font-mono w-7 text-right">{pct}%</span>
    </div>
  );
}

function PatternCard({ insight }: { insight: ContentInsight }) {
  const meta = getInsightMeta(insight.insight_type);
  const patternKeys = Object.entries(insight.pattern_data ?? {}).slice(0, 3);

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{meta.emoji}</span>
          <div>
            <p className={cn('text-xs font-bold', meta.color)}>{meta.label}</p>
            <p className="text-[10px] text-text-muted">
              {insight.total_occurrences > 0 ? `${insight.total_occurrences} ocorrências` : 'Padrão identificado'}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          {insight.avg_engagement_rate > 0 && (
            <p className="text-xs font-black text-emerald-400">{(insight.avg_engagement_rate * 100).toFixed(1)}%</p>
          )}
          {insight.avg_reach > 0 && (
            <p className="text-[10px] text-text-muted">{insight.avg_reach.toLocaleString()} alcance</p>
          )}
        </div>
      </div>

      <ConfidenceBar score={insight.confidence_score} />

      {patternKeys.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {patternKeys.map(([k, v]) => (
            <span key={k} className="text-[10px] bg-surface-hover border border-border/50 px-2 py-0.5 rounded-full text-text-secondary">
              {String(k)}: <strong>{String(v)}</strong>
            </span>
          ))}
        </div>
      )}

      {insight.ai_recommendation && (
        <div className="rounded-lg bg-brand/5 border border-brand/15 px-3 py-2">
          <p className="text-[11px] text-text-primary/85 leading-relaxed">
            <TrendingUp className="w-3 h-3 inline mr-1 text-brand" />
            {insight.ai_recommendation}
          </p>
        </div>
      )}
    </div>
  );
}

export default function DataSciencePanel() {
  const { data: insights, isLoading, analyzing, runAnalysis, error } = useContentInsights();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-400/10 p-1.5 border border-purple-400/20">
            <FlaskConical className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">Data Science — Padrões de Conteúdo</p>
            <p className="text-[11px] text-text-muted">
              IA analisa posts orgânicos e anúncios para identificar o que mais performa
            </p>
          </div>
        </div>
        <button
          onClick={runAnalysis}
          disabled={analyzing || isLoading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-400/10 border border-purple-400/20 text-purple-400 text-xs font-bold hover:bg-purple-400/15 transition-colors disabled:opacity-50"
        >
          {analyzing
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analisando padrões...</>
            : <><RefreshCw className="w-3.5 h-3.5" /> {insights?.length ? 'Reanalisar' : 'Analisar padrões'}</>}
        </button>
      </div>

      {/* Tip */}
      <div className="flex items-start gap-2 rounded-lg bg-purple-400/5 border border-purple-400/15 px-3 py-2.5">
        <span className="text-purple-400 text-xs shrink-0 mt-0.5">💡</span>
        <p className="text-[11px] text-text-muted leading-relaxed">
          O pipeline analisa seus <strong>posts do Instagram</strong> e <strong>anúncios do Meta</strong> dos últimos 90 dias.
          Os insights gerados ficam disponíveis em todas as ferramentas criativas como contexto de IA.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-400">{error.message}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-text-muted animate-spin" />
        </div>
      ) : !insights?.length ? (
        <div className="rounded-xl border border-border bg-surface-elevated p-12 text-center space-y-3">
          <FlaskConical className="w-10 h-10 text-text-muted mx-auto" />
          <p className="text-sm font-semibold text-text-secondary">Nenhum padrão analisado ainda</p>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            Clique em "Analisar padrões" para rodar o pipeline de Data Science.
            Você precisa ter dados de Instagram ou Meta Ads sincronizados.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-muted">{insights.length} padrões identificados</span>
            {insights[0]?.analyzed_at && (
              <span className="text-[10px] text-text-muted/60">
                · Atualizado {new Date(insights[0].analyzed_at).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {insights.map(insight => (
              <PatternCard key={insight.id} insight={insight} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
