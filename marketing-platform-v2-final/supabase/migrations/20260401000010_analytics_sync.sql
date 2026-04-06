-- Migration 010 — Analytics Sync tables: Instagram Posts, Google Ads, Operational Metrics

-- ── Instagram Posts (organic IG data from Meta Graph API) ──
create table instagram_posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  instagram_media_id text not null,
  instagram_account_id text,
  caption text,
  media_type text, -- IMAGE, VIDEO, CAROUSEL_ALBUM, REELS
  media_url text,
  thumbnail_url text,
  permalink text,
  published_at timestamptz,

  likes integer default 0,
  comments integer default 0,
  impressions integer default 0,
  reach integer default 0,
  saves integer default 0,
  shares integer default 0,
  video_views integer default 0,
  engagement integer default 0,

  synced_at timestamptz default now(),
  unique (workspace_id, instagram_media_id)
);

alter table instagram_posts enable row level security;
create policy "workspace member sees ig posts"
  on instagram_posts for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = instagram_posts.workspace_id
      and user_id = auth.uid()
    )
  );

create index idx_ig_workspace_date on instagram_posts (workspace_id, published_at desc);
create index idx_ig_media_type on instagram_posts (workspace_id, media_type);

-- ── Google Ads Campaigns ──
create table google_ads_campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  campaign_id text not null,
  campaign_name text,
  campaign_status text,
  campaign_type text,
  ad_group_id text,
  ad_group_name text,

  impressions integer default 0,
  clicks integer default 0,
  cost_micros bigint default 0,
  cost numeric(12,4) default 0,
  conversions numeric(10,2) default 0,
  conversion_value numeric(12,2) default 0,
  ctr numeric(8,6) default 0,
  avg_cpc numeric(12,4) default 0,
  avg_cpm numeric(12,4) default 0,
  interaction_rate numeric(8,6) default 0,

  date_start date not null,
  date_stop date not null,
  synced_at timestamptz default now(),
  unique (workspace_id, campaign_id, ad_group_id, date_start, date_stop)
);

alter table google_ads_campaigns enable row level security;
create policy "workspace member sees google ads"
  on google_ads_campaigns for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = google_ads_campaigns.workspace_id
      and user_id = auth.uid()
    )
  );

create index idx_gads_workspace_date on google_ads_campaigns (workspace_id, date_start desc);
create index idx_gads_campaign on google_ads_campaigns (workspace_id, campaign_id);

-- ── Operational Metrics (Firestore sync: users, bookings, transactions, etc.) ──
create table operational_metrics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  metric_type text not null,
  metric_date date not null,
  count integer default 0,
  total_value numeric(14,2) default 0,
  city text,
  state text,
  metadata jsonb default '{}',

  synced_at timestamptz default now()
);

alter table operational_metrics enable row level security;
create policy "workspace member sees operational metrics"
  on operational_metrics for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = operational_metrics.workspace_id
      and user_id = auth.uid()
    )
  );

create index idx_ops_workspace_type on operational_metrics (workspace_id, metric_type);
create index idx_ops_date on operational_metrics (workspace_id, metric_date desc);

-- ── Extend meta_ads_performance with missing columns for ads sync ──
alter table meta_ads_performance
  add column if not exists adset_id text,
  add column if not exists campaign_id text,
  add column if not exists date_start date,
  add column if not exists date_stop date,
  add column if not exists creative_url text,
  add column if not exists thumbnail_url text,
  add column if not exists ad_body text,
  add column if not exists ad_title text;

-- ── Extend ga4_metrics with missing columns for full sync ──
alter table ga4_metrics
  add column if not exists campaign_name text,
  add column if not exists revenue numeric(12,2) default 0;
