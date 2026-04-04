
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read username→email (needed for login lookup)
CREATE POLICY "Public can read profiles for login"
  ON public.profiles FOR SELECT
  USING (true);

-- Only the owner can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Create media_library table
CREATE TABLE public.media_library (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  url text NOT NULL,
  filename text NOT NULL,
  category text,
  tags text[],
  description text,
  file_size integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own media" ON public.media_library
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own media" ON public.media_library
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own media" ON public.media_library
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own media" ON public.media_library
  FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for media library
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-library', 'media-library', true);

-- Storage RLS policies
CREATE POLICY "Public read access on media-library"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media-library');

CREATE POLICY "Users can upload to own folder in media-library"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'media-library' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own files in media-library"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'media-library' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Knowledge base table: stores brand book documents + AI-extracted fields
CREATE TABLE public.strategy_knowledge (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  document_name text NOT NULL,
  document_url text NOT NULL,
  document_type text,
  file_size integer,
  status text NOT NULL DEFAULT 'pending', -- pending | analyzing | done | error
  extracted_knowledge jsonb,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.strategy_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own knowledge"
  ON public.strategy_knowledge FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own knowledge"
  ON public.strategy_knowledge FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own knowledge"
  ON public.strategy_knowledge FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own knowledge"
  ON public.strategy_knowledge FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_strategy_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_strategy_knowledge_updated_at
  BEFORE UPDATE ON public.strategy_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION public.update_strategy_knowledge_updated_at();

-- Forum messages table
CREATE TABLE public.forum_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  author_name text NOT NULL,
  author_initials text NOT NULL DEFAULT '',
  author_role text NOT NULL DEFAULT '',
  content text NOT NULL,
  is_ai boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  message_type text NOT NULL DEFAULT 'message',
  -- message_type: 'message' | 'task_comment' | 'strategy_change' | 'goal_update' | 'system'
  metadata jsonb,
  -- metadata stores: { taskId, taskTitle, action, oldValue, newValue, approved_by }
  reply_to uuid REFERENCES public.forum_messages(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.forum_messages ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all messages (team chat)
CREATE POLICY "Authenticated users can view all messages"
ON public.forum_messages FOR SELECT
TO authenticated
USING (true);

-- Users can insert their own messages
CREATE POLICY "Users can insert own messages"
ON public.forum_messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own messages
CREATE POLICY "Users can update own messages"
ON public.forum_messages FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
ON public.forum_messages FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Service role can insert AI messages (user_id = system UUID)
CREATE POLICY "Service role can insert AI messages"
ON public.forum_messages FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update messages"
ON public.forum_messages FOR UPDATE
TO service_role
USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_forum_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_forum_messages_updated_at
BEFORE UPDATE ON public.forum_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_forum_messages_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_messages;

-- Create creative_drafts table
CREATE TABLE public.creative_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  -- Sigla única e legível: CRI-MMDD-XXXX
  sigla TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'rejected')),
  -- Briefing metadata
  context TEXT,
  angle TEXT,
  persona TEXT,
  channel TEXT,
  tone TEXT,
  format_id TEXT,
  -- The full carousel JSON
  carousel_data JSONB,
  -- Slide images map { slideNumber: url }
  slide_images JSONB DEFAULT '{}'::jsonb,
  -- Feedback requests and comments
  feedback_requests JSONB DEFAULT '[]'::jsonb,
  -- Campaign / workflow link
  campaign_name TEXT,
  workflow_stage TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creative_drafts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all drafts (team collaboration)
CREATE POLICY "Team members can view all drafts"
  ON public.creative_drafts FOR SELECT
  TO authenticated
  USING (true);

-- Users can only create their own drafts
CREATE POLICY "Users can insert own drafts"
  ON public.creative_drafts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own drafts; reviewers can update feedback_requests column
CREATE POLICY "Users can update own drafts"
  ON public.creative_drafts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only the owner can delete their drafts
CREATE POLICY "Users can delete own drafts"
  ON public.creative_drafts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_creative_drafts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_creative_drafts_updated_at
  BEFORE UPDATE ON public.creative_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_creative_drafts_updated_at();

-- Helper function to generate unique sigla: CRI-MMDD-XXXX
CREATE OR REPLACE FUNCTION public.generate_draft_sigla()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_sigla TEXT;
  v_suffix TEXT;
  v_prefix TEXT;
  v_exists BOOLEAN;
BEGIN
  v_prefix := 'CRI-' || TO_CHAR(NOW(), 'MMDD') || '-';
  LOOP
    v_suffix := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
    v_sigla := v_prefix || v_suffix;
    SELECT EXISTS(SELECT 1 FROM public.creative_drafts WHERE sigla = v_sigla) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_sigla;
END;
$$;

-- Create benchmarks table for competitor references
CREATE TABLE public.competitor_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  competitor_name TEXT NOT NULL,
  platform TEXT,
  format_type TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  thumbnail_url TEXT,
  notes TEXT,
  ai_insights JSONB,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.competitor_benchmarks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own benchmarks"
ON public.competitor_benchmarks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own benchmarks"
ON public.competitor_benchmarks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own benchmarks"
ON public.competitor_benchmarks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own benchmarks"
ON public.competitor_benchmarks FOR DELETE
USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_competitor_benchmarks_updated_at
BEFORE UPDATE ON public.competitor_benchmarks
FOR EACH ROW
EXECUTE FUNCTION public.update_creative_drafts_updated_at();

-- Storage bucket for benchmark files
INSERT INTO storage.buckets (id, name, public) VALUES ('benchmarks', 'benchmarks', true);

CREATE POLICY "Users can upload own benchmarks"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'benchmarks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own benchmark files"
ON storage.objects FOR SELECT
USING (bucket_id = 'benchmarks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own benchmark files"
ON storage.objects FOR DELETE
USING (bucket_id = 'benchmarks' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Table: active_creatives
CREATE TABLE public.active_creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  file_url text,
  thumbnail_url text,
  platform text,
  format_type text,
  dimensions text,
  campaign_id text,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  engagement_rate numeric DEFAULT 0,
  conversions integer DEFAULT 0,
  spend numeric DEFAULT 0,
  tags text[] DEFAULT '{}',
  notes text,
  grid_position integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.active_creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own creatives" ON public.active_creatives FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own creatives" ON public.active_creatives FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own creatives" ON public.active_creatives FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own creatives" ON public.active_creatives FOR DELETE USING (auth.uid() = user_id);

-- Table: brand_assets
CREATE TABLE public.brand_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  asset_type text NOT NULL DEFAULT 'logo',
  name text NOT NULL,
  file_url text NOT NULL,
  thumbnail_url text,
  category text DEFAULT 'primary',
  file_format text,
  width integer,
  height integer,
  file_size integer,
  tags text[] DEFAULT '{}',
  usage_notes text,
  is_favorite boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assets" ON public.brand_assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assets" ON public.brand_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own assets" ON public.brand_assets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own assets" ON public.brand_assets FOR DELETE USING (auth.uid() = user_id);

-- Table: brand_colors
CREATE TABLE public.brand_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  hex_value text NOT NULL,
  rgb_value text,
  category text DEFAULT 'primary',
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own colors" ON public.brand_colors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own colors" ON public.brand_colors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own colors" ON public.brand_colors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own colors" ON public.brand_colors FOR DELETE USING (auth.uid() = user_id);

-- Table: brand_fonts
CREATE TABLE public.brand_fonts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  font_name text NOT NULL,
  font_weight text DEFAULT 'Regular',
  usage text DEFAULT 'body',
  font_url text,
  sample_text text DEFAULT 'O rápido cão marrom saltou sobre a cerca.',
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_fonts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fonts" ON public.brand_fonts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own fonts" ON public.brand_fonts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own fonts" ON public.brand_fonts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own fonts" ON public.brand_fonts FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-assets', 'brand-assets', true);

CREATE POLICY "Users can view own brand assets" ON storage.objects FOR SELECT USING (bucket_id = 'brand-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload brand assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'brand-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own brand assets" ON storage.objects FOR UPDATE USING (bucket_id = 'brand-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own brand assets" ON storage.objects FOR DELETE USING (bucket_id = 'brand-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_active_creatives_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_active_creatives_updated_at
  BEFORE UPDATE ON public.active_creatives
  FOR EACH ROW EXECUTE FUNCTION public.update_active_creatives_updated_at();

-- Tabela de log de uso de IA para controle de custos
CREATE TABLE public.ai_usage_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  task_type text NOT NULL,
  model_used text NOT NULL,
  provider text NOT NULL DEFAULT 'openrouter',
  tokens_input integer DEFAULT 0,
  tokens_output integer DEFAULT 0,
  cost_estimate numeric DEFAULT 0,
  latency_ms integer DEFAULT 0,
  success boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage logs"
  ON public.ai_usage_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage logs"
  ON public.ai_usage_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role tambem pode inserir (para edge functions)
CREATE POLICY "Service role can insert usage logs"
  ON public.ai_usage_log FOR INSERT
  WITH CHECK (true);

-- Index para queries de analytics
CREATE INDEX idx_ai_usage_log_user_created ON public.ai_usage_log (user_id, created_at DESC);
CREATE INDEX idx_ai_usage_log_task_type ON public.ai_usage_log (task_type);

-- Tabela de cache do DAM (Google Drive)
CREATE TABLE public.dam_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  drive_file_id text NOT NULL,
  filename text NOT NULL,
  mime_type text,
  thumbnail_url text,
  download_url text,
  folder_path text,
  category text,
  tags text[] DEFAULT '{}'::text[],
  description text,
  file_size integer,
  synced_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.dam_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own DAM assets"
  ON public.dam_assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own DAM assets"
  ON public.dam_assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own DAM assets"
  ON public.dam_assets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own DAM assets"
  ON public.dam_assets FOR DELETE
  USING (auth.uid() = user_id);

-- Service role pode gerenciar DAM assets (para sync via edge function)
CREATE POLICY "Service role can manage DAM assets"
  ON public.dam_assets FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index para buscas rapidas
CREATE INDEX idx_dam_assets_drive_file ON public.dam_assets (drive_file_id);
CREATE INDEX idx_dam_assets_category ON public.dam_assets (category);
CREATE INDEX idx_dam_assets_user ON public.dam_assets (user_id);

-- Table for AI-generated creative suggestions from user input
CREATE TABLE public.creative_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  input_text TEXT NOT NULL,
  input_type TEXT NOT NULL DEFAULT 'mixed', -- mixed, video, static, copy, prompt
  suggestion_type TEXT NOT NULL, -- post, carousel, video, copy, reels
  title TEXT NOT NULL,
  description TEXT,
  copy_text TEXT,
  visual_direction TEXT,
  channel TEXT,
  format TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, sent_to_production
  ai_reasoning TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creative_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own suggestions" ON public.creative_suggestions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own suggestions" ON public.creative_suggestions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own suggestions" ON public.creative_suggestions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own suggestions" ON public.creative_suggestions
  FOR DELETE USING (auth.uid() = user_id);

-- Service role for edge function inserts
CREATE POLICY "Service role can insert suggestions" ON public.creative_suggestions
  FOR INSERT WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_creative_suggestions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_creative_suggestions_updated_at
  BEFORE UPDATE ON public.creative_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_creative_suggestions_updated_at();

-- Table to store generative AI playbook knowledge (image + video best practices)
CREATE TABLE public.generative_playbooks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playbook_type text NOT NULL, -- 'image' or 'video'
  title text NOT NULL,
  knowledge_json jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generative_playbooks ENABLE ROW LEVEL SECURITY;

-- Public read for all authenticated users (shared knowledge)
CREATE POLICY "Authenticated users can read playbooks"
ON public.generative_playbooks
FOR SELECT
USING (true);

-- Only service role can manage (via edge functions)
CREATE POLICY "Service role can manage playbooks"
ON public.generative_playbooks
FOR ALL
USING (true)
WITH CHECK (true);

-- Create video_projects table for multi-shot video production workflow
CREATE TABLE public.video_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  concept TEXT,
  briefing_data JSONB DEFAULT '{}'::jsonb,
  storyboard JSONB DEFAULT '[]'::jsonb,
  shot_frames JSONB DEFAULT '{}'::jsonb,
  shot_motions JSONB DEFAULT '{}'::jsonb,
  pipeline_notes JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_projects ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own video projects" ON public.video_projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own video projects" ON public.video_projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own video projects" ON public.video_projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own video projects" ON public.video_projects FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_video_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_video_projects_updated_at
BEFORE UPDATE ON public.video_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_video_projects_updated_at();

-- Create campaign_tasks table
CREATE TABLE public.campaign_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  creative_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  format_width INTEGER,
  format_height INTEGER,
  format_ratio TEXT,
  format_name TEXT,
  
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'Media',
  assigned_to TEXT NOT NULL DEFAULT 'Guilherme',
  approved_by TEXT,
  approval_note TEXT,
  
  deadline DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  campaign_context JSONB DEFAULT '{}',
  creative_output JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own campaign tasks"
  ON public.campaign_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own campaign tasks"
  ON public.campaign_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaign tasks"
  ON public.campaign_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaign tasks"
  ON public.campaign_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_campaign_tasks_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_campaign_tasks_updated_at
  BEFORE UPDATE ON public.campaign_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_campaign_tasks_updated_at();

-- Add drive_link and asset_name columns to campaign_tasks for the approval workflow
ALTER TABLE public.campaign_tasks
  ADD COLUMN IF NOT EXISTS drive_link text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS asset_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS destination_platform text DEFAULT NULL;

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

CREATE TABLE public.operational_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  metric_type TEXT NOT NULL,
  metric_date DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  city TEXT,
  state TEXT,
  metadata JSONB DEFAULT '{}',
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.operational_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own operational metrics" ON public.operational_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own operational metrics" ON public.operational_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own operational metrics" ON public.operational_metrics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own operational metrics" ON public.operational_metrics FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage operational metrics" ON public.operational_metrics FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_operational_metrics_user_type ON public.operational_metrics(user_id, metric_type);
CREATE INDEX idx_operational_metrics_date ON public.operational_metrics(metric_date);
ALTER TABLE public.meta_ads_performance 
  ADD COLUMN IF NOT EXISTS ad_body text,
  ADD COLUMN IF NOT EXISTS ad_title text,
  ADD COLUMN IF NOT EXISTS creative_category text,
  ADD COLUMN IF NOT EXISTS creative_niche text,
  ADD COLUMN IF NOT EXISTS visual_style text,
  ADD COLUMN IF NOT EXISTS copy_style text,
  ADD COLUMN IF NOT EXISTS draft_id uuid REFERENCES public.creative_drafts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_meta_ads_draft_id ON public.meta_ads_performance(draft_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_creative_category ON public.meta_ads_performance(creative_category);
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
-- Restrict profiles SELECT to owner-only (was previously public)
DROP POLICY IF EXISTS "Public can read profiles for login" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);
-- 1. Delete duplicate ga4_metrics rows (keep the latest synced_at per unique combo)
DELETE FROM ga4_metrics a
USING ga4_metrics b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.metric_date = b.metric_date
  AND COALESCE(a.source_medium, '') = COALESCE(b.source_medium, '')
  AND COALESCE(a.campaign_name, '') = COALESCE(b.campaign_name, '')
  AND COALESCE(a.landing_page, '') = COALESCE(b.landing_page, '')
  AND COALESCE(a.device_category, '') = COALESCE(b.device_category, '');

-- 2. Drop old unique constraint that doesn't handle NULLs
ALTER TABLE ga4_metrics DROP CONSTRAINT IF EXISTS ga4_metrics_user_id_metric_date_source_medium_campaign_name_key;

-- 3. Create new unique index with COALESCE to handle NULLs properly
CREATE UNIQUE INDEX ga4_metrics_unique_row
ON ga4_metrics (user_id, metric_date, COALESCE(source_medium, ''), COALESCE(campaign_name, ''), COALESCE(landing_page, ''), COALESCE(device_category, ''));

-- 4. Delete duplicate operational_metrics rows
DELETE FROM operational_metrics a
USING operational_metrics b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.metric_type = b.metric_type
  AND a.metric_date = b.metric_date
  AND COALESCE(a.city, '') = COALESCE(b.city, '')
  AND COALESCE(a.state, '') = COALESCE(b.state, '');

-- 5. Create unique index for operational_metrics
CREATE UNIQUE INDEX operational_metrics_unique_row
ON operational_metrics (user_id, metric_type, metric_date, COALESCE(city, ''), COALESCE(state, ''));

-- 6. Fix google_ads unique constraint for NULL ad_group_id
ALTER TABLE google_ads_campaigns DROP CONSTRAINT IF EXISTS google_ads_campaigns_user_id_campaign_id_ad_group_id_date_s_key;

CREATE UNIQUE INDEX google_ads_unique_row
ON google_ads_campaigns (user_id, campaign_id, COALESCE(ad_group_id, ''), COALESCE(date_start, '1970-01-01'), COALESCE(date_stop, '1970-01-01'));

CREATE TABLE public.monthly_reports (
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

CREATE POLICY "All team members can view reports"
  ON public.monthly_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own reports"
  ON public.monthly_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports"
  ON public.monthly_reports FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage reports"
  ON public.monthly_reports FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage reports" ON public.monthly_reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON public.monthly_reports;

CREATE POLICY "Users can insert own reports"
  ON public.monthly_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON public.monthly_reports FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Users can manage own analytics report files" ON storage.objects;

CREATE POLICY "Users can manage own analytics report files"
ON storage.objects
FOR ALL
TO authenticated
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