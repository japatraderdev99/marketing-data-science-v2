-- ═══════════════════════════════════════════════════════════════════════════════
-- DQEF Studio — Migração COMPLETA (idempotente, ordem correta)
-- Rode este arquivo INTEIRO no SQL Editor do Supabase.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. profiles ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 2. media_library ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.media_library (
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
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "All team members can view media" ON public.media_library FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own media" ON public.media_library FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own media" ON public.media_library FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own media" ON public.media_library FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('media-library', 'media-library', true) ON CONFLICT (id) DO NOTHING;
DO $$ BEGIN CREATE POLICY "Public read access on media-library" ON storage.objects FOR SELECT USING (bucket_id = 'media-library'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can upload to own folder in media-library" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media-library' AND auth.uid()::text = (storage.foldername(name))[1]); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own files in media-library" ON storage.objects FOR DELETE USING (bucket_id = 'media-library' AND auth.uid()::text = (storage.foldername(name))[1]); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 3. strategy_knowledge ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.strategy_knowledge (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  document_name text NOT NULL,
  document_url text NOT NULL,
  document_type text,
  file_size integer,
  status text NOT NULL DEFAULT 'pending',
  extracted_knowledge jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.strategy_knowledge ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "All team members can view knowledge" ON public.strategy_knowledge FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own knowledge" ON public.strategy_knowledge FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own knowledge" ON public.strategy_knowledge FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own knowledge" ON public.strategy_knowledge FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.update_strategy_knowledge_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
DROP TRIGGER IF EXISTS update_strategy_knowledge_updated_at ON public.strategy_knowledge;
CREATE TRIGGER update_strategy_knowledge_updated_at BEFORE UPDATE ON public.strategy_knowledge FOR EACH ROW EXECUTE FUNCTION public.update_strategy_knowledge_updated_at();

-- ─── 4. forum_messages ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  author_name text NOT NULL,
  author_initials text NOT NULL DEFAULT '',
  author_role text NOT NULL DEFAULT '',
  content text NOT NULL,
  is_ai boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  message_type text NOT NULL DEFAULT 'message',
  metadata jsonb,
  reply_to uuid REFERENCES public.forum_messages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.forum_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Authenticated users can view all messages" ON public.forum_messages FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own messages" ON public.forum_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own messages" ON public.forum_messages FOR UPDATE TO authenticated USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own messages" ON public.forum_messages FOR DELETE TO authenticated USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role can insert AI messages" ON public.forum_messages FOR INSERT TO service_role WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role can update messages" ON public.forum_messages FOR UPDATE TO service_role USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.update_forum_messages_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
DROP TRIGGER IF EXISTS trg_forum_messages_updated_at ON public.forum_messages;
CREATE TRIGGER trg_forum_messages_updated_at BEFORE UPDATE ON public.forum_messages FOR EACH ROW EXECUTE FUNCTION public.update_forum_messages_updated_at();

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 5. creative_drafts ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.creative_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sigla TEXT UNIQUE,
  name TEXT NOT NULL DEFAULT 'Sem título',
  status TEXT NOT NULL DEFAULT 'draft',
  context TEXT,
  angle TEXT,
  persona TEXT,
  channel TEXT,
  tone TEXT,
  format_id TEXT,
  carousel_data JSONB,
  slide_images JSONB DEFAULT '{}'::jsonb,
  feedback_requests JSONB DEFAULT '[]'::jsonb,
  campaign_name TEXT,
  workflow_stage TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.creative_drafts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Team members can view all drafts" ON public.creative_drafts FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own drafts" ON public.creative_drafts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own drafts" ON public.creative_drafts FOR UPDATE TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own drafts" ON public.creative_drafts FOR DELETE TO authenticated USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add columns that may be missing from earlier partial creation
ALTER TABLE public.creative_drafts ADD COLUMN IF NOT EXISTS sigla TEXT;
ALTER TABLE public.creative_drafts ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Sem título';
ALTER TABLE public.creative_drafts ADD COLUMN IF NOT EXISTS context TEXT;
ALTER TABLE public.creative_drafts ADD COLUMN IF NOT EXISTS angle TEXT;
ALTER TABLE public.creative_drafts ADD COLUMN IF NOT EXISTS persona TEXT;
ALTER TABLE public.creative_drafts ADD COLUMN IF NOT EXISTS channel TEXT;
ALTER TABLE public.creative_drafts ADD COLUMN IF NOT EXISTS tone TEXT;
ALTER TABLE public.creative_drafts ADD COLUMN IF NOT EXISTS format_id TEXT;
ALTER TABLE public.creative_drafts ADD COLUMN IF NOT EXISTS carousel_data JSONB;
ALTER TABLE public.creative_drafts ADD COLUMN IF NOT EXISTS slide_images JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.creative_drafts ADD COLUMN IF NOT EXISTS feedback_requests JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.creative_drafts ADD COLUMN IF NOT EXISTS campaign_name TEXT;
ALTER TABLE public.creative_drafts ADD COLUMN IF NOT EXISTS workflow_stage TEXT;

CREATE OR REPLACE FUNCTION public.update_creative_drafts_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS update_creative_drafts_updated_at ON public.creative_drafts;
CREATE TRIGGER update_creative_drafts_updated_at BEFORE UPDATE ON public.creative_drafts FOR EACH ROW EXECUTE FUNCTION public.update_creative_drafts_updated_at();

CREATE OR REPLACE FUNCTION public.generate_draft_sigla() RETURNS TEXT LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_sigla TEXT; v_suffix TEXT; v_prefix TEXT; v_exists BOOLEAN;
BEGIN
  v_prefix := 'CRI-' || TO_CHAR(NOW(), 'MMDD') || '-';
  LOOP
    v_suffix := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
    v_sigla := v_prefix || v_suffix;
    SELECT EXISTS(SELECT 1 FROM public.creative_drafts WHERE sigla = v_sigla) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_sigla;
END; $$;

-- ─── 6. competitor_benchmarks ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.competitor_benchmarks (
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.competitor_benchmarks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "All team members can view benchmarks" ON public.competitor_benchmarks FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own benchmarks" ON public.competitor_benchmarks FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own benchmarks" ON public.competitor_benchmarks FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own benchmarks" ON public.competitor_benchmarks FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO storage.buckets (id, name, public) VALUES ('benchmarks', 'benchmarks', true) ON CONFLICT (id) DO NOTHING;
DO $$ BEGIN CREATE POLICY "Users can upload own benchmarks" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'benchmarks' AND auth.uid()::text = (storage.foldername(name))[1]); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can view own benchmark files" ON storage.objects FOR SELECT USING (bucket_id = 'benchmarks' AND auth.uid()::text = (storage.foldername(name))[1]); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own benchmark files" ON storage.objects FOR DELETE USING (bucket_id = 'benchmarks' AND auth.uid()::text = (storage.foldername(name))[1]); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 7. active_creatives ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.active_creatives (
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
DO $$ BEGIN CREATE POLICY "All team members can view creatives" ON public.active_creatives FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "All team members can insert creatives" ON public.active_creatives FOR INSERT TO authenticated WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "All team members can update creatives" ON public.active_creatives FOR UPDATE TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "All team members can delete creatives" ON public.active_creatives FOR DELETE TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.update_active_creatives_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
DROP TRIGGER IF EXISTS update_active_creatives_updated_at ON public.active_creatives;
CREATE TRIGGER update_active_creatives_updated_at BEFORE UPDATE ON public.active_creatives FOR EACH ROW EXECUTE FUNCTION public.update_active_creatives_updated_at();

-- ─── 8. brand_assets ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brand_assets (
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
DO $$ BEGIN CREATE POLICY "All team members can view assets" ON public.brand_assets FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own assets" ON public.brand_assets FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own assets" ON public.brand_assets FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own assets" ON public.brand_assets FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 9. brand_colors ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brand_colors (
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
DO $$ BEGIN CREATE POLICY "All team members can view colors" ON public.brand_colors FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own colors" ON public.brand_colors FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own colors" ON public.brand_colors FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own colors" ON public.brand_colors FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 10. brand_fonts ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brand_fonts (
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
DO $$ BEGIN CREATE POLICY "All team members can view fonts" ON public.brand_fonts FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own fonts" ON public.brand_fonts FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own fonts" ON public.brand_fonts FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own fonts" ON public.brand_fonts FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Brand storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-assets', 'brand-assets', true) ON CONFLICT (id) DO NOTHING;
DO $$ BEGIN CREATE POLICY "Users can view own brand assets" ON storage.objects FOR SELECT USING (bucket_id = 'brand-assets' AND auth.uid()::text = (storage.foldername(name))[1]); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can upload brand assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'brand-assets' AND auth.uid()::text = (storage.foldername(name))[1]); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own brand assets" ON storage.objects FOR UPDATE USING (bucket_id = 'brand-assets' AND auth.uid()::text = (storage.foldername(name))[1]); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own brand assets" ON storage.objects FOR DELETE USING (bucket_id = 'brand-assets' AND auth.uid()::text = (storage.foldername(name))[1]); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 11. ai_usage_log ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
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
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Users can view own usage logs" ON public.ai_usage_log FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own usage logs" ON public.ai_usage_log FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role can insert usage logs" ON public.ai_usage_log FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_created ON public.ai_usage_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_task_type ON public.ai_usage_log (task_type);

-- ─── 12. dam_assets ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dam_assets (
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
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dam_assets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "All team members can view DAM assets" ON public.dam_assets FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own DAM assets" ON public.dam_assets FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own DAM assets" ON public.dam_assets FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own DAM assets" ON public.dam_assets FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role can manage DAM assets" ON public.dam_assets FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_dam_assets_drive_file ON public.dam_assets (drive_file_id);
CREATE INDEX IF NOT EXISTS idx_dam_assets_category ON public.dam_assets (category);
CREATE INDEX IF NOT EXISTS idx_dam_assets_user ON public.dam_assets (user_id);

-- ─── 13. creative_suggestions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.creative_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  input_text TEXT NOT NULL,
  input_type TEXT NOT NULL DEFAULT 'mixed',
  suggestion_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  copy_text TEXT,
  visual_direction TEXT,
  channel TEXT,
  format TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  ai_reasoning TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.creative_suggestions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "All team members can view suggestions" ON public.creative_suggestions FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own suggestions" ON public.creative_suggestions FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "All team members can update suggestions" ON public.creative_suggestions FOR UPDATE TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "All team members can delete suggestions" ON public.creative_suggestions FOR DELETE TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role can insert suggestions" ON public.creative_suggestions FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.update_creative_suggestions_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
DROP TRIGGER IF EXISTS update_creative_suggestions_updated_at ON public.creative_suggestions;
CREATE TRIGGER update_creative_suggestions_updated_at BEFORE UPDATE ON public.creative_suggestions FOR EACH ROW EXECUTE FUNCTION public.update_creative_suggestions_updated_at();

-- ─── 14. generative_playbooks ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.generative_playbooks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playbook_type text NOT NULL,
  title text NOT NULL,
  knowledge_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.generative_playbooks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Authenticated users can read playbooks" ON public.generative_playbooks FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role can manage playbooks" ON public.generative_playbooks FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 15. video_projects ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.video_projects (
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
ALTER TABLE public.video_projects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "All team members can view video projects" ON public.video_projects FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own video projects" ON public.video_projects FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own video projects" ON public.video_projects FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own video projects" ON public.video_projects FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.update_video_projects_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
DROP TRIGGER IF EXISTS update_video_projects_updated_at ON public.video_projects;
CREATE TRIGGER update_video_projects_updated_at BEFORE UPDATE ON public.video_projects FOR EACH ROW EXECUTE FUNCTION public.update_video_projects_updated_at();

-- ─── 16. campaign_tasks ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campaign_tasks (
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
  drive_link text,
  asset_name text,
  destination_platform text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campaign_tasks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "All team members can view campaign tasks" ON public.campaign_tasks FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "All team members can insert campaign tasks" ON public.campaign_tasks FOR INSERT TO authenticated WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "All team members can update campaign tasks" ON public.campaign_tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "All team members can delete campaign tasks" ON public.campaign_tasks FOR DELETE TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.update_campaign_tasks_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS update_campaign_tasks_updated_at ON public.campaign_tasks;
CREATE TRIGGER update_campaign_tasks_updated_at BEFORE UPDATE ON public.campaign_tasks FOR EACH ROW EXECUTE FUNCTION public.update_campaign_tasks_updated_at();

-- ─── 17. ga4_metrics ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ga4_metrics (
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
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.ga4_metrics ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "All team members can view ga4 metrics" ON public.ga4_metrics FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own ga4 metrics" ON public.ga4_metrics FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own ga4 metrics" ON public.ga4_metrics FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own ga4 metrics" ON public.ga4_metrics FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role can manage ga4 metrics" ON public.ga4_metrics FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ga4_metrics_unique_row ON ga4_metrics (user_id, metric_date, COALESCE(source_medium, ''), COALESCE(campaign_name, ''), COALESCE(landing_page, ''), COALESCE(device_category, ''));

-- ─── 18. google_ads_campaigns ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.google_ads_campaigns (
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
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.google_ads_campaigns ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "All team members can view google ads" ON public.google_ads_campaigns FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own google ads" ON public.google_ads_campaigns FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own google ads" ON public.google_ads_campaigns FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own google ads" ON public.google_ads_campaigns FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role can manage google ads" ON public.google_ads_campaigns FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS google_ads_unique_row ON google_ads_campaigns (user_id, campaign_id, COALESCE(ad_group_id, ''), COALESCE(date_start, '1970-01-01'), COALESCE(date_stop, '1970-01-01'));

-- ─── 19. operational_metrics ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.operational_metrics (
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
DO $$ BEGIN CREATE POLICY "All team members can view operational metrics" ON public.operational_metrics FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own operational metrics" ON public.operational_metrics FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own operational metrics" ON public.operational_metrics FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own operational metrics" ON public.operational_metrics FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role can manage operational metrics" ON public.operational_metrics FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_operational_metrics_user_type ON public.operational_metrics(user_id, metric_type);
CREATE INDEX IF NOT EXISTS idx_operational_metrics_date ON public.operational_metrics(metric_date);

CREATE UNIQUE INDEX IF NOT EXISTS operational_metrics_unique_row ON operational_metrics (user_id, metric_type, metric_date, COALESCE(city, ''), COALESCE(state, ''));

-- ─── 20. meta_ads_performance ──────────────────────────────────────────────
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
DO $$ BEGIN CREATE POLICY "All team members can view meta ads" ON public.meta_ads_performance FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own meta ads" ON public.meta_ads_performance FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own meta ads" ON public.meta_ads_performance FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own meta ads" ON public.meta_ads_performance FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_meta_ads_user_date ON public.meta_ads_performance(user_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_meta_ads_draft_id ON public.meta_ads_performance(draft_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_creative_category ON public.meta_ads_performance(creative_category);

-- ─── 21. instagram_posts ───────────────────────────────────────────────────
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
DO $$ BEGIN CREATE POLICY "All team members can view instagram posts" ON public.instagram_posts FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own instagram posts" ON public.instagram_posts FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own instagram posts" ON public.instagram_posts FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own instagram posts" ON public.instagram_posts FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_instagram_posts_user ON public.instagram_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_published ON public.instagram_posts(published_at);

-- ─── 22. content_performance_insights ──────────────────────────────────────
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
DO $$ BEGIN CREATE POLICY "All team members can view insights" ON public.content_performance_insights FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own insights" ON public.content_performance_insights FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own insights" ON public.content_performance_insights FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own insights" ON public.content_performance_insights FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_insights_user_type ON public.content_performance_insights(user_id, insight_type);

-- ─── 23. campaigns ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campaigns (
  id text PRIMARY KEY,
  user_id uuid NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "All team members can view campaigns" ON public.campaigns FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Authenticated users can insert campaigns" ON public.campaigns FOR INSERT TO authenticated WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Authenticated users can update campaigns" ON public.campaigns FOR UPDATE TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Authenticated users can delete campaigns" ON public.campaigns FOR DELETE TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 24. calendar_contents ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.calendar_contents (
  id text PRIMARY KEY,
  user_id uuid NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.calendar_contents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "All team members can view contents" ON public.calendar_contents FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Authenticated users can insert contents" ON public.calendar_contents FOR INSERT TO authenticated WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Authenticated users can update contents" ON public.calendar_contents FOR UPDATE TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Authenticated users can delete contents" ON public.calendar_contents FOR DELETE TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 25. monthly_reports ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  report_month date NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  extracted_data jsonb DEFAULT '{}'::jsonb,
  ai_analysis text,
  model_used text DEFAULT 'anthropic/claude-sonnet-4',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "All team members can view reports" ON public.monthly_reports FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own reports" ON public.monthly_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own reports" ON public.monthly_reports FOR DELETE TO authenticated USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role full access" ON public.monthly_reports FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Storage policy for analytics reports
DROP POLICY IF EXISTS "Users can manage own analytics report files" ON storage.objects;
CREATE POLICY "Users can manage own analytics report files"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'media-library' AND (storage.foldername(name))[1] = 'reports' AND (storage.foldername(name))[2] = auth.uid()::text)
  WITH CHECK (bucket_id = 'media-library' AND (storage.foldername(name))[1] = 'reports' AND (storage.foldername(name))[2] = auth.uid()::text);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIM — 25 tabelas, 3 storage buckets, RLS em todas, indexes, triggers
-- ═══════════════════════════════════════════════════════════════════════════════
