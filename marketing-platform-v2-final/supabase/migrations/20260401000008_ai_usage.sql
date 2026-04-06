-- Migration 008 — Tracking de Uso de IA

create table ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id),
  function_name text,
  task_type text,
  model_used text,
  provider text,
  tokens_input integer,
  tokens_output integer,
  cost_estimate numeric(10,6),
  latency_ms integer,
  success boolean default true,
  error_message text,
  created_at timestamptz default now()
);

-- Sem RLS — apenas service role pode inserir (edge functions)
-- Leitura pelo usuário apenas do próprio workspace via view
create view my_ai_usage as
  select * from ai_usage_log
  where workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  );
