-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX: Tabelas que faltavam no DQEF_Consolidated_Migrations.sql
-- Rodar ANTES de re-executar o SQL consolidado, ou rodar sozinho depois do erro.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. meta_ads_performance — Performance de anúncios Meta Ads
CREATE TABLE IF NOT EXISTS public.meta_ads_performance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  ad_id text,
  adset_id text,
  campaign_id text,
  ad_account_id text,
  ad_name text,
  adset_name text,
  campaign_name text,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  spend numeric(10,2) DEFAULT 0,
  cpc numeric(10,4) DEFAULT 0,
  cpm numeric(10,4) DEFAULT 0,
  ctr numeric(6,4) DEFAULT 0,
  conversions integer DEFAULT 0,
  roas numeric(10,4) DEFAULT 0,
  reach integer DEFAULT 0,
  frequency numeric(6,4) DEFAULT 0,
  ad_body text,
  ad_title text,
  creative_category text,
  creative_niche text,
  visual_style text,
  copy_style text,
  draft_id uuid REFERENCES public.creative_drafts(id) ON DELETE SET NULL,
  metric_date date,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_ads_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meta ads" ON public.meta_ads_performance
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meta ads" ON public.meta_ads_performance
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meta ads" ON public.meta_ads_performance
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meta ads" ON public.meta_ads_performance
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_meta_ads_user_date ON public.meta_ads_performance(user_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_meta_ads_draft_id ON public.meta_ads_performance(draft_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_creative_category ON public.meta_ads_performance(creative_category);

-- 2. instagram_posts — Posts orgânicos sincronizados via Meta Graph API
CREATE TABLE IF NOT EXISTS public.instagram_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  instagram_media_id text NOT NULL,
  instagram_account_id text NOT NULL,
  caption text,
  media_type text,
  media_url text,
  thumbnail_url text,
  permalink text,
  impressions integer DEFAULT 0,
  reach integer DEFAULT 0,
  engagement integer DEFAULT 0,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  saves integer DEFAULT 0,
  shares integer DEFAULT 0,
  video_views integer DEFAULT 0,
  from_hashtags integer DEFAULT 0,
  from_explore integer DEFAULT 0,
  from_profile integer DEFAULT 0,
  from_other integer DEFAULT 0,
  published_at timestamptz,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.instagram_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own instagram posts" ON public.instagram_posts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own instagram posts" ON public.instagram_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own instagram posts" ON public.instagram_posts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own instagram posts" ON public.instagram_posts
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_instagram_posts_user ON public.instagram_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_published ON public.instagram_posts(published_at);

-- 3. content_performance_insights — Padrões detectados por IA
CREATE TABLE IF NOT EXISTS public.content_performance_insights (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  insight_type text NOT NULL,
  pattern_data jsonb DEFAULT '{}'::jsonb,
  avg_engagement_rate numeric(6,4) DEFAULT 0,
  ai_recommendation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_performance_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights" ON public.content_performance_insights
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own insights" ON public.content_performance_insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own insights" ON public.content_performance_insights
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own insights" ON public.content_performance_insights
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_insights_user_type ON public.content_performance_insights(user_id, insight_type);
