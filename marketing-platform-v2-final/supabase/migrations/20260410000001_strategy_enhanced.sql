-- Migration 012 — Estratégia Enhanced: competitor_benchmarks + colunas adicionais

-- Adicionar colunas à strategy_knowledge
ALTER TABLE strategy_knowledge
  ADD COLUMN IF NOT EXISTS document_url TEXT,
  ADD COLUMN IF NOT EXISTS file_size BIGINT,
  ADD COLUMN IF NOT EXISTS doc_type TEXT DEFAULT 'knowledge';

-- Atualizar constraint de status para incluir 'pending'
ALTER TABLE strategy_knowledge DROP CONSTRAINT IF EXISTS strategy_knowledge_status_check;
ALTER TABLE strategy_knowledge
  ADD CONSTRAINT strategy_knowledge_status_check
    CHECK (status IN ('pending', 'processing', 'done', 'error'));

-- Atualizar constraint de doc_type
ALTER TABLE strategy_knowledge
  ADD CONSTRAINT strategy_knowledge_doc_type_check
    CHECK (doc_type IN ('knowledge', 'reference'));

-- Tabela de benchmarks de concorrentes
CREATE TABLE IF NOT EXISTS competitor_benchmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  competitor_name TEXT NOT NULL,
  platform TEXT,
  format_type TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'done', 'error')),
  ai_insights JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE competitor_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace member sees benchmarks"
  ON competitor_benchmarks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = competitor_benchmarks.workspace_id
        AND user_id = auth.uid()
    )
  );

-- Bucket de benchmarks
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'benchmarks', 'benchmarks', false, 20971520,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "upload benchmarks"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'benchmarks' AND auth.uid() IS NOT NULL);

CREATE POLICY "read benchmarks"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'benchmarks' AND auth.uid() IS NOT NULL);

CREATE POLICY "delete benchmarks"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'benchmarks' AND auth.uid() = owner);

-- Atualizar bucket knowledge para aceitar imagens também (brand books em PNG/JPG)
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf', 'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png', 'image/webp'
]
WHERE id = 'knowledge';
