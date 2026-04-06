-- Migration 006 — Analytics: Meta Ads

create table meta_ads_performance (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  ad_account_id text,
  ad_id text not null,
  ad_name text,
  adset_name text,
  campaign_name text,
  campaign_objective text,
  metric_date date not null,

  impressions integer default 0,
  clicks integer default 0,
  spend numeric(10,4) default 0,
  conversions integer default 0,
  reach integer default 0,

  cpc numeric(10,4),
  cpm numeric(10,4),
  ctr numeric(6,4),
  roas numeric(8,4),
  cost_per_conversion numeric(10,4),

  creative_score integer,

  synced_at timestamptz default now(),
  unique (workspace_id, ad_id, metric_date)
);

alter table meta_ads_performance enable row level security;
create policy "workspace member sees meta ads"
  on meta_ads_performance for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = meta_ads_performance.workspace_id
      and user_id = auth.uid()
    )
  );

create index idx_meta_workspace_date on meta_ads_performance (workspace_id, metric_date desc);
create index idx_meta_campaign on meta_ads_performance (workspace_id, campaign_name, metric_date desc);
