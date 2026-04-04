import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Eye, Plus, Upload, Trash2, RefreshCw,
  Image as ImageIcon, BarChart3, Palette, FileText,
  Sparkles, Copy, ArrowRight, Link2, Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORMS = ['Instagram', 'TikTok', 'LinkedIn', 'Facebook', 'YouTube'];
const FORMATS = ['Feed', 'Stories', 'Reels', 'Carrossel'];

const CREATIVE_CATEGORIES = ['Aquisição', 'Engajamento', 'Conversão', 'Branding', 'Educacional', 'Social Proof'];
const CREATIVE_NICHES = ['Prestador de Serviço', 'Food', 'SaaS', 'E-commerce', 'Institucional'];
const VISUAL_STYLES = ['Documental', 'Clean/Minimal', 'Bold/Impactful', 'Lifestyle', 'Motion/Video', 'Tipográfico'];
const COPY_STYLES = ['Direto/CTA', 'Storytelling', 'Educativo', 'Provocativo', 'Social Proof', 'Pergunta'];

const platformColors: Record<string, string> = {
  Instagram: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  TikTok: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  LinkedIn: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Facebook: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  YouTube: 'bg-red-500/20 text-red-400 border-red-500/30',
  'Meta Ads': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  paused: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  archived: 'bg-muted text-muted-foreground border-border',
  draft: 'bg-muted text-muted-foreground border-border',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Creative {
  id: string; title: string; file_url: string | null; thumbnail_url: string | null;
  platform: string | null; format_type: string | null; dimensions: string | null;
  campaign_id: string | null; status: string; published_at: string | null;
  impressions: number; clicks: number; engagement_rate: number; conversions: number;
  spend: number; tags: string[]; notes: string | null; grid_position: number | null;
  created_at: string;
}

interface MetaAd {
  id: string; ad_id: string; ad_name: string | null; campaign_name: string | null;
  impressions: number | null; clicks: number | null; spend: number | null;
  ctr: number | null; cpc: number | null; conversions: number | null;
  roas: number | null; creative_url: string | null; thumbnail_url: string | null;
  status: string | null; date_start: string | null; date_stop: string | null;
  ad_account_id: string; ad_body: string | null; ad_title: string | null;
  creative_category: string | null; creative_niche: string | null;
  visual_style: string | null; copy_style: string | null; draft_id: string | null;
}

interface Draft {
  id: string; sigla: string; name: string; status: string;
  channel: string | null; angle: string | null; persona: string | null;
  tone: string | null; campaign_name: string | null; format_id: string | null;
  slide_images: Record<string, string> | null;
  carousel_data: { title?: string; caption?: string; slides?: { headline?: string; subtext?: string; imagePrompt?: string }[] } | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CriativosAtivos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [metaAds, setMetaAds] = useState<MetaAd[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('meta');
  const [syncing, setSyncing] = useState(false);
  const [selectedAdAccount, setSelectedAdAccount] = useState<string>('');

  const [selectedMeta, setSelectedMeta] = useState<MetaAd | null>(null);
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDnaDialog, setShowDnaDialog] = useState(false);
  const [dnaAd, setDnaAd] = useState<MetaAd | null>(null);
  const [uploading, setUploading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const [newTitle, setNewTitle] = useState('');
  const [newPlatform, setNewPlatform] = useState('Instagram');
  const [newFormat, setNewFormat] = useState('Feed');
  const [newFile, setNewFile] = useState<File | null>(null);

  // DNA edit state
  const [editCategory, setEditCategory] = useState('');
  const [editNiche, setEditNiche] = useState('');
  const [editVisual, setEditVisual] = useState('');
  const [editCopy, setEditCopy] = useState('');
  const [editDraftId, setEditDraftId] = useState('');

  useEffect(() => {
    if (user) {
      fetchCreatives();
      fetchMetaAds();
      fetchDrafts();
      loadAdAccounts();
    }
  }, [user]);

  async function loadAdAccounts() {
    try {
      const { data } = await supabase.functions.invoke('sync-meta-insights', { body: { list_accounts: true } });
      if (data?.ad_accounts) {
        const accounts = data.ad_accounts as { id: string; name: string; status: number }[];
        if (accounts.length > 0) {
          const dqefAccount = accounts.find(a => a.name?.toLowerCase().includes('gabriel merhy'));
          setSelectedAdAccount(dqefAccount?.id || accounts[0].id);
        }
      }
    } catch {}
  }

  async function fetchCreatives() {
    const { data } = await supabase.from('active_creatives').select('*').order('created_at', { ascending: false });
    if (data) setCreatives(data as Creative[]);
    setLoading(false);
  }

  async function fetchMetaAds() {
    const { data } = await supabase.from('meta_ads_performance').select('*').order('impressions', { ascending: false });
    if (data) {
      const map = new Map<string, MetaAd>();
      (data as any[]).forEach(ad => {
        const existing = map.get(ad.ad_id);
        if (!existing || (ad.impressions || 0) > (existing.impressions || 0)) {
          map.set(ad.ad_id, ad as MetaAd);
        }
      });
      setMetaAds(Array.from(map.values()));
    }
  }

  async function fetchDrafts() {
    const { data } = await supabase.from('creative_drafts')
      .select('id, sigla, name, status, channel, angle, persona, tone, campaign_name, format_id, slide_images, carousel_data')
      .order('created_at', { ascending: false });
    if (data) setDrafts(data as any[]);
  }

  // Filter Meta Ads by account
  const filteredMetaAds = useMemo(() => {
    let ads = selectedAdAccount ? metaAds.filter(a => a.ad_account_id === selectedAdAccount) : metaAds;
    if (filterCategory !== 'all') {
      ads = ads.filter(a => a.creative_category === filterCategory);
    }
    return ads;
  }, [metaAds, selectedAdAccount, filterCategory]);

  // Get first slide image from a draft
  function getDraftPreviewUrl(draft: Draft): string | null {
    if (draft.slide_images) {
      const keys = Object.keys(draft.slide_images).sort();
      if (keys.length > 0) {
        const val = draft.slide_images[keys[0]];
        if (val && !val.startsWith('data:')) return val;
      }
    }
    return null;
  }

  // Find matching draft for an ad (by name similarity)
  function findMatchingDraft(ad: MetaAd): Draft | null {
    if (ad.draft_id) {
      const linked = drafts.find(d => d.id === ad.draft_id);
      if (linked) return linked;
    }
    // Try matching by ad name → draft name
    const adName = (ad.ad_name || '').toLowerCase();
    return drafts.find(d => {
      const draftName = d.name.toLowerCase();
      return adName.includes(draftName) || draftName.includes(adName);
    }) || null;
  }

  // Save creative DNA
  async function saveDna() {
    if (!dnaAd) return;
    const { error } = await supabase.from('meta_ads_performance')
      .update({
        creative_category: editCategory || null,
        creative_niche: editNiche || null,
        visual_style: editVisual || null,
        copy_style: editCopy || null,
        draft_id: editDraftId || null,
      })
      .eq('ad_id', dnaAd.ad_id);
    if (!error) {
      toast({ title: '✅ DNA Criativo salvo!' });
      setShowDnaDialog(false);
      fetchMetaAds();
    } else {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  }

  // Use as reference → navigate to Criativo with full context
  function useAsReference(ad: MetaAd) {
    const matchedDraft = findMatchingDraft(ad);
    const ref: Record<string, any> = {
      source: 'meta_ads',
      ad_id: ad.ad_id,
      ad_name: ad.ad_name,
      campaign_name: ad.campaign_name,
      impressions: ad.impressions,
      clicks: ad.clicks,
      ctr: ad.ctr,
      spend: ad.spend,
      conversions: ad.conversions,
      ad_body: ad.ad_body,
      ad_title: ad.ad_title,
      creative_category: ad.creative_category,
      creative_niche: ad.creative_niche,
      visual_style: ad.visual_style,
      copy_style: ad.copy_style,
      thumbnail_url: ad.thumbnail_url || ad.creative_url,
    };

    if (matchedDraft) {
      ref.draft_id = matchedDraft.id;
      ref.draft_sigla = matchedDraft.sigla;
      ref.draft_angle = matchedDraft.angle;
      ref.draft_persona = matchedDraft.persona;
      ref.draft_tone = matchedDraft.tone;
      if (matchedDraft.carousel_data) {
        ref.draft_caption = matchedDraft.carousel_data.caption;
        ref.draft_title = matchedDraft.carousel_data.title;
      }
    }

    // Build briefing text
    const lines = [
      '📊 REFERÊNCIA DE CRIATIVO COM DNA:',
      `Anúncio: "${ad.ad_name}"`,
      `Campanha: ${ad.campaign_name || '—'}`,
      `Invest: R$${(ad.spend || 0).toFixed(2)} | Imp: ${(ad.impressions || 0).toLocaleString('pt-BR')} | CTR: ${ad.ctr ? (ad.ctr * 100).toFixed(2) : '0'}%`,
      ad.creative_category ? `📁 Categoria: ${ad.creative_category}` : null,
      ad.creative_niche ? `🎯 Nicho: ${ad.creative_niche}` : null,
      ad.visual_style ? `🎨 Estilo Visual: ${ad.visual_style}` : null,
      ad.copy_style ? `✍️ Estilo de Copy: ${ad.copy_style}` : null,
      ad.ad_body ? `\n📝 Copy Original:\n${ad.ad_body}` : null,
      matchedDraft ? `\n🔗 Draft Vinculado: ${matchedDraft.sigla} — ${matchedDraft.name}` : null,
      matchedDraft?.angle ? `Ângulo: ${matchedDraft.angle}` : null,
      matchedDraft?.persona ? `Persona: ${matchedDraft.persona}` : null,
      '\n➡️ Criar criativo que SUPERE esta performance mantendo o DNA.',
    ].filter(Boolean).join('\n');

    localStorage.setItem('ig_ref_to_criativo', JSON.stringify({
      caption: lines,
      engRate: ad.ctr ? (ad.ctr * 100).toFixed(2) : '0',
      likes: ad.clicks || 0,
      saves: ad.conversions || 0,
      shares: 0,
      creative_dna: ref,
    }));

    navigate('/criativo');
    toast({ title: '📋 Referência com DNA carregada', description: `"${ad.ad_name}" → AI Criativo` });
  }

  // Re-sync Meta Ads data (to populate thumbnails/creative URLs)
  async function handleResyncMeta() {
    if (!user || !selectedAdAccount) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-meta-insights', {
        body: { sync_type: 'ads', ad_account_id: selectedAdAccount, limit: 50 },
      });
      if (error) throw error;
      toast({ title: '✅ Meta Ads re-sincronizados', description: `${data?.synced_ads || 0} anúncios atualizados com previews` });
      await fetchMetaAds();
    } catch (err: any) {
      toast({ title: 'Erro no sync', description: err.message, variant: 'destructive' });
    }
    setSyncing(false);
  }

  // Sync Meta → Active Creatives
  async function handleSyncMetaToCreatives() {
    if (!user) return;
    setSyncing(true);
    let synced = 0;
    const adsToSync = selectedAdAccount ? metaAds.filter(a => a.ad_account_id === selectedAdAccount) : metaAds;
    for (const ad of adsToSync) {
      const exists = creatives.some(c => c.campaign_id === ad.ad_id);
      if (!exists && (ad.impressions || 0) > 100) {
        const { error } = await supabase.from('active_creatives').insert({
          user_id: user.id,
          title: ad.ad_name || `Meta Ad ${ad.ad_id.slice(-6)}`,
          thumbnail_url: ad.thumbnail_url || ad.creative_url,
          file_url: ad.creative_url,
          platform: 'Meta Ads', format_type: 'Feed', campaign_id: ad.ad_id,
          status: ad.status === 'ACTIVE' ? 'active' : 'paused',
          impressions: ad.impressions || 0, clicks: ad.clicks || 0,
          engagement_rate: ad.ctr ? parseFloat((ad.ctr * 100).toFixed(2)) : 0,
          conversions: ad.conversions || 0, spend: ad.spend || 0,
        });
        if (!error) synced++;
      }
    }
    if (synced > 0) { toast({ title: `✅ ${synced} criativos sincronizados` }); fetchCreatives(); }
    else toast({ title: 'Tudo sincronizado', description: 'Nenhum criativo novo.' });
    setSyncing(false);
  }

  async function handleUpload() {
    if (!user || !newTitle || !newFile) return;
    setUploading(true);
    const ext = newFile.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('brand-assets').upload(path, newFile);
    if (uploadErr) { toast({ title: 'Erro', description: uploadErr.message, variant: 'destructive' }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('brand-assets').getPublicUrl(path);
    const { error: insertErr } = await supabase.from('active_creatives').insert({
      user_id: user.id, title: newTitle, file_url: urlData.publicUrl,
      thumbnail_url: urlData.publicUrl, platform: newPlatform, format_type: newFormat, status: 'active',
    });
    if (!insertErr) { toast({ title: 'Criativo adicionado!' }); setShowAddDialog(false); setNewTitle(''); setNewFile(null); fetchCreatives(); }
    setUploading(false);
  }

  async function handleDelete(id: string) {
    await supabase.from('active_creatives').delete().eq('id', id);
    setCreatives(prev => prev.filter(c => c.id !== id));
    setSelectedCreative(null);
    toast({ title: 'Criativo removido' });
  }

  // KPIs
  const metaTotalSpend = filteredMetaAds.reduce((s, a) => s + (a.spend || 0), 0);
  const metaTotalImpressions = filteredMetaAds.reduce((s, a) => s + (a.impressions || 0), 0);
  const metaTotalClicks = filteredMetaAds.reduce((s, a) => s + (a.clicks || 0), 0);
  const metaAvgCtr = metaTotalImpressions > 0 ? ((metaTotalClicks / metaTotalImpressions) * 100).toFixed(2) : '0';
  const metaTotalConversions = filteredMetaAds.reduce((s, a) => s + (a.conversions || 0), 0);
  const taggedCount = filteredMetaAds.filter(a => a.creative_category).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Criativos Ativos</h1>
          <p className="text-sm text-muted-foreground">Performance, DNA criativo e referências para produção</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleResyncMeta} disabled={syncing}>
            {syncing ? <RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1 h-3.5 w-3.5" />}
            Re-sync Previews
          </Button>
          <Button size="sm" variant="outline" onClick={handleSyncMetaToCreatives} disabled={syncing}>
            <BarChart3 className="mr-1 h-3.5 w-3.5" />
            Sync → Galeria
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Novo
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Criativos', value: filteredMetaAds.length, icon: ImageIcon },
          { label: 'Impressões', value: metaTotalImpressions.toLocaleString('pt-BR'), icon: Eye },
          { label: 'CTR Médio', value: `${metaAvgCtr}%`, icon: BarChart3 },
          { label: 'Investimento', value: `R$ ${metaTotalSpend.toFixed(0)}`, icon: Tag },
          { label: 'Conversões', value: metaTotalConversions, icon: Sparkles },
          { label: 'DNA Tagueados', value: `${taggedCount}/${filteredMetaAds.length}`, icon: Palette },
        ].map(k => (
          <Card key={k.label} className="border-border bg-card">
            <CardContent className="flex items-center gap-3 p-3">
              <k.icon className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground">{k.label}</p>
                <p className="text-sm font-bold text-foreground">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="meta" className="text-xs">Meta Ads ({filteredMetaAds.length})</TabsTrigger>
            <TabsTrigger value="all" className="text-xs">Galeria ({creatives.length})</TabsTrigger>
          </TabsList>

          {activeTab === 'meta' && (
            <div className="flex items-center gap-2">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue placeholder="Filtrar categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {CREATIVE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Meta Ads Tab */}
        <TabsContent value="meta">
          {filteredMetaAds.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <BarChart3 className="mx-auto h-10 w-10 opacity-30 mb-2" />
              <p className="text-sm">Nenhum dado de Meta Ads encontrado</p>
              <p className="text-xs mt-1">Sincronize seus dados na aba Analytics</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredMetaAds.map(ad => {
                const matchedDraft = findMatchingDraft(ad);
                const draftPreview = matchedDraft ? getDraftPreviewUrl(matchedDraft) : null;
                const previewUrl = ad.thumbnail_url || ad.creative_url || draftPreview;
                const hasDna = !!(ad.creative_category || ad.visual_style);

                return (
                  <Card key={ad.id} className="group border-border bg-card hover:border-primary/40 transition-all overflow-hidden">
                    {/* Preview */}
                    <div className="relative aspect-[4/5] bg-muted overflow-hidden">
                      {previewUrl ? (
                        <img src={previewUrl} alt={ad.ad_name || ''} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 p-4">
                          <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                          {ad.ad_body && (
                            <p className="text-[10px] text-muted-foreground text-center line-clamp-4">{ad.ad_body}</p>
                          )}
                        </div>
                      )}

                      {/* Status badge */}
                      <Badge className={cn('absolute top-2 left-2 text-[10px]', ad.status === 'ACTIVE' ? statusColors.active : statusColors.paused)}>
                        {ad.status === 'ACTIVE' ? 'Ativo' : 'Pausado'}
                      </Badge>

                      {/* DNA badge */}
                      {hasDna && (
                        <Badge className="absolute top-2 right-2 text-[10px] bg-primary/20 text-primary border-primary/30">
                          <Palette className="h-2.5 w-2.5 mr-0.5" /> DNA
                        </Badge>
                      )}

                      {/* Linked draft badge */}
                      {matchedDraft && (
                        <Badge className="absolute bottom-2 left-2 text-[10px] bg-accent/80 text-accent-foreground">
                          <Link2 className="h-2.5 w-2.5 mr-0.5" /> {matchedDraft.sigla}
                        </Badge>
                      )}

                      {/* Hover actions */}
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 text-xs" onClick={() => setSelectedMeta(ad)}>
                          <Eye className="mr-1 h-3.5 w-3.5" /> Detalhes
                        </Button>
                        <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 text-xs" onClick={() => {
                          setDnaAd(ad);
                          setEditCategory(ad.creative_category || '');
                          setEditNiche(ad.creative_niche || '');
                          setEditVisual(ad.visual_style || '');
                          setEditCopy(ad.copy_style || '');
                          setEditDraftId(ad.draft_id || '');
                          setShowDnaDialog(true);
                        }}>
                          <Palette className="mr-1 h-3.5 w-3.5" /> DNA
                        </Button>
                      </div>
                    </div>

                    <CardContent className="p-3 space-y-2">
                      <p className="text-sm font-semibold text-foreground truncate">{ad.ad_name || `Ad ${ad.ad_id.slice(-8)}`}</p>
                      {ad.campaign_name && <p className="text-[10px] text-muted-foreground truncate">{ad.campaign_name}</p>}

                      {/* DNA Tags */}
                      {hasDna && (
                        <div className="flex flex-wrap gap-1">
                          {ad.creative_category && <Badge variant="outline" className="text-[9px]">{ad.creative_category}</Badge>}
                          {ad.visual_style && <Badge variant="outline" className="text-[9px]">🎨 {ad.visual_style}</Badge>}
                          {ad.copy_style && <Badge variant="outline" className="text-[9px]">✍️ {ad.copy_style}</Badge>}
                        </div>
                      )}

                      {/* Metrics */}
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { label: 'Imp', value: (ad.impressions || 0).toLocaleString('pt-BR') },
                          { label: 'Cliq', value: (ad.clicks || 0).toLocaleString('pt-BR') },
                          { label: 'CTR', value: ad.ctr ? `${(ad.ctr * 100).toFixed(1)}%` : '—' },
                          { label: 'Conv', value: ad.conversions || 0 },
                        ].map(m => (
                          <div key={m.label} className="text-center">
                            <p className="text-[10px] text-muted-foreground">{m.label}</p>
                            <p className="text-xs font-bold text-foreground">{m.value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground">R$ {(ad.spend || 0).toFixed(2)}</span>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-primary hover:text-primary/80" onClick={() => useAsReference(ad)}>
                          <ArrowRight className="mr-0.5 h-3 w-3" /> Usar como Ref
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Gallery Tab */}
        <TabsContent value="all">
          {creatives.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <ImageIcon className="mx-auto h-10 w-10 opacity-30 mb-2" />
              <p className="text-sm">Nenhum criativo na galeria</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {creatives.map(c => (
                <CreativeCard key={c.id} creative={c} onClick={() => setSelectedCreative(c)} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* DNA Dialog */}
      <Dialog open={showDnaDialog} onOpenChange={setShowDnaDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /> DNA Criativo</DialogTitle>
            <DialogDescription>Classifique o estilo visual, copy e categoria deste criativo</DialogDescription>
          </DialogHeader>
          {dnaAd && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm font-semibold text-foreground">{dnaAd.ad_name}</p>
                <p className="text-xs text-muted-foreground">{dnaAd.campaign_name}</p>
                {dnaAd.ad_body && <p className="text-xs text-muted-foreground mt-2 line-clamp-3">📝 {dnaAd.ad_body}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Categoria</label>
                  <Select value={editCategory} onValueChange={setEditCategory}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {CREATIVE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Nicho</label>
                  <Select value={editNiche} onValueChange={setEditNiche}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {CREATIVE_NICHES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Estilo Visual</label>
                  <Select value={editVisual} onValueChange={setEditVisual}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {VISUAL_STYLES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Estilo de Copy</label>
                  <Select value={editCopy} onValueChange={setEditCopy}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {COPY_STYLES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Link to Draft */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1"><Link2 className="h-3 w-3" /> Vincular ao Draft</label>
                <Select value={editDraftId} onValueChange={setEditDraftId}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Nenhum draft vinculado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {drafts.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.sigla} — {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={saveDna}>
                  <Sparkles className="mr-1 h-3.5 w-3.5" /> Salvar DNA
                </Button>
                <Button variant="outline" onClick={() => useAsReference(dnaAd)}>
                  <ArrowRight className="mr-1 h-3.5 w-3.5" /> Usar como Ref
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Meta Ad Detail Dialog */}
      <Dialog open={!!selectedMeta} onOpenChange={() => setSelectedMeta(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedMeta?.ad_name || 'Meta Ad'}</DialogTitle>
            <DialogDescription>{selectedMeta?.campaign_name || 'Sem campanha'}</DialogDescription>
          </DialogHeader>
          {selectedMeta && (
            <div className="space-y-4">
              {(selectedMeta.thumbnail_url || selectedMeta.creative_url) && (
                <img src={selectedMeta.thumbnail_url || selectedMeta.creative_url || ''} alt="" className="w-full rounded-lg" />
              )}

              {selectedMeta.ad_body && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">📝 Copy do Anúncio</p>
                  <p className="text-sm text-foreground whitespace-pre-line">{selectedMeta.ad_body}</p>
                </div>
              )}

              {/* DNA Tags */}
              {(selectedMeta.creative_category || selectedMeta.visual_style) && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedMeta.creative_category && <Badge variant="outline" className="text-xs">{selectedMeta.creative_category}</Badge>}
                  {selectedMeta.creative_niche && <Badge variant="outline" className="text-xs">🎯 {selectedMeta.creative_niche}</Badge>}
                  {selectedMeta.visual_style && <Badge variant="outline" className="text-xs">🎨 {selectedMeta.visual_style}</Badge>}
                  {selectedMeta.copy_style && <Badge variant="outline" className="text-xs">✍️ {selectedMeta.copy_style}</Badge>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Impressões', value: (selectedMeta.impressions || 0).toLocaleString('pt-BR') },
                  { label: 'Cliques', value: (selectedMeta.clicks || 0).toLocaleString('pt-BR') },
                  { label: 'CTR', value: selectedMeta.ctr ? `${(selectedMeta.ctr * 100).toFixed(2)}%` : '—' },
                  { label: 'CPC', value: selectedMeta.cpc ? `R$ ${selectedMeta.cpc.toFixed(2)}` : '—' },
                  { label: 'Conversões', value: selectedMeta.conversions || 0 },
                  { label: 'Investimento', value: `R$ ${(selectedMeta.spend || 0).toFixed(2)}` },
                  { label: 'ROAS', value: selectedMeta.roas ? `${selectedMeta.roas.toFixed(2)}x` : '—' },
                  { label: 'Período', value: selectedMeta.date_start ? `${selectedMeta.date_start} → ${selectedMeta.date_stop}` : '—' },
                ].map(m => (
                  <div key={m.label} className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                    <p className="text-sm font-bold text-foreground">{m.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                  setDnaAd(selectedMeta);
                  setEditCategory(selectedMeta.creative_category || '');
                  setEditNiche(selectedMeta.creative_niche || '');
                  setEditVisual(selectedMeta.visual_style || '');
                  setEditCopy(selectedMeta.copy_style || '');
                  setEditDraftId(selectedMeta.draft_id || '');
                  setShowDnaDialog(true);
                  setSelectedMeta(null);
                }}>
                  <Palette className="mr-1 h-3.5 w-3.5" /> Editar DNA
                </Button>
                <Button size="sm" className="flex-1" onClick={() => { useAsReference(selectedMeta); setSelectedMeta(null); }}>
                  <ArrowRight className="mr-1 h-3.5 w-3.5" /> Usar como Referência
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Creative Detail Dialog */}
      <Dialog open={!!selectedCreative} onOpenChange={() => setSelectedCreative(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedCreative?.title}</DialogTitle>
            <DialogDescription>{selectedCreative?.platform} · {selectedCreative?.format_type}</DialogDescription>
          </DialogHeader>
          {selectedCreative && (
            <div className="space-y-4">
              {(selectedCreative.file_url || selectedCreative.thumbnail_url) && (
                <img src={selectedCreative.file_url || selectedCreative.thumbnail_url || ''} alt="" className="w-full rounded-lg" />
              )}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Impressões', value: (selectedCreative.impressions || 0).toLocaleString('pt-BR') },
                  { label: 'Cliques', value: (selectedCreative.clicks || 0).toLocaleString('pt-BR') },
                  { label: 'CTR', value: `${selectedCreative.engagement_rate}%` },
                  { label: 'Conversões', value: selectedCreative.conversions },
                  { label: 'Investimento', value: `R$ ${(selectedCreative.spend || 0).toFixed(2)}` },
                  { label: 'Status', value: selectedCreative.status },
                ].map(m => (
                  <div key={m.label} className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                    <p className="text-sm font-bold text-foreground">{m.value}</p>
                  </div>
                ))}
              </div>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(selectedCreative.id)}>
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Remover
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo Criativo</DialogTitle>
            <DialogDescription>Adicione um criativo ativo com preview e métricas</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome do criativo" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            <div className="flex gap-2">
              <select value={newPlatform} onChange={e => setNewPlatform(e.target.value)} className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                {PLATFORMS.map(p => <option key={p}>{p}</option>)}
              </select>
              <select value={newFormat} onChange={e => setNewFormat(e.target.value)} className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                {FORMATS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="rounded-lg border border-dashed border-border p-4 text-center">
              <input type="file" accept="image/*,video/*" onChange={e => setNewFile(e.target.files?.[0] || null)} className="hidden" id="creative-upload" />
              <label htmlFor="creative-upload" className="cursor-pointer text-sm text-muted-foreground hover:text-primary">
                <Upload className="mx-auto mb-1 h-6 w-6" />
                {newFile ? newFile.name : 'Clique para selecionar arquivo'}
              </label>
            </div>
            <Button className="w-full" onClick={handleUpload} disabled={!newTitle || !newFile || uploading}>
              {uploading ? 'Enviando...' : 'Adicionar Criativo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Creative Card ────────────────────────────────────────────────────────────

function CreativeCard({ creative: c, onClick, onDelete }: { creative: Creative; onClick: () => void; onDelete: (id: string) => void }) {
  return (
    <Card className="group cursor-pointer border-border bg-card transition-all hover:border-primary/40 hover:shadow-md overflow-hidden" onClick={onClick}>
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {c.thumbnail_url || c.file_url ? (
          <img src={c.thumbnail_url || c.file_url || ''} alt={c.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center"><ImageIcon className="h-10 w-10 text-muted-foreground/30" /></div>
        )}
        {c.platform && <Badge className={cn('absolute left-2 top-2 text-[10px]', platformColors[c.platform] || 'bg-muted')}>{c.platform}</Badge>}
        <Badge className={cn('absolute right-2 top-2 text-[10px] capitalize', statusColors[c.status] || 'bg-muted')}>
          {c.status === 'active' ? 'Ativo' : c.status === 'paused' ? 'Pausado' : c.status}
        </Badge>
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
          <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20"><Eye className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={e => { e.stopPropagation(); onDelete(c.id); }}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      <CardContent className="space-y-2 p-3">
        <p className="truncate text-sm font-semibold text-foreground">{c.title}</p>
        {c.format_type && <p className="text-xs text-muted-foreground">{c.format_type} {c.dimensions && `· ${c.dimensions}`}</p>}
        <div className="grid grid-cols-4 gap-1">
          {[
            { label: 'Imp', value: (c.impressions || 0).toLocaleString('pt-BR') },
            { label: 'Cliq', value: (c.clicks || 0).toLocaleString('pt-BR') },
            { label: 'CTR', value: `${c.engagement_rate || 0}%` },
            { label: 'Conv', value: c.conversions || 0 },
          ].map(m => (
            <div key={m.label} className="text-center">
              <p className="text-[10px] text-muted-foreground">{m.label}</p>
              <p className="text-xs font-bold text-foreground">{typeof m.value === 'number' ? m.value.toLocaleString('pt-BR') : m.value}</p>
            </div>
          ))}
        </div>
        {(c.spend || 0) > 0 && (
          <p className="text-[10px] text-muted-foreground">Invest: <span className="font-bold text-foreground">R$ {c.spend.toFixed(2)}</span></p>
        )}
      </CardContent>
    </Card>
  );
}
