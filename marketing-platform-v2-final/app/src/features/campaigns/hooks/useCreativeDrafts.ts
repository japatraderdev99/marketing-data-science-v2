import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type DraftStatus = 'draft' | 'approved' | 'published' | 'archived';

export interface CreativeDraft {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  user_id: string;
  type: 'carousel_direct' | 'carousel_narrative' | 'static_post' | 'batch';
  title: string | null;
  data: Record<string, unknown>;
  status: DraftStatus;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  carousel_direct: 'Carrossel Direto',
  carousel_narrative: 'Carrossel Narrativa',
  static_post: 'Post Estático',
  batch: 'Lote',
};

export { TYPE_LABELS };

export function useCreativeDrafts() {
  const { workspaceId } = useAuth();
  return useQuery({
    queryKey: ['creative-drafts', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creative_drafts')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CreativeDraft[];
    },
    enabled: !!workspaceId && !!isSupabaseConfigured,
  });
}

export function useUpdateDraftStatus() {
  const { workspaceId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DraftStatus }) => {
      const { error } = await supabase
        .from('creative_drafts')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['creative-drafts', workspaceId] });
      const prev = qc.getQueryData<CreativeDraft[]>(['creative-drafts', workspaceId]);
      qc.setQueryData<CreativeDraft[]>(['creative-drafts', workspaceId], old =>
        (old ?? []).map(d => d.id === id ? { ...d, status } : d)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['creative-drafts', workspaceId], ctx.prev);
    },
  });
}

export function useDeleteDraft() {
  const { workspaceId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('creative_drafts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['creative-drafts', workspaceId] }),
  });
}
