import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Campaign, initialCampaigns } from '@/data/seedData';
import { useAuth } from '@/contexts/AuthContext';

export function useCampaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaignsState] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, data')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const parsed = data.map((row: any) => ({
          ...(row.data as Campaign),
          id: row.id,
        }));
        setCampaignsState(parsed);
      } else {
        setCampaignsState([]);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setCampaignsState([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const setCampaigns = useCallback(async (valueOrFn: Campaign[] | ((prev: Campaign[]) => Campaign[])) => {
    const newCampaigns = typeof valueOrFn === 'function' ? valueOrFn(campaigns) : valueOrFn;
    setCampaignsState(newCampaigns);

    if (!user) return;

    // Determine which campaigns were added/updated/removed
    const currentIds = new Set(campaigns.map(c => c.id));
    const newIds = new Set(newCampaigns.map(c => c.id));

    // Delete removed campaigns
    const removedIds = [...currentIds].filter(id => !newIds.has(id));
    for (const id of removedIds) {
      await supabase.from('campaigns').delete().eq('id', id);
    }

    // Upsert all current campaigns
    for (const campaign of newCampaigns) {
      const { id, ...rest } = campaign;
      await supabase.from('campaigns').upsert({
        id,
        user_id: user.id,
        data: rest as any,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    }
  }, [user, campaigns]);

  const addCampaign = useCallback(async (campaign: Campaign) => {
    if (!user) return;
    const { id, ...rest } = campaign;
    const { error } = await supabase.from('campaigns').upsert({
      id,
      user_id: user.id,
      data: rest as any,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (!error) {
      setCampaignsState(prev => [...prev.filter(c => c.id !== id), campaign]);
    }
  }, [user]);

  const updateCampaign = useCallback(async (id: string, updates: Partial<Campaign>) => {
    setCampaignsState(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...updates } : c);
      // Persist async
      const campaign = updated.find(c => c.id === id);
      if (campaign && user) {
        const { id: cId, ...rest } = campaign;
        supabase.from('campaigns').upsert({
          id: cId,
          user_id: user.id,
          data: rest as any,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      }
      return updated;
    });
  }, [user]);

  const deleteCampaign = useCallback(async (id: string) => {
    setCampaignsState(prev => prev.filter(c => c.id !== id));
    await supabase.from('campaigns').delete().eq('id', id);
  }, []);

  return { campaigns, setCampaigns, addCampaign, updateCampaign, deleteCampaign, loading, refetch: fetchCampaigns };
}
