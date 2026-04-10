import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePeriodDates } from './usePeriodDates';

export function useMetaAdsKPIs(period: string) {
  const { workspaceId } = useAuth();
  const { startDate, endDate } = usePeriodDates(period);

  return useQuery({
    queryKey: ['meta-ads-kpis', workspaceId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_ads_performance')
        .select('impressions, clicks, spend, conversions, ctr, cpc')
        .eq('workspace_id', workspaceId!)
        .gte('metric_date', startDate)
        .lte('metric_date', endDate);
      if (error) throw error;

      const rows = data ?? [];
      const totals = rows.reduce(
        (acc, r) => ({
          impressions: acc.impressions + (r.impressions ?? 0),
          clicks: acc.clicks + (r.clicks ?? 0),
          spend: acc.spend + Number(r.spend ?? 0),
          conversions: acc.conversions + (r.conversions ?? 0),
        }),
        { impressions: 0, clicks: 0, spend: 0, conversions: 0 },
      );

      const ctr = totals.impressions > 0
        ? (totals.clicks / totals.impressions) * 100
        : 0;
      const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;

      return { ...totals, ctr, cpc };
    },
    enabled: !!workspaceId && !!isSupabaseConfigured,
  });
}

export function useMetaAdsCampaignSpend(period: string) {
  const { workspaceId } = useAuth();
  const { startDate, endDate } = usePeriodDates(period);

  return useQuery({
    queryKey: ['meta-ads-campaign-spend', workspaceId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_ads_performance')
        .select('campaign_name, spend')
        .eq('workspace_id', workspaceId!)
        .gte('metric_date', startDate)
        .lte('metric_date', endDate);
      if (error) throw error;

      const grouped = (data ?? []).reduce<Record<string, number>>((acc, r) => {
        const name = r.campaign_name ?? 'Sem nome';
        acc[name] = (acc[name] ?? 0) + Number(r.spend ?? 0);
        return acc;
      }, {});

      const COLORS = ['#3B82F6', '#F59E0B', '#8B5CF6', '#22C55E', '#EF4444', '#EC4899'];
      return Object.entries(grouped)
        .sort(([, a], [, b]) => b - a)
        .map(([name, value], i) => ({
          name,
          value: Math.round(value * 100) / 100,
          fill: COLORS[i % COLORS.length],
        }));
    },
    enabled: !!workspaceId && !!isSupabaseConfigured,
  });
}

export function useMetaAdsRanking(period: string) {
  const { workspaceId } = useAuth();
  const { startDate, endDate } = usePeriodDates(period);

  return useQuery({
    queryKey: ['meta-ads-ranking', workspaceId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_ads_performance')
        .select('ad_name, campaign_name, spend, impressions, clicks, ctr, cpc, conversions, creative_score')
        .eq('workspace_id', workspaceId!)
        .gte('metric_date', startDate)
        .lte('metric_date', endDate)
        .order('spend', { ascending: false })
        .limit(20);
      if (error) throw error;

      // Aggregate by ad_name
      const grouped = new Map<string, {
        campaign: string; spend: number; impressions: number;
        clicks: number; conversions: number; bestScore: number;
      }>();

      for (const r of data ?? []) {
        const key = r.ad_name ?? 'Sem nome';
        const prev = grouped.get(key) ?? {
          campaign: r.campaign_name ?? '', spend: 0,
          impressions: 0, clicks: 0, conversions: 0, bestScore: 0,
        };
        prev.spend += Number(r.spend ?? 0);
        prev.impressions += r.impressions ?? 0;
        prev.clicks += r.clicks ?? 0;
        prev.conversions += r.conversions ?? 0;
        if ((r.creative_score ?? 0) > prev.bestScore) prev.bestScore = r.creative_score ?? 0;
        grouped.set(key, prev);
      }

      return [...grouped.entries()]
        .sort(([, a], [, b]) => b.spend - a.spend)
        .map(([name, d]) => {
          const ctr = d.impressions > 0 ? ((d.clicks / d.impressions) * 100).toFixed(2) + '%' : '0%';
          const cpc = d.clicks > 0 ? 'R$' + (d.spend / d.clicks).toFixed(2) : '—';
          const score = d.bestScore || Math.round((d.clicks / Math.max(d.impressions, 1)) * 100 * 25);
          const scoreLabel = score >= 60 ? 'Bom' : 'Baixo';
          const scoreColor = score >= 60
            ? 'text-blue-400 bg-blue-400/10 border-blue-400/30'
            : 'text-red-400 bg-red-400/10 border-red-400/30';
          return { name, campaign: d.campaign, spend: d.spend, impressions: d.impressions, clicks: d.clicks, ctr, cpc, conversions: d.conversions, score, scoreLabel, scoreColor };
        });
    },
    enabled: !!workspaceId && !!isSupabaseConfigured,
  });
}

export function useMetaAdsCount(period: string) {
  const { workspaceId } = useAuth();
  const { startDate, endDate } = usePeriodDates(period);

  return useQuery({
    queryKey: ['meta-ads-count', workspaceId, startDate, endDate],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('meta_ads_performance')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId!)
        .gte('metric_date', startDate)
        .lte('metric_date', endDate);
      if (error) throw error;

      const { data: ads } = await supabase
        .from('meta_ads_performance')
        .select('ad_id')
        .eq('workspace_id', workspaceId!)
        .gte('metric_date', startDate)
        .lte('metric_date', endDate);

      const uniqueAds = new Set((ads ?? []).map(a => a.ad_id)).size;
      return { totalRows: count ?? 0, uniqueAds };
    },
    enabled: !!workspaceId && !!isSupabaseConfigured,
  });
}
