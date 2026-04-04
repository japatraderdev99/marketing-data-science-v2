
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
