import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  Users, Eye, Activity, Target, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, RefreshCw, Globe, Smartphone,
  Monitor, Tablet, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ORANGE = 'hsl(33, 100%, 50%)';
const TEAL = 'hsl(185, 100%, 36%)';
const PURPLE = 'hsl(262, 83%, 58%)';
const BLUE = 'hsl(217, 91%, 60%)';
const GREEN = 'hsl(142, 71%, 45%)';
const RED = 'hsl(0, 72%, 51%)';
const AMBER = 'hsl(38, 92%, 50%)';

interface GA4Row {
  metric_date: string;
  sessions: number | null;
  total_users: number | null;
  new_users: number | null;
  page_views: number | null;
  avg_session_duration: number | null;
  bounce_rate: number | null;
  conversions: number | null;
  conversion_rate: number | null;
  events_count: number | null;
  source_medium: string | null;
  landing_page: string | null;
  device_category: string | null;
}

function KpiCard({ label, value, delta, positive, icon: Icon, color }: {
  label: string; value: string; delta?: string; positive?: boolean; icon: React.ElementType; color: string;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="rounded-lg p-1.5" style={{ background: `${color}20` }}>
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</span>
        </div>
        <p className="text-2xl font-black text-foreground">{value}</p>
        {delta && (
          <div className={cn(
            'flex items-center gap-1 text-[11px] font-semibold mt-1',
            positive ? 'text-green-400' : 'text-red-400'
          )}>
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {delta}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function GA4Tab({ period = '30d' }: { period?: '7d' | '30d' | '90d' }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<GA4Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const { data: rows, error } = await supabase
      .from('ga4_metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('metric_date', { ascending: true })
      .limit(1000);

    if (error) {
      toast({ title: 'Erro ao carregar GA4', description: error.message, variant: 'destructive' });
    } else {
      setData((rows || []) as GA4Row[]);
    }
    setLoading(false);
  };

  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('sync-ga4', {
        body: { days: 30 },
      });
      if (error) throw error;
      if (res?.success) {
        toast({ title: 'GA4 sincronizado', description: `${res.synced_rows} registros atualizados` });
        await fetchData();
      } else {
        toast({ title: 'Erro na sincronização', description: res?.error || 'Erro desconhecido', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
    setSyncing(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  // Filter by period
  const filteredData = useMemo(() => {
    const now = new Date();
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return data.filter(r => r.metric_date >= cutoffStr);
  }, [data, period]);

  // Aggregate by date for trend charts
  const dailyTrend = useMemo(() => {
    const map = new Map<string, { date: string; sessions: number; users: number; newUsers: number; pageViews: number; bounceRate: number; conversions: number; conversionRate: number; events: number; count: number }>();
    for (const row of filteredData) {
      const d = row.metric_date;
      const existing = map.get(d) || { date: d, sessions: 0, users: 0, newUsers: 0, pageViews: 0, bounceRate: 0, conversions: 0, conversionRate: 0, events: 0, count: 0 };
      existing.sessions += row.sessions || 0;
      existing.users += row.total_users || 0;
      existing.newUsers += row.new_users || 0;
      existing.pageViews += row.page_views || 0;
      existing.bounceRate += row.bounce_rate || 0;
      existing.conversions += row.conversions || 0;
      existing.conversionRate += row.conversion_rate || 0;
      existing.events += row.events_count || 0;
      existing.count += 1;
      map.set(d, existing);
    }
    return Array.from(map.values())
      .map(d => ({ ...d, bounceRate: d.count > 0 ? d.bounceRate / d.count : 0, conversionRate: d.count > 0 ? d.conversionRate / d.count : 0 }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData]);

  // Totals
  const totals = useMemo(() => {
    const sessions = filteredData.reduce((s, r) => s + (r.sessions || 0), 0);
    const users = filteredData.reduce((s, r) => s + (r.total_users || 0), 0);
    const newUsers = filteredData.reduce((s, r) => s + (r.new_users || 0), 0);
    const pageViews = filteredData.reduce((s, r) => s + (r.page_views || 0), 0);
    const conversions = filteredData.reduce((s, r) => s + (r.conversions || 0), 0);
    const events = filteredData.reduce((s, r) => s + (r.events_count || 0), 0);
    const avgBounce = filteredData.length > 0 ? filteredData.reduce((s, r) => s + (r.bounce_rate || 0), 0) / filteredData.length : 0;
    const avgDuration = filteredData.length > 0 ? filteredData.reduce((s, r) => s + (r.avg_session_duration || 0), 0) / filteredData.length : 0;
    const avgConvRate = filteredData.length > 0 ? filteredData.reduce((s, r) => s + (r.conversion_rate || 0), 0) / filteredData.length : 0;
    return { sessions, users, newUsers, pageViews, conversions, events, avgBounce, avgDuration, avgConvRate };
  }, [filteredData]);

  // Top sources
  const topSources = useMemo(() => {
    const map = new Map<string, { source: string; sessions: number; users: number; conversions: number }>();
    for (const row of filteredData) {
      const src = row.source_medium || '(direct)';
      const existing = map.get(src) || { source: src, sessions: 0, users: 0, conversions: 0 };
      existing.sessions += row.sessions || 0;
      existing.users += row.total_users || 0;
      existing.conversions += row.conversions || 0;
      map.set(src, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.sessions - a.sessions).slice(0, 8);
  }, [filteredData]);

  // Device breakdown
  const deviceBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of filteredData) {
      const dev = row.device_category || 'unknown';
      map.set(dev, (map.get(dev) || 0) + (row.sessions || 0));
    }
    const colors: Record<string, string> = { mobile: BLUE, desktop: PURPLE, tablet: TEAL, unknown: AMBER };
    return Array.from(map.entries()).map(([name, value]) => ({ name, value, color: colors[name] || ORANGE })).sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // Top landing pages
  const topPages = useMemo(() => {
    const map = new Map<string, { page: string; sessions: number; pageViews: number }>();
    for (const row of filteredData) {
      const page = row.landing_page || '/';
      const existing = map.get(page) || { page, sessions: 0, pageViews: 0 };
      existing.sessions += row.sessions || 0;
      existing.pageViews += row.page_views || 0;
      map.set(page, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.sessions - a.sessions).slice(0, 8);
  }, [filteredData]);

  const formatNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  const formatDate = (d: string) => {
    try { return format(parseISO(d), 'dd/MM', { locale: ptBR }); } catch { return d; }
  };
  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.round(s % 60);
    return `${mins}m${secs.toString().padStart(2, '0')}s`;
  };

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Carregando dados do GA4...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-8 text-center">
          <Globe className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-bold text-foreground mb-1">Nenhum dado GA4 encontrado</h3>
          <p className="text-sm text-muted-foreground mb-4">Sincronize os dados do Google Analytics 4 para visualizar as métricas.</p>
          <Button onClick={handleSync} disabled={syncing} size="sm">
            <RefreshCw className={cn('h-4 w-4 mr-2', syncing && 'animate-spin')} />
            {syncing ? 'Sincronizando...' : 'Sincronizar GA4'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const dateRange = dailyTrend.length > 0
    ? `${formatDate(dailyTrend[0].date)} — ${formatDate(dailyTrend[dailyTrend.length - 1].date)}`
    : '';

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Google Analytics 4
            <Badge variant="outline" className="text-[10px] font-mono">{data.length} registros</Badge>
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Período: {dateRange}</p>
        </div>
        <Button onClick={handleSync} disabled={syncing} size="sm" variant="outline" className="text-xs">
          <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', syncing && 'animate-spin')} />
          {syncing ? 'Sincronizando...' : 'Atualizar'}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard label="Sessões" value={formatNum(totals.sessions)} icon={Activity} color={BLUE} />
        <KpiCard label="Usuários" value={formatNum(totals.users)} icon={Users} color={PURPLE} />
        <KpiCard label="Taxa de Rejeição" value={`${totals.avgBounce.toFixed(1)}%`} icon={TrendingDown} color={RED} />
        <KpiCard label="Conversões" value={formatNum(totals.conversions)} icon={Target} color={GREEN} />
        <KpiCard label="Duração Média" value={formatDuration(totals.avgDuration)} icon={Eye} color={TEAL} />
      </div>

      {/* Main trend chart: Sessions + Users */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">Tendência — Sessões & Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend}>
                <defs>
                  <linearGradient id="gradSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BLUE} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={BLUE} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PURPLE} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={PURPLE} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  labelFormatter={formatDate}
                />
                <Area type="monotone" dataKey="sessions" name="Sessões" stroke={BLUE} fill="url(#gradSessions)" strokeWidth={2} />
                <Area type="monotone" dataKey="users" name="Usuários" stroke={PURPLE} fill="url(#gradUsers)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Secondary charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bounce Rate & Conversion Rate trend */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Taxa de Rejeição & Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrend}>
                  <defs>
                    <linearGradient id="gradBounce" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={RED} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={RED} stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="gradConv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GREEN} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={GREEN} stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    labelFormatter={formatDate}
                    formatter={(v: number) => [`${v.toFixed(1)}%`]}
                  />
                  <Area type="monotone" dataKey="bounceRate" name="Rejeição" stroke={RED} fill="url(#gradBounce)" strokeWidth={2} />
                  <Area type="monotone" dataKey="conversionRate" name="Conversão" stroke={GREEN} fill="url(#gradConv)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Device breakdown pie */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Dispositivos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="h-48 w-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={deviceBreakdown} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                      {deviceBreakdown.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [formatNum(v), 'Sessões']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 flex-1">
                {deviceBreakdown.map(d => {
                  const total = deviceBreakdown.reduce((s, x) => s + x.value, 0);
                  const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0';
                  const Icon = d.name === 'mobile' ? Smartphone : d.name === 'tablet' ? Tablet : Monitor;
                  return (
                    <div key={d.name} className="flex items-center gap-3">
                      <Icon className="h-4 w-4" style={{ color: d.color }} />
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-foreground capitalize">{d.name}</span>
                          <span className="text-muted-foreground">{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: d.color }} />
                        </div>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground w-12 text-right">{formatNum(d.value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom tables row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Sources */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              Top Fontes de Tráfego
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Fonte/Meio', 'Sessões', 'Usuários', 'Conv.'].map(h => (
                      <th key={h} className="pb-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pr-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topSources.map((s, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="py-2 pr-3 text-xs font-medium text-foreground truncate max-w-[200px]">{s.source}</td>
                      <td className="py-2 pr-3 text-xs tabular-nums text-foreground">{formatNum(s.sessions)}</td>
                      <td className="py-2 pr-3 text-xs tabular-nums text-muted-foreground">{formatNum(s.users)}</td>
                      <td className="py-2 pr-3 text-xs tabular-nums text-muted-foreground">{s.conversions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Top Landing Pages */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              Top Landing Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Página', 'Sessões', 'Page Views'].map(h => (
                      <th key={h} className="pb-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pr-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topPages.map((p, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="py-2 pr-3 text-xs font-medium text-foreground truncate max-w-[200px]" title={p.page}>{p.page}</td>
                      <td className="py-2 pr-3 text-xs tabular-nums text-foreground">{formatNum(p.sessions)}</td>
                      <td className="py-2 pr-3 text-xs tabular-nums text-muted-foreground">{formatNum(p.pageViews)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Page Views bar chart */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">Visualizações de Página por Dia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  labelFormatter={formatDate}
                />
                <Bar dataKey="pageViews" name="Page Views" fill={ORANGE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Opportunities Section */}
      <OpportunitiesSection data={filteredData} formatNum={formatNum} />
    </div>
  );
}

/* ── Opportunities Table ── */
function OpportunitiesSection({ data, formatNum }: { data: GA4Row[]; formatNum: (n: number) => string }) {
  const opportunities = useMemo(() => {
    const map = new Map<string, { page: string; source: string; sessions: number; conversions: number; bounceRate: number; count: number }>();
    for (const row of data) {
      const page = row.landing_page || '/';
      const source = row.source_medium || '(direct)';
      const key = `${page}||${source}`;
      const ex = map.get(key) || { page, source, sessions: 0, conversions: 0, bounceRate: 0, count: 0 };
      ex.sessions += row.sessions || 0;
      ex.conversions += row.conversions || 0;
      ex.bounceRate += row.bounce_rate || 0;
      ex.count += 1;
      map.set(key, ex);
    }

    return Array.from(map.values())
      .map(item => {
        const avgBounce = item.count > 0 ? item.bounceRate / item.count : 0;
        const convRate = item.sessions > 0 ? (item.conversions / item.sessions) * 100 : 0;

        // Score: high traffic + low conversion = CRO opportunity; high conversion + low volume = scale opportunity
        let action: 'Escalar' | 'Otimizar CRO' | 'Investigar' = 'Investigar';
        let score = 0;

        if (item.sessions > 50 && convRate < 2) {
          action = 'Otimizar CRO';
          score = Math.min(100, item.sessions / 5 + (100 - convRate * 10));
        } else if (convRate >= 5 && item.sessions < 100) {
          action = 'Escalar';
          score = Math.min(100, convRate * 10 + (100 - item.sessions));
        } else {
          score = Math.max(0, 50 - item.sessions / 10 + convRate * 5);
        }

        return { ...item, avgBounce, convRate, action, score: Math.round(score) };
      })
      .filter(i => i.sessions >= 5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [data]);

  if (opportunities.length === 0) return null;

  const actionColors: Record<string, string> = {
    'Escalar': 'bg-green-500/15 text-green-400',
    'Otimizar CRO': 'bg-amber-500/15 text-amber-400',
    'Investigar': 'bg-blue-500/15 text-blue-400',
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-primary" />
          Oportunidades de Keywords & Serviços
          <Badge variant="outline" className="text-[10px]">Análise cruzada</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Landing Page', 'Fonte', 'Sessões', 'Conv.', 'Conv. %', 'Bounce %', 'Score', 'Ação'].map(h => (
                  <th key={h} className="pb-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pr-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {opportunities.map((o, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="py-2 pr-3 text-xs font-medium text-foreground truncate max-w-[180px]" title={o.page}>{o.page}</td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground truncate max-w-[120px]">{o.source}</td>
                  <td className="py-2 pr-3 text-xs tabular-nums text-foreground">{formatNum(o.sessions)}</td>
                  <td className="py-2 pr-3 text-xs tabular-nums text-foreground">{o.conversions}</td>
                  <td className="py-2 pr-3 text-xs tabular-nums text-foreground">{o.convRate.toFixed(1)}%</td>
                  <td className="py-2 pr-3 text-xs tabular-nums text-muted-foreground">{o.avgBounce.toFixed(1)}%</td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-12 rounded-full bg-border overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${o.score}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">{o.score}</span>
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', actionColors[o.action])}>
                      {o.action}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex gap-4 text-[10px] text-muted-foreground">
          <span><span className="inline-block h-2 w-2 rounded-full bg-green-400 mr-1" />Escalar = alta conversão, baixo volume</span>
          <span><span className="inline-block h-2 w-2 rounded-full bg-amber-400 mr-1" />Otimizar CRO = alto tráfego, baixa conversão</span>
          <span><span className="inline-block h-2 w-2 rounded-full bg-blue-400 mr-1" />Investigar = análise necessária</span>
        </div>
      </CardContent>
    </Card>
  );
}
