import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/** Fetch user's strategy knowledge documents */
export function useStrategyKnowledge() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['strategy-knowledge', user?.id],
    queryFn: async () => {
      if (!user?.id || !isSupabaseConfigured) return [];
      const { data, error } = await supabase
        .from('strategy_knowledge')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'done')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id && isSupabaseConfigured,
  });
}

/** Fetch user's generative playbook by type */
export function usePlaybook(type: 'image' | 'copy' | 'video' = 'copy') {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['playbook', user?.id, type],
    queryFn: async () => {
      if (!user?.id || !isSupabaseConfigured) return null;
      const { data, error } = await supabase
        .from('generative_playbooks')
        .select('*')
        .eq('playbook_type', type)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    enabled: !!user?.id && isSupabaseConfigured,
  });
}

/** Save/update a generative playbook */
export function useSavePlaybook() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, knowledgeJson }: { type: 'image' | 'copy' | 'video'; knowledgeJson: Record<string, unknown> }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      // generative_playbooks has no user_id — upsert on playbook_type (single-user system)
      const { data, error } = await supabase
        .from('generative_playbooks')
        .upsert(
          { playbook_type: type, knowledge_json: knowledgeJson, updated_at: new Date().toISOString() },
          { onConflict: 'playbook_type' },
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['playbook', user?.id, vars.type] });
    },
  });
}

/** Build a context string from strategy knowledge for AI injection */
export function useStrategyContext() {
  const { data: docs, isLoading } = useStrategyKnowledge();
  const { data: copyPlaybook } = usePlaybook('copy');

  const contextParts: string[] = [];
  const kj = (copyPlaybook?.knowledge_json ?? {}) as Record<string, unknown>;

  // Prefer meta-fields promptContext (richest, AI-extracted)
  const meta = kj._metafields as Record<string, unknown> | undefined;
  if (meta?.promptContext) {
    contextParts.push(String(meta.promptContext));
  } else if (docs && docs.length > 0) {
    for (const doc of docs) {
      const knowledge = doc.extracted_knowledge as Record<string, unknown> | null;
      if (knowledge?.promptContext) contextParts.push(String(knowledge.promptContext));
    }
  }

  // Fallback: playbook fields
  if (contextParts.length === 0) {
    const fields: Record<string, string> = {
      positioning: 'Posicionamento',
      differentials: 'Diferenciais',
      targetAudience: 'Público-Alvo',
      pains: 'Dores',
      toneOfVoice: 'Tom de Voz',
      currentObjective: 'Objetivo',
    };
    for (const [key, label] of Object.entries(fields)) {
      if (typeof kj[key] === 'string' && (kj[key] as string).length > 0) {
        contextParts.push(`${label}: ${kj[key]}`);
      }
    }
  }

  // Tone rules from meta-fields
  if (meta?.toneRules) {
    const t = meta.toneRules as { use?: string[]; avoid?: string[] };
    if (t.use?.length) contextParts.push(`Tom (usar): ${t.use.join('; ')}`);
    if (t.avoid?.length) contextParts.push(`Tom (evitar): ${t.avoid.join('; ')}`);
  }

  return {
    context: contextParts.join('\n\n'),
    hasStrategy: contextParts.length > 0,
    isLoading,
    metafields: meta ?? null,
  };
}
