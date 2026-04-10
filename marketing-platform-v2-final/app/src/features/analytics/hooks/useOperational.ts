import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePeriodDates } from './usePeriodDates';

interface OperationalSummary {
  clients: number;
  clientsTotal: number;
  providers: number;
  providersPct: string;
  bookings: number;
  completed: number;
  gmv: number;
  revenue: number;
  rating: number;
  reviews: number;
}

export function useOperationalSummary(period: string) {
  const { workspaceId } = useAuth();
  const { startDate, endDate } = usePeriodDates(period);

  return useQuery({
    queryKey: ['operational-summary', workspaceId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_metrics')
        .select('metric_type, count, total_value, metadata')
        .eq('workspace_id', workspaceId!)
        .gte('metric_date', startDate)
        .lte('metric_date', endDate);
      if (error) throw error;

      const rows = data ?? [];
      const byType = (type: string) => rows.filter(r => r.metric_type === type);
      const sumCount = (type: string) => byType(type).reduce((s, r) => s + (r.count ?? 0), 0);
      const sumValue = (type: string) => byType(type).reduce((s, r) => s + Number(r.total_value ?? 0), 0);

      const clients = sumCount('clients');
      const clientsTotal = sumCount('clients_total') || clients;
      const providers = sumCount('providers');
      const bookings = sumCount('bookings');
      const completed = sumCount('completed');
      const gmv = sumValue('gmv') || sumValue('bookings');
      const revenue = sumValue('revenue');
      const ratingRows = byType('rating');
      const rating = ratingRows.length > 0
        ? ratingRows.reduce((s, r) => s + Number(r.total_value ?? 0), 0) / ratingRows.length
        : 0;
      const reviews = sumCount('reviews');

      const total = clients + providers || 1;
      const providersPct = `${Math.round((providers / total) * 100)}%`;

      const result: OperationalSummary = {
        clients, clientsTotal, providers, providersPct,
        bookings, completed, gmv, revenue, rating, reviews,
      };
      return result;
    },
    enabled: !!workspaceId && !!isSupabaseConfigured,
  });
}

export interface StatusCount {
  label: string;
  count: number;
  color: string;
}

const STATUS_COLORS: Record<string, string> = {
  aceito: 'bg-emerald-500',
  'aguard. orçamento': 'bg-text-muted',
  confirmado: 'bg-blue-500',
  concluído: 'bg-emerald-400',
  'orçamento enviado': 'bg-teal',
  cancelado: 'bg-danger',
  pago: 'bg-brand',
  pendente: 'bg-text-muted',
  'em andamento': 'bg-text-muted',
};

export function useOperationalStatuses(period: string) {
  const { workspaceId } = useAuth();
  const { startDate, endDate } = usePeriodDates(period);

  return useQuery({
    queryKey: ['operational-statuses', workspaceId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_metrics')
        .select('metadata, count')
        .eq('workspace_id', workspaceId!)
        .eq('metric_type', 'booking_status')
        .gte('metric_date', startDate)
        .lte('metric_date', endDate);
      if (error) throw error;

      const grouped = new Map<string, number>();
      for (const r of data ?? []) {
        const meta = r.metadata as Record<string, unknown> | null;
        const status = String(meta?.status ?? 'Desconhecido');
        grouped.set(status, (grouped.get(status) ?? 0) + (r.count ?? 0));
      }

      return [...grouped.entries()]
        .sort(([, a], [, b]) => b - a)
        .map(([label, count]): StatusCount => ({
          label,
          count,
          color: STATUS_COLORS[label.toLowerCase()] ?? 'bg-text-muted',
        }));
    },
    enabled: !!workspaceId && !!isSupabaseConfigured,
  });
}

export interface CityData {
  city: string;
  state: string;
  bookings: number;
}

export function useOperationalCities(period: string) {
  const { workspaceId } = useAuth();
  const { startDate, endDate } = usePeriodDates(period);

  return useQuery({
    queryKey: ['operational-cities', workspaceId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_metrics')
        .select('city, state, count')
        .eq('workspace_id', workspaceId!)
        .eq('metric_type', 'bookings')
        .gte('metric_date', startDate)
        .lte('metric_date', endDate)
        .not('city', 'is', null);
      if (error) throw error;

      const grouped = new Map<string, CityData>();
      for (const r of data ?? []) {
        const key = `${r.city}-${r.state}`;
        const prev = grouped.get(key) ?? { city: r.city ?? '', state: r.state ?? '', bookings: 0 };
        prev.bookings += r.count ?? 0;
        grouped.set(key, prev);
      }

      return [...grouped.values()].sort((a, b) => b.bookings - a.bookings);
    },
    enabled: !!workspaceId && !!isSupabaseConfigured,
  });
}
