import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePlaybook, useSavePlaybook } from '@/hooks/useWorkspace';

export interface KbDoc {
  id: string;
  document_name: string;
  document_url: string | null;
  file_size: number | null;
  status: 'pending' | 'processing' | 'done' | 'error';
  extracted_knowledge: Record<string, unknown> | null;
  created_at: string;
  doc_type: 'knowledge' | 'reference';
  document_type: string | null;
}

export interface Benchmark {
  id: string;
  competitor_name: string;
  platform: string | null;
  format_type: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  status: 'pending' | 'processing' | 'done' | 'error';
  ai_insights: Record<string, unknown> | null;
  created_at: string;
}

export interface MetaFields {
  brandEssence: string;
  uniqueValueProp: string;
  targetPersona: { profile: string; demographics: string; digitalBehavior: string; biggestPain: string; dream: string };
  toneRules: { use: string[]; avoid: string[] };
  keyMessages: string[];
  painPoints: string[];
  competitiveEdge: string[];
  forbiddenTopics: string[];
  currentCampaignFocus: string;
  contentAngles: string[];
  ctaStyle: string;
  kpiPriorities: string[];
  promptContext: string;
  completenessScore: number;
  missingCritical: string[];
}

const CRITICAL_SECTIONS = ['positioning', 'differentials', 'targetAudience', 'currentObjective'];
const ALL_SECTIONS = ['positioning', 'differentials', 'targetAudience', 'pains', 'toneOfVoice', 'competitors', 'forbiddenTopics', 'currentObjective', 'kpis'];

export function useStrategyData() {
  const { user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();
  const { data: playbook } = usePlaybook('copy');
  const savePlaybook = useSavePlaybook();

  const [uploading, setUploading] = useState(false);
  const [fillingPlaybook, setFillingPlaybook] = useState(false);
  const [extractingMeta, setExtractingMeta] = useState(false);
  const [fillingMeta, setFillingMeta] = useState(false);

  // ── KB Docs ────────────────────────────────────────────
  const kbQuery = useQuery({
    queryKey: ['kb-docs', userId],
    queryFn: async () => {
      if (!userId || !isSupabaseConfigured) return [] as KbDoc[];
      const { data, error } = await supabase
        .from('strategy_knowledge')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as KbDoc[];
    },
    enabled: !!userId && !!isSupabaseConfigured,
    refetchInterval: (query) => {
      const hasPending = query.state.data?.some(d => d.status === 'pending' || d.status === 'processing');
      return hasPending ? 5000 : false;
    },
  });

  // ── Benchmarks ────────────────────────────────────────
  const benchmarkQuery = useQuery({
    queryKey: ['benchmarks', userId],
    queryFn: async () => {
      if (!userId || !isSupabaseConfigured) return [] as Benchmark[];
      const { data, error } = await supabase
        .from('competitor_benchmarks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Benchmark[];
    },
    enabled: !!userId && !!isSupabaseConfigured,
    refetchInterval: (query) => {
      const hasPending = query.state.data?.some(d => d.status === 'pending' || d.status === 'processing');
      return hasPending ? 5000 : false;
    },
  });

  // ── Metafields (from generative_playbooks._metafields) ──
  const kj = (playbook?.knowledge_json ?? {}) as Record<string, unknown>;
  const metafields = (kj._metafields as MetaFields) || null;

  // ── Scorecard ─────────────────────────────────────────
  const criticalFilled = CRITICAL_SECTIONS.filter(k => typeof kj[k] === 'string' && (kj[k] as string).length > 0).length;
  const allFilled = ALL_SECTIONS.filter(k => typeof kj[k] === 'string' && (kj[k] as string).length > 0).length;
  const kbDoneCount = (kbQuery.data ?? []).filter(d => d.status === 'done').length;

  // ── Handlers ──────────────────────────────────────────
  const uploadKbDoc = async (file: File, docType: 'knowledge' | 'reference' = 'knowledge') => {
    if (!userId) return;
    setUploading(true);
    try {
      const path = `${userId}/${docType}/${crypto.randomUUID()}.${file.name.split('.').pop()}`;
      const { error: upErr } = await supabase.storage.from('knowledge').upload(path, file);
      if (upErr) throw upErr;

      const { data: doc, error: insErr } = await supabase
        .from('strategy_knowledge')
        .insert({ user_id: userId, document_name: file.name, document_url: path, file_size: file.size, status: 'pending', doc_type: docType, document_type: docType })
        .select()
        .single();
      if (insErr) throw insErr;

      qc.invalidateQueries({ queryKey: ['kb-docs', userId] });

      // Fire-and-forget analysis
      supabase.functions.invoke('analyze-brand-document', {
        body: { knowledgeId: doc.id, storagePath: path, documentName: file.name },
      }).then(() => qc.invalidateQueries({ queryKey: ['kb-docs', userId] }));
    } finally {
      setUploading(false);
    }
  };

  const deleteKbDoc = async (id: string, storagePath: string | null) => {
    if (storagePath) await supabase.storage.from('knowledge').remove([storagePath]);
    await supabase.from('strategy_knowledge').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['kb-docs', userId] });
  };

  const uploadBenchmark = async (file: File, competitorName: string, platform = '', formatType = '') => {
    if (!userId) return;
    setUploading(true);
    try {
      const path = `${userId}/benchmarks/${crypto.randomUUID()}.${file.name.split('.').pop()}`;
      const { error: upErr } = await supabase.storage.from('benchmarks').upload(path, file);
      if (upErr) throw upErr;

      const { data: bm, error: insErr } = await supabase
        .from('competitor_benchmarks')
        .insert({ user_id: userId, competitor_name: competitorName, platform: platform || null, format_type: formatType || null, file_url: path, file_name: file.name, file_size: file.size, status: 'pending' })
        .select()
        .single();
      if (insErr) throw insErr;

      qc.invalidateQueries({ queryKey: ['benchmarks', userId] });

      supabase.functions.invoke('analyze-benchmark', {
        body: { benchmarkId: bm.id, storagePath: path, competitorName, platform, formatType },
      }).then(() => qc.invalidateQueries({ queryKey: ['benchmarks', userId] }));
    } finally {
      setUploading(false);
    }
  };

  const deleteBenchmark = async (id: string, storagePath: string | null) => {
    if (storagePath) await supabase.storage.from('benchmarks').remove([storagePath]);
    await supabase.from('competitor_benchmarks').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['benchmarks', userId] });
  };

  const fillPlaybookFromKb = async () => {
    setFillingPlaybook(true);
    try {
      const { data, error } = await supabase.functions.invoke('fill-playbook-from-knowledge', {
        body: { currentData: kj },
      });
      if (error) throw error;
      if (data?.playbook) {
        const { filledFields: _f, skippedFields: _s, ...fields } = data.playbook;
        savePlaybook.mutate({ type: 'copy', knowledgeJson: { ...kj, ...fields } });
      }
    } finally {
      setFillingPlaybook(false);
    }
  };

  const extractMetafields = async () => {
    setExtractingMeta(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-strategy-metafields', {
        body: { strategyData: kj },
      });
      if (error) throw error;
      if (data?.metafields) {
        savePlaybook.mutate({ type: 'copy', knowledgeJson: { ...kj, _metafields: data.metafields } });
      }
    } finally {
      setExtractingMeta(false);
    }
  };

  const fillMetafieldsFromKb = async () => {
    setFillingMeta(true);
    try {
      const { data, error } = await supabase.functions.invoke('fill-metafields-from-knowledge', {
        body: { currentMetafields: metafields ?? {}, strategyData: kj },
      });
      if (error) throw error;
      if (data?.metafields) {
        const { filledFromKB: _f, confidenceNotes: _c, ...meta } = data.metafields;
        savePlaybook.mutate({ type: 'copy', knowledgeJson: { ...kj, _metafields: meta } });
      }
    } finally {
      setFillingMeta(false);
    }
  };

  return {
    kbDocs: kbQuery.data ?? [],
    kbLoading: kbQuery.isLoading,
    uploading,
    uploadKbDoc,
    deleteKbDoc,
    fillPlaybookFromKb,
    fillingPlaybook,
    benchmarks: benchmarkQuery.data ?? [],
    benchmarksLoading: benchmarkQuery.isLoading,
    uploadBenchmark,
    deleteBenchmark,
    metafields,
    extractingMeta,
    fillingMeta,
    extractMetafields,
    fillMetafieldsFromKb,
    scorecard: {
      criticalFilled,
      totalCritical: CRITICAL_SECTIONS.length,
      completeness: Math.round((allFilled / ALL_SECTIONS.length) * 100),
      kbDoneCount,
      benchmarkCount: (benchmarkQuery.data ?? []).length,
      metafieldsScore: metafields?.completenessScore ?? 0,
    },
  };
}
