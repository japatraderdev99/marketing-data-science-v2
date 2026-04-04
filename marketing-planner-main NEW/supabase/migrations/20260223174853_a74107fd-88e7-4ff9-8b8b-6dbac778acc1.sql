
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
