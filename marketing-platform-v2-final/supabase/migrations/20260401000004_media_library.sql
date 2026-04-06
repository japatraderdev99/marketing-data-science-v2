-- Migration 004 — Biblioteca de Mídia com Tagging por IA

create table media_library (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,

  -- Arquivo
  file_url text not null,
  thumbnail_url text,
  file_name text,
  file_size integer,
  mime_type text,
  width integer,
  height integer,

  -- Tagging por IA
  ai_tags text[] default '{}',
  ai_description text,
  ai_mood text,
  ai_subjects text[],
  ai_colors text[],
  ai_style text,
  ai_fit_score_map jsonb default '{}',

  -- Metadados manuais
  manual_tags text[] default '{}',
  category text,
  is_favorite boolean default false,

  -- Status do processamento
  tagging_status text default 'pending' check (tagging_status in ('pending', 'processing', 'done', 'error')),
  tagging_error text,

  created_at timestamptz default now()
);

alter table media_library enable row level security;
create policy "workspace member sees media"
  on media_library for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = media_library.workspace_id
      and user_id = auth.uid()
    )
  );

create index idx_media_ai_tags on media_library using gin(ai_tags);
create index idx_media_manual_tags on media_library using gin(manual_tags);
create index idx_media_workspace on media_library (workspace_id, created_at desc);
create index idx_media_mood on media_library (workspace_id, ai_mood);
