
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
