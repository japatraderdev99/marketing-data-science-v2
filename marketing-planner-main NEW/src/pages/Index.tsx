import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useCalendarContents } from '@/hooks/useCalendarContents';
import { Campaign, ContentItem } from '@/data/seedData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Megaphone, FileText, TrendingUp, DollarSign,
  AlertTriangle, ArrowRight, Plus, Calendar,
  Clock, CheckCircle2, AlertCircle, Zap, Target,
  Users, BarChart3, Activity, ArrowUpRight, ArrowDownRight,
  Flame, ShieldAlert, Eye, MousePointerClick, Wallet,
  ChevronRight, CircleDot, TrendingDown, Star, Wrench,
  ChevronDown, Lightbulb, Gauge, BarChart2
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  RadialBarChart, RadialBar, LineChart, Line
} from 'recharts';

// ── Design tokens (aligned with index.css)
const C = {
  orange: 'hsl(33, 100%, 50%)',
  teal: 'hsl(185, 100%, 36%)',
  purple: 'hsl(262, 83%, 58%)',
  blue: 'hsl(217, 91%, 60%)',
  green: 'hsl(142, 71%, 45%)',
  red: 'hsl(0, 72%, 51%)',
  amber: 'hsl(45, 93%, 47%)',
};

// ── Marketplace data (static, ready for DB integration)
const MARKETPLACE = {
  prestadoresAtivos: 470,
  clientesAtivos: 1450,
  solicitacoesAtivas: 980,
  taxaMatch: 70,
  gmv: 62000,
  cac: 40.50,
};

const clienteFunnel = [
  { etapa: 'Visitantes', valor: 15420, pct: 100 },
  { etapa: 'Cadastros', valor: 3855, pct: 25 },
  { etapa: 'Busca Serviço', valor: 2313, pct: 60 },
  { etapa: 'Solicitação', valor: 925, pct: 40 },
  { etapa: 'Contratação', valor: 463, pct: 50 },
];

const prestadorFunnel = [
  { etapa: 'Visitantes', valor: 8750, pct: 100 },
  { etapa: 'Cadastros', valor: 1750, pct: 20 },
  { etapa: 'Perfil Completo', valor: 1050, pct: 60 },
  { etapa: 'Proposta Enviada', valor: 420, pct: 40 },
  { etapa: 'Serviço Realizado', valor: 294, pct: 70 },
];

const aiInsights = [
  {
    impact: 'Alto' as const,
    title: 'CAC do Meta Ads aumentou 23%',
    detail: 'Custo por aquisição subiu de R$32 para R$40. Revisar segmentação de público e criativos — possível saturação da audiência atual.',
  },
  {
    impact: 'Médio' as const,
    title: 'Taxa de conversão de cadastro caiu 8pp',
    detail: 'Onboarding com fricção detectada na etapa de confirmação de e-mail. A/B test com cadastro via Google pode recuperar 15% dos leads perdidos.',
  },
  {
    impact: 'Oportunidade' as const,
    title: 'LinkedIn Ads com ROAS acima da média',
    detail: 'ROAS de 8.2x vs média de 4.1x. Canal sub-investido. Aumentar budget em R$2.000/mês pode gerar +340 prestadores qualificados.',
  },
];

// ── Static data
const revenueData = [
  { mes: 'Set', receita: 42000, meta: 50000, custo: 18000 },
  { mes: 'Out', receita: 55000, meta: 55000, custo: 22000 },
  { mes: 'Nov', receita: 48000, meta: 60000, custo: 19000 },
  { mes: 'Dez', receita: 72000, meta: 65000, custo: 28000 },
  { mes: 'Jan', receita: 68000, meta: 70000, custo: 25000 },
  { mes: 'Fev', receita: 81000, meta: 80000, custo: 31000 },
];

const funnelStages = [
  { label: 'Impressões', value: 473000, pct: 100, color: C.purple },
  { label: 'Cliques', value: 27100, pct: 5.7, color: C.blue },
  { label: 'Leads', value: 4550, pct: 0.96, color: C.orange },
  { label: 'Conversões', value: 1342, pct: 0.28, color: C.green },
];

const channelData = [
  { name: 'Instagram', value: 38, color: C.orange },
  { name: 'TikTok', value: 28, color: C.teal },
  { name: 'Meta Ads', value: 22, color: C.purple },
  { name: 'LinkedIn', value: 12, color: C.blue },
];

const teamDemands = [
  { member: 'Gabriel', role: 'CMO · Head de Comunicação', initials: 'GA', color: C.blue, bg: 'bg-blue-500/15', ring: 'ring-blue-500', total: 8, done: 5, overdue: 1 },
  { member: 'Guilherme', role: 'Criativo', initials: 'GU', color: C.teal, bg: 'bg-teal/15', ring: 'ring-teal', total: 11, done: 7, overdue: 2 },
  { member: 'Marcelo', role: 'CFO', initials: 'MC', color: C.green, bg: 'bg-emerald-600/15', ring: 'ring-emerald-600', total: 4, done: 3, overdue: 0 },
  { member: 'Leandro', role: 'CEO', initials: 'LE', color: C.purple, bg: 'bg-violet-600/15', ring: 'ring-violet-600', total: 6, done: 2, overdue: 1 },
  { member: 'Gustavo', role: 'Dev', initials: 'GV', color: C.red, bg: 'bg-rose-600/15', ring: 'ring-rose-600', total: 9, done: 6, overdue: 0 },
];

const bottlenecks = [
  { label: 'Aprovação de criativos parada', severity: 'high', owner: 'Guilherme', days: 4, icon: ShieldAlert },
  { label: 'Meta Ads sem otimização (8 dias)', severity: 'high', owner: 'Gabriel', days: 8, icon: AlertCircle },
  { label: '3 rascunhos sem responsável', severity: 'medium', owner: 'Gabriel', days: 2, icon: Clock },
  { label: 'Budget Q1 sub-alocado (39%)', severity: 'medium', owner: 'Marcelo', days: 5, icon: Wallet },
  { label: 'LinkedIn sem publicação (21 dias)', severity: 'low', owner: 'Guilherme', days: 21, icon: TrendingDown },
];

const goalsData = [
  { label: 'Leads Mensais', current: 4550, target: 6000, color: C.orange },
  { label: 'Conversões', current: 1342, target: 2000, color: C.teal },
  { label: 'Budget Gasto', current: 31000, target: 50000, color: C.blue },
  { label: 'Posts Publicados', current: 34, target: 60, color: C.purple },
];

const roasData = [
  { camp: 'Meta Ads', roas: 11.1, color: C.green },
  { camp: '#FazAConta', roas: 6.4, color: C.teal },
  { camp: 'ASMR', roas: 2.4, color: C.orange },
  { camp: 'Lead Sumiu', roas: 1.6, color: C.amber },
];

const weeklyVelocity = [
  { week: 'W1', tasks: 14, delivered: 11 },
  { week: 'W2', tasks: 18, delivered: 16 },
  { week: 'W3', tasks: 22, delivered: 19 },
  { week: 'W4', tasks: 20, delivered: 20 },
  { week: 'W5', tasks: 25, delivered: 21 },
  { week: 'W6', tasks: 28, delivered: 26 },
];

// ── Sub-components
function HealthScoreCircle({ score }: { score: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? C.teal : score >= 50 ? C.orange : C.red;
  const label = score >= 70 ? 'Saudável' : score >= 50 ? 'Atenção' : 'Crítico';

  return (
    <div className="relative flex h-28 w-28 items-center justify-center mx-auto">
      <svg className="-rotate-90" width="112" height="112">
        <circle cx="56" cy="56" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="9" />
        <circle
          cx="56" cy="56" r={radius} fill="none"
          stroke={color} strokeWidth="9"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-2xl font-black" style={{ color }}>{score}</span>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

function KpiCard({ label, value, delta, positive, icon: Icon, color, bg, sub }: {
  label: string; value: string | number; delta: string; positive: boolean;
  icon: React.ElementType; color: string; bg: string; sub?: string;
}) {
  return (
    <Card className="border-border bg-card hover:border-primary/30 transition-all duration-200 group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`rounded-xl p-2.5 ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div className={`flex items-center gap-1 text-xs font-semibold ${positive ? 'text-green-400' : 'text-red-400'}`}>
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {delta}
          </div>
        </div>
        <p className="text-2xl font-black text-foreground tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/60 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function GoalBar({ label, current, target, color }: { label: string; current: number; target: number; color: string }) {
  const pct = Math.min(Math.round((current / target) * 100), 100);
  const fmt = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toString();
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground">{fmt(current)}</span>
          <span className="text-muted-foreground/50">/ {fmt(target)}</span>
          <span className="font-semibold text-xs" style={{ color }}>{pct}%</span>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-border overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function SeverityDot({ severity }: { severity: string }) {
  const map: Record<string, string> = { high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-primary' };
  return <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${map[severity]}`} />;
}

function ImpactBadge({ impact }: { impact: 'Alto' | 'Médio' | 'Oportunidade' }) {
  const styles = {
    Alto: 'bg-red-500/15 text-red-400 border-red-500/30',
    Médio: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    Oportunidade: 'bg-teal/15 text-teal border-teal/30',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${styles[impact]}`}>
      {impact}
    </span>
  );
}

function FunnelColumn({ title, icon: Icon, color, items }: {
  title: string; icon: React.ElementType; color: string;
  items: { etapa: string; valor: number; pct: number }[];
}) {
  const maxVal = items[0].valor;
  return (
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-1.5 mb-3">
        <Icon className="h-4 w-4" style={{ color }} />
        <span className="text-xs font-bold text-foreground">{title}</span>
      </div>
      {items.map((item, i) => {
        const barPct = (item.valor / maxVal) * 100;
        const convPct = i > 0 ? Math.round((item.valor / items[i - 1].valor) * 100) : 100;
        return (
          <div key={item.etapa}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground truncate pr-1">{item.etapa}</span>
              <span className="text-[10px] font-bold shrink-0" style={{ color }}>
                {item.valor.toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="h-4 w-full rounded bg-border overflow-hidden">
              <div
                className="h-full rounded flex items-center px-1.5 transition-all duration-700"
                style={{ width: `${barPct}%`, background: color, minWidth: '4%' }}
              >
                {barPct > 20 && (
                  <span className="text-[8px] font-bold text-white">{item.pct}%</span>
                )}
              </div>
            </div>
            {i > 0 && (
              <p className="text-right text-[9px] text-muted-foreground mt-0.5">→ {convPct}% conv.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Index() {
  const navigate = useNavigate();
  const { campaigns } = useCampaigns();
  const { contents } = useCalendarContents();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);

  // ── Derived metrics
  const activeCampaigns = campaigns.filter(c => c.status === 'Ativa').length;
  const publishedPosts = contents.filter(c => c.status === 'Publicado').length;
  const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
  const totalLeads = campaigns.reduce((sum, c) => sum + (c.leads ?? 0), 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + (c.conversions ?? 0), 0);
  const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions ?? 0), 0);
  const avgROAS = campaigns.filter(c => c.roas).reduce((sum, c, _, arr) => sum + (c.roas ?? 0) / arr.length, 0);
  const spentBudget = campaigns.reduce((sum, c) => sum + (c.budgetPaid ?? 0), 0);

  const urgentCampaigns = campaigns.filter(c => {
    const diff = (new Date(c.endDate).getTime() - Date.now()) / 864e5;
    return diff <= 7 && c.status === 'Ativa';
  });

  const upcomingContent = contents
    .filter(c => new Date(c.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);

  const healthScore = Math.round(
    ((activeCampaigns / Math.max(campaigns.length, 1)) * 35) +
    ((publishedPosts / Math.max(contents.length, 1)) * 35) +
    (urgentCampaigns.length === 0 ? 20 : 5) +
    (avgROAS > 3 ? 10 : avgROAS > 1 ? 5 : 0)
  );

  const ctr = totalImpressions > 0 ? ((totalLeads / totalImpressions) * 100).toFixed(2) : '0';
  const convRate = totalLeads > 0 ? ((totalConversions / totalLeads) * 100).toFixed(1) : '0';

  const totalTeamTasks = teamDemands.reduce((s, m) => s + m.total, 0);
  const totalTeamDone = teamDemands.reduce((s, m) => s + m.done, 0);
  const totalOverdue = teamDemands.reduce((s, m) => s + m.overdue, 0);

  // Marketplace liquidity
  const liquidityRatio = MARKETPLACE.prestadoresAtivos / (MARKETPLACE.solicitacoesAtivas / 10);
  const liquidityPct = Math.min(Math.round(liquidityRatio * 50), 100);
  const liquidityLabel = liquidityRatio < 0.8 ? 'Falta Oferta' : liquidityRatio < 1.2 ? 'Equilibrado' : 'Sobra Oferta';
  const liquidityColor = liquidityRatio < 0.8 ? C.red : liquidityRatio < 1.2 ? C.green : C.amber;

  const FORMAT_COLORS: Record<string, string> = {
    Post: 'bg-blue-500/20 text-blue-400',
    Reels: 'bg-primary/20 text-primary',
    Stories: 'bg-purple-500/20 text-purple-400',
    Carrossel: 'bg-teal/20 text-teal',
    Ads: 'bg-red-500/20 text-red-400',
    Shorts: 'bg-green-500/20 text-green-400',
  };

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── HEADER: Period Selector ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Pré-inauguração · 15/03/2026</p>
        </div>
        <div className="flex items-center rounded-lg border border-border bg-card p-0.5 gap-0.5">
          {(['7d', '30d', '90d'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                period === p
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'}
            </button>
          ))}
        </div>
      </div>

      {/* ── TOP STRIP: Health + Quick Stats ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">

        {/* Health Score Card */}
        <Card className="border-border bg-card lg:w-64 shrink-0">
          <CardContent className="p-5 flex flex-col items-center gap-3 h-full justify-center">
            <div className="flex items-center gap-2 self-start w-full">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-foreground">Health Score</span>
            </div>
            <HealthScoreCircle score={healthScore} />
            <div className="w-full space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Campanhas ativas</span>
                <span className="font-semibold text-foreground">{activeCampaigns}/{campaigns.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ROAS médio</span>
                <span className="font-semibold text-green-400">{avgROAS.toFixed(1)}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Urgências</span>
                <span className={`font-semibold ${urgentCampaigns.length > 0 ? 'text-red-400' : 'text-green-400'}`}>{urgentCampaigns.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tasks atrasadas</span>
                <span className={`font-semibold ${totalOverdue > 0 ? 'text-amber-400' : 'text-green-400'}`}>{totalOverdue}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Grid — 10 KPIs (2 rows × 5) */}
        <div className="flex-1 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard
            label="Impressões Totais"
            value={`${(totalImpressions / 1000).toFixed(0)}k`}
            delta="+22% mês"
            positive={true}
            icon={Eye}
            color="text-purple-400"
            bg="bg-purple-400/10"
            sub="Todos os canais"
          />
          <KpiCard
            label="Leads Gerados"
            value={totalLeads.toLocaleString('pt-BR')}
            delta="+18% semana"
            positive={true}
            icon={TrendingUp}
            color="text-primary"
            bg="bg-primary/10"
            sub={`Taxa: ${ctr}% de impres.`}
          />
          <KpiCard
            label="Conversões"
            value={totalConversions.toLocaleString('pt-BR')}
            delta="+12% mês"
            positive={true}
            icon={Target}
            color="text-teal"
            bg="bg-teal/10"
            sub={`Conv. rate: ${convRate}%`}
          />
          <KpiCard
            label="Budget Investido"
            value={`R$${(spentBudget / 1000).toFixed(1)}k`}
            delta={`${Math.round((spentBudget / totalBudget) * 100)}% alocado`}
            positive={spentBudget / totalBudget < 0.9}
            icon={DollarSign}
            color="text-blue-400"
            bg="bg-blue-400/10"
            sub={`Total: R$${(totalBudget / 1000).toFixed(1)}k`}
          />
          <KpiCard
            label="ROAS Médio"
            value={`${avgROAS.toFixed(1)}x`}
            delta="Acima da meta"
            positive={avgROAS >= 3}
            icon={BarChart3}
            color="text-green-400"
            bg="bg-green-400/10"
            sub="Meta: 3.0x"
          />
          {/* Row 2 — Marketplace KPIs */}
          <KpiCard
            label="Prestadores Ativos"
            value={MARKETPLACE.prestadoresAtivos.toLocaleString('pt-BR')}
            delta="+34 esta semana"
            positive={true}
            icon={Wrench}
            color="text-amber-400"
            bg="bg-amber-400/10"
            sub="Meta: 500 no launch"
          />
          <KpiCard
            label="Clientes Ativos"
            value={MARKETPLACE.clientesAtivos.toLocaleString('pt-BR')}
            delta="+112 esta semana"
            positive={true}
            icon={Users}
            color="text-teal"
            bg="bg-teal/10"
            sub="Meta: 2.000 no launch"
          />
          <KpiCard
            label="GMV Acumulado"
            value={`R$${(MARKETPLACE.gmv / 1000).toFixed(0)}k`}
            delta="+18% mês"
            positive={true}
            icon={BarChart2}
            color="text-orange-400"
            bg="bg-orange-400/10"
            sub="Volume de serviços"
          />
          <KpiCard
            label="CAC Médio"
            value={`R$${MARKETPLACE.cac.toFixed(2)}`}
            delta="-12% vs mês ant."
            positive={true}
            icon={Zap}
            color="text-violet-400"
            bg="bg-violet-400/10"
            sub="Custo aquisição"
          />
          <KpiCard
            label="Campanhas Ativas"
            value={activeCampaigns}
            delta="+2 esta semana"
            positive={true}
            icon={Megaphone}
            color="text-red-400"
            bg="bg-red-400/10"
            sub={`${campaigns.filter(c => c.status === 'Aprovada').length} aprovadas`}
          />
        </div>
      </div>

      {/* ── ROW 2: Revenue + Dual Funnel ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        {/* Revenue Chart */}
        <Card className="col-span-2 border-border bg-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Receita vs Meta — Últimos 6 Meses
            </CardTitle>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded" style={{ background: C.orange }} />Receita</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded border border-border bg-transparent" style={{ borderColor: C.teal }} />Meta</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded bg-border" />Custo</span>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.orange} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={C.orange} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gCusto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.red} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={C.red} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis tickFormatter={v => `${v / 1000}k`} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} width={38} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v: number) => `R$${v.toLocaleString('pt-BR')}`}
                />
                <Area type="monotone" dataKey="custo" stroke={C.red} strokeWidth={1.5} fill="url(#gCusto)" name="Custo" />
                <Area type="monotone" dataKey="receita" stroke={C.orange} strokeWidth={2.5} fill="url(#gRec)" name="Receita" dot={{ fill: C.orange, r: 3 }} />
                <Line type="monotone" dataKey="meta" stroke={C.teal} strokeWidth={1.5} strokeDasharray="5 4" dot={false} name="Meta" />
              </AreaChart>
            </ResponsiveContainer>

            {/* Financial Summary Strip */}
            <div className="mt-3 grid grid-cols-3 divide-x divide-border border-t border-border pt-3">
              {[
                { label: 'Receita Fev', val: 'R$81k', delta: '+19%', up: true },
                { label: 'Margem Bruta', val: '61.7%', delta: '+4pp', up: true },
                { label: 'CAC Médio', val: `R$${MARKETPLACE.cac.toFixed(2)}`, delta: '-12%', up: true },
              ].map(({ label, val, delta, up }) => (
                <div key={label} className="px-3 text-center first:pl-0 last:pr-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-base font-black text-foreground">{val}</p>
                  <p className={`text-[10px] font-semibold ${up ? 'text-green-400' : 'text-red-400'}`}>{delta} vs mês ant.</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dual Conversion Funnel */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Target className="h-4 w-4 text-teal" />
              Funis de Conversão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <FunnelColumn
                title="Clientes"
                icon={Users}
                color={C.teal}
                items={clienteFunnel}
              />
              <div className="w-px bg-border shrink-0" />
              <FunnelColumn
                title="Prestadores"
                icon={Wrench}
                color={C.orange}
                items={prestadorFunnel}
              />
            </div>

            {/* Channel mix */}
            <div className="pt-3 mt-3 border-t border-border">
              <p className="text-[10px] text-muted-foreground mb-2 font-semibold uppercase tracking-wider">Mix de Canais</p>
              <div className="flex items-center gap-2">
                <PieChart width={64} height={64}>
                  <Pie data={channelData} cx={32} cy={32} innerRadius={18} outerRadius={30} dataKey="value">
                    {channelData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
                <div className="space-y-1 flex-1">
                  {channelData.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: d.color, display: 'inline-block' }} />
                        <span className="text-muted-foreground">{d.name}</span>
                      </div>
                      <span className="font-bold text-foreground">{d.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── ROW 3: AI Insights + Marketplace Liquidity ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* AI Insights Panel */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-400" />
              AI Insights — Top 3 Prioridades
            </CardTitle>
            <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px]">IA</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {aiInsights.map((insight, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-muted/20 overflow-hidden transition-all duration-200"
              >
                <button
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedInsight(expandedInsight === i ? null : i)}
                >
                  <ImpactBadge impact={insight.impact} />
                  <span className="flex-1 text-xs font-semibold text-foreground">{insight.title}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${expandedInsight === i ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedInsight === i && (
                  <div className="px-3 pb-3 border-t border-border/50">
                    <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{insight.detail}</p>
                    <button
                      onClick={() => navigate('/analytics')}
                      className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
                    >
                      Ver analytics <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Marketplace Liquidity */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Gauge className="h-4 w-4 text-teal" />
              Liquidez do Marketplace
            </CardTitle>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ color: liquidityColor, background: `${liquidityColor}20` }}
            >
              {liquidityLabel}
            </span>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Gauge bar */}
            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
                <span>Falta Oferta</span>
                <span>Equilibrado</span>
                <span>Sobra Oferta</span>
              </div>
              <div className="h-3 w-full rounded-full bg-border overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${liquidityPct}%`, background: `linear-gradient(90deg, ${C.red}, ${C.green}, ${C.amber})` }}
                />
                <div
                  className="absolute top-0 h-full w-0.5 bg-white/50"
                  style={{ left: '50%' }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-muted-foreground/50 mt-1">
                <span>0</span>
                <span>Ratio ideal: 1:1</span>
                <span>∞</span>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Prestadores', value: MARKETPLACE.prestadoresAtivos.toLocaleString('pt-BR'), color: C.orange, icon: Wrench },
                { label: 'Solicitações', value: MARKETPLACE.solicitacoesAtivas.toLocaleString('pt-BR'), color: C.teal, icon: Users },
                { label: 'Taxa Match', value: `${MARKETPLACE.taxaMatch}%`, color: C.green, icon: CheckCircle2 },
              ].map(({ label, value, color, icon: Icon }) => (
                <div key={label} className="rounded-lg border border-border bg-muted/20 p-2.5 text-center">
                  <Icon className="h-3.5 w-3.5 mx-auto mb-1" style={{ color }} />
                  <p className="text-sm font-black" style={{ color }}>{value}</p>
                  <p className="text-[9px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            {/* Match rate bar */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground font-medium">Taxa de Match</span>
                <span className="font-bold text-green-400">{MARKETPLACE.taxaMatch}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${MARKETPLACE.taxaMatch}%`, background: C.green }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {Math.round(MARKETPLACE.solicitacoesAtivas * MARKETPLACE.taxaMatch / 100)} de {MARKETPLACE.solicitacoesAtivas} solicitações matched
              </p>
            </div>

            {/* Category insight */}
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
              <p className="text-[10px] font-semibold text-amber-400">⚠ Limpeza e Elétrica com maior gap de oferta</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Considere campanhas de aquisição de prestadores nessas categorias.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── ROW 4: Team Demands + Bottlenecks ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* Team Workload */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Carga do Time
            </CardTitle>
            <div className="text-[10px] text-muted-foreground">
              {totalTeamDone}/{totalTeamTasks} concluídas · <span className="text-amber-400">{totalOverdue} atrasadas</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {teamDemands.map((m) => {
              const pct = Math.round((m.done / m.total) * 100);
              return (
                <div key={m.member} className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-2 ${m.ring} ${m.bg} text-xs font-black`}
                    style={{ color: m.color }}>
                    {m.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="text-xs font-semibold text-foreground">{m.member}</span>
                        <span className="text-[10px] text-muted-foreground ml-1.5">{m.role}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-muted-foreground">{m.done}/{m.total}</span>
                        {m.overdue > 0 && (
                          <span className="bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded font-semibold">
                            {m.overdue} atraso
                          </span>
                        )}
                        <span className="font-bold text-foreground">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: m.color }} />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Velocity chart */}
            <div className="pt-2 border-t border-border">
              <p className="text-[10px] text-muted-foreground mb-2 font-semibold uppercase tracking-wider">Velocidade de Entrega (6 sem.)</p>
              <ResponsiveContainer width="100%" height={70}>
                <BarChart data={weeklyVelocity} barGap={2}>
                  <XAxis dataKey="week" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: '11px' }} />
                  <Bar dataKey="tasks" fill="hsl(var(--border))" radius={[3, 3, 0, 0]} name="Planejado" />
                  <Bar dataKey="delivered" fill={C.orange} radius={[3, 3, 0, 0]} name="Entregue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bottlenecks */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Flame className="h-4 w-4 text-red-400" />
              Gargalos & Atenção Imediata
            </CardTitle>
            <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]">
              {bottlenecks.filter(b => b.severity === 'high').length} críticos
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {bottlenecks.map((b, i) => {
              const severityStyle = {
                high: 'border-red-500/25 bg-red-500/5',
                medium: 'border-amber-500/25 bg-amber-500/5',
                low: 'border-border bg-muted/20',
              }[b.severity];
              const textColor = { high: 'text-red-400', medium: 'text-amber-400', low: 'text-muted-foreground' }[b.severity];
              return (
                <div key={i} className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${severityStyle}`}>
                  <SeverityDot severity={b.severity} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${textColor}`}>{b.label}</p>
                    <p className="text-[10px] text-muted-foreground">Responsável: {b.owner} · {b.days}d sem ação</p>
                  </div>
                  <b.icon className={`h-4 w-4 shrink-0 ${textColor} opacity-70`} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* ── ROW 5: Goals + ROAS + Timeline ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        {/* Monthly Goals */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-400" />
              Metas do Mês — Fevereiro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {goalsData.map(g => (
              <GoalBar key={g.label} {...g} />
            ))}

            <div className="pt-3 border-t border-border space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">ROAS por Campanha</p>
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={roasData} layout="vertical" margin={{ left: 0 }}>
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="camp" width={70} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: '11px' }} formatter={(v: number) => `${v}x`} />
                  <Bar dataKey="roas" radius={[0, 4, 4, 0]} name="ROAS">
                    {roasData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Content */}
        <Card className="col-span-1 lg:col-span-2 border-border bg-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Próximas Publicações
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => navigate('/calendario')}>
              Calendário <ChevronRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingContent.map((item) => {
              const d = new Date(item.date);
              const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
              return (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3 hover:border-primary/30 transition-colors group cursor-pointer">
                  <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-card border border-border text-center">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">{months[d.getMonth()]}</span>
                    <span className="text-sm font-black text-primary leading-none">{d.getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground">{item.responsible} · {item.channel}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${FORMAT_COLORS[item.format] ?? 'bg-muted text-muted-foreground'}`}>
                      {item.format}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Alerts strip */}
            <div className="pt-2 border-t border-border">
              <div className="flex items-center gap-2 flex-wrap">
                {urgentCampaigns.length > 0 && (
                  <div className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1.5">
                    <AlertCircle className="h-3 w-3 text-red-400" />
                    <span className="text-[10px] font-semibold text-red-400">{urgentCampaigns.length} campanha(s) vencendo em 7 dias</span>
                  </div>
                )}
                {urgentCampaigns.length === 0 && (
                  <div className="flex items-center gap-1.5 rounded-lg border border-green-500/20 bg-green-500/5 px-2.5 py-1.5">
                    <CheckCircle2 className="h-3 w-3 text-green-400" />
                    <span className="text-[10px] font-semibold text-green-400">Prazos em dia</span>
                  </div>
                )}
                <div className="ml-auto flex gap-2">
                  {[
                    { label: 'Nova campanha', path: '/campanhas', icon: Plus },
                    { label: 'Kanban', path: '/kanban', icon: ArrowRight },
                  ].map(({ label, path, icon: Icon }) => (
                    <button key={label} onClick={() => navigate(path)}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-[10px] font-semibold text-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary transition-all">
                      <Icon className="h-3 w-3" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── FOOTER: Quick Actions ── */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0">Ações Rápidas</span>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Ver Gargalos', icon: Flame, style: 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20', path: null },
            { label: 'Ver Canais', icon: BarChart3, style: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20', path: '/analytics' },
            { label: 'Ver Marketplace', icon: Gauge, style: 'bg-teal/10 text-teal border-teal/20 hover:bg-teal/20', path: '/analytics' },
          ].map(({ label, icon: Icon, style, path }) => (
            <button
              key={label}
              onClick={() => path && navigate(path)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${style}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <button
            onClick={() => navigate('/analytics')}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-border/80 transition-all"
          >
            <FileText className="h-3.5 w-3.5" />
            Gerar Relatório
          </button>
        </div>
      </div>

    </div>
  );
}
