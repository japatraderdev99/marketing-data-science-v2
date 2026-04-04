import {
  Eye, TrendingUp, Target as TargetIcon, DollarSign, BarChart3,
  ArrowUpRight, Zap, Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Health Score Gauge ─────────────────────────────────────────────────────

function HealthGauge({ score }: { score: number }) {
  const color = score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-red-400';
  const label = score >= 70 ? 'SAUDÁVEL' : score >= 40 ? 'ATENÇÃO' : 'CRÍTICO';
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r="45" fill="none" stroke="#2A2A2E" strokeWidth="8" />
        <circle
          cx="60" cy="60" r="45" fill="none"
          stroke="currentColor"
          strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={color}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn('font-heading font-black text-3xl', color)}>{score}</span>
        <span className={cn('text-[10px] font-bold uppercase tracking-wider', color)}>{label}</span>
      </div>
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KPICard({ icon: Icon, value, sub, trend, trendColor }: {
  icon: typeof Eye;
  value: string;
  sub: string;
  trend?: string;
  trendColor?: string;
}) {
  return (
    <div className="p-4 rounded-xl border border-border bg-surface-elevated">
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5 text-brand" />
        {trend && (
          <span className={cn('text-[10px] font-bold flex items-center gap-0.5', trendColor || 'text-emerald-400')}>
            <ArrowUpRight className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>
      <p className="font-heading font-black text-2xl text-text-primary">{value}</p>
      <p className="text-[11px] text-text-muted">{sub}</p>
    </div>
  );
}

// ─── Metric Card ────────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof Eye;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="p-4 rounded-xl border border-border bg-surface-elevated">
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5 text-text-muted" />
        <span className={cn('text-[10px] font-bold flex items-center gap-0.5', color)}>
          <ArrowUpRight className="w-3 h-3" />{sub}
        </span>
      </div>
      <p className="font-heading font-black text-2xl text-text-primary">{value}</p>
      <p className="text-[11px] text-text-muted">{label}</p>
    </div>
  );
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export default function Dashboard() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-black text-xl uppercase text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary">Visão geral da operação de marketing</p>
        </div>
        <p className="text-xs text-text-muted">Pré-inauguração · 15/03/2026</p>
        <div className="flex gap-2">
          {['7 dias', '30 dias', '90 dias'].map((period, i) => (
            <button
              key={period}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors',
                i === 1 ? 'bg-brand text-white' : 'bg-surface-elevated text-text-secondary hover:text-text-primary',
              )}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Top row: Health Score + KPIs */}
      <div className="grid grid-cols-7 gap-3">
        <div className="col-span-2 p-4 rounded-xl border border-border bg-surface-elevated">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-brand" />
            <span className="text-xs font-bold text-text-primary uppercase">Health Score</span>
          </div>
          <HealthGauge score={20} />
          <div className="mt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-text-secondary">
              <span>Campanhas ativas</span><span className="text-text-primary">0/0</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>ROAS médio</span><span className="text-text-primary">0.0x</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Urgências</span><span className="text-brand">0</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Tasks atrasadas</span><span className="text-brand">4</span>
            </div>
          </div>
        </div>

        <KPICard icon={Eye} value="0k" sub="Impressões Totais" trend="+22% mês" />
        <KPICard icon={TrendingUp} value="0" sub="Leads Gerados" trend="+18% semana" />
        <KPICard icon={TargetIcon} value="0" sub="Conversões" trend="+12% mês" />
        <KPICard icon={DollarSign} value="R$0.0k" sub="Budget Investido" trendColor="text-brand" trend="NaN% alocado" />
        <KPICard icon={BarChart3} value="0.0x" sub="ROAS Médio" trendColor="text-emerald-400" trend="Acima da meta" />
      </div>

      {/* Second row: Operational metrics */}
      <div className="grid grid-cols-5 gap-3">
        <MetricCard icon={Zap} label="Prestadores Ativos" value="470" sub="+34 esta semana" color="text-emerald-400" />
        <MetricCard icon={Eye} label="Clientes Ativos" value="1.450" sub="+112 esta semana" color="text-emerald-400" />
        <MetricCard icon={BarChart3} label="GMV Acumulado" value="R$62k" sub="+18% mês" color="text-emerald-400" />
        <MetricCard icon={DollarSign} label="CAC Médio" value="R$40.50" sub="-12% vs mês ant." color="text-brand" />
        <MetricCard icon={Megaphone} label="Campanhas Ativas" value="0" sub="+2 esta semana" color="text-text-muted" />
      </div>

      {/* Third row: Chart + Funnel */}
      <div className="grid grid-cols-3 gap-3">
        {/* Revenue Chart */}
        <div className="col-span-2 p-5 rounded-xl border border-border bg-surface-elevated">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-brand" />
              <span className="text-sm font-bold text-text-primary">Receita vs Meta — Últimos 6 Meses</span>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-text-muted">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand" />Receita</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />Meta</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />Custo</span>
            </div>
          </div>
          <div className="h-44 flex items-end gap-1.5">
            {[35, 45, 50, 60, 72, 81].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t bg-brand/80 transition-all" style={{ height: `${v * 2}px` }} />
                <span className="text-[9px] text-text-muted">{['Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev'][i]}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-xs text-text-muted">Receita Fev</p>
              <p className="font-heading font-black text-lg text-text-primary">R$81k</p>
              <p className="text-[10px] text-emerald-400">+19% vs mês ant.</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-muted">Margem Bruta</p>
              <p className="font-heading font-black text-lg text-text-primary">61.7%</p>
              <p className="text-[10px] text-emerald-400">+4pp vs mês ant.</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-muted">CAC Médio</p>
              <p className="font-heading font-black text-lg text-text-primary">R$40.50</p>
              <p className="text-[10px] text-brand">-12% vs mês ant.</p>
            </div>
          </div>
        </div>

        {/* Funnel */}
        <div className="p-5 rounded-xl border border-border bg-surface-elevated">
          <span className="text-sm font-bold text-text-primary">Funis de Conversão</span>
          <div className="flex gap-2 mt-3 mb-4">
            <button className="px-3 py-1 rounded text-[11px] font-bold bg-brand/15 text-brand">Clientes</button>
            <button className="px-3 py-1 rounded text-[11px] font-bold text-text-muted hover:text-text-secondary">Prestadores</button>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Visitantes', value: '15.420', pct: '100%', color: 'bg-emerald-400' },
              { label: 'Cadastros', value: '3.855', pct: '25%', color: 'bg-emerald-500' },
              { label: 'Busca Serviço', value: '2.313', pct: '60%', color: 'bg-teal-500' },
              { label: 'Solicitação', value: '925', pct: '40%', color: 'bg-blue-500' },
              { label: 'Contratação', value: '463', pct: '50%', color: 'bg-indigo-500' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', item.color)} />
                  <span className="text-xs text-text-secondary">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-text-primary">{item.value}</span>
                  <span className="text-[10px] text-text-muted w-10 text-right">{item.pct}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-border">
            <span className="text-[10px] font-bold text-text-muted uppercase">Mix de Canais</span>
            <div className="mt-2 space-y-1">
              {[
                { label: 'Instagram', pct: '38%', color: 'bg-brand' },
                { label: 'TikTok', pct: '28%', color: 'bg-teal-400' },
                { label: 'Meta Ads', pct: '22%', color: 'bg-blue-400' },
                { label: 'LinkedIn', pct: '12%', color: 'bg-indigo-400' },
              ].map((ch) => (
                <div key={ch.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', ch.color)} />
                    <span className="text-[11px] text-text-secondary">{ch.label}</span>
                  </div>
                  <span className="text-[11px] font-bold text-text-primary">{ch.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
