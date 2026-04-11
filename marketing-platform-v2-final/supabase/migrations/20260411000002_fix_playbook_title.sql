-- Migration 015 — Fix generative_playbooks: title nullable + user_id para isolamento
-- O campo title é NOT NULL mas o frontend não envia esse campo no upsert.
-- Também adiciona user_id para isolamento correto por usuário (multi-tenant futuro).

-- Tornar title nullable (frontend não envia, deve ser opcional)
ALTER TABLE generative_playbooks ALTER COLUMN title DROP NOT NULL;
ALTER TABLE generative_playbooks ALTER COLUMN title SET DEFAULT '';

-- Adicionar user_id para isolamento por usuário
ALTER TABLE generative_playbooks
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Remover unique constraint antiga (apenas playbook_type) se existir
-- e criar nova em (playbook_type) — sem user_id pois o frontend não envia user_id
-- Nota: mantemos single-user por ora pois useSavePlaybook não envia user_id

-- Atualizar RLS para incluir user_id quando disponível
-- (política atual: auth.uid() IS NOT NULL — qualquer autenticado pode gerenciar)
-- Já está correta para sistema single-user.
