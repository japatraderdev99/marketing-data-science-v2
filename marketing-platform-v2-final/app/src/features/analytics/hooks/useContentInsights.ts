import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface ContentInsight {
  id: string;
  insight_type: string;
  pattern_data: Record<string, unknown>;
  avg_engagement_rate: number;
  avg_reach: number;
  total_occurrences: number;
  ai_recommendation: string;
  confidence_score: number;
  analyzed_at: string;
}

const INSIGHT_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  best_format:       { label: 'Melhor Formato',        emoji: '🎯', color: 'text-brand' },
  best_hour:         { label: 'Melhor Horário',        emoji: '⏰', color: 'text-emerald-400' },
  saves_driver:      { label: 'Driver de Saves',       emoji: '🔖', color: 'text-purple-400' },
  share_driver:      { label: 'Driver de Shares',      emoji: '📤', color: 'text-blue-400' },
  top_ad_pattern:    { label: 'Padrão de Anúncio',     emoji: '📢', color: 'text-amber-400' },
  engagement_peak:   { label: 'Pico de Engajamento',   emoji: '📈', color: 'text-cyan-400' },
};

export function getInsightMeta(type: string) {
  return INSIGHT_LABELS[type] ?? { label: type, emoji: '💡', color: 'text-text-secondary' };
}

export function useContentInsights() {
  const { user } = useAuth();
  const userId = user?.id;
  const [analyzing, setAnalyzing] = useState(false);

  const query = useQuery({
    queryKey: ['content-insights', userId],
    queryFn: async () => {
      if (!userId || !isSupabaseConfigured) return [] as ContentInsight[];
      const { data, error } = await supabase
        .from('content_performance_insights')
        .select('*')
        .eq('user_id', userId)
        .order('confidence_score', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContentInsight[];
    },
    enabled: !!userId && isSupabaseConfigured,
  });

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      await supabase.functions.invoke('analyze-content-patterns', { body: {} });
      await query.refetch();
    } finally {
      setAnalyzing(false);
    }
  };

  return { ...query, analyzing, runAnalysis };
}
