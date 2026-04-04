
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
