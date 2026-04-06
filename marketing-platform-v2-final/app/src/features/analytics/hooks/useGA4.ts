import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePeriodDates } from './usePeriodDates';

export function useGA4KPIs(period: string) {
  const { workspaceId } = useAuth();
  const { startDate, endDate } = usePeriodDates(period);

  return useQuery({
    queryKey: ['ga4-kpis', workspaceId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ga4_metrics')
        .select('sessions, total_users, bounce_rate, conversions, avg_session_duration')
        .eq('workspace_id', workspaceId!)
        .gte('metric_date', startDate)
        .lte('metric_date', endDate);
      if (error) throw error;

      const rows = data ?? [];
      const totals = rows.reduce(
        (acc, r) => ({
          sessions: acc.sessions + (r.sessions ?? 0),
          users: acc.users + (r.total_users ?? 0),
          conversions: acc.conversions + (r.conversions ?? 0),
          bounceSum: acc.bounceSum + Number(r.bounce_rate ?? 0),
          durationSum: acc.durationSum + Number(r.avg_session_duration ?? 0),
          count: acc.count + 1,
        }),
        { sessions: 0, users: 0, conversions: 0, bounceSum: 0, durationSum: 0, count: 0 },
      );

      const avgBounce = totals.count > 0 ? totals.bounceSum / totals.count : 0;
      const avgDuration = totals.count > 0 ? totals.durationSum / totals.count : 0;
      const mins = Math.floor(avgDuration / 60);
      const secs = Math.round(avgDuration % 60);

      return {
        sessions: totals.sessions,
        users: totals.users,
        bounceRate: Math.round(avgBounce * 10000) / 100,
        conversions: totals.conversions,
        avgDuration: `${mins}m ${String(secs).padStart(2, '0')}s`,
        totalRows: totals.count,
      };
    },
    enabled: !!workspaceId && isSupabaseConfigured,
  });
}

export function useGA4Trend(period: string) {
  const { workspaceId } = useAuth();
  const { startDate, endDate } = usePeriodDates(period);

  return useQuery({
    queryKey: ['ga4-trend', workspaceId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ga4_metrics')
        .select('metric_date, sessions, total_users')
        .eq('workspace_id', workspaceId!)
        .gte('metric_date', startDate)
        .lte('metric_date', endDate)
        .order('metric_date', { ascending: true });
      if (error) throw error;

      // Group by date (multiple rows per date possible for different sources/devices)
      const grouped = new Map<string, { sessions: number; users: number }>();
      for (const r of data ?? []) {
        const key = r.metric_date;
        const prev = grouped.get(key) ?? { sessions: 0, users: 0 };
        prev.sessions += r.sessions ?? 0;
        prev.users += r.total_users ?? 0;
        grouped.set(key, prev);
      }

      return [...grouped.entries()].map(([date, vals]) => ({
        date: formatDate(date),
        sessions: vals.sessions,
        users: vals.users,
      }));
    },
    enabled: !!workspaceId && isSupabaseConfigured,
  });
}

export function useGA4BounceRate(period: string) {
  const { workspaceId } = useAuth();
  const { startDate, endDate } = usePeriodDates(period);

  return useQuery({
    queryKey: ['ga4-bounce', workspaceId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ga4_metrics')
        .select('metric_date, bounce_rate, conversion_rate')
        .eq('workspace_id', workspaceId!)
        .gte('metric_date', startDate)
        .lte('metric_date', endDate)
        .order('metric_date', { ascending: true });
      if (error) throw error;

      const grouped = new Map<string, { bounceSum: number; convSum: number; count: number }>();
      for (const r of data ?? []) {
        const key = r.metric_date;
        const prev = grouped.get(key) ?? { bounceSum: 0, convSum: 0, count: 0 };
        prev.bounceSum += Number(r.bounce_rate ?? 0);
        prev.convSum += Number(r.conversion_rate ?? 0);
        prev.count += 1;
        grouped.set(key, prev);
      }

      return [...grouped.entries()].map(([date, v]) => ({
        date: formatDate(date),
        bounceRate: Math.round((v.bounceSum / v.count) * 100) / 100,
        conversionRate: Math.round((v.convSum / v.count) * 100) / 100,
      }));
    },
    enabled: !!workspaceId && isSupabaseConfigured,
  });
}

export function useGA4Devices(period: string) {
  const { workspaceId } = useAuth();
  const { startDate, endDate } = usePeriodDates(period);

  return useQuery({
    queryKey: ['ga4-devices', workspaceId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ga4_metrics')
        .select('device_category, sessions')
        .eq('workspace_id', workspaceId!)
        .gte('metric_date', startDate)
        .lte('metric_date', endDate)
        .not('device_category', 'is', null);
      if (error) throw error;

      const grouped = (data ?? []).reduce<Record<string, number>>((acc, r) => {
        const device = r.device_category ?? 'unknown';
        acc[device] = (acc[device] ?? 0) + (r.sessions ?? 0);
        return acc;
      }, {});

      const total = Object.values(grouped).reduce((s, v) => s + v, 0) || 1;
      const COLORS: Record<string, string> = {
        mobile: '#E8603C', desktop: '#00A7B5', tablet: '#8B5CF6',
      };

      return Object.entries(grouped)
        .sort(([, a], [, b]) => b - a)
        .map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
          pct: ((value / total) * 100).toFixed(1) + '%',
          fill: COLORS[name.toLowerCase()] ?? '#808080',
        }));
    },
    enabled: !!workspaceId && isSupabaseConfigured,
  });
}

function formatDate(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}
