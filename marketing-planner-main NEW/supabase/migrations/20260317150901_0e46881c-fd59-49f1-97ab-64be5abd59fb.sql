
-- GA4 metrics table
CREATE TABLE public.ga4_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  metric_date date NOT NULL,
  sessions integer DEFAULT 0,
  total_users integer DEFAULT 0,
  new_users integer DEFAULT 0,
  page_views integer DEFAULT 0,
  avg_session_duration numeric DEFAULT 0,
  bounce_rate numeric DEFAULT 0,
  conversions integer DEFAULT 0,
  conversion_rate numeric DEFAULT 0,
  events_count integer DEFAULT 0,
  revenue numeric DEFAULT 0,
  source_medium text,
  campaign_name text,
  landing_page text,
  device_category text,
  city text,
  country text,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, metric_date, source_medium, campaign_name, landing_page, device_category)
);

ALTER TABLE public.ga4_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ga4 metrics" ON public.ga4_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ga4 metrics" ON public.ga4_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ga4 metrics" ON public.ga4_metrics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ga4 metrics" ON public.ga4_metrics FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage ga4 metrics" ON public.ga4_metrics FOR ALL USING (true) WITH CHECK (true);

-- Google Ads campaigns table
CREATE TABLE public.google_ads_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campaign_id text NOT NULL,
  campaign_name text,
  campaign_status text,
  campaign_type text,
  ad_group_id text,
  ad_group_name text,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  cost_micros bigint DEFAULT 0,
  cost numeric DEFAULT 0,
  conversions numeric DEFAULT 0,
  conversion_value numeric DEFAULT 0,
  ctr numeric DEFAULT 0,
  avg_cpc numeric DEFAULT 0,
  avg_cpm numeric DEFAULT 0,
  interaction_rate numeric DEFAULT 0,
  date_start date,
  date_stop date,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, campaign_id, ad_group_id, date_start, date_stop)
);

ALTER TABLE public.google_ads_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own google ads" ON public.google_ads_campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own google ads" ON public.google_ads_campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own google ads" ON public.google_ads_campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own google ads" ON public.google_ads_campaigns FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage google ads" ON public.google_ads_campaigns FOR ALL USING (true) WITH CHECK (true);
