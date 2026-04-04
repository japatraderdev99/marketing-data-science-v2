import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  DollarSign, TrendingUp, Users, Target, Eye, MousePointerClick,
  UserPlus, Briefcase, AlertCircle, CheckCircle2, ShoppingBag, Globe,
  Megaphone, Search, Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── palette ─────────────────────────────────────────────── */
const CHANNEL_PALETTE: Record<string, { base: string; dark: string; rim: string }[]> = {
  meta: [
    { base: 'hsl(217, 91%, 55%)', dark: 'hsl(217, 91%, 35%)', rim: 'hsl(217, 91%, 65%)' },
    { base: 'hsl(217, 85%, 48%)', dark: 'hsl(217, 85%, 30%)', rim: 'hsl(217, 85%, 58%)' },
    { base: 'hsl(217, 80%, 42%)', dark: 'hsl(217, 80%, 26%)', rim: 'hsl(217, 80%, 52%)' },
    { base: 'hsl(217, 75%, 36%)', dark: 'hsl(217, 75%, 22%)', rim: 'hsl(217, 75%, 46%)' },
    { base: 'hsl(217, 70%, 30%)', dark: 'hsl(217, 70%, 18%)', rim: 'hsl(217, 70%, 40%)' },
  ],
  google: [
    { base: 'hsl(142, 71%, 50%)', dark: 'hsl(142, 71%, 30%)', rim: 'hsl(142, 71%, 60%)' },
    { base: 'hsl(142, 65%, 44%)', dark: 'hsl(142, 65%, 26%)', rim: 'hsl(142, 65%, 54%)' },
    { base: 'hsl(142, 60%, 38%)', dark: 'hsl(142, 60%, 22%)', rim: 'hsl(142, 60%, 48%)' },
    { base: 'hsl(142, 55%, 32%)', dark: 'hsl(142, 55%, 18%)', rim: 'hsl(142, 55%, 42%)' },
    { base: 'hsl(142, 50%, 26%)', dark: 'hsl(142, 50%, 14%)', rim: 'hsl(142, 50%, 36%)' },
  ],
  organic: [
    { base: 'hsl(262, 83%, 58%)', dark: 'hsl(262, 83%, 38%)', rim: 'hsl(262, 83%, 68%)' },
    { base: 'hsl(262, 78%, 52%)', dark: 'hsl(262, 78%, 34%)', rim: 'hsl(262, 78%, 62%)' },
    { base: 'hsl(262, 73%, 46%)', dark: 'hsl(262, 73%, 28%)', rim: 'hsl(262, 73%, 56%)' },
    { base: 'hsl(262, 68%, 40%)', dark: 'hsl(262, 68%, 24%)', rim: 'hsl(262, 68%, 50%)' },
    { base: 'hsl(262, 63%, 34%)', dark: 'hsl(262, 63%, 20%)', rim: 'hsl(262, 63%, 44%)' },
  ],
};

interface FunnelStageData { label: string; value: number; }

const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

/* ── 3D Funnel Stage ──────────────────────────────────────── */
function Funnel3DStage({ topWidth, bottomWidth, color, label, value, index, total }: {
  topWidth: number; bottomWidth: number;
  color: { base: string; dark: string; rim: string };
  label: string; value: number; index: number; total: number;
}) {
  const height = 52;
  const cx = 150;
  const halfTop = topWidth / 2;
  const halfBot = bottomWidth / 2;
  const rimH = 12;

  return (
    <g style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.2))' }}>
      <path d={`M${cx - halfTop},0 L${cx + halfTop},0 L${cx + halfBot},${height} L${cx - halfBot},${height} Z`} fill={color.base} />
      <path d={`M${cx - halfTop},0 L${cx},0 L${cx},${height} L${cx - halfBot},${height} Z`} fill={color.dark} opacity={0.4} />
      <ellipse cx={cx} cy={0} rx={halfTop} ry={rimH} fill={color.rim} opacity={0.7} />
      <ellipse cx={cx} cy={0} rx={halfTop * 0.75} ry={rimH * 0.6} fill={color.dark} opacity={0.5} />
      {index < total - 1 && <ellipse cx={cx} cy={height} rx={halfBot} ry={rimH * 0.7} fill={color.dark} opacity={0.6} />}
      {index === total - 1 && <ellipse cx={cx} cy={height} rx={halfBot} ry={rimH * 0.5} fill={color.dark} opacity={0.8} />}
      <text x={cx} y={height / 2 - 5} textAnchor="middle" fill="white" fontSize="9" fontWeight="700" opacity={0.9}>{label}</text>
      <text x={cx} y={height / 2 + 9} textAnchor="middle" fill="white" fontSize="13" fontWeight="900">{fmt(value)}</text>
    </g>
  );
}

/* ── Channel Funnel Card ──────────────────────────────────── */
function ChannelFunnelCard({ title, icon: Icon, iconColor, stages, colors, spend, convRate, kpis }: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  stages: FunnelStageData[];
  colors: typeof CHANNEL_PALETTE.meta;
  spend?: number;
  convRate: number;
  kpis: { label: string; value: string; status?: 'good' | 'warning' | 'bad' }[];
}) {
  const maxVal = stages[0]?.value || 1;
  const stageHeight = 52;
  const gap = 6;
  const topPad = 16;
  const totalH = topPad + stages.length * (stageHeight + gap);

  // Conversion rates between stages
  const rates = stages.slice(1).map((s, i) => ({
    from: stages[i].label,
    to: s.label,
    rate: stages[i].value > 0 ? (s.value / stages[i].value) * 100 : 0,
  }));

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" style={{ color: iconColor }} />
            <CardTitle className="text-sm font-bold">{title}</CardTitle>
          </div>
          {spend !== undefined && (
            <Badge variant="outline" className="text-[10px] font-mono">
              R${fmt(spend)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {/* Funnel SVG */}
        <div className="flex justify-center mb-3">
          <svg viewBox={`0 0 300 ${totalH}`} className="w-full max-w-[200px]" style={{ overflow: 'visible' }}>
            {stages.map((stage, i) => {
              const widthPct = Math.max(0.25, stage.value / maxVal);
              const nextPct = i < stages.length - 1 ? Math.max(0.2, stages[i + 1].value / maxVal) : widthPct * 0.6;
              const topW = widthPct * 240;
              const botW = nextPct * 240;
              const yOffset = topPad + i * (stageHeight + gap);
              return (
                <g key={stage.label} transform={`translate(0, ${yOffset})`}>
                  <Funnel3DStage topWidth={topW} bottomWidth={botW} color={colors[i] || colors[colors.length - 1]} label={stage.label} value={stage.value} index={i} total={stages.length} />
                </g>
              );
            })}
          </svg>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {kpis.map(kpi => (
            <div key={kpi.label} className="rounded-lg border border-border bg-muted/30 p-2 text-center">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">{kpi.label}</p>
              <p className={cn('text-sm font-black',
                kpi.status === 'good' ? 'text-green-400' : kpi.status === 'bad' ? 'text-red-400' : 'text-foreground'
              )}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Conversion rates */}
        <div className="space-y-1">
          {rates.map(cr => {
            const isGood = cr.rate >= 20;
            const isBad = cr.rate < 5;
            return (
              <div key={cr.from + cr.to} className={cn(
                'flex items-center justify-between rounded-md border px-2 py-1.5 text-[10px]',
                isGood ? 'border-green-500/20 bg-green-500/5' : isBad ? 'border-red-500/20 bg-red-500/5' : 'border-amber-500/20 bg-amber-500/5'
              )}>
                <div className="flex items-center gap-1">
                  {isGood ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <AlertCircle className="h-3 w-3 text-amber-400" />}
                  <span className="text-muted-foreground">{cr.from} → {cr.to}</span>
                </div>
                <span className={cn('font-bold', isGood ? 'text-green-400' : isBad ? 'text-red-400' : 'text-amber-400')}>
                  {cr.rate.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Main Component ──────────────────────────────────────── */
export default function FunnelEndToEnd({ period = '30d' }: { period?: '7d' | '30d' | '90d' }) {
  const { user } = useAuth();

  const [metaAds, setMetaAds] = useState<{ ad_id: string; impressions: number; clicks: number; spend: number; conversions: number }[]>([]);
  const [googleData, setGoogleData] = useState({ impressions: 0, clicks: 0, cost: 0, conversions: 0 });
  const [ga4Data, setGa4Data] = useState({ sessions: 0, users: 0 });
  const [opsData, setOpsData] = useState({ totalUsers: 0, totalBookings: 0, completedServices: 0, gmvReais: 0, avgTicket: 0, platformFee: 0 });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [m, g, ga, ops] = await Promise.all([
        supabase.from('meta_ads_performance').select('ad_id, impressions, clicks, spend, conversions').eq('user_id', user.id),
        supabase.from('google_ads_campaigns').select('impressions, clicks, cost, conversions').eq('user_id', user.id),
        supabase.from('ga4_metrics').select('sessions, total_users').eq('user_id', user.id),
        supabase.from('operational_metrics').select('metric_type, count, total_value, metadata').eq('user_id', user.id),
      ]);

      // Deduplicate Meta Ads by ad_id (aggregate per ad to avoid overlapping date ranges)
      if (m.data) {
        const adMap = new Map<string, { impressions: number; clicks: number; spend: number; conversions: number }>();
        m.data.forEach(r => {
          const key = r.ad_id;
          if (!adMap.has(key)) {
            adMap.set(key, { impressions: 0, clicks: 0, spend: 0, conversions: 0 });
          }
          const agg = adMap.get(key)!;
          agg.impressions += r.impressions || 0;
          agg.clicks += r.clicks || 0;
          agg.spend += Number(r.spend) || 0;
          agg.conversions += Number(r.conversions) || 0;
        });
        setMetaAds(Array.from(adMap.entries()).map(([ad_id, v]) => ({ ad_id, ...v })));
      }

      if (g.data) setGoogleData({
        impressions: g.data.reduce((s, r) => s + (r.impressions || 0), 0),
        clicks: g.data.reduce((s, r) => s + (r.clicks || 0), 0),
        cost: g.data.reduce((s, r) => s + (Number(r.cost) || 0), 0),
        conversions: g.data.reduce((s, r) => s + (Number(r.conversions) || 0), 0),
      });

      if (ga.data) setGa4Data({
        sessions: ga.data.reduce((s, r) => s + (r.sessions || 0), 0),
        users: ga.data.reduce((s, r) => s + (r.total_users || 0), 0),
      });

      if (ops.data) {
        const usersRow = ops.data.find(r => r.metric_type === 'users_total' && (r.metadata as any)?.total);
        const bookingsRow = ops.data.find(r => r.metric_type === 'bookings_total' && (r.metadata as any)?.total);
        const servicesRow = ops.data.find(r => r.metric_type === 'services_completed');
        const txRow = ops.data.find(r => r.metric_type === 'transactions_total' && (r.metadata as any)?.total);
        const txMeta = (txRow?.metadata || {}) as any;
        setOpsData({
          totalUsers: usersRow?.count || 0,
          totalBookings: bookingsRow?.count || 0,
          completedServices: servicesRow?.count || 0,
          gmvReais: txMeta.gmv_reais || 0,
          avgTicket: txMeta.avg_ticket || 0,
          platformFee: txMeta.platform_fee_reais || 0,
        });
      }
    };
    load();
  }, [user]);

  // Aggregated Meta data (deduplicated)
  const metaData = useMemo(() => ({
    impressions: metaAds.reduce((s, a) => s + a.impressions, 0),
    clicks: metaAds.reduce((s, a) => s + a.clicks, 0),
    spend: metaAds.reduce((s, a) => s + a.spend, 0),
    conversions: metaAds.reduce((s, a) => s + a.conversions, 0),
  }), [metaAds]);

  // Build channel-specific stages
  const metaStages: FunnelStageData[] = useMemo(() => [
    { label: 'Impressões', value: metaData.impressions },
    { label: 'Cliques', value: metaData.clicks },
    { label: 'Sessões (est.)', value: Math.round(metaData.clicks * 0.85) },
    { label: 'Conversões', value: metaData.conversions },
    { label: 'Cadastros (est.)', value: Math.round(metaData.conversions * 0.7) },
  ], [metaData]);

  const googleStages: FunnelStageData[] = useMemo(() => [
    { label: 'Impressões', value: googleData.impressions },
    { label: 'Cliques', value: googleData.clicks },
    { label: 'Sessões (est.)', value: Math.round(googleData.clicks * 0.85) },
    { label: 'Conversões', value: googleData.conversions },
  ], [googleData]);

  const organicStages: FunnelStageData[] = useMemo(() => [
    { label: 'Visitantes', value: ga4Data.users },
    { label: 'Sessões', value: ga4Data.sessions },
    { label: 'Cadastros (est.)', value: Math.round(ga4Data.sessions * 0.05) },
    { label: 'Oportunidades', value: Math.round(ga4Data.sessions * 0.02) },
  ], [ga4Data]);

  // KPIs per channel
  const metaCTR = metaData.impressions > 0 ? (metaData.clicks / metaData.impressions) * 100 : 0;
  const metaCPC = metaData.clicks > 0 ? metaData.spend / metaData.clicks : 0;
  const metaCAC = metaData.conversions > 0 ? metaData.spend / metaData.conversions : 0;

  const googleCTR = googleData.impressions > 0 ? (googleData.clicks / googleData.impressions) * 100 : 0;
  const googleCPC = googleData.clicks > 0 ? googleData.cost / googleData.clicks : 0;

  // Totals
  const totalSpend = metaData.spend + googleData.cost;
  const totalServices = opsData.completedServices;
  const gmv = opsData.gmvReais;
  const takeRate = opsData.platformFee;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">Funil por Canal</h2>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono">
          {metaAds.length} anúncios Meta · {ga4Data.sessions} sessões GA4
        </Badge>
      </div>

      {/* ═══ Per-channel funnels ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Meta Ads */}
        <ChannelFunnelCard
          title="Meta Ads"
          icon={Megaphone}
          iconColor="hsl(217, 91%, 60%)"
          stages={metaStages}
          colors={CHANNEL_PALETTE.meta}
          spend={metaData.spend}
          convRate={metaCTR}
          kpis={[
            { label: 'CTR', value: `${metaCTR.toFixed(2)}%`, status: metaCTR >= 1.5 ? 'good' : metaCTR >= 0.5 ? undefined : 'bad' },
            { label: 'CPC', value: `R$${metaCPC.toFixed(2)}`, status: metaCPC > 0 && metaCPC <= 1.5 ? 'good' : undefined },
            { label: 'Conversões', value: fmt(metaData.conversions), status: metaData.conversions > 0 ? 'good' : 'bad' },
            { label: 'CAC', value: metaCAC > 0 ? `R$${metaCAC.toFixed(2)}` : '—' },
          ]}
        />

        {/* Google Ads */}
        <ChannelFunnelCard
          title="Google Ads"
          icon={Search}
          iconColor="hsl(142, 71%, 50%)"
          stages={googleStages}
          colors={CHANNEL_PALETTE.google}
          spend={googleData.cost}
          convRate={googleCTR}
          kpis={[
            { label: 'CTR', value: googleData.impressions > 0 ? `${googleCTR.toFixed(2)}%` : '—' },
            { label: 'CPC', value: googleData.clicks > 0 ? `R$${googleCPC.toFixed(2)}` : '—' },
            { label: 'Cliques', value: fmt(googleData.clicks) },
            { label: 'Conversões', value: fmt(googleData.conversions) },
          ]}
        />

        {/* Orgânico */}
        <ChannelFunnelCard
          title="Orgânico (GA4)"
          icon={Globe}
          iconColor="hsl(262, 83%, 58%)"
          stages={organicStages}
          colors={CHANNEL_PALETTE.organic}
          convRate={0}
          kpis={[
            { label: 'Visitantes', value: fmt(ga4Data.users) },
            { label: 'Sessões', value: fmt(ga4Data.sessions) },
            { label: 'Sess/User', value: ga4Data.users > 0 ? (ga4Data.sessions / ga4Data.users).toFixed(1) : '—' },
            { label: 'Conv. Est.', value: fmt(Math.round(ga4Data.sessions * 0.02)) },
          ]}
        />
      </div>

      {/* ═══ Consolidado ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="border-border bg-card p-3 text-center">
          <DollarSign className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Investimento</p>
          <p className="text-lg font-black text-foreground">R${fmt(totalSpend)}</p>
          <p className="text-[9px] text-muted-foreground">Meta + Google</p>
        </Card>
        <Card className="border-border bg-card p-3 text-center">
          <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Cadastros</p>
          <p className="text-lg font-black text-foreground">{opsData.totalUsers > 0 ? fmt(opsData.totalUsers) : '—'}</p>
          <p className="text-[9px] text-muted-foreground">Firestore real</p>
        </Card>
        <Card className="border-border bg-card p-3 text-center">
          <Briefcase className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Serviços</p>
          <p className="text-lg font-black text-foreground">{fmt(totalServices)}</p>
          <p className="text-[9px] text-muted-foreground">Concluídos</p>
        </Card>
        <Card className="border-border bg-card p-3 text-center">
          <ShoppingBag className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">GMV Real</p>
          <p className="text-lg font-black" style={{ color: 'hsl(142, 71%, 45%)' }}>{gmv > 0 ? `R$${fmt(gmv)}` : 'R$0'}</p>
          <p className="text-[9px] text-muted-foreground">{opsData.avgTicket > 0 ? `Ticket: R$${opsData.avgTicket.toFixed(2)}` : 'Firestore'}</p>
        </Card>
        <Card className="border-border bg-card p-3 text-center">
          <TrendingUp className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Receita Plat.</p>
          <p className="text-lg font-black" style={{ color: 'hsl(33, 100%, 50%)' }}>{takeRate > 0 ? `R$${takeRate.toFixed(2)}` : 'R$0'}</p>
          <p className="text-[9px] text-muted-foreground">{gmv > 0 ? `${((takeRate / gmv) * 100).toFixed(1)}% do GMV` : 'Taxa real'}</p>
        </Card>
      </div>
    </div>
  );
}
