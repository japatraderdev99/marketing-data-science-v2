import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ContentItem, initialContents } from '@/data/seedData';
import { useAuth } from '@/contexts/AuthContext';

export function useCalendarContents() {
  const { user } = useAuth();
  const [contents, setContentsState] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContents = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('calendar_contents')
        .select('id, data')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const parsed = data.map((row: any) => ({
          ...(row.data as ContentItem),
          id: row.id,
        }));
        setContentsState(parsed);
      } else {
        setContentsState([]);
      }
    } catch (err) {
      console.error('Error fetching contents:', err);
      setContentsState([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  const setContents = useCallback(async (valueOrFn: ContentItem[] | ((prev: ContentItem[]) => ContentItem[])) => {
    const newContents = typeof valueOrFn === 'function' ? valueOrFn(contents) : valueOrFn;
    setContentsState(newContents);

    if (!user) return;

    const currentIds = new Set(contents.map(c => c.id));
    const newIds = new Set(newContents.map(c => c.id));

    const removedIds = [...currentIds].filter(id => !newIds.has(id));
    for (const id of removedIds) {
      await supabase.from('calendar_contents').delete().eq('id', id);
    }

    for (const item of newContents) {
      const { id, ...rest } = item;
      await supabase.from('calendar_contents').upsert({
        id,
        user_id: user.id,
        data: rest as any,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    }
  }, [user, contents]);

  const addContent = useCallback(async (item: ContentItem) => {
    if (!user) return;
    const { id, ...rest } = item;
    const { error } = await supabase.from('calendar_contents').upsert({
      id,
      user_id: user.id,
      data: rest as any,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (!error) {
      setContentsState(prev => [...prev.filter(c => c.id !== id), item]);
    }
  }, [user]);

  return { contents, setContents, addContent, loading, refetch: fetchContents };
}
