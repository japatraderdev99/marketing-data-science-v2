
-- Add drive_link and asset_name columns to campaign_tasks for the approval workflow
ALTER TABLE public.campaign_tasks
  ADD COLUMN IF NOT EXISTS drive_link text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS asset_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS destination_platform text DEFAULT NULL;
