import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, Users, Target,
  ArrowUpRight, ArrowDownRight, Percent, Activity, Zap,
  AlertCircle, CheckCircle2, Calculator, Wallet, CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ORANGE = 'hsl(33, 100%, 50%)';
const TEAL = 'hsl(185, 100%, 36%)';
const PURPLE = 'hsl(262, 83%, 58%)';
const BLUE = 'hsl(217, 91%, 60%)';
const GREEN = 'hsl(142, 71%, 45%)';
const RED = 'hsl(0, 72%, 51%)';
const AMBER = 'hsl(38, 92%, 50%)';
const PINK = 'hsl(330, 80%, 60%)';

// Business constants
const TAKE_RATE_PROVIDER = 0.07;
const TAKE_RATE_USER = 0.07;
const PIX_FEE = 0.01;
const WITHDRAWAL_FEE = 0.0367;
const PLANS = {
  pf_monthly: { label: 'PF Mensal', price: 10.90 },
  pf_annual: { label: 'PF Anual', price: 9.90 },
  pj_monthly: { label: 'PJ Mensal', price: 20.90 },
  pj_annual: { label: 'PJ Anual', price: 17.90 },
};

function KpiCard({ label, value, sub, icon: Icon, color, status }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string; status?: 'good' | 'warning' | 'critical';
}) {
  const statusColor = status === 'good' ? 'text-green-400' : status === 'warning' ? 'text-amber-400' : status === 'critical' ? 'text-red-400' : '';
  return (
    <Card className="border-border bg-card relative overflow-hidden">
      {status && (
        <div className={cn('absolute top-2 right-2', statusColor)}>
          {status === 'good' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="rounded-lg p-1.5" style={{ background: `${color}20` }}>
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</span>
        </div>
        <p className="text-xl font-black text-foreground">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function FinancialHealthTab({ period = '30d' }: { period?: '7d' | '30d' | '90d' }) {
  const { user } = useAuth();

  // Scenario simulator inputs
  const [gmv, setGmv] = useState(0);
  const [totalServices, setTotalServices] = useState(0);
  const [subscribersPF, setSubscribersPF] = useState(0);
  const [subscribersPJ, setSubscribersPJ] = useState(0);
  const [pctAnnual, setPctAnnual] = useState(40);
  const [churnRate, setChurnRate] = useState(5);
  const [avgRetentionMonths, setAvgRetentionMonths] = useState(12);

  // Real ads data for CAC
  const [metaSpend, setMetaSpend] = useState(0);
  const [metaConversions, setMetaConversions] = useState(0);
  const [googleSpend, setGoogleSpend] = useState(0);
  const [googleConversions, setGoogleConversions] = useState(0);
  const [organicConversions, setOrganicConversions] = useState(0);

  useEffect(() => {
    if (!user) return;
    const loadAdsData = async () => {
      const [metaRes, googleRes, ga4Res] = await Promise.all([
        supabase.from('meta_ads_performance').select('spend, conversions').eq('user_id', user.id),
        supabase.from('google_ads_campaigns').select('cost, conversions').eq('user_id', user.id),
        supabase.from('ga4_metrics').select('conversions, source_medium').eq('user_id', user.id),
      ]);
      if (metaRes.data) {
        setMetaSpend(metaRes.data.reduce((s, r) => s + (Number(r.spend) || 0), 0));
        setMetaConversions(metaRes.data.reduce((s, r) => s + (Number(r.conversions) || 0), 0));
      }
      if (googleRes.data) {
        setGoogleSpend(googleRes.data.reduce((s, r) => s + (Number(r.cost) || 0), 0));
        setGoogleConversions(googleRes.data.reduce((s, r) => s + (Number(r.conversions) || 0), 0));
      }
      if (ga4Res.data) {
        const organic = ga4Res.data.filter(r => r.source_medium?.toLowerCase().includes('organic'));
        setOrganicConversions(organic.reduce((s, r) => s + (Number(r.conversions) || 0), 0));
      }
    };
    loadAdsData();
  }, [user]);

  // Computed unit economics
  const computed = useMemo(() => {
    const ticketMedio = totalServices > 0 ? gmv / totalServices : 0;
    const takeRateRevenue = gmv * (TAKE_RATE_PROVIDER + TAKE_RATE_USER);
    const pixCost = gmv * PIX_FEE;
    const netTakeRate = takeRateRevenue - pixCost;
    const providerNet = gmv - (gmv * TAKE_RATE_PROVIDER);
    const withdrawalRevenue = providerNet * WITHDRAWAL_FEE;
    const totalServiceRevenue = netTakeRate + withdrawalRevenue;

    // Per-service breakdown
    const perServiceGross = ticketMedio * (TAKE_RATE_PROVIDER + TAKE_RATE_USER);
    const perServicePix = ticketMedio * PIX_FEE;
    const perServiceNet = perServiceGross - perServicePix;
    const perServiceProviderNet = ticketMedio - (ticketMedio * TAKE_RATE_PROVIDER);
    const perServiceWithdrawal = perServiceProviderNet * WITHDRAWAL_FEE;
    const perServiceTotal = perServiceNet + perServiceWithdrawal;

    // Subscription MRR
    const pfAnnualCount = Math.round(subscribersPF * (pctAnnual / 100));
    const pfMonthlyCount = subscribersPF - pfAnnualCount;
    const pjAnnualCount = Math.round(subscribersPJ * (pctAnnual / 100));
    const pjMonthlyCount = subscribersPJ - pjAnnualCount;
    const mrrSubs = (pfMonthlyCount * PLANS.pf_monthly.price) + (pfAnnualCount * PLANS.pf_annual.price) + (pjMonthlyCount * PLANS.pj_monthly.price) + (pjAnnualCount * PLANS.pj_annual.price);

    const totalRevenue = totalServiceRevenue + mrrSubs;

    // CAC
    const totalAdSpend = metaSpend + googleSpend;
    const totalConversions = metaConversions + googleConversions + organicConversions;
    const cacBlended = totalConversions > 0 ? totalAdSpend / totalConversions : 0;
    const cacMeta = metaConversions > 0 ? metaSpend / metaConversions : 0;
    const cacGoogle = googleConversions > 0 ? googleSpend / googleConversions : 0;

    // LTV
    const avgRevenuePerUser = (subscribersPF + subscribersPJ) > 0 ? totalRevenue / (subscribersPF + subscribersPJ) : 0;
    const ltv = avgRevenuePerUser * avgRetentionMonths;
    const ltvCacRatio = cacBlended > 0 ? ltv / cacBlended : 0;
    const paybackMonths = avgRevenuePerUser > 0 ? cacBlended / avgRevenuePerUser : 0;
    const marginPct = gmv > 0 ? (totalServiceRevenue / gmv) * 100 : 0;

    return {
      ticketMedio, takeRateRevenue, pixCost, netTakeRate, withdrawalRevenue, totalServiceRevenue,
      perServiceGross, perServicePix, perServiceNet, perServiceWithdrawal, perServiceTotal,
      mrrSubs, totalRevenue, cacBlended, cacMeta, cacGoogle,
      ltv, ltvCacRatio, paybackMonths, marginPct, totalAdSpend, totalConversions,
      pfMonthlyCount, pfAnnualCount, pjMonthlyCount, pjAnnualCount,
    };
  }, [gmv, totalServices, subscribersPF, subscribersPJ, pctAnnual, churnRate, avgRetentionMonths,
      metaSpend, metaConversions, googleSpend, googleConversions, organicConversions]);

  const fmt = (n: number) => n >= 1000000 ? `R$${(n / 1000000).toFixed(2)}M` : n >= 1000 ? `R$${(n / 1000).toFixed(1)}k` : `R$${n.toFixed(2)}`;
  const fmtShort = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0);

  // Waterfall data
  const waterfallData = [
    { name: 'Valor Serviço', value: computed.perServiceTotal > 0 ? computed.ticketMedio : 200, fill: 'hsl(var(--muted-foreground))' },
    { name: 'Taxa Provider 7%', value: -(computed.ticketMedio || 200) * TAKE_RATE_PROVIDER, fill: RED },
    { name: 'Taxa User 7%', value: -(computed.ticketMedio || 200) * TAKE_RATE_USER, fill: ORANGE },
    { name: 'Custo Pix 1%', value: -(computed.ticketMedio || 200) * PIX_FEE, fill: AMBER },
    { name: 'Receita Líquida', value: computed.perServiceNet || 200 * 0.13, fill: GREEN },
    { name: 'Taxa Saque 3,67%', value: computed.perServiceWithdrawal || 200 * 0.93 * 0.0367, fill: TEAL },
    { name: 'Receita Total', value: computed.perServiceTotal || 200 * 0.13 + 200 * 0.93 * 0.0367, fill: BLUE },
  ];

  // Revenue by source pie
  const revenueBySource = [
    { name: 'Take Rate', value: computed.netTakeRate, color: ORANGE },
    { name: 'Taxa de Saque', value: computed.withdrawalRevenue, color: TEAL },
    { name: 'Assinaturas PF', value: (computed.pfMonthlyCount * PLANS.pf_monthly.price) + (computed.pfAnnualCount * PLANS.pf_annual.price), color: BLUE },
    { name: 'Assinaturas PJ', value: (computed.pjMonthlyCount * PLANS.pj_monthly.price) + (computed.pjAnnualCount * PLANS.pj_annual.price), color: PURPLE },
  ].filter(d => d.value > 0);

  // CAC by channel
  const cacByChannel = [
    { canal: 'Meta Ads', spend: metaSpend, conversions: metaConversions, cac: computed.cacMeta, color: BLUE },
    { canal: 'Google Ads', spend: googleSpend, conversions: googleConversions, cac: computed.cacGoogle, color: GREEN },
    { canal: 'Orgânico', spend: 0, conversions: organicConversions, cac: 0, color: ORANGE },
  ];

  // MRR trend mock projection
  const mrrTrend = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    return months.map((m, i) => {
      const growth = 1 + (i * 0.08) - ((churnRate / 100) * i * 0.3);
      return { month: m, mrr: Math.round(computed.mrrSubs * growth * (0.6 + i * 0.08)), gmv: Math.round(gmv * growth * (0.5 + i * 0.1)) };
    });
  }, [computed.mrrSubs, gmv, churnRate]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground">Saúde Financeira</h2>
        <Badge variant="outline" className="text-[10px] font-mono">Unit Economics</Badge>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <KpiCard label="GMV Mensal" value={fmt(gmv)} icon={DollarSign} color={ORANGE} sub={`${totalServices} serviços`} />
        <KpiCard label="Receita Total" value={fmt(computed.totalRevenue)} icon={TrendingUp} color={GREEN} sub={`Take Rate + Subs`} />
        <KpiCard label="MRR Assinaturas" value={fmt(computed.mrrSubs)} icon={CreditCard} color={BLUE} sub={`${subscribersPF + subscribersPJ} assinantes`} />
        <KpiCard label="CAC Blended" value={fmt(computed.cacBlended)} icon={Target} color={computed.cacBlended > 50 ? RED : TEAL} status={computed.cacBlended > 50 ? 'warning' : 'good'} sub={`${fmtShort(computed.totalConversions)} conv.`} />
        <KpiCard label="LTV" value={fmt(computed.ltv)} icon={Users} color={PURPLE} sub={`${avgRetentionMonths} meses ret.`} />
        <KpiCard label="LTV:CAC" value={computed.ltvCacRatio > 0 ? `${computed.ltvCacRatio.toFixed(1)}x` : '—'} icon={Activity} color={computed.ltvCacRatio >= 3 ? GREEN : computed.ltvCacRatio >= 1.5 ? AMBER : RED} status={computed.ltvCacRatio >= 3 ? 'good' : computed.ltvCacRatio >= 1.5 ? 'warning' : 'critical'} sub={`Meta: > 3x`} />
      </div>

      {/* Second KPI Row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Ticket Médio" value={fmt(computed.ticketMedio)} icon={Calculator} color={ORANGE} />
        <KpiCard label="Margem Líquida" value={`${computed.marginPct.toFixed(1)}%`} icon={Percent} color={computed.marginPct >= 15 ? GREEN : AMBER} sub="Take Rate + Saque - Pix" />
        <KpiCard label="Churn Rate" value={`${churnRate}%`} icon={TrendingDown} color={churnRate <= 5 ? GREEN : RED} status={churnRate <= 5 ? 'good' : 'critical'} />
        <KpiCard label="Payback" value={computed.paybackMonths > 0 ? `${computed.paybackMonths.toFixed(1)} meses` : '—'} icon={Zap} color={computed.paybackMonths <= 6 ? GREEN : AMBER} status={computed.paybackMonths <= 6 ? 'good' : 'warning'} />
      </div>

      {/* Unit Economics Waterfall + Revenue Pie */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Calculator className="h-3.5 w-3.5 text-muted-foreground" />
              Unit Economics por Transação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterfallData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `R$${Math.abs(v).toFixed(0)}`} />
                  <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`R$${v.toFixed(2)}`]} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {waterfallData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">Receita por serviço: </span>
                {fmt(computed.perServiceTotal)} ({((computed.perServiceTotal / (computed.ticketMedio || 1)) * 100).toFixed(1)}% do valor bruto)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              Composição da Receita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="h-52 w-52 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={revenueBySource} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {revenueBySource.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [fmt(v)]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 flex-1">
                {revenueBySource.map(d => {
                  const total = revenueBySource.reduce((s, x) => s + x.value, 0);
                  const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0';
                  return (
                    <div key={d.name} className="flex items-center gap-3">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                      <div className="flex-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-foreground">{d.name}</span>
                          <span className="text-muted-foreground">{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-border overflow-hidden mt-1">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: d.color }} />
                        </div>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground w-16 text-right">{fmt(d.value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CAC por Canal + Tendência MRR */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-muted-foreground" />
              CAC por Canal
              {(metaSpend > 0 || googleSpend > 0) && <Badge className="text-[9px] bg-green-500/20 text-green-400 border-0">Dados Reais</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cacByChannel.map(ch => (
                <div key={ch.canal} className="p-3 rounded-lg bg-muted/20 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-foreground">{ch.canal}</span>
                    <Badge variant="outline" className="text-[10px] font-mono" style={{ borderColor: ch.color, color: ch.color }}>
                      CAC: {ch.cac > 0 ? fmt(ch.cac) : 'R$0'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Investimento</p>
                      <p className="text-sm font-bold text-foreground">{fmt(ch.spend)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Conversões</p>
                      <p className="text-sm font-bold text-foreground">{fmtShort(ch.conversions)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Projeção MRR + GMV</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mrrTrend}>
                  <defs>
                    <linearGradient id="gradMrr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={BLUE} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={BLUE} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradGmv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ORANGE} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={ORANGE} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [fmt(v)]} />
                  <Area type="monotone" dataKey="gmv" name="GMV" stroke={ORANGE} fill="url(#gradGmv)" strokeWidth={2} />
                  <Area type="monotone" dataKey="mrr" name="MRR" stroke={BLUE} fill="url(#gradMrr)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scenario Simulator */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Simulador de Cenários
            <Badge variant="outline" className="text-[10px]">Ajuste os inputs e veja os KPIs recalcularem</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">GMV Mensal (R$)</Label>
              <Input type="number" value={gmv} onChange={e => setGmv(Number(e.target.value))} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Nº Serviços/mês</Label>
              <Input type="number" value={totalServices} onChange={e => setTotalServices(Number(e.target.value))} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Assinantes PF</Label>
              <Input type="number" value={subscribersPF} onChange={e => setSubscribersPF(Number(e.target.value))} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Assinantes PJ</Label>
              <Input type="number" value={subscribersPJ} onChange={e => setSubscribersPJ(Number(e.target.value))} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">% Plano Anual</Label>
              <Input type="number" value={pctAnnual} onChange={e => setPctAnnual(Number(e.target.value))} className="h-8 text-xs" min={0} max={100} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Churn Rate (%)</Label>
              <Input type="number" value={churnRate} onChange={e => setChurnRate(Number(e.target.value))} className="h-8 text-xs" step={0.5} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Retenção (meses)</Label>
              <Input type="number" value={avgRetentionMonths} onChange={e => setAvgRetentionMonths(Number(e.target.value))} className="h-8 text-xs" />
            </div>
          </div>

          {/* Quick summary */}
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
              <p className="text-[10px] text-muted-foreground">Receita/Serviço</p>
              <p className="text-lg font-black text-foreground">{fmt(computed.perServiceTotal)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
              <p className="text-[10px] text-muted-foreground">Net Take Rate</p>
              <p className="text-lg font-black text-foreground">{((computed.perServiceTotal / (computed.ticketMedio || 1)) * 100).toFixed(1)}%</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
              <p className="text-[10px] text-muted-foreground">ARR Projetado</p>
              <p className="text-lg font-black text-foreground">{fmt(computed.totalRevenue * 12)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
              <p className="text-[10px] text-muted-foreground">Invest. Total Ads</p>
              <p className="text-lg font-black text-foreground">{fmt(computed.totalAdSpend)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
              <p className="text-[10px] text-muted-foreground">ROI (Receita/Invest.)</p>
              <p className="text-lg font-black text-foreground">{computed.totalAdSpend > 0 ? `${(computed.totalRevenue / computed.totalAdSpend).toFixed(1)}x` : '∞'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
