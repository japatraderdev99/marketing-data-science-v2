import { Target, Megaphone, Search, Globe, DollarSign, Users, Briefcase, TrendingUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMetaAdsKPIs } from '@/features/analytics/hooks/useMetaAds';
import { useGA4KPIs } from '@/features/analytics/hooks/useGA4';
import { useGoogleAdsKPIs } from '@/features/analytics/hooks/useGoogleAds';
import { useOperationalSummary } from '@/features/analytics/hooks/useOperational';

/* ── Funnel Stage Colors ── */
const META_COLORS = ['#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#1E3A8A'];
const GOOGLE_COLORS = ['#22C55E', '#16A34A', '#15803D', '#166534', '#14532D'];
const ORGANIC_COLORS = ['#A855F7', '#9333EA', '#7E22CE', '#6B21A8', '#581C87'];

function Funnel3DStage({ width, color, label, value, y }: {
  width: number; color: string; label: string; value: string; y: number;
}) {
  const x = (200 - width) / 2;
  return (
    <g>
      <rect x={x} y={y} width={width} height={32} rx={4} fill={color} opacity={0.9} />
      <rect x={x} y={y + 28} width={width} height={6} rx={2} fill={color} opacity={0.5} />
      <text x={100} y={y + 14} textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">{label}</text>
      <text x={100} y={y + 24} textAnchor="middle" fill="white" fontSize="10" fontWeight="900">{value}</text>
    </g>
  );
}

interface ChannelData {
  name: string;
  icon: typeof Megaphone;
  colors: string[];
  spend: string;
  stages: { label: string; value: string }[];
  metrics: { label: string; value: string }[];
  rates: { label: string; value: string; good: boolean }[];
}

function ChannelFunnelCard({ data }: { data: ChannelData }) {
  const { name, icon: Icon, colors, spend, stages, metrics, rates } = data;
  const widths = [180, 150, 120, 90, 70];

  return (
    <div className="p-5 rounded-xl border border-border bg-surface-elevated">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-text-primary" />
          <span className="font-heading font-bold text-sm text-text-primary">{name}</span>
        </div>
        {spend && <span className="text-xs font-bold text-text-muted">{spend}</span>}
      </div>
      <svg viewBox="0 0 200 200" className="w-full h-[200px] mb-4">
        {stages.map((stage, i) => (
          <Funnel3DStage key={stage.label} width={widths[i]} color={colors[i]} label={stage.label} value={stage.value} y={i * 38 + 5} />
        ))}
      </svg>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {metrics.map(({ label, value }) => (
          <div key={label} className="p-2 rounded-lg bg-surface-hover text-center">
            <p className="text-[9px] text-text-muted uppercase">{label}</p>
            <p className="font-heading font-black text-sm text-text-primary">{value}</p>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {rates.map(({ label, value, good }) => (
          <div key={label} className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className={cn('w-1.5 h-1.5 rounded-full', good ? 'bg-emerald-400' : 'bg-warning')} />
              <span className="text-text-secondary">{label}</span>
            </span>
            <span className={cn('font-bold', good ? 'text-emerald-400' : 'text-warning')}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmtK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function pct(num: number, den: number) {
  if (den === 0) return '0.0%';
  return ((num / den) * 100).toFixed(1) + '%';
}

export default function FunilE2ETab({ period = '30d' }: { period?: string }) {
  const { data: meta, isLoading: lm } = useMetaAdsKPIs(period);
  const { data: ga4, isLoading: lg } = useGA4KPIs(period);
  const { data: gads, isLoading: lga } = useGoogleAdsKPIs(period);
  const { data: ops, isLoading: lo } = useOperationalSummary(period);

  const m = meta ?? { impressions: 0, clicks: 0, spend: 0, conversions: 0, ctr: 0, cpc: 0 };
  const g = ga4 ?? { sessions: 0, users: 0, bounceRate: 0, conversions: 0, avgDuration: '0m', totalRows: 0 };
  const ga = gads ?? { impressions: 0, clicks: 0, cost: 0, conversions: 0, ctr: 0, cpc: 0 };
  const o = ops ?? { clients: 0, clientsTotal: 0, providers: 0, providersPct: '0%', bookings: 0, completed: 0, gmv: 0, revenue: 0, rating: 0, reviews: 0 };

  const isLoading = lm || lg || lga || lo;

  const metaSessions = Math.round(m.clicks * 0.85);
  const metaCadastros = Math.round(m.conversions * 0.69);
  const metaCac = m.conversions > 0 ? m.spend / m.conversions : 0;

  const channels: ChannelData[] = [
    {
      name: 'Meta Ads', icon: Megaphone, colors: META_COLORS, spend: m.spend > 0 ? `R$${fmtK(m.spend)}` : 'R$0',
      stages: [
        { label: 'Impressões', value: fmtK(m.impressions) },
        { label: 'Cliques', value: fmtK(m.clicks) },
        { label: 'Sessões (est.)', value: fmtK(metaSessions) },
        { label: 'Conversões', value: String(m.conversions) },
        { label: 'Cadastros (est.)', value: String(metaCadastros) },
      ],
      metrics: [
        { label: 'CTR', value: `${m.ctr.toFixed(2)}%` },
        { label: 'CPC', value: m.cpc > 0 ? `R$${m.cpc.toFixed(2)}` : '—' },
        { label: 'CONVERSÕES', value: String(m.conversions) },
        { label: 'CAC', value: metaCac > 0 ? `R$${metaCac.toFixed(2)}` : '—' },
      ],
      rates: [
        { label: 'Impressões → Cliques', value: pct(m.clicks, m.impressions), good: m.ctr > 1.5 },
        { label: 'Cliques → Sessões (est.)', value: '85.0%', good: true },
        { label: 'Sessões → Conversões', value: pct(m.conversions, metaSessions), good: m.conversions / Math.max(metaSessions, 1) > 0.02 },
        { label: 'Conversões → Cadastros', value: '69.0%', good: true },
      ],
    },
    {
      name: 'Google Ads', icon: Search, colors: GOOGLE_COLORS, spend: ga.cost > 0 ? `R$${fmtK(ga.cost)}` : 'R$0',
      stages: [
        { label: 'Impressões', value: fmtK(ga.impressions) },
        { label: 'Cliques', value: fmtK(ga.clicks) },
        { label: 'Sessões (est.)', value: fmtK(Math.round(ga.clicks * 0.85)) },
        { label: 'Conversões', value: String(Math.round(ga.conversions)) },
        { label: 'Cadastros', value: '0' },
      ],
      metrics: [
        { label: 'CTR', value: ga.ctr > 0 ? `${ga.ctr.toFixed(2)}%` : '—' },
        { label: 'CPC', value: ga.cpc > 0 ? `R$${ga.cpc.toFixed(2)}` : '—' },
        { label: 'CLIQUES', value: String(ga.clicks) },
        { label: 'CONVERSÕES', value: String(Math.round(ga.conversions)) },
      ],
      rates: [
        { label: 'Impressões → Cliques', value: pct(ga.clicks, ga.impressions), good: ga.ctr > 1.5 },
        { label: 'Cliques → Sessões (est.)', value: ga.clicks > 0 ? '85.0%' : '0.0%', good: ga.clicks > 0 },
        { label: 'Sessões → Conversões', value: pct(ga.conversions, Math.max(ga.clicks * 0.85, 1)), good: false },
      ],
    },
    {
      name: 'Orgânico (GA4)', icon: Globe, colors: ORGANIC_COLORS, spend: '',
      stages: [
        { label: 'Visitantes', value: fmtK(g.users) },
        { label: 'Sessões', value: fmtK(g.sessions) },
        { label: 'Cadastros (est.)', value: fmtK(Math.round(g.users * 0.05)) },
        { label: 'Oportunidades', value: fmtK(Math.round(g.users * 0.02)) },
      ],
      metrics: [
        { label: 'VISITANTES', value: fmtK(g.users) },
        { label: 'SESSÕES', value: fmtK(g.sessions) },
        { label: 'SESS/USER', value: g.users > 0 ? (g.sessions / g.users).toFixed(1) : '—' },
        { label: 'CONV. EST.', value: fmtK(Math.round(g.users * 0.02)) },
      ],
      rates: [
        { label: 'Visitantes → Sessões', value: g.users > 0 ? pct(g.sessions, g.users) : '0.0%', good: g.sessions > g.users },
        { label: 'Sessões → Cadastros (est.)', value: '5.0%', good: true },
        { label: 'Cadastros → Oportunidades', value: '39.8%', good: true },
      ],
    },
  ];

  const totalInvestment = m.spend + ga.cost;
  const totalCadastros = o.clientsTotal || o.clients;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-brand" />
          <span className="font-heading font-black text-base text-text-primary">Funil por Canal</span>
          {isLoading && <Loader2 className="w-4 h-4 text-brand animate-spin ml-2" />}
        </div>
        <span className="text-xs text-text-muted">
          {m.clicks > 0 || ga.clicks > 0 ? `${fmtK(m.clicks + ga.clicks)} cliques ads` : ''}
          {g.sessions > 0 ? ` · ${fmtK(g.sessions)} sessões GA4` : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {channels.map((ch) => <ChannelFunnelCard key={ch.name} data={ch} />)}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { icon: DollarSign, label: 'INVESTIMENTO', value: totalInvestment > 0 ? `R$${fmtK(totalInvestment)}` : 'R$0', sub: 'Meta + Google' },
          { icon: Users, label: 'CADASTROS', value: String(totalCadastros), sub: 'Firestore real' },
          { icon: Briefcase, label: 'SERVIÇOS', value: String(o.completed), sub: 'Concluídos' },
          { icon: TrendingUp, label: 'GMV REAL', value: `R$${o.gmv.toFixed(1)}`, sub: o.bookings > 0 ? `Ticket: R$${(o.gmv / o.bookings).toFixed(2)}` : '', accent: true },
          { icon: DollarSign, label: 'RECEITA PLAT.', value: `R$${o.revenue.toFixed(2)}`, sub: o.gmv > 0 ? `${((o.revenue / o.gmv) * 100).toFixed(1)}% do GMV` : '', accent: true },
        ].map(({ icon: Icon, label, value, sub, accent }) => (
          <div key={label} className="p-4 rounded-xl border border-border bg-surface-elevated text-center">
            <Icon className="w-5 h-5 text-text-muted mx-auto mb-2" />
            <p className="text-[9px] font-bold text-text-muted uppercase">{label}</p>
            <p className={cn('font-heading font-black text-lg', accent ? 'text-emerald-400' : 'text-text-primary')}>{value}</p>
            <p className="text-[10px] text-text-muted">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
