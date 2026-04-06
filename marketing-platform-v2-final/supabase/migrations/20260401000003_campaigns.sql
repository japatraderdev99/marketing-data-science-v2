-- Migration 003 — Campanhas

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  name text not null,
  objective text check (objective in ('awareness', 'engagement', 'conversion', 'retention')),
  channel text,
  budget numeric,
  start_date date,
  end_date date,
  context text,
  status text default 'active' check (status in ('active', 'paused', 'ended')),
  created_at timestamptz default now()
);

alter table campaigns enable row level security;
create policy "workspace member sees campaigns"
  on campaigns for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = campaigns.workspace_id
      and user_id = auth.uid()
    )
  );
