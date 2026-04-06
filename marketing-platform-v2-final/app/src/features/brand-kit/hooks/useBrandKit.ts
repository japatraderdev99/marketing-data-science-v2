import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ── Types ──

export interface BrandAsset {
  id: string;
  workspace_id: string;
  name: string;
  asset_type: string;
  category: string | null;
  file_url: string;
  file_format: string | null;
  width: number | null;
  height: number | null;
  is_favorite: boolean;
}

export interface BrandColor {
  id: string;
  workspace_id: string;
  name: string;
  hex_value: string;
  rgb_value: string | null;
  category: string | null;
}

export interface BrandFont {
  id: string;
  workspace_id: string;
  font_name: string;
  font_weight: string | null;
  usage: string | null;
  sample_text: string | null;
}

// ── Hooks ──

export function useBrandAssets() {
  const { workspaceId } = useAuth();
  return useQuery({
    queryKey: ['brand-assets', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_assets')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as BrandAsset[];
    },
    enabled: !!workspaceId && isSupabaseConfigured,
  });
}

export function useBrandColors() {
  const { workspaceId } = useAuth();
  return useQuery({
    queryKey: ['brand-colors', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_colors')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as BrandColor[];
    },
    enabled: !!workspaceId && isSupabaseConfigured,
  });
}

export function useBrandFonts() {
  const { workspaceId } = useAuth();
  return useQuery({
    queryKey: ['brand-fonts', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_fonts')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as BrandFont[];
    },
    enabled: !!workspaceId && isSupabaseConfigured,
  });
}

export function useAddBrandAsset() {
  const { workspaceId, user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, assetType, category, file }: {
      name: string; assetType: string; category: string; file: File;
    }) => {
      if (!workspaceId || !user) throw new Error('Não autenticado');

      const ext = file.name.split('.').pop() ?? 'png';
      const path = `${workspaceId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('brand-assets')
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('brand-assets').getPublicUrl(path);

      const { error } = await supabase.from('brand_assets').insert({
        workspace_id: workspaceId,
        user_id: user.id,
        name,
        asset_type: assetType,
        category,
        file_url: urlData.publicUrl,
        file_format: ext,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brand-assets', workspaceId] }),
  });
}

export function useDeleteBrandAsset() {
  const { workspaceId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('brand_assets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brand-assets', workspaceId] }),
  });
}

export function useToggleFavorite() {
  const { workspaceId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, current }: { id: string; current: boolean }) => {
      const { error } = await supabase
        .from('brand_assets')
        .update({ is_favorite: !current })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brand-assets', workspaceId] }),
  });
}

export function useAddBrandColor() {
  const { workspaceId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, hexValue, category }: {
      name: string; hexValue: string; category: string;
    }) => {
      if (!workspaceId) throw new Error('Workspace não selecionado');
      const r = parseInt(hexValue.slice(1, 3), 16);
      const g = parseInt(hexValue.slice(3, 5), 16);
      const b = parseInt(hexValue.slice(5, 7), 16);
      const { error } = await supabase.from('brand_colors').insert({
        workspace_id: workspaceId,
        name,
        hex_value: hexValue,
        rgb_value: `${r}, ${g}, ${b}`,
        category,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brand-colors', workspaceId] }),
  });
}

export function useDeleteBrandColor() {
  const { workspaceId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('brand_colors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brand-colors', workspaceId] }),
  });
}

export function useAddBrandFont() {
  const { workspaceId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fontName, fontWeight, usage }: {
      fontName: string; fontWeight: string; usage: string;
    }) => {
      if (!workspaceId) throw new Error('Workspace não selecionado');
      const { error } = await supabase.from('brand_fonts').insert({
        workspace_id: workspaceId,
        font_name: fontName,
        font_weight: fontWeight,
        usage,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brand-fonts', workspaceId] }),
  });
}

export function useDeleteBrandFont() {
  const { workspaceId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('brand_fonts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brand-fonts', workspaceId] }),
  });
}
