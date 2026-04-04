import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  Target, Megaphone, Lightbulb, BarChart3,
  ChevronDown, ChevronUp, Check, Loader2
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  objective: string;
  status: string;
  cta?: string;
  hook?: string;
  angle?: string;
  targetAudience?: string;
}

interface CreativeSuggestion {
  id: string;
  title: string;
  copy_text: string | null;
  visual_direction: string | null;
  suggestion_type: string;
  status: string;
}

interface StrategyContext {
  strategy: string | null;
  campaign: Campaign | null;
  idea: CreativeSuggestion | null;
  combined: string;
}

interface Props {
  onContextChange: (ctx: StrategyContext) => void;
  userId: string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function StrategyContextPanel({ onContextChange, userId }: Props) {
  // Strategy toggle
  const [strategyEnabled, setStrategyEnabled] = useState(false);
  const [strategyText, setStrategyText] = useState<string | null>(null);
  const [loadingStrategy, setLoadingStrategy] = useState(false);

  // Campaigns
  const [campaignsOpen, setCampaignsOpen] = useState(false);
  const { campaigns } = useCampaigns();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Ideas from DB
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [ideas, setIdeas] = useState<CreativeSuggestion[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<CreativeSuggestion | null>(null);
  const [loadingIdeas, setLoadingIdeas] = useState(false);

  // Load playbook from localStorage
  const [positioning] = useLocalStorage('dqef-strategy-positioning', '');
  const [targetAudience] = useLocalStorage('dqef-strategy-targetAudience', '');
  const [toneOfVoice] = useLocalStorage('dqef-strategy-toneOfVoice', '');
  const [differentials] = useLocalStorage('dqef-strategy-differentials', '');
  const [brandEssence] = useLocalStorage('dqef-strategy-brandEssence', '');

  // Load strategy context
  useEffect(() => {
    if (!strategyEnabled) {
      setStrategyText(null);
      return;
    }
    setLoadingStrategy(true);
    const parts: string[] = [];
    if (positioning) parts.push(`Posicionamento: ${positioning}`);
    if (targetAudience) parts.push(`Público-alvo: ${targetAudience}`);
    if (toneOfVoice) parts.push(`Tom de Voz: ${toneOfVoice}`);
    if (differentials) parts.push(`Diferenciais: ${differentials}`);
    if (brandEssence) parts.push(`Essência: ${brandEssence}`);

    // Also try to load meta-fields from DB
    if (userId) {
      supabase
        .from('strategy_knowledge')
        .select('extracted_knowledge')
        .eq('user_id', userId)
        .eq('status', 'done')
        .then(({ data }) => {
          if (data?.length) {
            data.forEach(doc => {
              const k = doc.extracted_knowledge as Record<string, unknown> | null;
              if (k) {
                const summary = (k as Record<string, string>).summary || (k as Record<string, string>).key_insights;
                if (summary) parts.push(`Knowledge Base: ${String(summary).slice(0, 500)}`);
              }
            });
          }
          setStrategyText(parts.length > 0 ? parts.join('\n\n') : null);
          setLoadingStrategy(false);
        });
    } else {
      setStrategyText(parts.length > 0 ? parts.join('\n\n') : null);
      setLoadingStrategy(false);
    }
  }, [strategyEnabled, positioning, targetAudience, toneOfVoice, differentials, brandEssence, userId]);

  // Load approved ideas
  useEffect(() => {
    if (!ideasOpen || !userId || ideas.length > 0) return;
    setLoadingIdeas(true);
    supabase
      .from('creative_suggestions')
      .select('id, title, copy_text, visual_direction, suggestion_type, status')
      .eq('user_id', userId)
      .in('status', ['approved', 'sent_to_production'])
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setIdeas(data || []);
        setLoadingIdeas(false);
      });
  }, [ideasOpen, userId]);

  // Emit context changes
  useEffect(() => {
    const parts: string[] = [];

    if (strategyEnabled && strategyText) {
      parts.push(`=== CONTEXTO ESTRATÉGICO ===\n${strategyText}`);
    }

    if (selectedCampaign) {
      const c = selectedCampaign;
      parts.push(`=== CAMPANHA SELECIONADA ===\nNome: ${c.name}\nObjetivo: ${c.objective}\n${c.cta ? `CTA: ${c.cta}` : ''}${c.hook ? `\nHook: ${c.hook}` : ''}${c.angle ? `\nÂngulo: ${c.angle}` : ''}${c.targetAudience ? `\nPúblico: ${c.targetAudience}` : ''}`);
    }

    if (selectedIdea) {
      parts.push(`=== IDEIA SELECIONADA ===\nTítulo: ${selectedIdea.title}\n${selectedIdea.copy_text ? `Copy: ${selectedIdea.copy_text}` : ''}\n${selectedIdea.visual_direction ? `Direção visual: ${selectedIdea.visual_direction}` : ''}`);
    }

    onContextChange({
      strategy: strategyEnabled ? strategyText : null,
      campaign: selectedCampaign,
      idea: selectedIdea,
      combined: parts.join('\n\n'),
    });
  }, [strategyText, strategyEnabled, selectedCampaign, selectedIdea]);

  const activeSources = [strategyEnabled, !!selectedCampaign, !!selectedIdea].filter(Boolean).length;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-black text-foreground uppercase tracking-wider">🧠 Contexto Estratégico</p>
          {activeSources > 0 && (
            <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
              {activeSources} fonte{activeSources > 1 ? 's' : ''} ativa{activeSources > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">Enriqueça o briefing com dados do sistema</p>
      </div>

      <div className="border-t border-border divide-y divide-border">
        {/* Strategy Toggle */}
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', strategyEnabled ? 'bg-primary/20' : 'bg-muted')}>
                <Target className={cn('h-3.5 w-3.5', strategyEnabled ? 'text-primary' : 'text-muted-foreground')} />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Estratégia & Playbook</p>
                <p className="text-[10px] text-muted-foreground">Posicionamento, público, tom de voz</p>
              </div>
            </div>
            <Switch checked={strategyEnabled} onCheckedChange={setStrategyEnabled} />
          </div>
          {strategyEnabled && loadingStrategy && (
            <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Carregando estratégia...
            </div>
          )}
          {strategyEnabled && strategyText && !loadingStrategy && (
            <div className="mt-2 rounded-lg bg-primary/5 border border-primary/10 p-2 max-h-24 overflow-y-auto">
              <p className="text-[10px] text-foreground whitespace-pre-line leading-relaxed">{strategyText.slice(0, 300)}...</p>
            </div>
          )}
          {strategyEnabled && !strategyText && !loadingStrategy && (
            <p className="mt-2 text-[10px] text-muted-foreground italic">Nenhum playbook salvo. Preencha na aba Estratégia.</p>
          )}
        </div>

        {/* Campaigns Selector */}
        <div className="p-3">
          <button onClick={() => setCampaignsOpen(o => !o)} className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', selectedCampaign ? 'bg-primary/20' : 'bg-muted')}>
                <Megaphone className={cn('h-3.5 w-3.5', selectedCampaign ? 'text-primary' : 'text-muted-foreground')} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-foreground">Campanhas</p>
                <p className="text-[10px] text-muted-foreground">
                  {selectedCampaign ? selectedCampaign.name : 'Selecionar campanha ativa'}
                </p>
              </div>
            </div>
            {campaignsOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
          {campaignsOpen && (
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {campaigns.length === 0 && (
                <p className="text-[10px] text-muted-foreground italic px-2 py-1">Nenhuma campanha salva.</p>
              )}
              {selectedCampaign && (
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="w-full rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 py-1.5 text-left text-[11px] text-destructive hover:bg-destructive/10 transition-all"
                >
                  ✕ Remover seleção
                </button>
              )}
              {campaigns.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCampaign(c); setCampaignsOpen(false); }}
                  className={cn(
                    'w-full rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition-all',
                    selectedCampaign?.id === c.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-foreground hover:border-primary/30'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{c.name}</span>
                    {selectedCampaign?.id === c.id && <Check className="h-3 w-3 text-primary" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{c.objective}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ideas Selector */}
        <div className="p-3">
          <button onClick={() => setIdeasOpen(o => !o)} className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', selectedIdea ? 'bg-primary/20' : 'bg-muted')}>
                <Lightbulb className={cn('h-3.5 w-3.5', selectedIdea ? 'text-primary' : 'text-muted-foreground')} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-foreground">Biblioteca de Ideias</p>
                <p className="text-[10px] text-muted-foreground">
                  {selectedIdea ? selectedIdea.title : 'Selecionar ideia aprovada'}
                </p>
              </div>
            </div>
            {ideasOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
          {ideasOpen && (
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {loadingIdeas && (
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground px-2 py-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Carregando ideias...
                </div>
              )}
              {!loadingIdeas && ideas.length === 0 && (
                <p className="text-[10px] text-muted-foreground italic px-2 py-1">Nenhuma ideia aprovada encontrada.</p>
              )}
              {selectedIdea && (
                <button
                  onClick={() => setSelectedIdea(null)}
                  className="w-full rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 py-1.5 text-left text-[11px] text-destructive hover:bg-destructive/10 transition-all"
                >
                  ✕ Remover seleção
                </button>
              )}
              {ideas.map(idea => (
                <button
                  key={idea.id}
                  onClick={() => { setSelectedIdea(idea); setIdeasOpen(false); }}
                  className={cn(
                    'w-full rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition-all',
                    selectedIdea?.id === idea.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-foreground hover:border-primary/30'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{idea.title}</span>
                    {selectedIdea?.id === idea.id && <Check className="h-3 w-3 text-primary" />}
                  </div>
                  {idea.copy_text && <p className="text-[10px] text-muted-foreground line-clamp-1">{idea.copy_text}</p>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Performance — Coming Soon */}
        <div className="p-3 opacity-50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-foreground">Performance</p>
                <Badge variant="outline" className="text-[9px] border-muted-foreground/30 text-muted-foreground">Em breve</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">Top criativos por canal, formato e copy</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
