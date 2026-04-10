-- Migration 013 — Fix schema: add missing columns, create missing tables (user_id based)

-- content_performance_insights: add missing columns
ALTER TABLE content_performance_insights
  ADD COLUMN IF NOT EXISTS total_occurrences INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_reach NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ DEFAULT now();

-- Unique constraint for upsert on user_id + insight_type
ALTER TABLE content_performance_insights
  DROP CONSTRAINT IF EXISTS content_performance_insights_user_insight_key;
ALTER TABLE content_performance_insights
  ADD CONSTRAINT content_performance_insights_user_insight_key
    UNIQUE (user_id, insight_type);

-- strategy_knowledge: add doc_type column
ALTER TABLE strategy_knowledge
  ADD COLUMN IF NOT EXISTS doc_type TEXT DEFAULT 'knowledge',
  ADD COLUMN IF NOT EXISTS raw_content TEXT;

-- diagnosis_cache (user_id based, 6h TTL)
CREATE TABLE IF NOT EXISTS diagnosis_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  period TEXT NOT NULL,
  diagnosis TEXT NOT NULL,
  kpi_snapshot JSONB,
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE (user_id, period)
);
ALTER TABLE diagnosis_cache ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='diagnosis_cache' AND policyname='user manages diagnosis') THEN
    EXECUTE 'CREATE POLICY "user manages diagnosis" ON diagnosis_cache FOR ALL USING (auth.uid() = user_id)';
  END IF;
END $$;

-- creative_references (replaces localStorage ig_ref_to_criativo)
CREATE TABLE IF NOT EXISTS creative_references (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  reference_data JSONB,
  used_in_module TEXT DEFAULT 'criativo',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE creative_references ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='creative_references' AND policyname='user manages refs') THEN
    EXECUTE 'CREATE POLICY "user manages refs" ON creative_references FOR ALL USING (auth.uid() = user_id)';
  END IF;
END $$;

-- View v_daily_channel_summary (cross-channel, user_id based)
CREATE OR REPLACE VIEW v_daily_channel_summary AS
SELECT
  m.user_id,
  m.metric_date::date AS date,
  'meta'::text AS channel,
  SUM(m.impressions)::bigint AS impressions,
  SUM(m.clicks)::bigint AS clicks,
  SUM(m.spend)::numeric AS spend,
  SUM(m.conversions)::bigint AS conversions
FROM meta_ads_performance m
WHERE m.metric_date IS NOT NULL
GROUP BY m.user_id, m.metric_date::date
UNION ALL
SELECT
  g.user_id,
  g.metric_date::date AS date,
  'ga4'::text AS channel,
  SUM(g.sessions)::bigint AS impressions,
  SUM(g.page_views)::bigint AS clicks,
  0::numeric AS spend,
  SUM(g.conversions)::bigint AS conversions
FROM ga4_metrics g
WHERE g.metric_date IS NOT NULL
GROUP BY g.user_id, g.metric_date::date;
