-- Migration 013 — Camada de Inteligência: diagnóstico IA, Data Science, referências criativas

-- Cache de diagnóstico IA (TTL 6h, por workspace + período)
CREATE TABLE IF NOT EXISTS diagnosis_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  period TEXT NOT NULL,
  diagnosis TEXT NOT NULL,
  kpi_snapshot JSONB,
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '6 hours',
  UNIQUE (workspace_id, period)
);

ALTER TABLE diagnosis_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace member sees diagnosis cache"
  ON diagnosis_cache FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = diagnosis_cache.workspace_id AND user_id = auth.uid()
    )
  );

-- Insights de padrões de conteúdo (pipeline Data Science)
CREATE TABLE IF NOT EXISTS content_performance_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  insight_type TEXT NOT NULL,
  pattern_data JSONB NOT NULL DEFAULT '{}',
  avg_engagement_rate NUMERIC(8,4) DEFAULT 0,
  avg_reach INTEGER DEFAULT 0,
  total_occurrences INTEGER DEFAULT 0,
  ai_recommendation TEXT,
  confidence_score NUMERIC(4,2) DEFAULT 0,
  analyzed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (workspace_id, insight_type)
);

ALTER TABLE content_performance_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace member sees content insights"
  ON content_performance_insights FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = content_performance_insights.workspace_id AND user_id = auth.uid()
    )
  );

-- Referências criativas (substitui localStorage ig_ref_to_criativo)
CREATE TABLE IF NOT EXISTS creative_references (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('meta_ad', 'instagram_post', 'manual')),
  source_id TEXT,
  reference_data JSONB NOT NULL DEFAULT '{}',
  used_in_module TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE creative_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace member sees creative references"
  ON creative_references FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = creative_references.workspace_id AND user_id = auth.uid()
    )
  );

-- View consolidada de canais por dia (cross-channel summary)
CREATE OR REPLACE VIEW v_daily_channel_summary AS
SELECT
  workspace_id,
  date_start::date AS day,
  'meta' AS channel,
  SUM(spend)::numeric(14,2) AS spend,
  SUM(impressions) AS impressions,
  SUM(clicks) AS clicks,
  SUM(conversions) AS conversions
FROM meta_ads_performance
WHERE date_start IS NOT NULL
GROUP BY workspace_id, date_start::date
UNION ALL
SELECT
  workspace_id,
  date_start::date,
  'google',
  SUM(cost)::numeric(14,2),
  SUM(impressions),
  SUM(clicks),
  SUM(conversions::int)
FROM google_ads_campaigns
WHERE date_start IS NOT NULL
GROUP BY workspace_id, date_start::date
UNION ALL
SELECT
  workspace_id,
  metric_date,
  'organic',
  0::numeric(14,2),
  0,
  SUM(sessions),
  SUM(conversions)
FROM ga4_metrics
WHERE metric_date IS NOT NULL
GROUP BY workspace_id, metric_date;
