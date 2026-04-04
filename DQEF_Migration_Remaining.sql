-- ═══════════════════════════════════════════════════════════════════════════════
-- DQEF Migration — Parte restante (após Fix + creative_drafts já criados)
-- Rode este SQL no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════════════════════

-- Colunas extras na meta_ads_performance (IF NOT EXISTS cuida de duplicatas)
ALTER TABLE public.meta_ads_performance
  ADD COLUMN IF NOT EXISTS ad_body text,
  ADD COLUMN IF NOT EXISTS ad_title text,
  ADD COLUMN IF NOT EXISTS creative_category text,
  ADD COLUMN IF NOT EXISTS creative_niche text,
  ADD COLUMN IF NOT EXISTS visual_style text,
  ADD COLUMN IF NOT EXISTS copy_style text;

-- FK draft_id pode já existir do Fix, ignorar erro
DO $$ BEGIN
  ALTER TABLE public.meta_ads_performance
    ADD COLUMN IF NOT EXISTS draft_id uuid REFERENCES public.creative_drafts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_meta_ads_draft_id ON public.meta_ads_performance(draft_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_creative_category ON public.meta_ads_performance(creative_category);

-- campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
  id text PRIMARY KEY,
  user_id uuid NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "All team members can view campaigns" ON public.campaigns FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert campaigns" ON public.campaigns FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can update campaigns" ON public.campaigns FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can delete campaigns" ON public.campaigns FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- calendar_contents
CREATE TABLE IF NOT EXISTS public.calendar_contents (
  id text PRIMARY KEY,
  user_id uuid NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.calendar_contents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "All team members can view contents" ON public.calendar_contents FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert contents" ON public.calendar_contents FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can update contents" ON public.calendar_contents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can delete contents" ON public.calendar_contents FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fix RLS: campaign_tasks → team shared
DROP POLICY IF EXISTS "Users can view own campaign tasks" ON public.campaign_tasks;
DO $$ BEGIN
  CREATE POLICY "All team members can view campaign tasks" ON public.campaign_tasks FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP POLICY IF EXISTS "Users can update own campaign tasks" ON public.campaign_tasks;
DO $$ BEGIN
  CREATE POLICY "All team members can update campaign tasks" ON public.campaign_tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP POLICY IF EXISTS "Users can insert own campaign tasks" ON public.campaign_tasks;
DO $$ BEGIN
  CREATE POLICY "All team members can insert campaign tasks" ON public.campaign_tasks FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP POLICY IF EXISTS "Users can delete own campaign tasks" ON public.campaign_tasks;
DO $$ BEGIN
  CREATE POLICY "All team members can delete campaign tasks" ON public.campaign_tasks FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fix RLS: creative_suggestions → team shared
DROP POLICY IF EXISTS "Users can view own suggestions" ON public.creative_suggestions;
DO $$ BEGIN
  CREATE POLICY "All team members can view suggestions" ON public.creative_suggestions FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP POLICY IF EXISTS "Users can update own suggestions" ON public.creative_suggestions;
DO $$ BEGIN
  CREATE POLICY "All team members can update suggestions" ON public.creative_suggestions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP POLICY IF EXISTS "Users can delete own suggestions" ON public.creative_suggestions;
DO $$ BEGIN
  CREATE POLICY "All team members can delete suggestions" ON public.creative_suggestions FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fix RLS: active_creatives → team shared
DROP POLICY IF EXISTS "Users can view own creatives" ON public.active_creatives;
DO $$ BEGIN
  CREATE POLICY "All team members can view creatives" ON public.active_creatives FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP POLICY IF EXISTS "Users can update own creatives" ON public.active_creatives;
DO $$ BEGIN
  CREATE POLICY "All team members can update creatives" ON public.active_creatives FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP POLICY IF EXISTS "Users can delete own creatives" ON public.active_creatives;
DO $$ BEGIN
  CREATE POLICY "All team members can delete creatives" ON public.active_creatives FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP POLICY IF EXISTS "Users can insert own creatives" ON public.active_creatives;
DO $$ BEGIN
  CREATE POLICY "All team members can insert creatives" ON public.active_creatives FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fix RLS: media_library → team shared
DROP POLICY IF EXISTS "Users can view own media" ON public.media_library;
DO $$ BEGIN
  CREATE POLICY "All team members can view media" ON public.media_library FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fix RLS: strategy_knowledge → team shared
DROP POLICY IF EXISTS "Users can view own knowledge" ON public.strategy_knowledge;
DO $$ BEGIN
  CREATE POLICY "All team members can view knowledge" ON public.strategy_knowledge FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fix RLS: competitor_benchmarks → team shared
DROP POLICY IF EXISTS "Users can view own benchmarks" ON public.competitor_benchmarks;
DO $$ BEGIN
  CREATE POLICY "All team members can view benchmarks" ON public.competitor_benchmarks FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fix RLS: brand_assets, brand_colors, brand_fonts → team shared
DROP POLICY IF EXISTS "Users can view own assets" ON public.brand_assets;
DO $$ BEGIN
  CREATE POLICY "All team members can view assets" ON public.brand_assets FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP POLICY IF EXISTS "Users can view own colors" ON public.brand_colors;
DO $$ BEGIN
  CREATE POLICY "All team members can view colors" ON public.brand_colors FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP POLICY IF EXISTS "Users can view own fonts" ON public.brand_fonts;
DO $$ BEGIN
  CREATE POLICY "All team members can view fonts" ON public.brand_fonts FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fix RLS: video_projects → team shared
DROP POLICY IF EXISTS "Users can view own video projects" ON public.video_projects;
DO $$ BEGIN
  CREATE POLICY "All team members can view video projects" ON public.video_projects FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fix RLS: operational_metrics → team shared
DROP POLICY IF EXISTS "Users can view own operational metrics" ON public.operational_metrics;
DO $$ BEGIN
  CREATE POLICY "All team members can view operational metrics" ON public.operational_metrics FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fix RLS: meta_ads_performance → team shared
DROP POLICY IF EXISTS "Users can view own meta ads" ON public.meta_ads_performance;
DO $$ BEGIN
  CREATE POLICY "All team members can view meta ads" ON public.meta_ads_performance FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fix RLS: ga4_metrics → team shared
DROP POLICY IF EXISTS "Users can view own ga4 metrics" ON public.ga4_metrics;
DO $$ BEGIN
  CREATE POLICY "All team members can view ga4 metrics" ON public.ga4_metrics FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fix RLS: google_ads_campaigns → team shared
DROP POLICY IF EXISTS "Users can view own google ads" ON public.google_ads_campaigns;
DO $$ BEGIN
  CREATE POLICY "All team members can view google ads" ON public.google_ads_campaigns FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fix RLS: instagram_posts → team shared
DROP POLICY IF EXISTS "Users can view own instagram posts" ON public.instagram_posts;
DO $$ BEGIN
  CREATE POLICY "All team members can view instagram posts" ON public.instagram_posts FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fix RLS: content_performance_insights → team shared
DROP POLICY IF EXISTS "Users can view own insights" ON public.content_performance_insights;
DO $$ BEGIN
  CREATE POLICY "All team members can view insights" ON public.content_performance_insights FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fix RLS: dam_assets → team shared
DROP POLICY IF EXISTS "Users can view own DAM assets" ON public.dam_assets;
DO $$ BEGIN
  CREATE POLICY "All team members can view DAM assets" ON public.dam_assets FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Restrict profiles SELECT to owner-only
DROP POLICY IF EXISTS "Public can read profiles for login" ON public.profiles;
DO $$ BEGIN
  CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Deduplicate and fix unique indexes (tables are empty so DELETE is harmless)
ALTER TABLE ga4_metrics DROP CONSTRAINT IF EXISTS ga4_metrics_user_id_metric_date_source_medium_campaign_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS ga4_metrics_unique_row
  ON ga4_metrics (user_id, metric_date, COALESCE(source_medium, ''), COALESCE(campaign_name, ''), COALESCE(landing_page, ''), COALESCE(device_category, ''));

CREATE UNIQUE INDEX IF NOT EXISTS operational_metrics_unique_row
  ON operational_metrics (user_id, metric_type, metric_date, COALESCE(city, ''), COALESCE(state, ''));

ALTER TABLE google_ads_campaigns DROP CONSTRAINT IF EXISTS google_ads_campaigns_user_id_campaign_id_ad_group_id_date_s_key;
CREATE UNIQUE INDEX IF NOT EXISTS google_ads_unique_row
  ON google_ads_campaigns (user_id, campaign_id, COALESCE(ad_group_id, ''), COALESCE(date_start, '1970-01-01'), COALESCE(date_stop, '1970-01-01'));

-- monthly_reports
CREATE TABLE IF NOT EXISTS public.monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  report_month date NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  extracted_data jsonb DEFAULT '{}'::jsonb,
  ai_analysis text,
  model_used text DEFAULT 'anthropic/claude-sonnet-4',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "All team members can view reports" ON public.monthly_reports FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own reports" ON public.monthly_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own reports" ON public.monthly_reports FOR DELETE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Service role full access" ON public.monthly_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Storage policy for analytics reports
DROP POLICY IF EXISTS "Users can manage own analytics report files" ON storage.objects;
CREATE POLICY "Users can manage own analytics report files"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'media-library'
    AND (storage.foldername(name))[1] = 'reports'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'media-library'
    AND (storage.foldername(name))[1] = 'reports'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
