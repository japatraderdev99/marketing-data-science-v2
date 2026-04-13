import { useState } from 'react';
import { Megaphone, Eye, MousePointerClick, DollarSign, TrendingUp, ExternalLink, RefreshCw, Loader2, Bookmark, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useMetaAdsKPIs, useMetaAdsCampaignSpend, useMetaAdsRanking, useMetaAdsCount } from '@/features/analytics/hooks/useMetaAds';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default function MetaAdsTab({ period }: { period: string }) {
  const { user } = useAuth();
  const { data: kpi, isLoading: loadingKpi } = useMetaAdsKPIs(period);
  const { data: campaignSpend, isLoading: loadingSpend } = useMetaAdsCampaignSpend(period);
  const { data: adsRanking, isLoading: loadingAds } = useMetaAdsRanking(period);
  const { data: counts } = useMetaAdsCount(period);
  const [savedRef, setSavedRef] = useState<string | null>(null);

  const k = kpi ?? { impressions: 0, clicks: 0, spend: 0, conversions: 0, ctr: 0, cpc: 0 };
  const spend = campaignSpend ?? [];
  const ads = adsRanking ?? [];
  const isLoading = loadingKpi || loadingSpend || loadingAds;

  const saveReference = async (ad: typeof ads[0]) => {
    if (!user?.id) return;
    const adKey = `${ad.name}-${ad.campaign}`;
    await supabase.from('creative_references').insert({
      user_id: user.id,
      source_type: 'meta_ad',
      source_id: ad.name,
      reference_data: { name: ad.name, campaign: ad.campaign, spend: ad.spend, ctr: ad.ctr, cpc: ad.cpc, conversions: ad.conversions, score: ad.score, scoreLabel: ad.scoreLabel },
      used_in_module: 'criativo',
    });
    setSavedRef(adKey);
    setTimeout(() => setSavedRef(null), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="w-5 h-5 text-brand" />
          <span className="font-heading font-black text-base text-text-primary">Meta Ads — Dados Reais</span>
          {counts && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-hover text-text-secondary">
              {counts.uniqueAds} anúncios · {counts.totalRows} registros
            </span>
          )}
          {isLoading && <Loader2 className="w-4 h-4 text-brand animate-spin" />}
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
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { icon: DollarSign, label: 'INVESTIMENTO', value: `R$${k.spend.toFixed(2)}` },
          { icon: Eye, label: 'IMPRESSÕES', value: fmtNum(k.impressions) },
          { icon: MousePointerClick, label: 'CLIQUES', value: fmtNum(k.clicks) },
          { icon: TrendingUp, label: 'CTR MÉDIO', value: `${k.ctr.toFixed(2)}%` },
          { icon: DollarSign, label: 'CPC MÉDIO', value: `R$${k.cpc.toFixed(2)}` },
          { icon: TrendingUp, label: 'CONVERSÕES', value: String(k.conversions) },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="p-4 rounded-xl border border-border bg-surface-elevated">
            <div className="flex items-center gap-1.5 mb-2">
              <Icon className="w-4 h-4 text-brand" />
              <span className="text-[10px] font-bold text-text-muted uppercase">{label}</span>
            </div>
            <p className="font-heading font-black text-2xl text-text-primary">{value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Spend by Campaign */}
        <div className="col-span-2 p-5 rounded-xl border border-border bg-surface-elevated">
          <span className="font-bold text-sm text-text-primary">Spend por Campanha</span>
          {spend.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180} className="mt-4">
                <PieChart>
                  <Pie data={spend} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                    {spend.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#171717', border: '1px solid #262626', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {spend.map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: c.fill }} />
                      <span className="text-text-secondary truncate max-w-[180px]">{c.name}</span>
                    </div>
                    <span className="font-bold text-text-primary">R${c.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-text-muted mt-8 text-center">Sem dados de campanhas</p>
          )}
        </div>

        {/* Ranking Table */}
        <div className="col-span-3 p-5 rounded-xl border border-border bg-surface-elevated overflow-auto">
          <span className="font-bold text-sm text-text-primary">Ranking de Anúncios (Agregado)</span>
          {ads.length > 0 ? (
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
                {ads.map((ad, i) => (
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
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => saveReference(ad)}
                          title="Usar como referência no Criativo"
                          className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors',
                            savedRef === `${ad.name}-${ad.campaign}`
                              ? 'text-emerald-400 bg-emerald-400/10'
                              : 'text-text-muted hover:text-brand hover:bg-brand/10'
                          )}
                        >
                          {savedRef === `${ad.name}-${ad.campaign}`
                            ? <><Check className="w-2.5 h-2.5" /> Salvo</>
                            : <><Bookmark className="w-2.5 h-2.5" /> Ref.</>}
                        </button>
                        <ExternalLink className="w-3.5 h-3.5 text-text-muted hover:text-text-primary cursor-pointer" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-text-muted mt-8 text-center">Sem dados de anúncios</p>
          )}
        </div>
      </div>
    </div>
  );
}
