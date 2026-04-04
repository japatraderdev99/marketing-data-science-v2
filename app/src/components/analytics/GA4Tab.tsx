import { Globe, Users, Activity, Target, Clock, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts';

/* ── Mock Data ── */
const MOCK_KPI = {
  sessions: 3300, users: 1100, bounceRate: 0.3, conversions: 0, avgDuration: '5m 35s',
};

const TREND_DATA = Array.from({ length: 24 }, (_, i) => {
  const day = String(i + 5).padStart(2, '0');
  const base = i < 12 ? 20 + Math.random() * 40 : 80 + Math.random() * 240;
  return {
    date: `${day}/03`,
    sessions: Math.round(base * 1.2),
    users: Math.round(base * 0.8),
  };
});

const BOUNCE_DATA = Array.from({ length: 24 }, (_, i) => {
  const day = String(i + 5).padStart(2, '0');
  return {
    date: `${day}/03`,
    bounceRate: Math.round(Math.random() * 100) / 100,
    conversionRate: 0,
  };
});

const DEVICE_DATA = [
  { name: 'Mobile', value: 2400, pct: '74.0%', fill: '#E8603C' },
  { name: 'Desktop', value: 832, pct: '25.4%', fill: '#00A7B5' },
  { name: 'Tablet', value: 28, pct: '0.6%', fill: '#8B5CF6' },
];

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function KpiCard({ icon: Icon, label, value, color }: {
  icon: typeof Globe; label: string; value: string; color?: string;
}) {
  return (
    <div className="p-4 rounded-xl border border-border bg-surface-elevated">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={cn('w-4 h-4', color || 'text-brand')} />
        <span className="text-[10px] font-bold text-text-muted uppercase">{label}</span>
      </div>
      <p className="font-heading font-black text-2xl text-text-primary">{value}</p>
    </div>
  );
}

const CHART_TOOLTIP = { background: '#171717', border: '1px solid #262626', fontSize: 11 };

export default function GA4Tab() {
  const k = MOCK_KPI;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-brand" />
          <div>
            <span className="font-heading font-black text-base text-text-primary">Google Analytics 4</span>
            <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-surface-hover text-text-secondary">
              814 registros
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Período: 05/03 — 28/03</span>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated text-text-secondary text-xs font-bold">
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-3">
        <KpiCard icon={Activity} label="SESSÕES" value={fmtNum(k.sessions)} />
        <KpiCard icon={Users} label="USUÁRIOS" value={fmtNum(k.users)} />
        <KpiCard icon={Activity} label="TAXA DE REJEIÇÃO" value={`${k.bounceRate}%`} />
        <KpiCard icon={Target} label="CONVERSÕES" value={String(k.conversions)} color="text-emerald-400" />
        <KpiCard icon={Clock} label="DURAÇÃO MÉDIA" value={k.avgDuration} />
      </div>

      {/* Trend Chart */}
      <div className="p-5 rounded-xl border border-border bg-surface-elevated">
        <span className="font-bold text-sm text-text-primary">Tendência — Sessões & Usuários</span>
        <ResponsiveContainer width="100%" height={240} className="mt-4">
          <AreaChart data={TREND_DATA}>
            <XAxis dataKey="date" tick={{ fill: '#808080', fontSize: 9 }} interval={2} />
            <YAxis tick={{ fill: '#808080', fontSize: 10 }} />
            <Tooltip contentStyle={CHART_TOOLTIP} />
            <Area type="monotone" dataKey="sessions" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} strokeWidth={2} />
            <Area type="monotone" dataKey="users" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.1} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bounce Rate + Devices */}
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-3 p-5 rounded-xl border border-border bg-surface-elevated">
          <span className="font-bold text-sm text-text-primary">Taxa de Rejeição & Conversão</span>
          <ResponsiveContainer width="100%" height={200} className="mt-4">
            <LineChart data={BOUNCE_DATA}>
              <XAxis dataKey="date" tick={{ fill: '#808080', fontSize: 9 }} interval={3} />
              <YAxis tick={{ fill: '#808080', fontSize: 10 }} />
              <Tooltip contentStyle={CHART_TOOLTIP} />
              <Line type="monotone" dataKey="bounceRate" stroke="#EF4444" strokeWidth={2} dot={false} name="Rejeição" />
              <Line type="monotone" dataKey="conversionRate" stroke="#22C55E" strokeWidth={2} dot={false} name="Conversão" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-2 p-5 rounded-xl border border-border bg-surface-elevated">
          <span className="font-bold text-sm text-text-primary">Dispositivos</span>
          <div className="flex items-center mt-4">
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie data={DEVICE_DATA} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60}>
                  {DEVICE_DATA.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {DEVICE_DATA.map((d) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded" style={{ background: d.fill }} />
                    <span className="text-xs text-text-primary">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-brand">{d.pct}</span>
                    <span className="text-xs text-text-muted">{fmtNum(d.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
