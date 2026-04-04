import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { BarChart3, Loader2, TrendingUp } from 'lucide-react';

interface Insight {
  id: string;
  insight_type: string | null;
  ai_recommendation: string | null;
  avg_engagement_rate: number | null;
  pattern_data: Record<string, unknown> | null;
  confidence_score: number | null;
}

interface Props {
  userId: string | null;
  onInsightsChange: (text: string | null) => void;
}

export default function DataSciencePanel({ userId, onInsightsChange }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !userId) {
      onInsightsChange(null);
      return;
    }
    setLoading(true);
    supabase
      .from('content_performance_insights')
      .select('id, insight_type, ai_recommendation, avg_engagement_rate, pattern_data, confidence_score')
      .eq('user_id', userId)
      .order('avg_engagement_rate', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        const items = (data || []) as Insight[];
        setInsights(items);
        if (items.length > 0) {
          const text = items.map(i => {
            const parts = [
              i.insight_type && `Tipo: ${i.insight_type}`,
              i.ai_recommendation && `Recomendação: ${i.ai_recommendation}`,
              i.avg_engagement_rate && `Eng. Rate: ${i.avg_engagement_rate}%`,
            ].filter(Boolean).join(' | ');
            return parts;
          }).join('\n');
          onInsightsChange(`=== DATA SCIENCE INSIGHTS ===\n${text}`);
        } else {
          onInsightsChange(null);
        }
        setLoading(false);
      });
  }, [enabled, userId]);

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', enabled ? 'bg-emerald-500/20' : 'bg-muted')}>
            <BarChart3 className={cn('h-3.5 w-3.5', enabled ? 'text-emerald-400' : 'text-muted-foreground')} />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">Data Science</p>
            <p className="text-[10px] text-muted-foreground">Padrões de performance + recomendações IA</p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {enabled && loading && (
        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Carregando insights...
        </div>
      )}

      {enabled && !loading && insights.length > 0 && (
        <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
          {insights.slice(0, 4).map(i => (
            <div key={i.id} className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-2">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-emerald-400 shrink-0" />
                <span className="text-[10px] font-bold text-foreground">{i.insight_type || 'Insight'}</span>
                {i.avg_engagement_rate && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[8px] ml-auto">
                    {i.avg_engagement_rate}% eng
                  </Badge>
                )}
              </div>
              {i.ai_recommendation && (
                <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{i.ai_recommendation}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {enabled && !loading && insights.length === 0 && (
        <p className="mt-2 text-[10px] text-muted-foreground italic">Nenhum insight disponível. Sincronize dados na aba Analytics.</p>
      )}
    </div>
  );
}
