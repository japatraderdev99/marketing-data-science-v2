
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
