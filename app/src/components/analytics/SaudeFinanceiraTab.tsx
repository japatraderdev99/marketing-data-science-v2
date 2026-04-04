import {
  DollarSign, TrendingUp, CreditCard, Target, Repeat,
  Clock, BarChart3, PieChart as PieIcon, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';

/* ── Business Constants ── */
const TAKE_RATE_PROVIDER = 0.07;
const TAKE_RATE_USER = 0.07;
const PIX_FEE = 0.01;
const WITHDRAWAL_FEE = 0.0367;

/* ── Mock Data ── */
const MOCK = {
  gmv: 0, revenue: 0, mrr: 0, cac: 34.39, ltv: 0,
  ltvCacRatio: null as number | null,
  ticket: 0, margin: 0, churn: 5, payback: null as number | null,
};

const UNIT_ECON = [
  { name: 'Valor Serviço', value: 200, fill: '#808080' },
  { name: 'Taxa Provider 7%', value: -14, fill: '#EF4444' },
  { name: 'Taxa User 7%', value: -14, fill: '#F59E0B' },
  { name: 'Custo Pix 1%', value: -2, fill: '#3B82F6' },
  { name: 'Receita Líquida', value: 26, fill: '#22C55E' },
  { name: 'Taxa Saque 3.67%', value: -7.34, fill: '#6366F1' },
  { name: 'Receita Total', value: 33.34, fill: '#3B82F6' },
];

const REVENUE_PIE = [
  { name: 'Take Rate Provider', value: 7, fill: '#E8603C' },
  { name: 'Take Rate User', value: 7, fill: '#F59E0B' },
  { name: 'Taxa Saque', value: 3.67, fill: '#3B82F6' },
];

const CAC_DATA = [
  { channel: 'Meta Ads', investment: 893.73, conversions: 42, cac: 34.39 },
];

const MRR_DATA = [
  { month: 'Jan', mrr: 0, gmv: 0 },
  { month: 'Fev', mrr: 0, gmv: 100 },
  { month: 'Mar', mrr: 0, gmv: 291 },
];

function KpiCard({ icon: Icon, label, value, sub, accent }: {
  icon: typeof DollarSign; label: string; value: string; sub: string; accent?: boolean;
}) {
  return (
    <div className="p-4 rounded-xl border border-border bg-surface-elevated">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={cn('w-4 h-4', accent ? 'text-emerald-400' : 'text-brand')} />
        <span className="text-[10px] font-bold text-text-muted uppercase">{label}</span>
      </div>
      <p className={cn('font-heading font-black text-2xl', accent ? 'text-emerald-400' : 'text-text-primary')}>{value}</p>
      <p className="text-[11px] text-text-muted">{sub}</p>
    </div>
  );
}

export default function SaudeFinanceiraTab() {
  const m = MOCK;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-brand" />
        <span className="font-heading font-black text-base text-text-primary">Saúde Financeira</span>
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-hover text-text-secondary">Unit Economics</span>
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-6 gap-3">
        <KpiCard icon={DollarSign} label="GMV MENSAL" value={`R$${m.gmv.toFixed(2)}`} sub="0 serviços" />
        <KpiCard icon={TrendingUp} label="RECEITA TOTAL" value={`R$${m.revenue.toFixed(2)}`} sub="Take Rate + Subs" />
        <KpiCard icon={CreditCard} label="MRR ASSINATURAS" value={`R$${m.mrr.toFixed(2)}`} sub="0 assinantes" />
        <KpiCard icon={Target} label="CAC BLENDED" value={`R$${m.cac.toFixed(2)}`} sub="42 conv." />
        <KpiCard icon={TrendingUp} label="LTV" value={`R$${m.ltv.toFixed(2)}`} sub="12 meses ret." />
        <KpiCard icon={Sparkles} label="LTV:CAC" value={m.ltvCacRatio ? `${m.ltvCacRatio.toFixed(1)}x` : '—'} sub="Meta: > 3x" />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard icon={DollarSign} label="TICKET MÉDIO" value={`R$${m.ticket.toFixed(2)}`} sub="" />
        <KpiCard icon={Sparkles} label="MARGEM LÍQUIDA" value={`${m.margin.toFixed(1)}%`} sub="Take Rate + Saque - Pix" />
        <KpiCard icon={Repeat} label="CHURN RATE" value={`${m.churn}%`} sub="" />
        <KpiCard icon={Clock} label="PAYBACK" value={m.payback ? `${m.payback.toFixed(0)} meses` : '—'} sub="" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Unit Economics Waterfall */}
        <div className="p-5 rounded-xl border border-border bg-surface-elevated">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-text-muted" />
            <span className="font-bold text-sm text-text-primary">Unit Economics por Transação</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={UNIT_ECON} layout="vertical" margin={{ left: 100, right: 20 }}>
              <XAxis type="number" tick={{ fill: '#808080', fontSize: 10 }} domain={[-70, 210]} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#808080', fontSize: 10 }} width={90} />
              <Tooltip contentStyle={{ background: '#171717', border: '1px solid #262626', fontSize: 11 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {UNIT_ECON.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-text-muted mt-2 px-2">
            <strong>Receita por serviço:</strong> R$0.00 (0.0% do valor bruto)
          </p>
        </div>

        {/* Revenue Composition */}
        <div className="p-5 rounded-xl border border-border bg-surface-elevated">
          <div className="flex items-center gap-2 mb-4">
            <PieIcon className="w-4 h-4 text-text-muted" />
            <span className="font-bold text-sm text-text-primary">Composição da Receita</span>
          </div>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={REVENUE_PIE} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {REVENUE_PIE.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#171717', border: '1px solid #262626', fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {REVENUE_PIE.map((item) => (
              <span key={item.name} className="flex items-center gap-1.5 text-[10px] text-text-muted">
                <span className="w-2 h-2 rounded-full" style={{ background: item.fill }} />
                {item.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* CAC + MRR Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* CAC por Canal */}
        <div className="p-5 rounded-xl border border-border bg-surface-elevated">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-text-muted" />
            <span className="font-bold text-sm text-text-primary">CAC por Canal</span>
            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-brand/15 text-brand">Dados Reais</span>
          </div>
          {CAC_DATA.map((ch) => (
            <div key={ch.channel} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-bold text-text-primary">{ch.channel}</p>
                <p className="text-[10px] text-text-muted">Investimento: R${ch.investment.toFixed(2)} · Conversões: {ch.conversions}</p>
              </div>
              <span className="px-3 py-1 rounded-lg bg-brand/10 text-brand text-xs font-bold">
                CAC: R${ch.cac.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Projeção MRR + GMV */}
        <div className="p-5 rounded-xl border border-border bg-surface-elevated">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-text-muted" />
            <span className="font-bold text-sm text-text-primary">Projeção MRR + GMV</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={MRR_DATA}>
              <XAxis dataKey="month" tick={{ fill: '#808080', fontSize: 10 }} />
              <YAxis tick={{ fill: '#808080', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#171717', border: '1px solid #262626', fontSize: 11 }} />
              <Line type="monotone" dataKey="gmv" stroke="#E8603C" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="mrr" stroke="#00A7B5" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
