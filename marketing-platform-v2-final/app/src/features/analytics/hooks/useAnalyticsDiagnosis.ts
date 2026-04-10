import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface KpiSnapshot {
  period: string;
  totalSpendMeta: number;
  totalSpendGads: number;
  totalInvest: number;
  totalConversions: number;
  avgCtrMeta: number;
  totalSessions: number;
  avgBounceRate: number;
  topCampaigns: string[];
  igPostsAnalyzed: number;
  operationalCounts: Record<string, number>;
}

export function useAnalyticsDiagnosis() {
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [kpiSnapshot, setKpiSnapshot] = useState<KpiSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnosis = async (period: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('analytics-diagnosis', {
        body: { period },
      });
      if (fnError) throw fnError;
      setDiagnosis(data?.diagnosis ?? null);
      setKpiSnapshot(data?.kpi_snapshot ?? null);
      setCachedAt(data?.cached_at ?? new Date().toISOString());
      setFromCache(data?.from_cache ?? false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar diagnóstico');
    } finally {
      setLoading(false);
    }
  };

  return { diagnosis, kpiSnapshot, loading, cachedAt, fromCache, error, runDiagnosis };
}
