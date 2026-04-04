import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  TrendingUp, DollarSign, Target, Globe, ArrowUpRight,
  ArrowDownRight, RefreshCw, Megaphone, MousePointerClick, Eye, ExternalLink,
  Brain, Sparkles, Upload, FileText, Calendar, ChevronRight, AlertTriangle, Lightbulb,
} from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import GA4Tab from '@/components/analytics/GA4Tab';
import FinancialHealthTab from '@/components/analytics/FinancialHealthTab';
import FunnelEndToEnd from '@/components/analytics/FunnelEndToEnd';
import BrazilHeatmap from '@/components/analytics/BrazilHeatmap';
import { cn } from '@/lib/utils';
import { MapPin } from 'lucide-react';

const ORANGE = 'hsl(33, 100%, 50%)';
const TEAL = 'hsl(185, 100%, 36%)';
const PURPLE = 'hsl(262, 83%, 58%)';
const BLUE = 'hsl(217, 91%, 60%)';
const GREEN = 'hsl(142, 71%, 45%)';
const RED = 'hsl(0, 72%, 51%)';

// ── Meta Ads Tab (real data from DQEF account) ───────────────
const DQEF_AD_ACCOUNT_ID = 'act_1066aborger';

interface AdAccount { id: string; name: string; status: number; status_label: string; }
interface MetaAd {
  id: string; ad_id: string; ad_name: string | null; campaign_name: string | null;
  impressions: number | null; clicks: number | null; spend: number | null;
  cpc: number | null; cpm: number | null; ctr: number | null; conversions: number | null;
  date_start: string | null; date_stop: string | null; ad_account_id: string;
}

interface AggregatedAd {
  ad_id: string;
  ad_name: string;
  campaign_name: string;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  avgCTR: number;
  avgCPC: number;
  dateRanges: string[];
  score: number;
  scoreLabel: string;
  rowCount: number;
}

const fmtNum = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
};

function computeCreativeScore(ad: AggregatedAd): { score: number; label: string } {
  const cn = ad.campaign_name.toLowerCase();
  let ctrW = 0.3, cpcW = 0.2, convW = 0.3, effW = 0.2;
  if (cn.includes('conver')) { ctrW = 0.15; cpcW = 0.15; convW = 0.5; effW = 0.2; }
  else if (cn.includes('tráfego') || cn.includes('trafego')) { ctrW = 0.45; cpcW = 0.3; convW = 0.1; effW = 0.15; }
  else if (cn.includes('alcance') || cn.includes('reconhecimento')) { ctrW = 0.2; cpcW = 0.1; convW = 0.1; effW = 0.6; }

  const ctrScore = Math.min(ad.avgCTR * 25, 100);
  const cpcScore = ad.avgCPC > 0 ? Math.min((2 / ad.avgCPC) * 50, 100) : 0;
  const convScore = Math.min(ad.totalConversions * 10, 100);
  const effScore = ad.totalImpressions > 0 ? Math.min(((ad.totalImpressions / Math.max(ad.totalSpend, 1)) / 1000) * 50, 100) : 0;

  const finalScore = Math.round(ctrScore * ctrW + cpcScore * cpcW + convScore * convW + effScore * effW);
  const label = finalScore >= 80 ? 'Excelente' : finalScore >= 60 ? 'Bom' : finalScore >= 40 ? 'Regular' : finalScore >= 20 ? 'Baixo' : 'Fraco';
  return { score: finalScore, label };
}

function ScoreBadgeAd({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10'
    : score >= 60 ? 'text-blue-500 border-blue-500/30 bg-blue-500/10'
    : score >= 40 ? 'text-amber-500 border-amber-500/30 bg-amber-500/10'
    : 'text-red-500 border-red-500/30 bg-red-500/10';
  return <Badge variant="outline" className={cn("text-[9px] font-bold", color)}>{score}pts · {label}</Badge>;
}

function MetaAdsRealTab({ period = '30d' }: { period?: '7d' | '30d' | '90d' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast: showToast } = useToast();
  const [ads, setAds] = useState<MetaAd[]>([]);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [syncing, setSyncing] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) { fetchAds(); loadAdAccounts(); } }, [user]);

  async function loadAdAccounts() {
    setLoadingAccounts(true);
    try {
      const { data } = await supabase.functions.invoke('sync-meta-insights', { body: { list_accounts: true } });
      if (data?.ad_accounts) {
        const accounts = data.ad_accounts as AdAccount[];
        setAdAccounts(accounts);
        if (accounts.length > 0 && !selectedAccount) {
          const dqefAccount = accounts.find(a => a.name?.toLowerCase().includes('gabriel merhy'));
          setSelectedAccount(dqefAccount?.id || accounts[0].id);
        }
      }
    } catch {}
    setLoadingAccounts(false);
  }

  async function fetchAds() {
    setLoading(true);
    const { data } = await supabase.from('meta_ads_performance').select('*').order('spend', { ascending: false }).limit(500);
    if (data) setAds(data as MetaAd[]);
    setLoading(false);
  }

  async function syncAds() {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-meta-insights', {
        body: { sync_type: 'ads', ad_account_id: selectedAccount || undefined }
      });
      if (error) throw error;
      if (data?.success) {
        showToast({ title: `✅ ${data.synced_ads} anúncios sincronizados!`, description: `Conta: ${data.ad_account_name || selectedAccount}` });
        await fetchAds();
      } else {
        showToast({ title: 'Erro na sincronização', description: data?.error || 'Erro desconhecido', variant: 'destructive' });
      }
    } catch (err) {
      showToast({ title: 'Erro', description: err instanceof Error ? err.message : 'Falha', variant: 'destructive' });
    }
    setSyncing(false);
  }

  function handleUseAsReference(ad: AggregatedAd) {
    const refBriefing = [
      '📊 REFERÊNCIA DE ANÚNCIO META ADS:',
      `Anúncio: "${ad.ad_name}"`,
      `Campanha: ${ad.campaign_name}`,
      `Invest.: R$${ad.totalSpend.toFixed(2)} | Impressões: ${fmtNum(ad.totalImpressions)}`,
      `CTR: ${ad.avgCTR.toFixed(2)}% | CPC: R$${ad.avgCPC.toFixed(2)}`,
      `Conversões: ${ad.totalConversions} | Score: ${ad.score}pts (${ad.scoreLabel})`,
      '➡️ Criar criativo que SUPERE esta performance.',
    ].join('\n');
    localStorage.setItem('ig_ref_to_criativo', JSON.stringify({
      caption: refBriefing, engRate: ad.avgCTR.toFixed(2),
      likes: ad.totalClicks, saves: ad.totalConversions, shares: 0,
    }));
    navigate('/criativo');
    showToast({ title: '📋 Referência carregada', description: `"${ad.ad_name}" enviado para AI Criativo` });
  }

  // Date filter
  const cutoffDate = useMemo(() => {
    const now = new Date();
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    now.setDate(now.getDate() - days);
    return now.toISOString().slice(0, 10);
  }, [period]);

  const dateFilteredAds = selectedAccount ? ads.filter(a => a.ad_account_id === selectedAccount) : ads;
  const filteredAds = dateFilteredAds.filter(a => !a.date_start || a.date_start >= cutoffDate);

  // Aggregate by ad_id
  const adMap = new Map<string, AggregatedAd>();
  filteredAds.forEach(a => {
    const key = a.ad_id;
    if (!adMap.has(key)) {
      adMap.set(key, {
        ad_id: a.ad_id,
        ad_name: a.ad_name || 'Sem nome',
        campaign_name: a.campaign_name || 'Sem campanha',
        totalSpend: 0, totalImpressions: 0, totalClicks: 0, totalConversions: 0,
        avgCTR: 0, avgCPC: 0, dateRanges: [], score: 0, scoreLabel: '', rowCount: 0,
      });
    }
    const agg = adMap.get(key)!;
    agg.totalSpend += Number(a.spend) || 0;
    agg.totalImpressions += a.impressions || 0;
    agg.totalClicks += a.clicks || 0;
    agg.totalConversions += Number(a.conversions) || 0;
    agg.rowCount++;
    if (a.date_start && a.date_stop) agg.dateRanges.push(`${a.date_start} ~ ${a.date_stop}`);
  });

  const aggregated = Array.from(adMap.values()).map(ad => {
    ad.avgCTR = ad.totalImpressions > 0 ? (ad.totalClicks / ad.totalImpressions) * 100 : 0;
    ad.avgCPC = ad.totalClicks > 0 ? ad.totalSpend / ad.totalClicks : 0;
    const { score, label } = computeCreativeScore(ad);
    ad.score = score;
    ad.scoreLabel = label;
    return ad;
  }).sort((a, b) => b.totalSpend - a.totalSpend);

  const totalSpend = aggregated.reduce((s, a) => s + a.totalSpend, 0);
  const totalImpressions = aggregated.reduce((s, a) => s + a.totalImpressions, 0);
  const totalClicks = aggregated.reduce((s, a) => s + a.totalClicks, 0);
  const totalConversions = aggregated.reduce((s, a) => s + a.totalConversions, 0);
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;

  // Campaign pie chart
  const campaignMap = new Map<string, number>();
  aggregated.forEach(a => {
    const key = a.campaign_name;
    campaignMap.set(key, (campaignMap.get(key) || 0) + a.totalSpend);
  });
  const campaignPie = Array.from(campaignMap.entries())
    .map(([name, spend]) => ({ name: name.length > 30 ? name.slice(0, 30) + '…' : name, value: spend }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const PIE_COLORS = [BLUE, ORANGE, PURPLE, TEAL, GREEN, RED];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header with sync */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Meta Ads — Dados Reais</h2>
          <Badge variant="outline" className="text-[10px] font-mono">
            {aggregated.length} anúncios · {ads.length} registros
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {adAccounts.length > 0 && (
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="w-[220px] h-8 text-xs">
                <SelectValue placeholder="Selecionar conta" />
              </SelectTrigger>
              <SelectContent>
                {adAccounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id} className="text-xs">
                    {acc.name || acc.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button size="sm" variant="outline" onClick={syncAds} disabled={syncing} className="h-8 text-xs">
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", syncing && "animate-spin")} />
            {syncing ? 'Sincronizando...' : 'Sync Meta'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : aggregated.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center">
            <Megaphone className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum anúncio encontrado. Clique em "Sync Meta" para importar dados.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            {[
              { label: 'Investimento', value: `R$${fmtNum(totalSpend)}`, icon: DollarSign, color: ORANGE },
              { label: 'Impressões', value: fmtNum(totalImpressions), icon: Eye, color: PURPLE },
              { label: 'Cliques', value: fmtNum(totalClicks), icon: MousePointerClick, color: BLUE },
              { label: 'CTR Médio', value: `${avgCTR.toFixed(2)}%`, icon: Target, color: TEAL },
              { label: 'CPC Médio', value: `R$${avgCPC.toFixed(2)}`, icon: DollarSign, color: GREEN },
              { label: 'Conversões', value: fmtNum(totalConversions), icon: TrendingUp, color: GREEN },
            ].map(kpi => (
              <Card key={kpi.label} className="border-border bg-card">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <kpi.icon className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">{kpi.label}</span>
                  </div>
                  <p className="text-lg font-black text-foreground">{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Chart + Table */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Spend por Campanha</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={campaignPie} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={2}>
                        {campaignPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
                        formatter={(v: number) => [`R$${v.toFixed(2)}`]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1 mt-2">
                  {campaignPie.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2 text-[10px]">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-muted-foreground truncate flex-1">{c.name}</span>
                      <span className="font-semibold text-foreground">R${c.value.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Ranking de Anúncios (Agregado)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        {['Anúncio', 'Campanha', 'Spend', 'Imp.', 'Cliques', 'CTR', 'CPC', 'Conv.', 'Score', ''].map(h => (
                          <TableHead key={h} className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aggregated.slice(0, 30).map(ad => (
                        <TableRow key={ad.ad_id} className="border-border/40 hover:bg-muted/20">
                          <TableCell className="text-xs font-medium max-w-[160px] truncate" title={ad.ad_name}>{ad.ad_name}</TableCell>
                          <TableCell className="text-[10px] text-muted-foreground max-w-[120px] truncate" title={ad.campaign_name}>{ad.campaign_name}</TableCell>
                          <TableCell className="text-xs font-semibold">R${ad.totalSpend.toFixed(2)}</TableCell>
                          <TableCell className="text-xs">{fmtNum(ad.totalImpressions)}</TableCell>
                          <TableCell className="text-xs">{fmtNum(ad.totalClicks)}</TableCell>
                          <TableCell className="text-xs font-medium">{ad.avgCTR.toFixed(2)}%</TableCell>
                          <TableCell className="text-xs">R${ad.avgCPC.toFixed(2)}</TableCell>
                          <TableCell className="text-xs font-semibold" style={{ color: GREEN }}>{ad.totalConversions}</TableCell>
                          <TableCell><ScoreBadgeAd score={ad.score} label={ad.scoreLabel} /></TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleUseAsReference(ad)}
                              className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                              title="Usar como referência no AI Criativo"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ── CMO Monthly Reports Tab ──────────────────────────────────
function CMOReportsTab() {
  const { user } = useAuth();
  const { toast: showToast } = useToast();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [dragOver, setDragOver] = useState(false);

  const fetchReports = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('monthly_reports')
      .select('*')
      .order('report_month', { ascending: false });
    if (data) setReports(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  async function handleFile(file: File) {
    if (!user || !file) return;
    if (file.type !== 'application/pdf') {
      showToast({ title: 'Formato inválido', description: 'Envie apenas arquivos PDF.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const path = `reports/${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('media-library').upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('media-library').getPublicUrl(path);
      const fileUrl = urlData.publicUrl;

      setUploading(false);
      setAnalyzing(true);

      const { data, error } = await supabase.functions.invoke('analyze-monthly-report', {
        body: {
          fileUrl,
          fileName: file.name,
          reportMonth: `${selectedMonth}-01`,
        },
      });

      if (error) throw error;
      if (data?.error) {
        showToast({ title: 'Erro na análise', description: data.error, variant: 'destructive' });
      } else {
        showToast({ title: '✅ Relatório analisado!', description: `${file.name} processado com Claude Sonnet 4` });
        await fetchReports();
      }
    } catch (err) {
      showToast({ title: 'Erro', description: err instanceof Error ? err.message : 'Falha', variant: 'destructive' });
    }
    setUploading(false);
    setAnalyzing(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const formatMonth = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const getKpi = (report: any, key: string) => {
    const kpis = report.extracted_data?.kpis || {};
    return kpis[key] ?? 0;
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Upload Zone */}
      <Card className="border-border bg-card">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-primary" />
                Upload Relatório Mensal CMO
              </h3>
              <p className="text-xs text-muted-foreground">
                Envie o PDF do relatório mensal. O Claude Sonnet 4 extrairá KPIs, insights e recomendações.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="h-8 w-[160px] text-xs"
                />
              </div>
            </div>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              "mt-4 border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/30",
              (uploading || analyzing) && "pointer-events-none opacity-60"
            )}
            onClick={() => {
              if (uploading || analyzing) return;
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.pdf';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleFile(file);
              };
              input.click();
            }}
          >
            {analyzing ? (
              <div className="flex flex-col items-center gap-2">
                <Brain className="h-8 w-8 text-primary animate-pulse" />
                <p className="text-sm font-medium text-foreground">Claude Sonnet 4 analisando relatório...</p>
                <p className="text-[10px] text-muted-foreground">Extraindo KPIs, insights e recomendações</p>
              </div>
            ) : uploading ? (
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                <p className="text-sm font-medium text-foreground">Enviando PDF...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Arraste o PDF aqui ou clique para selecionar</p>
                <p className="text-[10px] text-muted-foreground">PDF do relatório mensal do CMO</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reports History */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : reports.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum relatório analisado ainda.</p>
            <p className="text-xs text-muted-foreground mt-1">Envie o primeiro PDF para começar o acompanhamento estratégico.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Comparison Cards */}
          {reports.length >= 1 && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {[
                { key: 'investimento_total', label: 'Investimento', prefix: 'R$', icon: DollarSign },
                { key: 'leads_gerados', label: 'Leads', prefix: '', icon: Target },
                { key: 'cpl', label: 'CPL', prefix: 'R$', icon: DollarSign },
                { key: 'conversoes', label: 'Conversões', prefix: '', icon: TrendingUp },
                { key: 'roas', label: 'ROAS', prefix: '', suffix: 'x', icon: ArrowUpRight },
              ].map(kpi => {
                const current = getKpi(reports[0], kpi.key);
                const previous = reports.length > 1 ? getKpi(reports[1], kpi.key) : null;
                const diff = previous && previous > 0 ? ((current - previous) / previous) * 100 : null;
                return (
                  <Card key={kpi.key} className="border-border bg-card">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <kpi.icon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">{kpi.label}</span>
                      </div>
                      <p className="text-lg font-black text-foreground">
                        {kpi.prefix}{typeof current === 'number' ? current.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : current}{kpi.suffix || ''}
                      </p>
                      {diff !== null && (
                        <div className={cn("flex items-center gap-1 mt-0.5", diff >= 0 ? "text-emerald-500" : "text-red-500")}>
                          {diff >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          <span className="text-[10px] font-semibold">{Math.abs(diff).toFixed(1)}% vs mês anterior</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Reports List */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Histórico de Relatórios ({reports.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-2">
                {reports.map((report, idx) => (
                  <AccordionItem key={report.id} value={report.id} className="border border-border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3 flex-1 text-left">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold capitalize">{formatMonth(report.report_month)}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{report.file_name}</p>
                        </div>
                        <div className="flex gap-2 mr-2">
                          {report.extracted_data?.kpis?.investimento_total > 0 && (
                            <Badge variant="secondary" className="text-[9px] font-mono">
                              R${Number(report.extracted_data.kpis.investimento_total).toLocaleString('pt-BR')}
                            </Badge>
                          )}
                          {report.extracted_data?.kpis?.leads_gerados > 0 && (
                            <Badge variant="outline" className="text-[9px] font-mono">
                              {report.extracted_data.kpis.leads_gerados} leads
                            </Badge>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        {/* KPI Grid */}
                        {report.extracted_data?.kpis && (
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {Object.entries(report.extracted_data.kpis as Record<string, number>)
                              .filter(([_, v]) => v > 0)
                              .map(([key, value]) => (
                                <div key={key} className="bg-muted/30 rounded-md p-2">
                                  <p className="text-[9px] text-muted-foreground uppercase">{key.replace(/_/g, ' ')}</p>
                                  <p className="text-xs font-bold text-foreground">
                                    {typeof value === 'number' ? value.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : value}
                                  </p>
                                </div>
                              ))}
                          </div>
                        )}

                        {/* Alerts */}
                        {report.extracted_data?.alertas?.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-bold flex items-center gap-1.5 text-amber-500">
                              <AlertTriangle className="h-3.5 w-3.5" /> Alertas
                            </p>
                            {report.extracted_data.alertas.map((a: string, i: number) => (
                              <p key={i} className="text-xs text-muted-foreground ml-5">• {a}</p>
                            ))}
                          </div>
                        )}

                        {/* Recommendations */}
                        {report.extracted_data?.recomendacoes?.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-bold flex items-center gap-1.5 text-primary">
                              <Lightbulb className="h-3.5 w-3.5" /> Recomendações
                            </p>
                            {report.extracted_data.recomendacoes.map((r: string, i: number) => (
                              <p key={i} className="text-xs text-muted-foreground ml-5">• {r}</p>
                            ))}
                          </div>
                        )}

                        {/* Full AI Analysis */}
                        {report.ai_analysis && (
                          <div className="border-t border-border pt-3 mt-3">
                            <p className="text-xs font-bold mb-2 flex items-center gap-1.5">
                              <Brain className="h-3.5 w-3.5 text-primary" /> Análise Completa — {report.model_used}
                            </p>
                            <ScrollArea className="max-h-[400px]">
                              <DiagnosisContent text={report.ai_analysis} />
                            </ScrollArea>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Simple markdown renderer for diagnosis ───────────────────
function DiagnosisContent({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-2 text-sm text-foreground leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('## ')) {
          return <h2 key={i} className="text-lg font-black mt-4 mb-1 text-primary">{trimmed.replace('## ', '')}</h2>;
        }
        if (trimmed.startsWith('### ')) {
          return <h3 key={i} className="text-base font-bold mt-3 mb-1 text-foreground">{trimmed.replace('### ', '')}</h3>;
        }
        if (/^\d+\.\s/.test(trimmed)) {
          return <p key={i} className="ml-2 text-sm"><span className="font-bold text-primary">{trimmed.split('. ')[0]}.</span> {trimmed.split('. ').slice(1).join('. ')}</p>;
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return <p key={i} className="ml-4 text-sm text-muted-foreground">• {trimmed.slice(2)}</p>;
        }
        if (trimmed === '') return <div key={i} className="h-1" />;
        const withBold = trimmed.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        return <p key={i} className="text-sm" dangerouslySetInnerHTML={{ __html: withBold }} />;
      })}
    </div>
  );
}

// ── Page wrapper
export default function Analytics() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [diagnosisOpen, setDiagnosisOpen] = useState(false);
  const [diagnosisText, setDiagnosisText] = useState('');
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [diagnosisSnapshot, setDiagnosisSnapshot] = useState<Record<string, unknown> | null>(null);
  const { toast: showToast } = useToast();

  async function runDiagnosis() {
    setDiagnosisLoading(true);
    setDiagnosisOpen(true);
    setDiagnosisText('');
    try {
      const { data, error } = await supabase.functions.invoke('analytics-diagnosis', {
        body: { period },
      });
      if (error) throw error;
      if (data?.error) {
        if (data.error.includes('Rate limit')) {
          showToast({ title: 'Rate limit', description: 'Tente novamente em alguns minutos.', variant: 'destructive' });
          setDiagnosisOpen(false);
        } else if (data.error.includes('Créditos')) {
          showToast({ title: 'Créditos insuficientes', description: 'Adicione créditos no OpenRouter.', variant: 'destructive' });
          setDiagnosisOpen(false);
        } else {
          throw new Error(data.error);
        }
      } else {
        setDiagnosisText(data.diagnosis || 'Sem resposta');
        setDiagnosisSnapshot(data.dataSnapshot || null);
      }
    } catch (err) {
      showToast({
        title: 'Erro no diagnóstico',
        description: err instanceof Error ? err.message : 'Falha desconhecida',
        variant: 'destructive',
      });
      setDiagnosisOpen(false);
    }
    setDiagnosisLoading(false);
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Inteligência de Marketing — DQEF Hub</p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={runDiagnosis}
            disabled={diagnosisLoading}
            className="h-8 text-xs bg-gradient-to-r from-purple-600 to-primary hover:from-purple-700 hover:to-primary/90 text-white font-bold shadow-lg"
          >
            {diagnosisLoading ? (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Brain className="h-3.5 w-3.5 mr-1.5" />
            )}
            {diagnosisLoading ? 'Analisando...' : 'Diagnóstico IA'}
          </Button>
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
      </div>

      {/* Diagnosis Dialog */}
      <Dialog open={diagnosisOpen} onOpenChange={setDiagnosisOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-lg font-black">
              <Brain className="h-5 w-5 text-primary" />
              Diagnóstico Cross-Channel — Claude Opus
              {diagnosisSnapshot && (
                <Badge variant="outline" className="text-[10px] ml-2 font-mono">
                  {String(diagnosisSnapshot.period)}
                </Badge>
              )}
            </DialogTitle>
            {diagnosisSnapshot && (
              <div className="flex gap-3 mt-2">
                {[
                  { label: 'Meta Spend', value: `R$${Number(diagnosisSnapshot.meta_spend || 0).toFixed(0)}` },
                  { label: 'Meta Conv.', value: String(diagnosisSnapshot.meta_conversions || 0) },
                  { label: 'GA4 Sessions', value: String(diagnosisSnapshot.ga4_sessions || 0) },
                  { label: 'GAds Spend', value: `R$${Number(diagnosisSnapshot.gads_spend || 0).toFixed(0)}` },
                ].map(kpi => (
                  <Badge key={kpi.label} variant="secondary" className="text-[9px] font-mono">
                    {kpi.label}: {kpi.value}
                  </Badge>
                ))}
              </div>
            )}
          </DialogHeader>
          <ScrollArea className="px-6 py-4" style={{ maxHeight: 'calc(85vh - 140px)' }}>
            {diagnosisLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="relative">
                  <Brain className="h-10 w-10 text-primary animate-pulse" />
                  <Sparkles className="h-4 w-4 text-primary absolute -top-1 -right-1 animate-bounce" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">Claude Opus está analisando seus dados...</p>
                <p className="text-[10px] text-muted-foreground">Cruzando Meta Ads + GA4 + Google Ads + Operacional</p>
              </div>
            ) : diagnosisText ? (
              <DiagnosisContent text={diagnosisText} />
            ) : null}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="operacional">
        <TabsList className="bg-card border border-border h-auto p-1 gap-1 flex-wrap">
          <TabsTrigger value="operacional" className="text-xs px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <MapPin className="h-3.5 w-3.5 mr-1.5" />
            Operacional
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="text-xs px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <DollarSign className="h-3.5 w-3.5 mr-1.5" />
            Saúde Financeira
          </TabsTrigger>
          <TabsTrigger value="funil" className="text-xs px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Target className="h-3.5 w-3.5 mr-1.5" />
            Funil E2E
          </TabsTrigger>
          <TabsTrigger value="ga4" className="text-xs px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Globe className="h-3.5 w-3.5 mr-1.5" />
            GA4
          </TabsTrigger>
          <TabsTrigger value="meta-ads" className="text-xs px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Megaphone className="h-3.5 w-3.5 mr-1.5" />
            Meta Ads
          </TabsTrigger>
          <TabsTrigger value="cmo-reports" className="text-xs px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Relatórios CMO
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operacional" className="mt-4">
          <BrazilHeatmap period={period} />
        </TabsContent>
        <TabsContent value="financeiro" className="mt-4">
          <FinancialHealthTab period={period} />
        </TabsContent>
        <TabsContent value="funil" className="mt-4">
          <FunnelEndToEnd period={period} />
        </TabsContent>
        <TabsContent value="ga4" className="mt-4">
          <GA4Tab period={period} />
        </TabsContent>
        <TabsContent value="meta-ads" className="mt-4">
          <MetaAdsRealTab period={period} />
        </TabsContent>
        <TabsContent value="cmo-reports" className="mt-4">
          <CMOReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
