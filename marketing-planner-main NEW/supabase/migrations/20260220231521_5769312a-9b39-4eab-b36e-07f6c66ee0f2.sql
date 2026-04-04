
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
