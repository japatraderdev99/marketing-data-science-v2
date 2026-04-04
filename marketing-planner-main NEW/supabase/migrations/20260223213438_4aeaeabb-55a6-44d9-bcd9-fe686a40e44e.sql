
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
