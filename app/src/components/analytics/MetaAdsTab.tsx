import { Megaphone, Eye, MousePointerClick, DollarSign, TrendingUp, ExternalLink, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

/* ── Mock Data ── */
const MOCK_KPI = {
  investment: 893.73, impressions: 137600, clicks: 3600,
  ctr: 2.64, cpc: 0.25, conversions: 0,
};

const CAMPAIGN_SPEND = [
  { name: '001_Engajamento-Publicações_09...', value: 421, fill: '#3B82F6' },
  { name: '003_Tráfego-Site_16-03-2026', value: 260, fill: '#F59E0B' },
  { name: '002_Tráfego-Perfil_11-03-2026', value: 213, fill: '#8B5CF6' },
];

interface AggAd {
  name: string; campaign: string; spend: number; impressions: number;
  clicks: number; ctr: string; cpc: string; conversions: number;
  score: number; scoreLabel: string; scoreColor: string;
}

const ADS_RANKING: AggAd[] = [
  { name: '003_Post-Video_Instituciona...', campaign: '003_Tráfego-Site_16-03-...', spend: 161.03, impressions: 25700, clicks: 1100, ctr: '4.47%', cpc: 'R$0.14', conversions: 0, score: 78, scoreLabel: 'Bom', scoreColor: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  { name: '010_Post-Estatico_Eletrecist...', campaign: '001_Engajamento-Publi...', spend: 112.47, impressions: 28400, clicks: 311, ctr: '1.09%', cpc: 'R$0.36', conversions: 0, score: 31, scoreLabel: 'Baixo', scoreColor: 'text-red-400 bg-red-400/10 border-red-400/30' },
  { name: '009_Post-Video_Instituciona...', campaign: '001_Engajamento-Publi...', spend: 84.21, impressions: 25100, clicks: 230, ctr: '0.92%', cpc: 'R$0.37', conversions: 0, score: 30, scoreLabel: 'Baixo', scoreColor: 'text-red-400 bg-red-400/10 border-red-400/30' },
  { name: '002_Video-SeuJoao_16-03-...', campaign: '002_Tráfego-Perfil_11-0...', spend: 81.01, impressions: 7600, clicks: 373, ctr: '4.90%', cpc: 'R$0.22', conversions: 0, score: 76, scoreLabel: 'Bom', scoreColor: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  { name: '009_Post-Video_Instituciona...', campaign: '001_Engajamento-Publi...', spend: 59.55, impressions: 16600, clicks: 182, ctr: '1.10%', cpc: 'R$0.33', conversions: 0, score: 31, scoreLabel: 'Baixo', scoreColor: 'text-red-400 bg-red-400/10 border-red-400/30' },
  { name: '001_Post-Carrossel_Chega-...', campaign: '001_Engajamento-Publi...', spend: 51.85, impressions: 2800, clicks: 56, ctr: '2.00%', cpc: 'R$0.93', conversions: 0, score: 30, scoreLabel: 'Baixo', scoreColor: 'text-red-400 bg-red-400/10 border-red-400/30' },
];

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default function MetaAdsTab({ period }: { period: string }) {
  const k = MOCK_KPI;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="w-5 h-5 text-brand" />
          <span className="font-heading font-black text-base text-text-primary">Meta Ads — Dados Reais</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-hover text-text-secondary">
            50 anúncios · 71 registros
          </span>
        </div>
        <div className="flex items-center gap-3">
          <select className="bg-surface-elevated border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary">
            <option>Gabriel Merhy</option>
          </select>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated text-text-secondary text-xs font-bold">
            <RefreshCw className="w-3.5 h-3.5" /> Sync Meta
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { icon: DollarSign, label: 'INVESTIMENTO', value: `R$${k.investment.toFixed(2)}`, color: 'text-brand' },
          { icon: Eye, label: 'IMPRESSÕES', value: fmtNum(k.impressions), color: 'text-brand' },
          { icon: MousePointerClick, label: 'CLIQUES', value: fmtNum(k.clicks), color: 'text-brand' },
          { icon: TrendingUp, label: 'CTR MÉDIO', value: `${k.ctr.toFixed(2)}%`, color: 'text-brand' },
          { icon: DollarSign, label: 'CPC MÉDIO', value: `R$${k.cpc.toFixed(2)}`, color: 'text-brand' },
          { icon: TrendingUp, label: 'CONVERSÕES', value: String(k.conversions), color: 'text-brand' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="p-4 rounded-xl border border-border bg-surface-elevated">
            <div className="flex items-center gap-1.5 mb-2">
              <Icon className={cn('w-4 h-4', color)} />
              <span className="text-[10px] font-bold text-text-muted uppercase">{label}</span>
            </div>
            <p className="font-heading font-black text-2xl text-text-primary">{value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-5 gap-3">
        {/* Spend by Campaign */}
        <div className="col-span-2 p-5 rounded-xl border border-border bg-surface-elevated">
          <span className="font-bold text-sm text-text-primary">Spend por Campanha</span>
          <ResponsiveContainer width="100%" height={180} className="mt-4">
            <PieChart>
              <Pie data={CAMPAIGN_SPEND} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                {CAMPAIGN_SPEND.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#171717', border: '1px solid #262626', fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {CAMPAIGN_SPEND.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: c.fill }} />
                  <span className="text-text-secondary truncate max-w-[180px]">{c.name}</span>
                </div>
                <span className="font-bold text-text-primary">R${c.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ranking Table */}
        <div className="col-span-3 p-5 rounded-xl border border-border bg-surface-elevated overflow-auto">
          <span className="font-bold text-sm text-text-primary">Ranking de Anúncios (Agregado)</span>
          <table className="w-full mt-4 text-[11px]">
            <thead>
              <tr className="text-text-muted uppercase">
                <th className="text-left py-2 font-bold">Anúncio</th>
                <th className="text-left py-2 font-bold">Campanha</th>
                <th className="text-right py-2 font-bold">Spend</th>
                <th className="text-right py-2 font-bold">Imp.</th>
                <th className="text-right py-2 font-bold">Cliques</th>
                <th className="text-right py-2 font-bold">CTR</th>
                <th className="text-right py-2 font-bold">CPC</th>
                <th className="text-right py-2 font-bold">Conv.</th>
                <th className="text-right py-2 font-bold">Score</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {ADS_RANKING.map((ad, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-3 text-text-primary truncate max-w-[160px]">{ad.name}</td>
                  <td className="py-3 text-text-muted truncate max-w-[140px]">{ad.campaign}</td>
                  <td className="py-3 text-right font-bold text-text-primary">R${ad.spend.toFixed(2)}</td>
                  <td className="py-3 text-right text-text-secondary">{fmtNum(ad.impressions)}</td>
                  <td className="py-3 text-right text-text-secondary">{fmtNum(ad.clicks)}</td>
                  <td className="py-3 text-right text-text-secondary">{ad.ctr}</td>
                  <td className="py-3 text-right text-text-secondary">{ad.cpc}</td>
                  <td className="py-3 text-right text-brand font-bold">{ad.conversions}</td>
                  <td className="py-3 text-right">
                    <span className={cn('px-2 py-0.5 rounded text-[9px] font-bold border', ad.scoreColor)}>
                      {ad.score}pts · {ad.scoreLabel}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <ExternalLink className="w-3.5 h-3.5 text-text-muted hover:text-text-primary cursor-pointer" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
