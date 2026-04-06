-- Migration 005 — Criativos (Drafts)

create table creative_drafts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  campaign_id uuid references campaigns(id) on delete set null,
  user_id uuid references auth.users(id) not null,

  type text not null check (type in (
    'carousel_direct',
    'carousel_narrative',
    'static_post',
    'batch'
  )),

  title text,
  data jsonb not null,
  status text default 'draft' check (status in ('draft', 'approved', 'published', 'archived')),
  thumbnail_url text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table creative_drafts enable row level security;
create policy "workspace member sees drafts"
  on creative_drafts for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = creative_drafts.workspace_id
      and user_id = auth.uid()
    )
  );

create index idx_drafts_workspace on creative_drafts (workspace_id, type, created_at desc);
