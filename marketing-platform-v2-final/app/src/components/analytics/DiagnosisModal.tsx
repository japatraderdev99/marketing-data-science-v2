import { useState } from 'react';
import { X, Sparkles, Loader2, Clock, RefreshCw, DollarSign, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAnalyticsDiagnosis, type KpiSnapshot } from '@/features/analytics/hooks/useAnalyticsDiagnosis';

function renderMarkdown(text: string): React.ReactNode[] {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## ')) {
      return <h3 key={i} className="text-sm font-black text-text-primary mt-4 mb-1.5 uppercase tracking-wide">{line.replace('## ', '')}</h3>;
    }
    if (line.startsWith('### ')) {
      return <h4 key={i} className="text-xs font-bold text-brand mt-2 mb-1">{line.replace('### ', '')}</h4>;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return <p key={i} className="text-xs text-text-primary/85 pl-3 border-l border-brand/25 mb-0.5">{line.replace(/^[-*] /, '')}</p>;
    }
    if (line.startsWith('**') && line.endsWith('**')) {
      return <p key={i} className="text-xs font-bold text-text-primary mb-0.5">{line.replace(/\*\*/g, '')}</p>;
    }
    if (line.trim() === '') return <div key={i} className="h-1.5" />;
    return <p key={i} className="text-xs text-text-primary/75 leading-relaxed mb-0.5">{line}</p>;
  });
}

function KpiBar({ snapshot }: { snapshot: KpiSnapshot }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
      {[
        { icon: DollarSign, label: 'Invest. Total', value: `R$${(snapshot.totalInvest).toFixed(0)}`, color: 'text-brand' },
        { icon: TrendingUp, label: 'Conversões', value: String(snapshot.totalConversions), color: 'text-emerald-400' },
        { icon: Users, label: 'Sessões GA4', value: snapshot.totalSessions.toLocaleString(), color: 'text-blue-400' },
        { icon: TrendingUp, label: 'CTR Médio', value: `${(snapshot.avgCtrMeta * 100).toFixed(2)}%`, color: 'text-amber-400' },
      ].map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="rounded-lg border border-border bg-surface-hover p-2.5 text-center">
          <Icon className={cn('w-3.5 h-3.5 mx-auto mb-1', color)} />
          <p className={cn('font-black text-sm font-mono', color)}>{value}</p>
          <p className="text-[9px] text-text-muted uppercase tracking-wide">{label}</p>
        </div>
      ))}
    </div>
  );
}

interface Props {
  onClose: () => void;
  period: string;
}

export default function DiagnosisModal({ onClose, period }: Props) {
  const [activePeriod, setActivePeriod] = useState(period);
  const { diagnosis, kpiSnapshot, loading, cachedAt, fromCache, error, runDiagnosis } = useAnalyticsDiagnosis();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl border border-border bg-surface-elevated flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-brand/15 p-1.5 border border-brand/20">
              <Sparkles className="w-4 h-4 text-brand" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">Diagnóstico CMO com IA</p>
              <p className="text-[10px] text-text-muted">Análise estratégica dos seus dados de performance</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls */}
        <div className="px-5 py-3 border-b border-border flex items-center gap-3 shrink-0">
          <div className="flex gap-1">
            {(['7d', '30d', '90d'] as const).map(p => (
              <button
                key={p}
                onClick={() => setActivePeriod(p)}
                className={cn('px-3 py-1 rounded text-[11px] font-bold transition-colors', activePeriod === p ? 'bg-brand text-white' : 'bg-surface-hover text-text-muted hover:text-text-primary')}
              >
                {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'}
              </button>
            ))}
          </div>
          <button
            onClick={() => runDiagnosis(activePeriod)}
            disabled={loading}
            className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand text-white text-xs font-bold disabled:opacity-50"
          >
            {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analisando...</> : <><Sparkles className="w-3.5 h-3.5" /> Gerar Diagnóstico</>}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!diagnosis && !loading && (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
              <Sparkles className="w-10 h-10 text-text-muted" />
              <p className="text-sm text-text-secondary font-semibold">Diagnóstico não gerado</p>
              <p className="text-xs text-text-muted max-w-xs">Clique em "Gerar Diagnóstico" para analisar seus dados de Meta Ads, GA4, Google Ads e Operacional com IA.</p>
              <p className="text-[10px] text-text-muted/60">Resultado fica em cache por 6 horas — zero custo extra em consultas repetidas</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-xs text-red-400 mb-4">{error}</div>
          )}

          {kpiSnapshot && <KpiBar snapshot={kpiSnapshot} />}

          {cachedAt && (
            <div className="flex items-center gap-1.5 mb-3">
              {fromCache
                ? <><Clock className="w-3 h-3 text-text-muted" /><span className="text-[10px] text-text-muted">Cache · {new Date(cachedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></>
                : <><RefreshCw className="w-3 h-3 text-emerald-400" /><span className="text-[10px] text-emerald-400">Gerado agora</span></>
              }
            </div>
          )}

          {diagnosis && (
            <div className="space-y-0">
              {renderMarkdown(diagnosis)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
