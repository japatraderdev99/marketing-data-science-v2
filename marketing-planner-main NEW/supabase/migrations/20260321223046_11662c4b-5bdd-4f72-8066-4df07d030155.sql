
-- 1. Create campaigns table (migrating from localStorage)
CREATE TABLE public.campaigns (
  id text PRIMARY KEY,
  user_id uuid NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view ALL campaigns (team-shared)
CREATE POLICY "All team members can view campaigns"
  ON public.campaigns FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert campaigns"
  ON public.campaigns FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update campaigns"
  ON public.campaigns FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete campaigns"
  ON public.campaigns FOR DELETE TO authenticated
  USING (true);

-- 2. Create calendar_contents table (migrating from localStorage)
CREATE TABLE public.calendar_contents (
  id text PRIMARY KEY,
  user_id uuid NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.calendar_contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All team members can view contents"
  ON public.calendar_contents FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert contents"
  ON public.calendar_contents FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update contents"
  ON public.calendar_contents FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete contents"
  ON public.calendar_contents FOR DELETE TO authenticated
  USING (true);

-- 3. Fix RLS on campaign_tasks — allow all team members to view
DROP POLICY IF EXISTS "Users can view own campaign tasks" ON public.campaign_tasks;
CREATE POLICY "All team members can view campaign tasks"
  ON public.campaign_tasks FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own campaign tasks" ON public.campaign_tasks;
CREATE POLICY "All team members can update campaign tasks"
  ON public.campaign_tasks FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can insert own campaign tasks" ON public.campaign_tasks;
CREATE POLICY "All team members can insert campaign tasks"
  ON public.campaign_tasks FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own campaign tasks" ON public.campaign_tasks;
CREATE POLICY "All team members can delete campaign tasks"
  ON public.campaign_tasks FOR DELETE TO authenticated
  USING (true);

-- 4. Fix RLS on creative_suggestions — allow all team to view
DROP POLICY IF EXISTS "Users can view own suggestions" ON public.creative_suggestions;
CREATE POLICY "All team members can view suggestions"
  ON public.creative_suggestions FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own suggestions" ON public.creative_suggestions;
CREATE POLICY "All team members can update suggestions"
  ON public.creative_suggestions FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own suggestions" ON public.creative_suggestions;
CREATE POLICY "All team members can delete suggestions"
  ON public.creative_suggestions FOR DELETE TO authenticated
  USING (true);

-- 5. Fix RLS on active_creatives — allow all team to view
DROP POLICY IF EXISTS "Users can view own creatives" ON public.active_creatives;
CREATE POLICY "All team members can view creatives"
  ON public.active_creatives FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own creatives" ON public.active_creatives;
CREATE POLICY "All team members can update creatives"
  ON public.active_creatives FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own creatives" ON public.active_creatives;
CREATE POLICY "All team members can delete creatives"
  ON public.active_creatives FOR DELETE TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own creatives" ON public.active_creatives;
CREATE POLICY "All team members can insert creatives"
  ON public.active_creatives FOR INSERT TO authenticated
  WITH CHECK (true);

-- 6. Fix RLS on media_library — allow all team to view
DROP POLICY IF EXISTS "Users can view own media" ON public.media_library;
CREATE POLICY "All team members can view media"
  ON public.media_library FOR SELECT TO authenticated
  USING (true);

-- 7. Fix RLS on strategy_knowledge — allow all team to view
DROP POLICY IF EXISTS "Users can view own knowledge" ON public.strategy_knowledge;
CREATE POLICY "All team members can view knowledge"
  ON public.strategy_knowledge FOR SELECT TO authenticated
  USING (true);

-- 8. Fix RLS on competitor_benchmarks — allow all team to view
DROP POLICY IF EXISTS "Users can view own benchmarks" ON public.competitor_benchmarks;
CREATE POLICY "All team members can view benchmarks"
  ON public.competitor_benchmarks FOR SELECT TO authenticated
  USING (true);

-- 9. Fix RLS on brand_assets, brand_colors, brand_fonts — team shared
DROP POLICY IF EXISTS "Users can view own assets" ON public.brand_assets;
CREATE POLICY "All team members can view assets"
  ON public.brand_assets FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can view own colors" ON public.brand_colors;
CREATE POLICY "All team members can view colors"
  ON public.brand_colors FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can view own fonts" ON public.brand_fonts;
CREATE POLICY "All team members can view fonts"
  ON public.brand_fonts FOR SELECT TO authenticated
  USING (true);

-- 10. Fix RLS on video_projects — team shared
DROP POLICY IF EXISTS "Users can view own video projects" ON public.video_projects;
CREATE POLICY "All team members can view video projects"
  ON public.video_projects FOR SELECT TO authenticated
  USING (true);

-- 11. Fix RLS on operational_metrics — team shared
DROP POLICY IF EXISTS "Users can view own operational metrics" ON public.operational_metrics;
CREATE POLICY "All team members can view operational metrics"
  ON public.operational_metrics FOR SELECT TO authenticated
  USING (true);

-- 12. Fix RLS on meta_ads_performance — team shared
DROP POLICY IF EXISTS "Users can view own meta ads" ON public.meta_ads_performance;
CREATE POLICY "All team members can view meta ads"
  ON public.meta_ads_performance FOR SELECT TO authenticated
  USING (true);

-- 13. Fix RLS on ga4_metrics — team shared
DROP POLICY IF EXISTS "Users can view own ga4 metrics" ON public.ga4_metrics;
CREATE POLICY "All team members can view ga4 metrics"
  ON public.ga4_metrics FOR SELECT TO authenticated
  USING (true);

-- 14. Fix RLS on google_ads_campaigns — team shared
DROP POLICY IF EXISTS "Users can view own google ads" ON public.google_ads_campaigns;
CREATE POLICY "All team members can view google ads"
  ON public.google_ads_campaigns FOR SELECT TO authenticated
  USING (true);

-- 15. Fix RLS on instagram_posts — team shared
DROP POLICY IF EXISTS "Users can view own instagram posts" ON public.instagram_posts;
CREATE POLICY "All team members can view instagram posts"
  ON public.instagram_posts FOR SELECT TO authenticated
  USING (true);

-- 16. Fix RLS on content_performance_insights — team shared
DROP POLICY IF EXISTS "Users can view own insights" ON public.content_performance_insights;
CREATE POLICY "All team members can view insights"
  ON public.content_performance_insights FOR SELECT TO authenticated
  USING (true);

-- 17. Fix RLS on dam_assets — team shared
DROP POLICY IF EXISTS "Users can view own DAM assets" ON public.dam_assets;
CREATE POLICY "All team members can view DAM assets"
  ON public.dam_assets FOR SELECT TO authenticated
  USING (true);
