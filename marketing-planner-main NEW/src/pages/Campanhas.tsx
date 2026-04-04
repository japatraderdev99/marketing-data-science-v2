import { useState, useEffect, useRef, useCallback } from 'react';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useCalendarContents } from '@/hooks/useCalendarContents';
import { Campaign, CampaignStatus, Channel, ContentFormat, Priority, Funnel, KanbanStatus, ContentObjective } from '@/data/seedData';
import { ContentItem } from '@/data/seedData';
import { toPng } from 'html-to-image';
import { useAuth } from '@/contexts/AuthContext';
import { getFormatSpec, getCreativeTypesForChannel, contentFormatToCreativeType } from '@/data/formatSpecs';
import { useNavigate } from 'react-router-dom';

interface CampaignForm {
  name: string;
  objective: string;
  channels: Channel[];
  format: ContentFormat;
  targetAudience: string;
  budget: string;
  startDate: string;
  endDate: string;
  priority: Priority;
  status: CampaignStatus;
  funnel: Funnel;
  responsible: string;
  description: string;
}

interface ChannelAllocation {
  channel: Channel;
  creativeCount: number;
  budget: number;
  formats: ContentFormat[];
}
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, FunnelChart, Funnel as RFunnel, LabelList, Treemap
} from 'recharts';
import {
  Megaphone, Plus, Sparkles, Target, Users, TrendingUp, Calendar,
  DollarSign, AlertTriangle, CheckCircle2, Loader2, ChevronRight,
  LayoutGrid, List, Brain, Zap, Copy, Eye, Trash2, PenLine,
  ArrowRight, X, Info, RefreshCw, BarChart3, ArrowUpRight,
  ArrowDownRight, Filter, Activity, TrendingDown, Layers, Download,
  Clock, Hash, Crosshair
} from 'lucide-react';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  orange: 'hsl(33, 100%, 50%)',
  teal: 'hsl(185, 100%, 36%)',
  purple: 'hsl(262, 83%, 58%)',
  blue: 'hsl(217, 91%, 60%)',
  green: 'hsl(142, 71%, 45%)',
  red: 'hsl(0, 72%, 51%)',
  amber: 'hsl(45, 93%, 47%)',
};

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MetaFields {
  brandEssence?: string;
  uniqueValueProp?: string;
  targetPersona?: { profile?: string; biggestPain?: string; dream?: string; demographics?: string };
  toneRules?: { use?: string[]; avoid?: string[] };
  keyMessages?: string[];
  contentAngles?: string[];
  currentCampaignFocus?: string;
  ctaStyle?: string;
  kpiPriorities?: string[];
  forbiddenTopics?: string[];
  promptContext?: string;
  completenessScore?: number;
}

interface AiPlan {
  campaignSummary: string;
  angle: string;
  hooks: string[];
  keyMessage: string;
  ctaMain: string;
  viralLogic: string;
  estimatedResults?: { reach?: string; engagement?: string; conversions?: string };
  warnings?: string[];
  kanbanTasks?: Array<{
    title: string; description: string; format: ContentFormat; channel: Channel;
    priority: Priority; status: KanbanStatus; daysFromStart: number;
  }>;
  calendarEntries?: Array<{
    title: string; format: ContentFormat; channel: Channel;
    daysFromStart: number; copy: string; responsible: string;
  }>;
}

// ─── Status / color helpers ───────────────────────────────────────────────────

const STATUS_CONFIG: Record<CampaignStatus, { label: string; color: string; dot: string; bg: string }> = {
  Rascunho:   { label: 'Rascunho',   color: 'bg-muted/60 text-muted-foreground border-border',             dot: 'bg-muted-foreground',     bg: 'hsl(var(--muted))' },
  Aprovada:   { label: 'Aprovada',   color: 'bg-blue-500/15 text-blue-400 border-blue-500/25',             dot: 'bg-blue-400',             bg: 'hsl(217, 91%, 60%)' },
  Ativa:      { label: 'Ativa',      color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',    dot: 'bg-emerald-400',          bg: 'hsl(142, 71%, 45%)' },
  Pausada:    { label: 'Pausada',    color: 'bg-amber-500/15 text-amber-400 border-amber-500/25',           dot: 'bg-amber-400',            bg: 'hsl(45, 93%, 47%)' },
  Finalizada: { label: 'Finalizada', color: 'bg-muted/40 text-muted-foreground/70 border-border/50',        dot: 'bg-muted-foreground/50',  bg: 'hsl(var(--border))' },
};

const PRIORITY_COLORS: Record<Priority, string> = {
  Alta:  'bg-red-500/15 text-red-400 border-red-500/25',
  Média: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  Baixa: 'bg-muted/50 text-muted-foreground border-border',
};

const CHANNEL_COLORS: Record<string, string> = {
  TikTok: C.teal,
  'Meta Ads': C.purple,
  LinkedIn: C.blue,
  YouTube: C.red,
  Orgânico: C.green,
  'Google Ads': C.orange,
};

const FUNNEL_COLORS: Record<string, string> = {
  Topo: C.purple,
  Meio: C.orange,
  Fundo: C.green,
};

const ANGLE_EMOJI: Record<string, string> = {
  Orgulho: '🏆', Dinheiro: '💸', Urgência: '⏰', Raiva: '🔴', Alívio: '💚',
};

const EMPTY_FORM = (): CampaignForm => ({
  name: '', objective: '', channels: [],
  format: 'Carrossel', targetAudience: '', budget: '',
  startDate: new Date().toISOString().split('T')[0], endDate: '',
  priority: 'Alta', status: 'Rascunho',
  funnel: 'Topo', responsible: '', description: '',
});

const ALL_CHANNELS: Channel[] = ['TikTok', 'Meta Ads', 'LinkedIn', 'YouTube', 'Orgânico', 'Google Ads'];

const CHANNEL_EMOJI: Record<string, string> = {
  TikTok: '🎵', 'Meta Ads': '📢', LinkedIn: '💼', YouTube: '▶️', Orgânico: '🌱', 'Google Ads': '🔍',
};

// ─── Analytics helpers ────────────────────────────────────────────────────────

function buildChannelData(campaigns: Campaign[]) {
  const map: Record<string, { count: number; budget: number; leads: number; conversions: number; roas: number[] }> = {};
  campaigns.forEach(c => {
    (c.channel || []).forEach(ch => {
      if (!map[ch]) map[ch] = { count: 0, budget: 0, leads: 0, conversions: 0, roas: [] };
      map[ch].count++;
      map[ch].budget += c.budget || 0;
      map[ch].leads += c.leads || 0;
      map[ch].conversions += c.conversions || 0;
      if (c.roas) map[ch].roas.push(c.roas);
    });
  });
  return Object.entries(map).map(([name, d]) => ({
    name,
    campanhas: d.count,
    budget: d.budget,
    leads: d.leads,
    conversions: d.conversions,
    roas: d.roas.length ? +(d.roas.reduce((a, b) => a + b, 0) / d.roas.length).toFixed(1) : 0,
    color: CHANNEL_COLORS[name] || C.purple,
  }));
}

function buildFunnelData(campaigns: Campaign[]) {
  const byFunnel: Record<string, number> = { Topo: 0, Meio: 0, Fundo: 0 };
  campaigns.forEach(c => { if (c.funnel && byFunnel[c.funnel] !== undefined) byFunnel[c.funnel]++; });
  const total = Object.values(byFunnel).reduce((a, b) => a + b, 0) || 1;
  return [
    { name: 'Topo (Awareness)', value: byFunnel['Topo'], fill: FUNNEL_COLORS['Topo'], pct: Math.round((byFunnel['Topo'] / total) * 100) },
    { name: 'Meio (Consideração)', value: byFunnel['Meio'], fill: FUNNEL_COLORS['Meio'], pct: Math.round((byFunnel['Meio'] / total) * 100) },
    { name: 'Fundo (Conversão)', value: byFunnel['Fundo'], fill: FUNNEL_COLORS['Fundo'], pct: Math.round((byFunnel['Fundo'] / total) * 100) },
  ];
}

function buildStatusData(campaigns: Campaign[]) {
  const counts: Record<string, number> = {};
  campaigns.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1; });
  return Object.entries(counts).map(([status, value]) => ({
    name: status, value,
    fill: STATUS_CONFIG[status as CampaignStatus]?.bg || C.purple,
  }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiTile({ label, value, delta, positive, icon: Icon, color }: {
  label: string; value: string | number; delta?: string; positive?: boolean; icon: React.ElementType; color: string;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="rounded-lg p-2" style={{ background: `${color}18` }}>
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          {delta && (
            <div className={cn('flex items-center gap-1 text-[10px] font-semibold', positive ? 'text-green-400' : 'text-red-400')}>
              {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {delta}
            </div>
          )}
        </div>
        <p className="text-2xl font-black text-foreground tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

function StrategyPill({ label, value }: { label: string; value: string }) {
  const { toast } = useToast();
  return (
    <div
      onClick={() => { navigator.clipboard.writeText(value); toast({ title: 'Copiado ✅', description: label }); }}
      className="flex items-start gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 cursor-pointer hover:bg-primary/10 transition-colors group"
      title="Clique para copiar"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider text-primary/60 mb-0.5">{label}</p>
        <p className="text-[11px] text-foreground/85 leading-snug line-clamp-2">{value}</p>
      </div>
      <Copy className="h-3 w-3 text-primary/30 group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
    </div>
  );
}

function CampaignCard({
  campaign, onEdit, onDelete, onView,
}: {
  campaign: Campaign; onEdit: () => void; onDelete: () => void; onView: () => void;
}) {
  const st = STATUS_CONFIG[campaign.status];
  const budgetPct = campaign.budgetPaid && campaign.budget ? Math.round((campaign.budgetPaid / campaign.budget) * 100) : 0;
  const hasMetrics = !!(campaign.leads || campaign.conversions || campaign.roas);
  const isTemplate = campaign.id.includes('template');

  return (
    <div
      className="group relative rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.15)] cursor-pointer flex flex-col"
      onClick={onView}
    >
      {/* ── Top accent bar ── */}
      <div className="h-1 w-full" style={{ background: isTemplate ? `linear-gradient(90deg, ${C.orange}, ${C.teal})` : (CHANNEL_COLORS[campaign.channel?.[0]] || C.purple) }} />

      {/* ── Header ── */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={cn('flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase', st.color)}>
                <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', st.dot)} />
                {st.label}
              </span>
              <span className={cn('rounded-md border px-1.5 py-0.5 text-[10px] font-bold', PRIORITY_COLORS[campaign.priority])}>
                {campaign.priority}
              </span>
            </div>
            <h3 className="text-[15px] font-black text-foreground leading-tight tracking-tight line-clamp-2">
              {campaign.name}
            </h3>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
            <button onClick={onEdit} className="rounded-lg p-1.5 hover:bg-muted transition-colors" title="Editar">
              <PenLine className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
            <button onClick={onDelete} className="rounded-lg p-1.5 hover:bg-destructive/10 transition-colors" title="Excluir">
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Description ── */}
      {campaign.objective && (
        <div className="px-5 pb-3">
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{campaign.objective}</p>
        </div>
      )}

      {/* ── Tags row ── */}
      <div className="px-5 pb-3 flex flex-wrap gap-1.5">
        {(campaign.channel || []).map(ch => (
          <span key={ch} className="flex items-center gap-1 rounded-md border border-border/60 bg-muted/20 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: CHANNEL_COLORS[ch] || C.purple }} />
            {ch}
          </span>
        ))}
        {campaign.funnel && (
          <span className="flex items-center gap-1 rounded-md border border-border/60 bg-muted/20 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            <Crosshair className="h-2.5 w-2.5" /> {campaign.funnel}
          </span>
        )}
        {campaign.category && (
          <span className="rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {campaign.category}
          </span>
        )}
      </div>

      {/* ── Metrics panel ── */}
      {hasMetrics && (
        <div className="mx-5 mb-3 rounded-xl border border-border/60 bg-muted/10 p-3">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Leads', value: campaign.leads?.toLocaleString('pt-BR') || '—', color: C.orange, icon: Users },
              { label: 'Conv.', value: campaign.conversions?.toLocaleString('pt-BR') || '—', color: C.teal, icon: Target },
              { label: 'ROAS', value: campaign.roas ? `${campaign.roas}x` : '—', color: campaign.roas && campaign.roas >= 3 ? C.green : C.amber, icon: TrendingUp },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="text-center space-y-0.5">
                <Icon className="h-3 w-3 mx-auto mb-0.5" style={{ color, opacity: 0.6 }} />
                <p className="text-sm font-black tracking-tight" style={{ color }}>{value}</p>
                <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-widest">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Budget bar ── */}
      {campaign.budget > 0 && (
        <div className="px-5 pb-3">
          <div className="flex justify-between text-[10px] mb-1.5">
            <span className="text-muted-foreground/60 font-medium flex items-center gap-1"><DollarSign className="h-2.5 w-2.5" /> Budget</span>
            <span className="font-bold text-foreground tabular-nums">
              R${(campaign.budgetPaid || 0).toLocaleString('pt-BR')} <span className="text-muted-foreground/40">/ R${campaign.budget.toLocaleString('pt-BR')}</span>
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-border/60 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${budgetPct}%`,
                background: budgetPct > 90 ? C.red : `linear-gradient(90deg, ${C.orange}, ${C.teal})`,
              }}
            />
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="mt-auto border-t border-border/40 px-5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50">
          {campaign.startDate && (
            <span className="flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {new Date(campaign.startDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              {campaign.endDate && ` → ${new Date(campaign.endDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
            </span>
          )}
          {campaign.responsible && (
            <span className="flex items-center gap-1">
              <span className="h-4 w-4 rounded-full bg-primary/15 flex items-center justify-center text-[8px] font-bold text-primary">{campaign.avatar}</span>
              {campaign.responsible}
            </span>
          )}
        </div>
        {isTemplate && (
          <span className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary uppercase tracking-wider">
            Template
          </span>
        )}
      </div>
    </div>
  );
}
// ─── Analytics Panel ──────────────────────────────────────────────────────────

function AnalyticsPanel({ campaigns }: { campaigns: Campaign[] }) {
  const channelData = buildChannelData(campaigns);
  const funnelData = buildFunnelData(campaigns);
  const statusData = buildStatusData(campaigns);
  const activeCampaigns = campaigns.filter(c => c.status === 'Ativa');
  const totalBudget = campaigns.reduce((s, c) => s + (c.budget || 0), 0);
  const totalLeads = campaigns.reduce((s, c) => s + (c.leads || 0), 0);
  const totalConversions = campaigns.reduce((s, c) => s + (c.conversions || 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const avgRoas = campaigns.filter(c => c.roas).length
    ? +(campaigns.filter(c => c.roas).reduce((s, c) => s + (c.roas || 0), 0) / campaigns.filter(c => c.roas).length).toFixed(1)
    : 0;
  const ctr = totalImpressions > 0 ? ((totalLeads / totalImpressions) * 100).toFixed(2) : '0';

  const CUSTOM_TOOLTIP_STYLE = {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '11px',
  };

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile label="Campanhas Ativas" value={activeCampaigns.length} icon={Megaphone} color={C.orange} delta="+2 semana" positive={true} />
        <KpiTile label="Budget Total" value={`R$${(totalBudget/1000).toFixed(0)}k`} icon={DollarSign} color={C.blue} />
        <KpiTile label="Leads Gerados" value={totalLeads.toLocaleString('pt-BR')} icon={TrendingUp} color={C.teal} delta="+18%" positive={true} />
        <KpiTile label="Conversões" value={totalConversions.toLocaleString('pt-BR')} icon={Target} color={C.green} delta="+12%" positive={true} />
        <KpiTile label="ROAS Médio" value={`${avgRoas}x`} icon={BarChart3} color={C.green} delta={avgRoas >= 3 ? 'Acima da meta' : 'Abaixo da meta'} positive={avgRoas >= 3} />
        <KpiTile label="CTR Médio" value={`${ctr}%`} icon={Activity} color={C.purple} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Status pie */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Status das Campanhas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <PieChart width={130} height={130}>
                <Pie data={statusData} cx={65} cy={65} innerRadius={38} outerRadius={58} dataKey="value" strokeWidth={0}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
              </PieChart>
              <div className="space-y-1.5 flex-1">
                {statusData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.fill }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <span className="font-bold text-foreground">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Channel pie */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Activity className="h-4 w-4 text-teal" /> Mix de Canais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <PieChart width={130} height={130}>
                <Pie data={channelData} cx={65} cy={65} innerRadius={38} outerRadius={58} dataKey="campanhas" strokeWidth={0}>
                  {channelData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} formatter={(v, n, p) => [v, p.payload.name]} />
              </PieChart>
              <div className="space-y-1.5 flex-1">
                {channelData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <span className="font-bold text-foreground">{d.campanhas}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Funnel distribution */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-400" /> Distribuição no Funil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {funnelData.map((f, i) => (
              <div key={f.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{f.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground">{f.value}</span>
                    <span className="text-muted-foreground/50">({f.pct}%)</span>
                  </div>
                </div>
                <div className="h-5 w-full rounded-md bg-border overflow-hidden">
                  <div
                    className="h-full rounded-md flex items-center px-2 transition-all duration-700"
                    style={{ width: `${Math.max(f.pct, 5)}%`, background: f.fill }}
                  >
                    {f.pct > 15 && <span className="text-[9px] font-bold text-white">{f.pct}%</span>}
                  </div>
                </div>
                {i < funnelData.length - 1 && f.value > 0 && funnelData[i + 1].value > 0 && (
                  <p className="text-right text-[9px] text-muted-foreground mt-0.5">
                    → {Math.round((funnelData[i + 1].value / f.value) * 100)}% seguem para próxima etapa
                  </p>
                )}
              </div>
            ))}
            <div className="border-t border-border pt-2">
              <p className="text-[10px] text-muted-foreground text-center">
                Ideal: 40% Topo · 35% Meio · 25% Fundo
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Channel performance bar */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Performance por Canal — Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            {channelData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={channelData} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                  <Bar dataKey="leads" radius={[4, 4, 0, 0]} name="Leads">
                    {channelData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-44 text-muted-foreground/40 text-sm">
                <BarChart3 className="h-8 w-8 mb-2 opacity-30" />
                Nenhuma campanha com dados de canal
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget vs leads scatter-like bar */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-amber-400" /> Budget × ROAS por Canal
            </CardTitle>
          </CardHeader>
          <CardContent>
            {channelData.length > 0 ? (
              <div className="space-y-2.5">
                {channelData.sort((a, b) => b.roas - a.roas).map(d => (
                  <div key={d.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                        <span className="text-foreground font-medium">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span>R${d.budget.toLocaleString('pt-BR')}</span>
                        <span className="font-bold" style={{ color: d.roas >= 3 ? C.green : d.roas > 0 ? C.amber : 'hsl(var(--muted-foreground))' }}>
                          {d.roas > 0 ? `${d.roas}x ROAS` : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min((d.budget / (Math.max(...channelData.map(x => x.budget)) || 1)) * 100, 100)}%`,
                          background: d.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground text-center pt-1 border-t border-border">
                  Barra = % do budget total · Cor = canal · Meta ROAS: 3.0x
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-44 text-muted-foreground/40 text-sm">
                <DollarSign className="h-8 w-8 mb-2 opacity-30" />
                Nenhuma campanha com dados de budget
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Priority accountability table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" /> Accountability — Campanhas Ativas
          </CardTitle>
          <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">C-Level View</Badge>
        </CardHeader>
        <CardContent>
          {activeCampaigns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {['Campanha', 'Canal', 'Prioridade', 'Budget', 'ROAS', 'Leads', 'Status'].map(h => (
                      <th key={h} className="pb-2.5 text-left font-semibold text-muted-foreground pr-4 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeCampaigns.map(c => (
                    <tr key={c.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-foreground max-w-[160px] truncate">{c.name}</td>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-1.5">
                          {(c.channel || []).slice(0, 1).map(ch => (
                            <span key={ch} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: CHANNEL_COLORS[ch] || C.purple }} />
                              {ch}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px] font-bold', PRIORITY_COLORS[c.priority])}>{c.priority}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-foreground">
                        {c.budget ? `R$${c.budget.toLocaleString('pt-BR')}` : '—'}
                      </td>
                      <td className="py-2.5 pr-4 font-bold" style={{ color: c.roas && c.roas >= 3 ? C.green : c.roas ? C.amber : 'hsl(var(--muted-foreground))' }}>
                        {c.roas ? `${c.roas}x` : '—'}
                      </td>
                      <td className="py-2.5 pr-4 font-semibold" style={{ color: C.teal }}>
                        {c.leads?.toLocaleString('pt-BR') || '—'}
                      </td>
                      <td className="py-2.5">
                        <span className={cn('flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold w-fit', STATUS_CONFIG[c.status].color)}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_CONFIG[c.status].dot)} />
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground/40 text-sm">
              Nenhuma campanha ativa no momento
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Campanhas() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { campaigns, setCampaigns } = useCampaigns();
  const { contents, setContents } = useCalendarContents();

  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState<CampaignForm>(EMPTY_FORM());
  const [activeTab, setActiveTab] = useState('campanhas');

  const [generating, setGenerating] = useState(false);
  const [aiPlan, setAiPlan] = useState<AiPlan | null>(null);
  const [extraInstructions, setExtraInstructions] = useState('');
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [cmoDirectives, setCmoDirectives] = useState({ emotionalAngle: '', toneGuidance: '', targetPain: '', keyMessage: '', avoid: '', freeNotes: '' });
  const [refinementNote, setRefinementNote] = useState('');
  const [showRefinement, setShowRefinement] = useState(false);
  const [knowledgeDocs, setKnowledgeDocs] = useState<Array<{ document_name: string; status: string }>>([]);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [wizardStep, setWizardStep] = useState<'form' | 'allocation' | 'summary'>('form');
  const [channelAllocations, setChannelAllocations] = useState<ChannelAllocation[]>([]);

  const [metafields, setMetafields] = useState<MetaFields | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('dqef_strategy_metafields_v1');
      if (raw) setMetafields(JSON.parse(raw));
    } catch { /* noop */ }
    // Load knowledge docs count
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from('strategy_knowledge').select('document_name, status').eq('user_id', user.id);
          if (data) setKnowledgeDocs(data);
        }
      } catch { /* noop */ }
    })();
  }, []);

  // Campaigns and contents now loaded from DB via hooks

  const autofillFromStrategy = () => {
    if (!metafields) return;
    setForm(prev => ({
      ...prev,
      targetAudience: prev.targetAudience || metafields.targetPersona?.profile || '',
      objective: prev.objective || metafields.currentCampaignFocus || '',
    }));
    toast({ title: 'Campos preenchidos ✅', description: 'Usamos os meta-fields da estratégia como base.' });
  };

  const detailCampaign = campaigns.find(c => c.id === detailId);

  const handleExportPNG = useCallback(async () => {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(exportRef.current, {
        pixelRatio: 3,
        backgroundColor: '#1a1a2e',
        style: { borderRadius: '0' },
      });
      const link = document.createElement('a');
      link.download = `campanha-${detailCampaign?.name?.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 40) || 'plano'}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: 'PNG exportado ✅', description: 'Resolução 3x para qualidade profissional.' });
    } catch (err) {
      toast({ title: 'Erro ao exportar', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  }, [detailCampaign, toast]);

  const openCreate = () => {
    setEditingId(null);
    setAiPlan(null);
    setExtraInstructions('');
    setCmoDirectives({ emotionalAngle: '', toneGuidance: '', targetPain: '', keyMessage: '', avoid: '', freeNotes: '' });
    setForm(EMPTY_FORM());
    setShowAiPanel(false);
    setWizardStep('form');
    setChannelAllocations([]);
    setShowModal(true);
  };

  const openEdit = (c: Campaign) => {
    setEditingId(c.id);
    setAiPlan(null);
    setExtraInstructions('');
    setForm({
      name: c.name, objective: c.objective || '', channels: c.channel || [],
      format: 'Carrossel', targetAudience: c.audience || '',
      budget: String(c.budget || ''), startDate: c.startDate || '', endDate: c.endDate || '',
      priority: c.priority, status: c.status, funnel: c.funnel || 'Topo',
      responsible: c.responsible || '', description: c.description || '',
    });
    setShowAiPanel(false);
    setWizardStep('form');
    setChannelAllocations([]);
    setShowModal(true);
  };


  const handleDelete = (id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    toast({ title: 'Campanha removida' });
  };

  const handleSave = () => {
    if (!form.name?.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }
    const chs: Channel[] = form.channels.length > 0 ? form.channels : ['Meta Ads'];
    if (editingId) {
      setCampaigns(prev => prev.map(c => c.id === editingId ? {
        ...c, name: form.name, objective: form.objective,
        channel: chs, budget: Number(form.budget) || 0,
        startDate: form.startDate, endDate: form.endDate,
        priority: form.priority, status: form.status,
        funnel: form.funnel, responsible: form.responsible,
        description: form.description, audience: form.targetAudience,
      } : c));
      toast({ title: 'Campanha atualizada ✅' });
    } else {
      const newCampaign: Campaign = {
        id: `camp-${Date.now()}`,
        name: form.name, objective: form.objective,
        channel: chs, kanbanStatus: 'ideia',
        category: 'Awareness', avatar: (form.responsible || 'TM').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'TM',
        budget: Number(form.budget) || 0,
        startDate: form.startDate, endDate: form.endDate,
        priority: form.priority, status: form.status,
        funnel: form.funnel, responsible: form.responsible,
        description: form.description, audience: form.targetAudience,
        subtasks: [], links: [],
        history: [{ date: new Date().toISOString(), action: 'Campanha criada', user: form.responsible || 'CMO' }],
      };
      setCampaigns(prev => [...prev, newCampaign]);
      toast({ title: 'Campanha criada ✅' });
    }
    setShowModal(false);
  };

  const handleGenerateAI = async () => {
    if (!form.name?.trim()) {
      toast({ title: 'Dê um nome para a campanha', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    setAiPlan(null);
    // Build extra instructions from CMO directives
    const directiveParts = [
      cmoDirectives.emotionalAngle && `ÂNGULO EMOCIONAL: ${cmoDirectives.emotionalAngle}`,
      cmoDirectives.toneGuidance && `TOM DE VOZ: ${cmoDirectives.toneGuidance}`,
      cmoDirectives.targetPain && `DOR DO PÚBLICO: ${cmoDirectives.targetPain}`,
      cmoDirectives.keyMessage && `MENSAGEM CENTRAL: ${cmoDirectives.keyMessage}`,
      cmoDirectives.avoid && `EVITAR: ${cmoDirectives.avoid}`,
      cmoDirectives.freeNotes && `NOTAS DO CMO: ${cmoDirectives.freeNotes}`,
    ].filter(Boolean).join('\n');
    const combinedInstructions = [directiveParts, extraInstructions].filter(Boolean).join('\n\n');
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-campaign-plan', {
        body: { campaignForm: form, strategyMetafields: metafields, extraInstructions: combinedInstructions },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      setAiPlan(result.plan as AiPlan);
      setShowAiPanel(true);
      setShowRefinement(false);
      setRefinementNote('');
      toast({ title: 'Plano de campanha gerado ✅' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro ao gerar plano', description: msg, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleRefinePlan = async () => {
    if (!refinementNote.trim()) {
      toast({ title: 'Escreva o ajuste desejado', variant: 'destructive' });
      return;
    }
    const originalExtra = extraInstructions;
    setExtraInstructions(prev => [prev, `AJUSTE SOLICITADO PELO CMO: ${refinementNote}`].filter(Boolean).join('\n'));
    await handleGenerateAI();
    setExtraInstructions(originalExtra);
  };

  const handleRegenerateWithKB = async () => {
    const kbExtra = 'INSTRUÇÃO ESPECIAL: Consulte OBRIGATORIAMENTE o knowledge base completo (playbook de marketing, brand book, documentos de estratégia) antes de gerar o plano. Alinhe todas as sugestões com as diretrizes estratégicas registradas.';
    const originalExtra = extraInstructions;
    setExtraInstructions(prev => [kbExtra, prev].filter(Boolean).join('\n'));
    await handleGenerateAI();
    setExtraInstructions(originalExtra);
  };

  const generateCampaignTasks = async (campaignId: string, campaignName: string, channels: Channel[]) => {
    if (!user) return 0;
    const tasks: any[] = [];
    const startMs = form.startDate ? new Date(form.startDate + 'T12:00:00').getTime() : Date.now();
    
    for (const channel of channels) {
      const creativeTypes = getCreativeTypesForChannel(channel);
      creativeTypes.forEach((ct, i) => {
        const spec = getFormatSpec(channel, ct);
        tasks.push({
          user_id: user.id,
          campaign_id: campaignId,
          campaign_name: campaignName,
          title: `${ct.charAt(0).toUpperCase() + ct.slice(1)} — ${channel}`,
          description: aiPlan?.campaignSummary || form.objective || form.description,
          creative_type: ct,
          channel,
          format_width: spec.width,
          format_height: spec.height,
          format_ratio: spec.ratio,
          format_name: spec.name,
          status: 'pending',
          priority: form.priority || 'Média',
          assigned_to: 'Guilherme',
          deadline: new Date(startMs + (3 + i * 2) * 86400000).toISOString().split('T')[0],
          campaign_context: {
                objective: form.objective || aiPlan?.keyMessage || '',
                campaignSummary: aiPlan?.campaignSummary || '',
                cta: aiPlan?.ctaMain || '',
                hooks: aiPlan?.hooks || [],
                emotionalAngle: aiPlan?.angle || cmoDirectives.emotionalAngle || '',
                targetAudience: form.targetAudience || '',
                keyMessage: aiPlan?.keyMessage || '',
                funnel: form.funnel || 'Topo',
                viralLogic: aiPlan?.viralLogic || '',
                toneGuidance: cmoDirectives.toneGuidance || '',
                avoid: cmoDirectives.avoid || '',
              },
        });
      });
    }

    if (tasks.length === 0) return 0;
    const { error } = await supabase.from('campaign_tasks').insert(tasks);
    if (error) {
      console.error('Error creating campaign tasks:', error);
      toast({ title: 'Erro ao criar tarefas', description: error.message, variant: 'destructive' });
      return 0;
    }
    return tasks.length;
  };

  const handleApplyPlan = async () => {
    if (!aiPlan) return;
    const startMs = form.startDate ? new Date(form.startDate + 'T12:00:00').getTime() : Date.now();
    const chs: Channel[] = form.channels.length > 0 ? form.channels : ['Meta Ads'];
    const savedId = editingId || `camp-${Date.now()}`;
    const campaignName = form.name;
    if (editingId) {
      setCampaigns(prev => prev.map(c => c.id === editingId ? {
        ...c, name: form.name, objective: form.objective, channel: chs,
        budget: Number(form.budget) || 0, description: aiPlan.campaignSummary,
        audience: form.targetAudience, status: 'Aprovada' as CampaignStatus,
      } : c));
    } else {
      const newC: Campaign = {
        id: savedId, name: campaignName,
        objective: form.objective || aiPlan.keyMessage,
        channel: chs, kanbanStatus: 'ideia', category: 'Awareness',
        avatar: (form.responsible || 'TM').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'TM',
        budget: Number(form.budget) || 0,
        startDate: form.startDate, endDate: form.endDate,
        priority: form.priority, status: 'Aprovada',
        funnel: form.funnel, responsible: form.responsible,
        description: aiPlan.campaignSummary, audience: form.targetAudience,
        subtasks: [], links: [],
        history: [{ date: new Date().toISOString(), action: 'Campanha criada pela IA', user: form.responsible || 'CMO' }],
      };
      setCampaigns(prev => [...prev, newC]);
    }
    const kanbanItems: Campaign[] = (aiPlan.kanbanTasks || []).map((t, i) => ({
      id: `camp-${Date.now()}-k${i}`, name: `[${campaignName}] ${t.title}`,
      objective: t.description, channel: [t.channel], kanbanStatus: t.status,
      category: 'Awareness' as ContentObjective, avatar: 'TM', budget: 0,
      startDate: new Date(startMs + t.daysFromStart * 86400000).toISOString().split('T')[0],
      endDate: '', priority: t.priority, status: 'Rascunho' as CampaignStatus,
      funnel: form.funnel, responsible: form.responsible || 'Time Marketing',
      description: t.description, audience: '', subtasks: [], links: [], history: [],
    }));
    setCampaigns(prev => [...prev, ...kanbanItems]);
    const calItems: ContentItem[] = (aiPlan.calendarEntries || []).map((e, i) => ({
      id: `cont-${Date.now()}-c${i}`, title: e.title, format: e.format, channel: e.channel,
      date: new Date(startMs + e.daysFromStart * 86400000).toISOString().split('T')[0],
      status: 'Rascunho' as ContentItem['status'],
      responsible: e.responsible || 'Time Marketing', copy: e.copy || '',
    }));
    setContents(prev => [...prev, ...calItems]);

    // Generate structured creative tasks in the database
    const taskCount = await generateCampaignTasks(savedId, campaignName, chs);
    
    const taskMsg = taskCount > 0 ? ` · ${taskCount} tarefas criativas para Guilherme` : '';
    toast({ 
      title: '🚀 Campanha aplicada!', 
      description: `${kanbanItems.length} tarefas no Kanban · ${calItems.length} entradas no Calendário${taskMsg}`,
    });
    setShowModal(false);
  };

  // Filtered campaigns
  const allChannels = Array.from(new Set(campaigns.flatMap(c => c.channel || [])));
  const filtered = campaigns.filter(c => {
    const statusOk = filterStatus === 'all' || c.status === filterStatus;
    const channelOk = filterChannel === 'all' || (c.channel || []).includes(filterChannel as Channel);
    return statusOk && channelOk;
  });

  const grouped = (Object.keys(STATUS_CONFIG) as CampaignStatus[]).reduce<Record<CampaignStatus, Campaign[]>>(
    (acc, st) => { acc[st] = filtered.filter(c => c.status === st); return acc; },
    {} as Record<CampaignStatus, Campaign[]>
  );

  const hasStrategy = !!metafields && (metafields.completenessScore ?? 0) > 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-primary/15 p-3 border border-primary/20">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-black text-foreground tracking-tight">Campanhas</h1>
            <p className="text-sm text-muted-foreground">
              {hasStrategy
                ? `Estratégia ativa · Score ${metafields.completenessScore}% · IA vai usar esses dados na geração`
                : 'Preencha a aba Estratégia para a IA gerar campanhas mais precisas'}
            </p>
          </div>
          <Button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Nova campanha
          </Button>
        </div>

        {/* Strategy context banner */}
        {hasStrategy && metafields && (
          <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 to-transparent p-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-4 w-4 text-primary" />
              <p className="text-sm font-bold text-foreground">Meta-Fields Ativos da Estratégia</p>
              <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">Score {metafields.completenessScore}%</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {metafields.brandEssence && <StrategyPill label="Essência" value={metafields.brandEssence} />}
              {metafields.targetPersona?.profile && <StrategyPill label="Persona" value={metafields.targetPersona.profile} />}
              {metafields.currentCampaignFocus && <StrategyPill label="Foco Atual" value={metafields.currentCampaignFocus} />}
              {metafields.targetPersona?.biggestPain && <StrategyPill label="Maior Dor" value={metafields.targetPersona.biggestPain} />}
              {metafields.ctaStyle && <StrategyPill label="CTA Style" value={metafields.ctaStyle} />}
              {metafields.keyMessages?.[0] && <StrategyPill label="Mensagem Central" value={metafields.keyMessages[0]} />}
            </div>
          </div>
        )}

        {/* Tabs: Analytics | Campanhas */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-card border border-border h-auto p-1 gap-1">
            <TabsTrigger value="campanhas" className="text-xs px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Campanhas ({campaigns.length})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Analytics & Relatório
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campanhas" className="mt-4 space-y-4">
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex flex-wrap gap-1.5">
                {['all', ...Object.keys(STATUS_CONFIG)].map(st => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                      filterStatus === st
                        ? 'bg-primary/20 text-primary border-primary/30'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {st === 'all' ? `Todas (${campaigns.length})` : `${st} (${grouped[st as CampaignStatus]?.length ?? 0})`}
                  </button>
                ))}
              </div>
              {allChannels.length > 0 && (
                <>
                  <div className="w-px h-4 bg-border mx-1" />
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setFilterChannel('all')}
                      className={cn('rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors', filterChannel === 'all' ? 'bg-muted text-foreground border-border' : 'border-border text-muted-foreground hover:text-foreground')}
                    >
                      Todos canais
                    </button>
                    {allChannels.map(ch => (
                      <button
                        key={ch}
                        onClick={() => setFilterChannel(filterChannel === ch ? 'all' : ch)}
                        className={cn('rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors flex items-center gap-1', filterChannel === ch ? 'border-primary/30 text-primary bg-primary/10' : 'border-border text-muted-foreground hover:text-foreground')}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: CHANNEL_COLORS[ch] || C.purple }} />
                        {ch}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="ml-auto flex rounded-lg border border-border overflow-hidden">
                <button onClick={() => setView('grid')} className={cn('p-2 transition-colors', view === 'grid' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground')}>
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button onClick={() => setView('list')} className={cn('p-2 transition-colors', view === 'list' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground')}>
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Campaign grid / list */}
            {view === 'grid' ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(c => (
                  <CampaignCard key={c.id} campaign={c} onEdit={() => openEdit(c)} onDelete={() => handleDelete(c.id)} onView={() => setDetailId(c.id)} />
                ))}
                <button
                  onClick={openCreate}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all min-h-[160px] text-sm text-muted-foreground hover:text-primary"
                >
                  <Plus className="h-5 w-5" />
                  Nova campanha
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(c => {
                  const st = STATUS_CONFIG[c.status];
                  return (
                    <div key={c.id} className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/30 transition-colors group cursor-pointer" onClick={() => setDetailId(c.id)}>
                      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', c.priority === 'Alta' ? 'border-red-500/30 bg-red-500/10' : 'border-border bg-muted/30')}>
                        <Megaphone className={cn('h-4 w-4', c.priority === 'Alta' ? 'text-red-400' : 'text-muted-foreground')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {(c.channel || []).slice(0, 2).map(ch => (
                            <span key={ch} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: CHANNEL_COLORS[ch] || C.purple }} />
                              {ch}
                            </span>
                          ))}
                          {c.roas && <span className="text-[10px] font-bold text-green-400">ROAS {c.roas}x</span>}
                          {c.leads && <span className="text-[10px] text-muted-foreground">{c.leads.toLocaleString('pt-BR')} leads</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn('flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold', st.color)}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          <button onClick={() => openEdit(c)} className="rounded p-1 hover:bg-muted transition-colors"><PenLine className="h-3.5 w-3.5 text-muted-foreground" /></button>
                          <button onClick={() => handleDelete(c.id)} className="rounded p-1 hover:bg-destructive/15 transition-colors group/del"><Trash2 className="h-3.5 w-3.5 text-muted-foreground group-hover/del:text-destructive" /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            <AnalyticsPanel campaigns={campaigns} />
          </TabsContent>
        </Tabs>

        {/* ── Create / Edit Modal ── */}
        <Dialog open={showModal} onOpenChange={v => { if (!v) setShowModal(false); }}>
          <DialogContent className="max-w-2xl bg-card border-border overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                {editingId ? 'Editar campanha' : 'Nova campanha'}
                {hasStrategy && (
                  <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary flex items-center gap-1">
                    <Brain className="h-3 w-3" /> Estratégia ativa
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
            {/* ── STEP INDICATOR ── */}
              <div className="flex items-center gap-2 mb-2">
                {(['form', 'allocation', 'summary'] as const).map((step, i) => {
                  const labels = ['Dados', 'Alocação', 'Resumo'];
                  const isActive = wizardStep === step;
                  const isDone = (['form', 'allocation', 'summary'] as const).indexOf(wizardStep) > i;
                  return (
                    <div key={step} className="flex items-center gap-2 flex-1">
                      <div className={cn(
                        'flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold shrink-0 transition-colors',
                        isActive ? 'bg-primary text-primary-foreground' : isDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground'
                      )}>
                        {isDone ? '✓' : i + 1}
                      </div>
                      <span className={cn('text-[11px] font-semibold', isActive ? 'text-foreground' : 'text-muted-foreground')}>{labels[i]}</span>
                      {i < 2 && <div className="flex-1 h-px bg-border" />}
                    </div>
                  );
                })}
              </div>

              {/* ═══════════ STEP 1: FORM ═══════════ */}
              {wizardStep === 'form' && (
                <div className="space-y-5">
                  {hasStrategy && (
                    <div className="flex items-center justify-between rounded-lg bg-primary/8 border border-primary/20 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        <p className="text-xs text-foreground/80">Quer pré-preencher com a estratégia ativa?</p>
                      </div>
                      <button onClick={autofillFromStrategy} className="text-xs font-bold text-primary hover:underline">Preencher →</button>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Nome da campanha *</label>
                      <Input placeholder="Ex: Campanha Prestadores — Fevereiro 2026" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-muted/20 border-border/60" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Objetivo</label>
                      <Textarea placeholder="O que essa campanha precisa alcançar? Seja específico com números e prazo." value={form.objective || ''} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} rows={2} className="bg-muted/20 border-border/60 resize-none text-sm" />
                    </div>

                    {/* ── CHANNEL TOGGLE BUTTONS ── */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-2 block">Canais da campanha</label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (form.channels.length === ALL_CHANNELS.length) {
                              setForm(f => ({ ...f, channels: [] }));
                            } else {
                              setForm(f => ({ ...f, channels: [...ALL_CHANNELS] }));
                            }
                          }}
                          className={cn(
                            'rounded-lg border px-3 py-2 text-xs font-bold transition-all flex items-center gap-1.5',
                            form.channels.length === ALL_CHANNELS.length
                              ? 'bg-primary/15 border-primary/40 text-primary'
                              : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                          )}
                        >
                          <LayoutGrid className="h-3.5 w-3.5" />
                          Todos
                        </button>
                        {ALL_CHANNELS.map(ch => {
                          const selected = form.channels.includes(ch);
                          return (
                            <button
                              key={ch}
                              type="button"
                              onClick={() => {
                                setForm(f => ({
                                  ...f,
                                  channels: selected
                                    ? f.channels.filter(c => c !== ch)
                                    : [...f.channels, ch],
                                }));
                              }}
                              className={cn(
                                'rounded-lg border px-3 py-2 text-xs font-semibold transition-all flex items-center gap-1.5',
                                selected
                                  ? 'border-primary/40 text-foreground'
                                  : 'border-border text-muted-foreground hover:border-border hover:text-foreground'
                              )}
                              style={selected ? { background: `${CHANNEL_COLORS[ch]}15`, borderColor: `${CHANNEL_COLORS[ch]}40` } : {}}
                            >
                              <span className="h-2 w-2 rounded-full" style={{ background: CHANNEL_COLORS[ch] || C.purple }} />
                              {CHANNEL_EMOJI[ch] || ''} {ch}
                            </button>
                          );
                        })}
                      </div>
                      {form.channels.length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-1.5">{form.channels.length} canal(is) selecionado(s)</p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Prioridade</label>
                        <Select value={form.priority || 'Alta'} onValueChange={v => setForm(f => ({ ...f, priority: v as Priority }))}>
                          <SelectTrigger className="bg-muted/20 border-border/60"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            {['Alta', 'Média', 'Baixa'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Funil</label>
                        <Select value={form.funnel || 'Topo'} onValueChange={v => setForm(f => ({ ...f, funnel: v as Funnel }))}>
                          <SelectTrigger className="bg-muted/20 border-border/60"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            {['Topo', 'Meio', 'Fundo'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Status</label>
                        <Select value={form.status || 'Rascunho'} onValueChange={v => setForm(f => ({ ...f, status: v as CampaignStatus }))}>
                          <SelectTrigger className="bg-muted/20 border-border/60"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            {Object.keys(STATUS_CONFIG).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Início</label>
                        <Input type="date" value={form.startDate || ''} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="bg-muted/20 border-border/60" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Término</label>
                        <Input type="date" value={form.endDate || ''} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="bg-muted/20 border-border/60" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Orçamento Total (R$)</label>
                        <Input placeholder="Ex: 5000" value={form.budget || ''} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} className="bg-muted/20 border-border/60" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Responsável</label>
                        <Input placeholder="Ex: Guilherme" value={form.responsible || ''} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} className="bg-muted/20 border-border/60" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Público-alvo</label>
                      <Input placeholder={metafields?.targetPersona?.profile || 'Descreva quem é o público desta campanha'} value={form.targetAudience || ''} onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value }))} className="bg-muted/20 border-border/60" />
                    </div>
                  </div>

                  {/* Knowledge Base Status */}
                  <div className="rounded-xl border border-border bg-muted/10 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs font-bold text-foreground">📚 Knowledge Base & Documentos Estratégicos</p>
                    </div>
                    {knowledgeDocs.length > 0 ? (
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap gap-1.5">
                          {knowledgeDocs.map((doc, i) => (
                            <span key={i} className={cn(
                              'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                              doc.status === 'done' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            )}>
                              {doc.status === 'done' ? '✅' : '⏳'} {doc.document_name}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {knowledgeDocs.filter(d => d.status === 'done').length} doc(s) analisado(s) — a IA usará esses dados ao gerar o plano
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-muted-foreground">
                          Nenhum documento estratégico enviado.
                        </p>
                        <a href="/estrategia" className="text-[10px] font-bold text-primary hover:underline whitespace-nowrap ml-2 flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" /> Ir para Estratégia
                        </a>
                      </div>
                    )}
                  </div>

                  {/* CMO Directives */}
                  <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="rounded-lg bg-accent/15 p-1.5 border border-accent/20">
                        <Brain className="h-4 w-4 text-accent-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-foreground">Diretrizes do CMO</p>
                        <p className="text-[10px] text-muted-foreground">Preencha apenas o que desejar</p>
                      </div>
                      {metafields && (
                        <button
                          onClick={() => {
                            setCmoDirectives(prev => ({
                              ...prev,
                              toneGuidance: prev.toneGuidance || (metafields.toneRules?.use || []).join(', '),
                              emotionalAngle: prev.emotionalAngle || metafields.brandEssence || '',
                              targetPain: prev.targetPain || metafields.targetPersona?.biggestPain || '',
                              keyMessage: prev.keyMessage || (metafields.keyMessages?.[0] || ''),
                            }));
                            toast({ title: 'Diretrizes preenchidas ✅' });
                          }}
                          className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          <RefreshCw className="h-3 w-3" /> Preencher da estratégia
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-1 block">🎯 Ângulo emocional</label>
                        <Input placeholder="Ex: Orgulho profissional..." value={cmoDirectives.emotionalAngle} onChange={e => setCmoDirectives(d => ({ ...d, emotionalAngle: e.target.value }))} className="bg-muted/20 border-border/60 text-xs h-9" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-1 block">🗣️ Tom de voz</label>
                        <Input placeholder="Ex: Direto, motivacional..." value={cmoDirectives.toneGuidance} onChange={e => setCmoDirectives(d => ({ ...d, toneGuidance: e.target.value }))} className="bg-muted/20 border-border/60 text-xs h-9" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-1 block">💢 Dor principal</label>
                        <Input placeholder="Ex: Não saber divulgar..." value={cmoDirectives.targetPain} onChange={e => setCmoDirectives(d => ({ ...d, targetPain: e.target.value }))} className="bg-muted/20 border-border/60 text-xs h-9" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-1 block">💡 Mensagem central</label>
                        <Input placeholder="Ex: Você merece ser visto..." value={cmoDirectives.keyMessage} onChange={e => setCmoDirectives(d => ({ ...d, keyMessage: e.target.value }))} className="bg-muted/20 border-border/60 text-xs h-9" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-1 block">🚫 O que evitar</label>
                      <Input placeholder="Ex: Não usar humor..." value={cmoDirectives.avoid} onChange={e => setCmoDirectives(d => ({ ...d, avoid: e.target.value }))} className="bg-muted/20 border-border/60 text-xs h-9" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-1 block">✏️ Ajustes pontuais</label>
                      <Textarea placeholder="Orientação extra..." value={cmoDirectives.freeNotes} onChange={e => setCmoDirectives(d => ({ ...d, freeNotes: e.target.value }))} rows={2} className="bg-muted/20 border-border/60 resize-none text-xs" />
                    </div>
                  </div>

                  {/* AI Generation */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-primary/15 p-1.5 border border-primary/20">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">Gerar plano com IA</p>
                        <p className="text-[11px] text-muted-foreground">
                          {hasStrategy ? 'Usa meta-fields + knowledge base + diretrizes CMO' : 'Preencha os campos e deixe a IA sugerir'}
                        </p>
                      </div>
                    </div>
                    {Object.values(cmoDirectives).some((v: string) => v.trim()) && (
                      <div className="flex flex-wrap gap-1.5">
                        {cmoDirectives.emotionalAngle && <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary">🎯 {cmoDirectives.emotionalAngle}</span>}
                        {cmoDirectives.toneGuidance && <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary">🗣️ {cmoDirectives.toneGuidance}</span>}
                        {cmoDirectives.targetPain && <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary">💢 {cmoDirectives.targetPain}</span>}
                        {cmoDirectives.keyMessage && <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary">💡 {cmoDirectives.keyMessage}</span>}
                        {cmoDirectives.avoid && <span className="rounded-full bg-destructive/10 border border-destructive/20 px-2 py-0.5 text-[9px] font-bold text-destructive">🚫 {cmoDirectives.avoid}</span>}
                      </div>
                    )}
                    <Button onClick={handleGenerateAI} disabled={generating} variant="outline" className="w-full border-primary/40 text-primary hover:bg-primary/10 hover:border-primary/60 gap-2 font-bold">
                      {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando plano com IA...</> : <><Sparkles className="h-4 w-4" /> Gerar plano com IA</>}
                    </Button>
                  </div>

                  {/* AI Plan result */}
                  {aiPlan && showAiPanel && (
                    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <p className="text-sm font-bold text-foreground">Plano gerado pela IA</p>
                          {aiPlan.angle && (
                            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                              {ANGLE_EMOJI[aiPlan.angle] || '🎯'} {aiPlan.angle}
                            </span>
                          )}
                        </div>
                        <button onClick={() => setShowAiPanel(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                      </div>
                      <p className="text-xs text-foreground/80 leading-relaxed bg-muted/30 rounded-lg px-3 py-2">{aiPlan.campaignSummary}</p>
                      {aiPlan.keyMessage && (
                        <div className="rounded-lg bg-muted/30 px-3 py-2">
                          <p className="text-[10px] font-bold text-muted-foreground/60 mb-0.5 uppercase tracking-wider">Mensagem Central</p>
                          <p className="text-xs font-semibold text-foreground">{aiPlan.keyMessage}</p>
                        </div>
                      )}
                      {aiPlan.hooks && aiPlan.hooks.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-1.5">Hooks sugeridos</p>
                          <div className="space-y-1">
                            {aiPlan.hooks.map((h, i) => (
                              <div key={i} className="flex items-start gap-2 rounded-lg bg-muted/20 px-3 py-2">
                                <span className="text-primary text-xs font-bold mt-0.5">{i + 1}</span>
                                <p className="text-xs text-foreground/85">{h}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Adjust / Regenerate buttons */}
                      <div className="border-t border-emerald-500/15 pt-3 space-y-2">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setShowRefinement(v => !v)} className="flex-1 border-border text-xs gap-1.5" disabled={generating}>
                            <PenLine className="h-3.5 w-3.5" /> Ajustar plano
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleRegenerateWithKB} className="flex-1 border-primary/30 text-primary text-xs gap-1.5 hover:bg-primary/10" disabled={generating}>
                            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
                            Refazer com KB
                          </Button>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleGenerateAI} className="w-full border-border text-xs gap-1.5 text-muted-foreground" disabled={generating}>
                          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                          Regenerar do zero
                        </Button>
                        {showRefinement && (
                          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                            <Textarea placeholder="Ex: Troque o ângulo para urgência..." value={refinementNote} onChange={e => setRefinementNote(e.target.value)} rows={2} className="bg-muted/20 border-border/60 resize-none text-xs" />
                            <Button onClick={handleRefinePlan} disabled={generating || !refinementNote.trim()} size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 text-xs font-bold">
                              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                              Aplicar ajuste
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
                    <Button
                      onClick={() => {
                        if (!form.name?.trim()) {
                          toast({ title: 'Nome obrigatório', variant: 'destructive' });
                          return;
                        }
                        if (form.channels.length === 0) {
                          toast({ title: 'Selecione ao menos 1 canal', variant: 'destructive' });
                          return;
                        }
                        const totalBudget = Number(form.budget) || 0;
                        const perChannel = form.channels.length > 0 ? Math.round(totalBudget / form.channels.length) : 0;
                        // If AI plan has kanbanTasks, use them to compute per-channel creative counts
                        const aiTasksByChannel: Record<string, number> = {};
                        if (aiPlan?.kanbanTasks && aiPlan.kanbanTasks.length > 0) {
                          for (const t of aiPlan.kanbanTasks) {
                            const ch = t.channel as Channel;
                            if (form.channels.includes(ch)) {
                              aiTasksByChannel[ch] = (aiTasksByChannel[ch] || 0) + 1;
                            }
                          }
                        }
                        setChannelAllocations(form.channels.map(ch => ({
                          channel: ch,
                          creativeCount: aiTasksByChannel[ch] || 2,
                          budget: 0,
                          formats: getCreativeTypesForChannel(ch).map(ct => {
                            const map: Record<string, ContentFormat> = { carrossel: 'Carrossel', reels: 'Reels', stories: 'Stories', post: 'Post', video: 'Reels', ads: 'Ads', shorts: 'Shorts' };
                            return map[ct] || 'Post';
                          }),
                        })));
                        setWizardStep('allocation');
                      }}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
                    >
                      Avançar <ChevronRight className="h-4 w-4" />
                    </Button>
                  </DialogFooter>
                </div>
              )}

              {/* ═══════════ STEP 2: ALLOCATION ═══════════ */}
              {wizardStep === 'allocation' && (
                <div className="space-y-4">
                  {/* Objective context banner */}
                  {form.objective && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-1">📋 Objetivo da campanha</p>
                      <p className="text-xs text-foreground/80 leading-relaxed">{form.objective}</p>
                      {aiPlan?.campaignSummary && (
                        <div className="mt-2 pt-2 border-t border-amber-500/15">
                          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-1">🤖 Resumo da IA</p>
                          <p className="text-xs text-foreground/70 leading-relaxed">{aiPlan.campaignSummary}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-foreground">Verba Total</p>
                      <p className="text-lg font-black text-primary tabular-nums">R$ {(Number(form.budget) || 0).toLocaleString('pt-BR')}</p>
                    </div>
                    {(() => {
                      const allocated = channelAllocations.reduce((s, a) => s + a.budget, 0);
                      const total = Number(form.budget) || 0;
                      const remaining = total - allocated;
                      const pct = total > 0 ? Math.round((allocated / total) * 100) : 0;
                      return (
                        <>
                          <div className="h-2 w-full rounded-full bg-border overflow-hidden mb-1">
                            <div className="h-full rounded-full transition-all duration-300" style={{
                              width: `${Math.min(pct, 100)}%`,
                              background: remaining < 0 ? C.red : `linear-gradient(90deg, ${C.orange}, ${C.teal})`,
                            }} />
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span className="text-muted-foreground">Alocado: R$ {allocated.toLocaleString('pt-BR')} ({pct}%)</span>
                            <span className={cn('font-bold', remaining < 0 ? 'text-red-400' : remaining > 0 ? 'text-amber-400' : 'text-emerald-400')}>
                              {remaining === 0 ? '✅ Verba totalmente distribuída' : remaining > 0 ? `R$ ${remaining.toLocaleString('pt-BR')} restante` : `R$ ${Math.abs(remaining).toLocaleString('pt-BR')} excedido`}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {channelAllocations.map((alloc, idx) => {
                    const total = Number(form.budget) || 0;
                    const pct = total > 0 ? Math.round((alloc.budget / total) * 100) : 0;
                    // Calculate campaign duration for daily budget
                    const startMs = form.startDate ? new Date(form.startDate + 'T12:00:00').getTime() : Date.now();
                    const endMs = form.endDate ? new Date(form.endDate + 'T12:00:00').getTime() : startMs + 30 * 86400000;
                    const campaignDays = Math.max(1, Math.round((endMs - startMs) / 86400000));
                    const dailyBudget = alloc.budget > 0 ? (alloc.budget / campaignDays) : 0;
                    return (
                      <div key={alloc.channel} className="rounded-xl border border-border bg-card p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ background: CHANNEL_COLORS[alloc.channel] || C.purple }} />
                          <p className="text-sm font-bold text-foreground">{CHANNEL_EMOJI[alloc.channel]} {alloc.channel}</p>
                          {alloc.channel === 'Meta Ads' && (
                            <span className="text-[9px] text-muted-foreground/60 italic">(Facebook + Instagram)</span>
                          )}
                          <span className="ml-auto text-[10px] font-bold text-muted-foreground">{pct}% da verba</span>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider">Nº de criativos</label>
                            <Input
                              type="number"
                              min={1}
                              max={20}
                              value={alloc.creativeCount}
                              onChange={e => {
                                const v = Math.max(1, Math.min(20, Number(e.target.value) || 1));
                                setChannelAllocations(prev => prev.map((a, i) => i === idx ? { ...a, creativeCount: v } : a));
                              }}
                              className="w-16 h-7 text-xs font-bold text-center bg-muted/20 border-border/60 tabular-nums"
                            />
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={20}
                            value={alloc.creativeCount}
                            onChange={e => {
                              const v = Number(e.target.value);
                              setChannelAllocations(prev => prev.map((a, i) => i === idx ? { ...a, creativeCount: v } : a));
                            }}
                            className="w-full h-2 rounded-full appearance-none bg-border cursor-pointer accent-primary"
                          />
                          <div className="flex justify-between text-[9px] text-muted-foreground/50 mt-0.5">
                            <span>1</span><span>10</span><span>20</span>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider">Verba do canal (R$)</label>
                            <Input
                              type="number"
                              min={0}
                              step={50}
                              value={alloc.budget || ''}
                              placeholder="0"
                              onChange={e => {
                                const newVal = Math.max(0, Number(e.target.value) || 0);
                                setChannelAllocations(prev => prev.map((a, i) => i === idx ? { ...a, budget: newVal } : a));
                              }}
                              className="w-28 h-7 text-xs font-bold text-right bg-muted/20 border-border/60 tabular-nums"
                            />
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={Math.max(total, 1)}
                            step={50}
                            value={alloc.budget}
                            onChange={e => {
                              const newVal = Number(e.target.value);
                              setChannelAllocations(prev => prev.map((a, i) => i === idx ? { ...a, budget: newVal } : a));
                            }}
                            className="w-full h-2 rounded-full appearance-none bg-border cursor-pointer accent-primary"
                          />
                          <div className="flex justify-between text-[9px] text-muted-foreground/50 mt-0.5">
                            <span>R$ 0</span><span>R$ {total.toLocaleString('pt-BR')}</span>
                          </div>
                          {alloc.budget > 0 && (
                            <p className="text-[10px] text-primary/70 font-semibold mt-1">
                              ≈ R$ {dailyBudget.toFixed(2)}/dia ({campaignDays} dias)
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-1 block">Formatos</label>
                          <div className="flex flex-wrap gap-1.5">
                            {getCreativeTypesForChannel(alloc.channel).map(ct => {
                              const label = ct.charAt(0).toUpperCase() + ct.slice(1);
                              const spec = getFormatSpec(alloc.channel, ct);
                              return (
                                <span key={ct} className="rounded-md border border-border bg-muted/20 px-2 py-1 text-[10px] text-muted-foreground">
                                  {label} · {spec.width}×{spec.height}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex items-center justify-between rounded-lg bg-muted/20 border border-border px-3 py-2">
                    <span className="text-xs text-muted-foreground">Total de criativos:</span>
                    <span className="text-sm font-black text-foreground">{channelAllocations.reduce((s, a) => s + a.creativeCount, 0)} peças</span>
                  </div>

                  <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={() => setWizardStep('form')}>← Voltar</Button>
                    <Button
                      onClick={() => setWizardStep('summary')}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
                    >
                      Ver resumo <ChevronRight className="h-4 w-4" />
                    </Button>
                  </DialogFooter>
                </div>
              )}

              {/* ═══════════ STEP 3: SUMMARY ═══════════ */}
              {wizardStep === 'summary' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <p className="text-sm font-bold text-foreground">Resumo da Campanha</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Campanha</span>
                        <span className="font-bold text-foreground">{form.name}</span>
                      </div>
                      {form.objective && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Objetivo</span>
                          <span className="font-medium text-foreground max-w-[60%] text-right">{form.objective}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Prioridade</span>
                        <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold', PRIORITY_COLORS[form.priority])}>{form.priority}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Funil</span>
                        <span className="font-medium text-foreground">{form.funnel}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Verba Total</span>
                        <span className="font-bold text-primary">R$ {(Number(form.budget) || 0).toLocaleString('pt-BR')}</span>
                      </div>
                      {form.startDate && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Período</span>
                          <span className="font-medium text-foreground">
                            {new Date(form.startDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            {form.endDate && ` → ${new Date(form.endDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-emerald-500/15 pt-3">
                      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-2">Distribuição por Canal</p>
                      <div className="space-y-2">
                        {channelAllocations.map(alloc => (
                          <div key={alloc.channel} className="flex items-center gap-3 rounded-lg bg-muted/20 px-3 py-2">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: CHANNEL_COLORS[alloc.channel] || C.purple }} />
                            <span className="text-xs font-semibold text-foreground flex-1">{alloc.channel}</span>
                            <span className="text-[10px] text-muted-foreground">{alloc.creativeCount} criativos</span>
                            <span className="text-xs font-bold text-foreground tabular-nums">R$ {alloc.budget.toLocaleString('pt-BR')}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                      <span className="text-xs text-emerald-400 font-semibold">Total de tarefas a criar</span>
                      <span className="text-lg font-black text-emerald-400">{channelAllocations.reduce((s, a) => s + a.creativeCount, 0)}</span>
                    </div>
                  </div>

                  <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={() => setWizardStep('allocation')}>← Voltar</Button>
                    <Button
                      onClick={async () => {
                        // Save campaign
                        handleSave();
                        // Generate tasks from allocations
                        if (!user) return;
                        const savedId = editingId || `camp-${Date.now()}`;
                        const startMs = form.startDate ? new Date(form.startDate + 'T12:00:00').getTime() : Date.now();
                        const tasks: any[] = [];
                        let taskIdx = 0;
                        for (const alloc of channelAllocations) {
                          const creativeTypes = getCreativeTypesForChannel(alloc.channel);
                          for (let ci = 0; ci < alloc.creativeCount; ci++) {
                            const ct = creativeTypes[ci % creativeTypes.length];
                            const spec = getFormatSpec(alloc.channel, ct);
                            tasks.push({
                              user_id: user.id,
                              campaign_id: savedId,
                              campaign_name: form.name,
                              title: `${ct.charAt(0).toUpperCase() + ct.slice(1)} ${ci + 1} — ${alloc.channel}`,
                              description: form.objective || aiPlan?.campaignSummary || '',
                              creative_type: ct,
                              channel: alloc.channel,
                              format_width: spec.width,
                              format_height: spec.height,
                              format_ratio: spec.ratio,
                              format_name: spec.name,
                              status: 'pending',
                              priority: form.priority || 'Média',
                              assigned_to: 'Guilherme',
                              deadline: new Date(startMs + (3 + taskIdx * 2) * 86400000).toISOString().split('T')[0],
                              campaign_context: {
                                objective: form.objective || '',
                                campaignSummary: aiPlan?.campaignSummary || '',
                                cta: aiPlan?.ctaMain || '',
                                hooks: aiPlan?.hooks || [],
                                emotionalAngle: cmoDirectives.emotionalAngle || aiPlan?.angle || '',
                                targetAudience: form.targetAudience || '',
                                keyMessage: aiPlan?.keyMessage || cmoDirectives.keyMessage || '',
                                funnel: form.funnel || 'Topo',
                                channelBudget: alloc.budget,
                                viralLogic: aiPlan?.viralLogic || '',
                                toneGuidance: cmoDirectives.toneGuidance || '',
                                avoid: cmoDirectives.avoid || '',
                              },
                            });
                            taskIdx++;
                          }
                        }
                        if (tasks.length > 0) {
                          const { error } = await supabase.from('campaign_tasks').insert(tasks);
                          if (error) {
                            toast({ title: 'Erro ao criar tarefas', description: error.message, variant: 'destructive' });
                            return;
                          }
                          // Send forum notification
                          try {
                            const totalCreatives = tasks.length;
                            const channelSummary = channelAllocations.map(a => `${a.channel} (${a.creativeCount})`).join(', ');
                            await supabase.from('forum_messages').insert({
                              user_id: user.id,
                              author_name: 'Sistema',
                              author_initials: '🚀',
                              author_role: 'system',
                              content: `📋 **Campanha "${form.name}" aprovada!**\n\n${totalCreatives} tarefas criativas criadas para Guilherme:\n${channelSummary}\n\nVerba total: R$ ${(Number(form.budget) || 0).toLocaleString('pt-BR')}\nPrioridade: ${form.priority} · Funil: ${form.funnel}`,
                              is_ai: false,
                              is_pinned: false,
                              message_type: 'system',
                            });
                          } catch { /* noop */ }
                          toast({
                            title: '🚀 Campanha aprovada!',
                            description: `${tasks.length} tarefas criadas para Guilherme · Notificação enviada ao Fórum`,
                          });
                        }
                        setShowModal(false);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-600/90 text-white font-bold gap-2"
                    >
                      <Zap className="h-4 w-4" /> Aprovar e criar tarefas
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Detail drawer — Figma-quality export view */}
        {detailCampaign && (
          <Dialog open={!!detailId} onOpenChange={v => { if (!v) setDetailId(null); }}>
            <DialogContent className="max-w-2xl bg-card border-border overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-primary" />
                  Detalhes da Campanha
                </DialogTitle>
              </DialogHeader>

              {/* ── Exportable card ── */}
              <div
                ref={exportRef}
                className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted/20 overflow-hidden"
                style={{ fontFamily: "'Inter', 'Montserrat', system-ui, sans-serif" }}
              >
                {/* Accent bar */}
                <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${CHANNEL_COLORS[detailCampaign.channel?.[0]] || C.orange}, ${C.teal})` }} />

                {/* Header section */}
                <div className="px-6 pt-5 pb-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn('flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider', STATUS_CONFIG[detailCampaign.status].color)}>
                          <span className={cn('h-2 w-2 rounded-full', STATUS_CONFIG[detailCampaign.status].dot)} />
                          {detailCampaign.status}
                        </span>
                        <span className={cn('rounded-md border px-2 py-1 text-[11px] font-bold', PRIORITY_COLORS[detailCampaign.priority])}>
                          {detailCampaign.priority}
                        </span>
                        {detailCampaign.funnel && (
                          <span className="rounded-md border border-border bg-muted/30 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                            {detailCampaign.funnel}
                          </span>
                        )}
                      </div>
                      <h2 className="text-lg font-black text-foreground tracking-tight leading-tight">{detailCampaign.name}</h2>
                    </div>
                    {detailCampaign.category && (
                      <span className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-bold text-primary shrink-0">
                        {detailCampaign.category}
                      </span>
                    )}
                  </div>
                  {detailCampaign.objective && (
                    <p className="text-sm text-foreground/80 leading-relaxed">{detailCampaign.objective}</p>
                  )}
                </div>

                {/* ── Metrics grid ── */}
                {(detailCampaign.leads || detailCampaign.conversions || detailCampaign.roas || detailCampaign.impressions) && (
                  <div className="mx-6 mb-4 rounded-xl border border-border/60 bg-muted/10 p-4">
                    <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-3">Performance</p>
                    <div className="grid grid-cols-4 gap-4">
                      {[
                        { label: 'Impressões', value: detailCampaign.impressions?.toLocaleString('pt-BR') || '—', color: C.purple },
                        { label: 'Leads', value: detailCampaign.leads?.toLocaleString('pt-BR') || '—', color: C.orange },
                        { label: 'Conversões', value: detailCampaign.conversions?.toLocaleString('pt-BR') || '—', color: C.teal },
                        { label: 'ROAS', value: detailCampaign.roas ? `${detailCampaign.roas}x` : '—', color: detailCampaign.roas && detailCampaign.roas >= 3 ? C.green : C.amber },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="text-center">
                          <p className="text-xl font-black tracking-tight" style={{ color }}>{value}</p>
                          <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Info grid ── */}
                <div className="mx-6 mb-4 grid grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    { label: 'Canais', value: detailCampaign.channel?.join(', '), show: detailCampaign.channel?.length > 0 },
                    { label: 'Orçamento', value: detailCampaign.budget > 0 ? `R$ ${detailCampaign.budget.toLocaleString('pt-BR')}` : null, show: detailCampaign.budget > 0 },
                    { label: 'Responsável', value: detailCampaign.responsible, show: !!detailCampaign.responsible },
                    { label: 'Público', value: detailCampaign.audience, show: !!detailCampaign.audience },
                    { label: 'Início', value: detailCampaign.startDate ? new Date(detailCampaign.startDate + 'T12:00:00').toLocaleDateString('pt-BR') : null, show: !!detailCampaign.startDate },
                    { label: 'Término', value: detailCampaign.endDate ? new Date(detailCampaign.endDate + 'T12:00:00').toLocaleDateString('pt-BR') : null, show: !!detailCampaign.endDate },
                  ].filter(f => f.show && f.value).map(({ label, value }) => (
                    <div key={label} className="border-b border-border/30 pb-2">
                      <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mb-0.5">{label}</p>
                      <p className="text-sm font-semibold text-foreground">{value}</p>
                    </div>
                  ))}
                </div>

                {/* ── Description / instructions ── */}
                {detailCampaign.description && (
                  <div className="mx-6 mb-4 rounded-xl bg-muted/15 border border-border/40 p-4">
                    <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mb-2">Briefing</p>
                    <p className="text-xs text-foreground/75 leading-relaxed whitespace-pre-line">{detailCampaign.description}</p>
                  </div>
                )}

                {/* ── Subtasks ── */}
                {detailCampaign.subtasks?.length > 0 && (
                  <div className="mx-6 mb-4">
                    <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mb-2">Tarefas</p>
                    <div className="space-y-1.5">
                      {detailCampaign.subtasks.map(t => (
                        <div key={t.id} className="flex items-center gap-2 text-xs">
                          <span className={cn('h-4 w-4 rounded-md border flex items-center justify-center text-[10px] shrink-0', t.done ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'border-border text-muted-foreground/30')}>
                            {t.done ? '✓' : ''}
                          </span>
                          <span className={cn('font-medium', t.done ? 'text-muted-foreground line-through' : 'text-foreground')}>{t.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer watermark */}
                <div className="px-6 py-3 border-t border-border/30 flex items-center justify-between">
                  <p className="text-[9px] text-muted-foreground/30 font-semibold uppercase tracking-widest">DQEF Hub · Plano de Campanha</p>
                  <p className="text-[9px] text-muted-foreground/30 tabular-nums">{new Date().toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={() => setDetailId(null)}>Fechar</Button>
                <Button
                  variant="outline"
                  onClick={handleExportPNG}
                  disabled={exporting}
                  className="gap-2 border-border"
                >
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Exportar PNG
                </Button>
                <Button onClick={() => { setDetailId(null); openEdit(detailCampaign); }} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                  <PenLine className="h-4 w-4" /> Editar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

      </div>
    </div>
  );
}
