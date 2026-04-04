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