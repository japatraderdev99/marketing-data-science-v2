import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { MediaItem, MediaMood } from '@/types';

export interface MediaFilters {
  search?: string;
  mood?: MediaMood | '';
  style?: string;
}

export function useMediaItems(filters: MediaFilters = {}) {
  const { workspaceId } = useAuth();

  return useQuery({
    queryKey: ['media-library', workspaceId, filters],
    queryFn: async () => {
      let query = supabase
        .from('media_library')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('created_at', { ascending: false });

      if (filters.mood) {
        query = query.eq('ai_mood', filters.mood);
      }
      if (filters.style) {
        query = query.eq('ai_style', filters.style);
      }
      if (filters.search) {
        query = query.or(
          `file_name.ilike.%${filters.search}%,ai_description.ilike.%${filters.search}%`,
        );
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;

      return (data ?? []).map(mapDbToMediaItem);
    },
    enabled: !!workspaceId && !!isSupabaseConfigured,
  });
}

export function useUploadMedia() {
  const { workspaceId, user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!workspaceId || !user) throw new Error('Não autenticado');

      // 1. Upload to Supabase Storage
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${workspaceId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from('media')
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      // 2. Get public URL
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(path);

      // 3. Insert record
      const { data: record, error: dbErr } = await supabase
        .from('media_library')
        .insert({
          workspace_id: workspaceId,
          user_id: user.id,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          tagging_status: 'pending',
        })
        .select()
        .single();
      if (dbErr) throw dbErr;

      // 4. Trigger tagging (fire and forget)
      supabase.functions.invoke('tag-media', {
        body: {
          workspace_id: workspaceId,
          media_id: record.id,
          image_url: urlData.publicUrl,
        },
      });

      return mapDbToMediaItem(record);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media-library', workspaceId] });
    },
  });
}

export function useDeleteMedia() {
  const { workspaceId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('media_library')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media-library', workspaceId] });
    },
  });
}

export function useMediaTaggingPoll(mediaId: string | null) {
  return useQuery({
    queryKey: ['media-tagging', mediaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_library')
        .select('tagging_status, ai_tags, ai_description, ai_mood')
        .eq('id', mediaId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!mediaId && !!isSupabaseConfigured,
    refetchInterval: (query) => {
      const status = query.state.data?.tagging_status;
      return status === 'pending' || status === 'processing' ? 2000 : false;
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbToMediaItem(row: any): MediaItem {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    file_name: row.file_name ?? '',
    storage_path: '',
    public_url: row.file_url ?? row.public_url ?? '',
    file_size: row.file_size ?? 0,
    mime_type: row.mime_type ?? '',
    category: row.category,
    manual_tags: row.manual_tags ?? [],
    ai_tags: row.ai_tags ?? [],
    ai_description: row.ai_description,
    ai_mood: row.ai_mood,
    ai_subjects: row.ai_subjects ?? [],
    ai_colors: row.ai_colors ?? [],
    ai_style: row.ai_style,
    ai_fit_score_map: row.ai_fit_score_map ?? {},
    tagging_status: row.tagging_status ?? 'pending',
    created_at: row.created_at,
  };
}
