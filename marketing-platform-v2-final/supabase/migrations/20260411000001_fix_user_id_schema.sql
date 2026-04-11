-- Migration 014 — Fix RLS policies para arquitetura user_id
-- O schema já foi corrigido manualmente no dashboard (workspace_id removido, user_id adicionado).
-- Este migration APENAS corrige as políticas de RLS que ainda usam workspace_members.

-- ═══════════════════════════════════════════════════════════════════
-- strategy_knowledge — RLS baseada em user_id
-- ═══════════════════════════════════════════════════════════════════

-- Remover política antiga baseada em workspace_members
DROP POLICY IF EXISTS "workspace member sees strategy" ON strategy_knowledge;

-- Nova política: usuário gerencia seus próprios docs (user_id = auth.uid())
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'strategy_knowledge' AND policyname = 'user manages strategy knowledge'
  ) THEN
    EXECUTE 'CREATE POLICY "user manages strategy knowledge"
      ON strategy_knowledge FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid())';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- competitor_benchmarks — RLS baseada em user_id
-- ═══════════════════════════════════════════════════════════════════

-- Remover política antiga
DROP POLICY IF EXISTS "workspace member sees benchmarks" ON competitor_benchmarks;

-- Nova política
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'competitor_benchmarks' AND policyname = 'user manages competitor benchmarks'
  ) THEN
    EXECUTE 'CREATE POLICY "user manages competitor benchmarks"
      ON competitor_benchmarks FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid())';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- generative_playbooks — sem user_id, RLS para qualquer autenticado
-- ═══════════════════════════════════════════════════════════════════

-- Remover política antiga
DROP POLICY IF EXISTS "workspace member sees playbooks" ON generative_playbooks;

-- Garantir RLS habilitada
ALTER TABLE generative_playbooks ENABLE ROW LEVEL SECURITY;

-- Nova política: qualquer usuário autenticado pode gerenciar
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'generative_playbooks' AND policyname = 'authenticated manages playbooks'
  ) THEN
    EXECUTE 'CREATE POLICY "authenticated manages playbooks"
      ON generative_playbooks FOR ALL
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;
END $$;

-- Garantir unique constraint em playbook_type (para upsert on conflict 'playbook_type')
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'generative_playbooks_playbook_type_key'
      AND conrelid = 'generative_playbooks'::regclass
  ) THEN
    ALTER TABLE generative_playbooks
      ADD CONSTRAINT generative_playbooks_playbook_type_key UNIQUE (playbook_type);
  END IF;
END $$;
