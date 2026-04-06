import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ── Types ──

export type CampaignObjective = 'awareness' | 'engagement' | 'conversion' | 'retention';
export type CampaignChannel = 'instagram' | 'tiktok' | 'linkedin' | 'google' | 'facebook';
export type CampaignStatus = 'active' | 'paused' | 'ended';

export interface Campaign {
  id: string;
  workspace_id: string;
  name: string;
  objective: CampaignObjective | null;
  channel: CampaignChannel | null;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  context: string | null;
  status: CampaignStatus;
  created_at: string;
}

export interface CampaignInput {
  name: string;
  objective: CampaignObjective | '';
  channel: CampaignChannel | '';
  budget: string;
  start_date: string;
  end_date: string;
  context: string;
  status: CampaignStatus;
}

// ── Hooks ──

export function useCampaigns() {
  const { workspaceId } = useAuth();
  return useQuery({
    queryKey: ['campaigns', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Campaign[];
    },
    enabled: !!workspaceId && isSupabaseConfigured,
  });
}

export function useCreateCampaign() {
  const { workspaceId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CampaignInput) => {
      if (!workspaceId) throw new Error('Workspace não selecionado');
      const { error } = await supabase.from('campaigns').insert({
        workspace_id: workspaceId,
        name: input.name,
        objective: input.objective || null,
        channel: input.channel || null,
        budget: input.budget ? parseFloat(input.budget) : null,
        start_date: input.start_date || null,
        end_date: input.end_date || null,
        context: input.context || null,
        status: input.status,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns', workspaceId] }),
  });
}

export function useUpdateCampaign() {
  const { workspaceId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: CampaignInput }) => {
      const { error } = await supabase
        .from('campaigns')
        .update({
          name: input.name,
          objective: input.objective || null,
          channel: input.channel || null,
          budget: input.budget ? parseFloat(input.budget) : null,
          start_date: input.start_date || null,
          end_date: input.end_date || null,
          context: input.context || null,
          status: input.status,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns', workspaceId] }),
  });
}

export function useDeleteCampaign() {
  const { workspaceId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns', workspaceId] }),
  });
}
