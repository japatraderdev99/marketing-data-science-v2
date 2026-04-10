import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface AddToLibraryParams {
  imageUrl: string;                          // base64 data URI or https URL
  context?: {
    headline?: string;
    slideType?: string;
    topic?: string;
  };
}

// ── Convert image source to Blob ──────────────────────────────────────────────

async function toBlob(src: string): Promise<{ blob: Blob; ext: string }> {
  if (src.startsWith('data:')) {
    const [header, b64] = src.split(',');
    const mime = header.split(':')[1].split(';')[0];
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return { blob: new Blob([arr], { type: mime }), ext: mime.split('/')[1] || 'png' };
  }
  const res = await fetch(src);
  const blob = await res.blob();
  const ext = blob.type.split('/')[1] || 'jpg';
  return { blob, ext };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAddToLibrary() {
  const { workspaceId, user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ imageUrl, context }: AddToLibraryParams) => {
      if (!workspaceId || !user) throw new Error('Não autenticado');

      const { blob, ext } = await toBlob(imageUrl);
      const fileName = `slide-${Date.now()}.${ext}`;
      const path = `${workspaceId}/${fileName}`;

      // 1. Upload to Supabase Storage (media bucket)
      const { error: upErr } = await supabase.storage
        .from('media')
        .upload(path, blob, { contentType: blob.type });
      if (upErr) throw upErr;

      // 2. Get public URL
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      // 3. Insert media_library record
      const { data: record, error: dbErr } = await supabase
        .from('media_library')
        .insert({
          workspace_id: workspaceId,
          user_id: user.id,
          file_url: publicUrl,
          file_name: fileName,
          file_size: blob.size,
          mime_type: blob.type,
          tagging_status: 'pending',
        })
        .select()
        .single();
      if (dbErr) throw dbErr;

      // 4. Trigger tag-media (fire-and-forget) with slide context for richer tags
      const contextStr = context
        ? [
            context.headline && `Headline: "${context.headline}"`,
            context.slideType && `Tipo de slide: ${context.slideType}`,
            context.topic && `Tema: ${context.topic}`,
          ].filter(Boolean).join('. ')
        : undefined;

      supabase.functions.invoke('tag-media', {
        body: { workspace_id: workspaceId, media_id: record.id, image_url: publicUrl, context: contextStr },
      });

      return record;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media-library', workspaceId] });
    },
  });
}
