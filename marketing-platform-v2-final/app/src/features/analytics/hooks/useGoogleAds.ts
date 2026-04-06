import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePeriodDates } from './usePeriodDates';

export function useGoogleAdsKPIs(period: string) {
  const { workspaceId } = useAuth();
  const { startDate, endDate } = usePeriodDates(period);

  return useQuery({
    queryKey: ['google-ads-kpis', workspaceId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('google_ads_campaigns')
        .select('impressions, clicks, cost, conversions, conversion_value')
        .eq('workspace_id', workspaceId!)
        .gte('date_start', startDate)
        .lte('date_start', endDate);
      if (error) throw error;

      const rows = data ?? [];
      const totals = rows.reduce(
        (acc, r) => ({
          impressions: acc.impressions + (r.impressions ?? 0),
          clicks: acc.clicks + (r.clicks ?? 0),
          cost: acc.cost + Number(r.cost ?? 0),
          conversions: acc.conversions + Number(r.conversions ?? 0),
        }),
        { impressions: 0, clicks: 0, cost: 0, conversions: 0 },
      );

      const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
      const cpc = totals.clicks > 0 ? totals.cost / totals.clicks : 0;

      return { ...totals, ctr, cpc };
    },
    enabled: !!workspaceId && isSupabaseConfigured,
  });
}
