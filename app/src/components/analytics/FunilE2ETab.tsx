import { Target, Megaphone, Search, Globe, DollarSign, Users, Briefcase, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Funnel Stage Colors ── */
const META_COLORS = ['#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#1E3A8A'];
const GOOGLE_COLORS = ['#22C55E', '#16A34A', '#15803D', '#166534', '#14532D'];
const ORGANIC_COLORS = ['#A855F7', '#9333EA', '#7E22CE', '#6B21A8', '#581C87'];

/* ── 3D Funnel SVG ── */
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

/* ── Channel Funnel Card ── */
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

      {/* 3D Funnel */}
      <svg viewBox="0 0 200 200" className="w-full h-[200px] mb-4">
        {stages.map((stage, i) => (
          <Funnel3DStage
            key={stage.label}
            width={widths[i]}
            color={colors[i]}
            label={stage.label}
            value={stage.value}
            y={i * 38 + 5}
          />
        ))}
      </svg>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {metrics.map(({ label, value }) => (
          <div key={label} className="p-2 rounded-lg bg-surface-hover text-center">
            <p className="text-[9px] text-text-muted uppercase">{label}</p>
            <p className="font-heading font-black text-sm text-text-primary">{value}</p>
          </div>
        ))}
      </div>

      {/* Conversion Rates */}
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

/* ── Mock Data ── */
const CHANNELS: ChannelData[] = [
  {
    name: 'Meta Ads', icon: Megaphone, colors: META_COLORS, spend: 'R$1.4k',
    stages: [
      { label: 'Impressões', value: '224.8k' },
      { label: 'Cliques', value: '4.4k' },
      { label: 'Sessões (est.)', value: '3.7k' },
      { label: 'Conversões', value: '42' },
      { label: 'Cadastros (est.)', value: '29' },
    ],
    metrics: [
      { label: 'CTR', value: '1.95%' },
      { label: 'CPC', value: 'R$0.33' },
      { label: 'CONVERSÕES', value: '42' },
      { label: 'CAC', value: 'R$34.39' },
    ],
    rates: [
      { label: 'Impressões → Cliques', value: '2.0%', good: true },
      { label: 'Cliques → Sessões (est.)', value: '85.0%', good: true },
      { label: 'Sessões (est.) → Conversões', value: '1.1%', good: false },
      { label: 'Conversões → Cadastros (est.)', value: '69.0%', good: true },
    ],
  },
  {
    name: 'Google Ads', icon: Search, colors: GOOGLE_COLORS, spend: 'R$0',
    stages: [
      { label: 'Impressões', value: '0' },
      { label: 'Cliques', value: '0' },
      { label: 'Sessões (est.)', value: '0' },
      { label: 'Conversões', value: '0' },
      { label: 'Cadastros', value: '0' },
    ],
    metrics: [
      { label: 'CTR', value: '—' },
      { label: 'CPC', value: '—' },
      { label: 'CLIQUES', value: '0' },
      { label: 'CONVERSÕES', value: '0' },
    ],
    rates: [
      { label: 'Impressões → Cliques', value: '0.0%', good: false },
      { label: 'Cliques → Sessões (est.)', value: '0.0%', good: false },
      { label: 'Sessões (est.) → Conversões', value: '0.0%', good: false },
    ],
  },
  {
    name: 'Orgânico (GA4)', icon: Globe, colors: ORGANIC_COLORS, spend: '',
    stages: [
      { label: 'Visitantes', value: '1.3k' },
      { label: 'Sessões', value: '3.5k' },
      { label: 'Cadastros (est.)', value: '175' },
      { label: 'Oportunidades', value: '70' },
    ],
    metrics: [
      { label: 'VISITANTES', value: '1.3k' },
      { label: 'SESSÕES', value: '3.5k' },
      { label: 'SESS/USER', value: '2.7' },
      { label: 'CONV. EST.', value: '70' },
    ],
    rates: [
      { label: 'Visitantes → Sessões', value: '271.3%', good: true },
      { label: 'Sessões → Cadastros (est.)', value: '5.0%', good: true },
      { label: 'Cadastros (est.) → Oportunidades', value: '39.8%', good: true },
    ],
  },
];

export default function FunilE2ETab() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-brand" />
          <span className="font-heading font-black text-base text-text-primary">Funil por Canal</span>
        </div>
        <span className="text-xs text-text-muted">71 anúncios Meta · 3510 sessões GA4</span>
      </div>

      {/* 3 Funnels */}
      <div className="grid grid-cols-3 gap-3">
        {CHANNELS.map((ch) => (
          <ChannelFunnelCard key={ch.name} data={ch} />
        ))}
      </div>

      {/* Consolidation Cards */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { icon: DollarSign, label: 'INVESTIMENTO', value: 'R$1.4k', sub: 'Meta + Google' },
          { icon: Users, label: 'CADASTROS', value: '116', sub: 'Firestore real' },
          { icon: Briefcase, label: 'SERVIÇOS', value: '13', sub: 'Concluídos' },
          { icon: TrendingUp, label: 'GMV REAL', value: 'R$290.5', sub: 'Ticket: R$11.62', accent: true },
          { icon: DollarSign, label: 'RECEITA PLAT.', value: 'R$43.58', sub: '15.0% do GMV', accent: true },
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
