-- Migration 002 — Estratégia de Marca

create table strategy_knowledge (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  document_name text not null,
  raw_content text,
  extracted_knowledge jsonb,
  status text default 'processing' check (status in ('processing', 'done', 'error')),
  created_at timestamptz default now()
);

alter table strategy_knowledge enable row level security;
create policy "workspace member sees strategy"
  on strategy_knowledge for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = strategy_knowledge.workspace_id
      and user_id = auth.uid()
    )
  );

-- Playbooks de geração (regras de imagem, copy, vídeo)
create table generative_playbooks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  playbook_type text not null check (playbook_type in ('image', 'copy', 'video')),
  knowledge_json jsonb not null,
  updated_at timestamptz default now(),
  unique (workspace_id, playbook_type)
);

alter table generative_playbooks enable row level security;
create policy "workspace member sees playbooks"
  on generative_playbooks for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = generative_playbooks.workspace_id
      and user_id = auth.uid()
    )
  );
