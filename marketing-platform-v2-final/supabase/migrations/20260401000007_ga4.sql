-- Migration 007 — Analytics: GA4

create table ga4_metrics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  metric_date date not null,

  sessions integer,
  total_users integer,
  new_users integer,
  page_views integer,
  bounce_rate numeric(6,4),
  conversions integer,
  conversion_rate numeric(6,4),
  avg_session_duration numeric(10,2),
  events_count integer,

  source_medium text,
  landing_page text,
  device_category text,

  synced_at timestamptz default now(),
  unique (workspace_id, metric_date, source_medium, device_category)
);

alter table ga4_metrics enable row level security;
create policy "workspace member sees ga4"
  on ga4_metrics for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = ga4_metrics.workspace_id
      and user_id = auth.uid()
    )
  );

create index idx_ga4_workspace_date on ga4_metrics (workspace_id, metric_date desc);
