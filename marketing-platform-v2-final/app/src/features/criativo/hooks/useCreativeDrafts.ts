import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { CreativeDraft, DraftType } from '@/types';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const DRAFTS_KEY = (workspaceId: string | null, type?: DraftType) =>
  ['creative-drafts', workspaceId, type ?? 'all'] as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useMyDrafts(type?: DraftType) {
  const { workspaceId } = useAuth();

  return useQuery({
    queryKey: DRAFTS_KEY(workspaceId, type),
    queryFn: async () => {
      let query = supabase
        .from('creative_drafts')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('created_at', { ascending: false });

      if (type) query = query.eq('type', type);

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return (data ?? []) as CreativeDraft[];
    },
    enabled: !!workspaceId && isSupabaseConfigured,
  });
}

export function useSaveDraft() {
  const { workspaceId, user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      type,
      title,
      data,
      campaign_id,
      thumbnail_url,
    }: {
      type: DraftType;
      title?: string;
      data: Record<string, unknown>;
      campaign_id?: string;
      thumbnail_url?: string;
    }) => {
      if (!workspaceId || !user) throw new Error('Não autenticado');

      const { data: record, error } = await supabase
        .from('creative_drafts')
        .insert({
          workspace_id: workspaceId,
          user_id: user.id,
          type,
          title: title ?? null,
          data,
          status: 'draft',
          campaign_id: campaign_id ?? null,
          thumbnail_url: thumbnail_url ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return record as CreativeDraft;
    },
    onSuccess: (draft) => {
      qc.invalidateQueries({ queryKey: DRAFTS_KEY(workspaceId, draft.type) });
      qc.invalidateQueries({ queryKey: DRAFTS_KEY(workspaceId) });
    },
  });
}

export function useUpdateDraftStatus() {
  const { workspaceId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: CreativeDraft['status'];
    }) => {
      const { error } = await supabase
        .from('creative_drafts')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['creative-drafts', workspaceId] });
    },
  });
}
