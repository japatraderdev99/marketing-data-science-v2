import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/** Fetch workspace's strategy knowledge documents */
export function useStrategyKnowledge() {
  const { workspaceId } = useAuth();

  return useQuery({
    queryKey: ['strategy-knowledge', workspaceId],
    queryFn: async () => {
      if (!workspaceId || !isSupabaseConfigured) return [];
      const { data, error } = await supabase
        .from('strategy_knowledge')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', 'done')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId && isSupabaseConfigured,
  });
}

/** Fetch workspace's generative playbooks */
export function usePlaybook(type: 'image' | 'copy' | 'video' = 'copy') {
  const { workspaceId } = useAuth();

  return useQuery({
    queryKey: ['playbook', workspaceId, type],
    queryFn: async () => {
      if (!workspaceId || !isSupabaseConfigured) return null;
      const { data, error } = await supabase
        .from('generative_playbooks')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('playbook_type', type)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data ?? null;
    },
    enabled: !!workspaceId && isSupabaseConfigured,
  });
}

/** Save/update a generative playbook */
export function useSavePlaybook() {
  const { workspaceId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, knowledgeJson }: { type: 'image' | 'copy' | 'video'; knowledgeJson: Record<string, unknown> }) => {
      if (!workspaceId) throw new Error('Workspace não selecionado');
      const { data, error } = await supabase
        .from('generative_playbooks')
        .upsert(
          { workspace_id: workspaceId, playbook_type: type, knowledge_json: knowledgeJson, updated_at: new Date().toISOString() },
          { onConflict: 'workspace_id,playbook_type' },
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['playbook', workspaceId, vars.type] });
    },
  });
}

/** Build a context string from strategy knowledge for AI injection */
export function useStrategyContext() {
  const { data: docs, isLoading } = useStrategyKnowledge();
  const { data: copyPlaybook } = usePlaybook('copy');

  const contextParts: string[] = [];

  if (docs && docs.length > 0) {
    for (const doc of docs) {
      const knowledge = doc.extracted_knowledge as Record<string, unknown> | null;
      if (knowledge?.promptContext) {
        contextParts.push(String(knowledge.promptContext));
      }
    }
  }

  if (copyPlaybook?.knowledge_json) {
    const kj = copyPlaybook.knowledge_json as Record<string, unknown>;
    if (kj.angles) contextParts.push(`Ângulos preferidos: ${JSON.stringify(kj.angles)}`);
    if (kj.tones) contextParts.push(`Tons de voz: ${JSON.stringify(kj.tones)}`);
    if (kj.forbiddenWords) contextParts.push(`Palavras proibidas: ${JSON.stringify(kj.forbiddenWords)}`);
  }

  return {
    context: contextParts.join('\n\n'),
    hasStrategy: contextParts.length > 0,
    isLoading,
  };
}
