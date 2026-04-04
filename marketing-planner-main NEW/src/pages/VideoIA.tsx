import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { initialEstrategias } from '@/data/seedData';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import StrategyContextPanel from '@/components/video/StrategyContextPanel';
import CampaignKnowledgeSelector from '@/components/CampaignKnowledgeSelector';
import VideoProjectsList from '@/components/video/VideoProjectsList';
import ShotCard, { type Shot } from '@/components/video/ShotCard';
import {
  Clapperboard, Image, Film, Copy, Check, RefreshCw,
  ChevronRight, Sparkles, AlertTriangle, Lightbulb,
  Camera, Clock, Monitor, Download, Zap, FileText,
  Upload, X, ChevronDown, ChevronUp, Music, Mic,
  Volume2, Eye, Aperture, Gauge, Save, Loader2,
  FolderOpen, CheckCircle2
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const VIDEO_MODELS = [
  {
    id: 'VEO 3.1', label: 'VEO 3.1', badge: 'Google',
    badgeColor: 'bg-blue-500/20 text-blue-400', cost: '★★★',
    desc: 'Física realista + áudio nativo. Máx 5 frases = melhores resultados.',
    bestFor: ['Movimento de água', 'Áudio nativo gerado', 'Física realista'], color: 'blue',
  },
  {
    id: 'Sora 2 Pro Max', label: 'Sora 2 Pro Max', badge: 'OpenAI',
    badgeColor: 'bg-purple-500/20 text-purple-400', cost: '★★★★★',
    desc: 'Roteiro cinematográfico. Narrativas complexas e multi-beat.',
    bestFor: ['Narrativas com arco', 'Multi-personagens', 'Alta produção'], color: 'purple',
  },
  {
    id: 'Seedance 1.5 Pro', label: 'Seedance 1.5 Pro', badge: 'ByteDance',
    badgeColor: 'bg-green-500/20 text-green-400', cost: '★★',
    desc: 'Sujeito + Ações encadeadas. Iteração rápida e custo-benefício.',
    bestFor: ['Prototipação rápida', 'Ações físicas claras', 'Testes rápidos'], color: 'green',
  },
];

const ASPECT_RATIOS = ['9:16', '16:9', '1:1', '4:5'];
const DURATIONS = [5, 8, 10, 12, 15];

const CONTENT_ANGLES = [
  { id: 'Raiva', label: '🔴 Raiva', desc: 'Expõe injustiças, provoca indignação' },
  { id: 'Dinheiro', label: '💰 Dinheiro', desc: 'Números reais, ROI, comparativo de taxas' },
  { id: 'Orgulho', label: '🏆 Orgulho', desc: 'Dignidade do ofício, valorização' },
  { id: 'Urgência', label: '⏰ Urgência', desc: 'Verão em Floripa, janela de oportunidade' },
  { id: 'Alívio', label: '💚 Alívio', desc: 'PIX na hora, tranquilidade financeira' },
];

const PROJECT_STEPS = [
  { id: 1, label: 'Briefing', icon: FileText },
  { id: 2, label: 'Storyboard', icon: Clapperboard },
  { id: 3, label: 'Frames', icon: Camera },
  { id: 4, label: 'Motion', icon: Film },
  { id: 5, label: 'Pipeline', icon: Download },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface AudioInstructions {
  ambientSound: string;
  dialogue?: string | null;
  musicSuggestion?: string | null;
}

interface ImagePromptResult {
  imagePrompt: string;
  imagePromptPtBr: string;
  visualNotes: string;
  animationPotential?: string;
}

interface VideoPromptResult {
  videoPrompt: string;
  videoPromptPtBr: string;
  directorNotes: string;
  audioInstructions: AudioInstructions | null;
  lensMode: 'fixed' | 'unfixed';
  technicalSpecs: {
    model: string;
    duration: string;
    aspectRatio: string;
    fixedLens: boolean;
    audio: boolean;
    resolution: string;
  };
  warningsAndTips: string[];
  promptConfidenceScore: number;
}

interface ExpressResult extends ImagePromptResult, VideoPromptResult {
  extractedScene: string;
  suggestedAngle: string;
}

interface StrategyContext {
  strategy: string | null;
  campaign: unknown | null;
  idea: unknown | null;
  combined: string;
}

// ─── Small Helper Components ──────────────────────────────────────────────────

function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
        copied ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-primary'
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copiado!' : label}
    </button>
  );
}

function SpecTag({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
      <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
      <div>
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-xs font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function PromptQualityScore({ score }: { score: number }) {
  const color = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-orange-400';
  const bgColor = score >= 80 ? 'bg-green-500/10 border-green-500/20' : score >= 60 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-orange-500/10 border-orange-500/20';
  const label = score >= 80 ? 'Alta confiança' : score >= 60 ? 'Confiança média' : 'Baixa confiança';
  const progressColor = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-orange-500';

  return (
    <div className={cn('rounded-xl border p-3', bgColor)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Qualidade</p>
        </div>
        <span className={cn('text-lg font-black', color)}>{score}<span className="text-xs font-normal text-muted-foreground">/100</span></span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden mb-1.5">
        <div className={cn('h-full rounded-full transition-all', progressColor)} style={{ width: `${score}%` }} />
      </div>
      <p className={cn('text-[10px]', color)}>{label}</p>
    </div>
  );
}

function AudioInstructionsCard({ audio }: { audio: AudioInstructions }) {
  return (
    <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Volume2 className="h-4 w-4 text-green-400" />
        <p className="text-xs font-bold text-green-400 uppercase tracking-wider">Áudio Nativo</p>
      </div>
      <div className="space-y-2">
        {audio.ambientSound && (
          <div className="flex items-start gap-2 rounded-lg bg-green-500/10 px-3 py-2">
            <Eye className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[9px] uppercase tracking-wider text-green-400/70 mb-0.5">Som Ambiente</p>
              <p className="text-[11px] text-foreground">{audio.ambientSound}</p>
            </div>
          </div>
        )}
        {audio.dialogue && (
          <div className="flex items-start gap-2 rounded-lg bg-green-500/10 px-3 py-2">
            <Mic className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[9px] uppercase tracking-wider text-green-400/70 mb-0.5">Diálogo</p>
              <p className="text-[11px] text-foreground font-mono">"{audio.dialogue}"</p>
            </div>
          </div>
        )}
        {audio.musicSuggestion && (
          <div className="flex items-start gap-2 rounded-lg bg-green-500/10 px-3 py-2">
            <Music className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[9px] uppercase tracking-wider text-green-400/70 mb-0.5">Música</p>
              <p className="text-[11px] text-foreground">{audio.musicSuggestion}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PromptSections({ prompt, model }: { prompt: string; model: string }) {
  const sections: { key: string; color: string; bgColor: string }[] = model === 'VEO 3.1'
    ? [
        { key: 'Camera:', color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/20' },
        { key: 'Audio:', color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/20' },
      ]
    : model === 'Seedance 1.5 Pro'
    ? [
        { key: 'Camera', color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/20' },
        { key: 'Shot switch.', color: 'text-primary', bgColor: 'bg-primary/10 border-primary/20' },
      ]
    : [
        { key: 'Director:', color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/20' },
        { key: '[0.', color: 'text-primary', bgColor: 'bg-primary/10 border-primary/20' },
      ];

  const lines = prompt.split(/\n|(?<=\.) (?=[A-Z\[])/);
  return (
    <div className="space-y-1.5">
      {lines.filter(l => l.trim()).map((line, i) => {
        const matchedSection = sections.find(s => line.includes(s.key));
        return (
          <div key={i} className={cn('rounded-lg border px-3 py-2', matchedSection ? matchedSection.bgColor : 'bg-muted/20 border-transparent')}>
            <p className={cn('text-[11px] font-mono leading-relaxed', matchedSection ? matchedSection.color : 'text-foreground')}>{line}</p>
          </div>
        );
      })}
    </div>
  );
}

function ModelBadge({ modelId }: { modelId: string }) {
  const m = VIDEO_MODELS.find(x => x.id === modelId);
  if (!m) return null;
  return (
    <div className="flex items-center gap-2">
      <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-bold', m.badgeColor)}>{m.badge}</span>
      <span className="text-xs font-bold text-foreground">{m.label}</span>
    </div>
  );
}

function LensModeBadge({ lensMode }: { lensMode: 'fixed' | 'unfixed' }) {
  return (
    <div className={cn('flex items-center gap-1.5 rounded-lg border px-3 py-2',
      lensMode === 'unfixed' ? 'border-blue-500/20 bg-blue-500/10' : 'border-muted bg-muted/30')}>
      <Aperture className={cn('h-3.5 w-3.5', lensMode === 'unfixed' ? 'text-blue-400' : 'text-muted-foreground')} />
      <div>
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Lens Mode</p>
        <p className={cn('text-xs font-bold', lensMode === 'unfixed' ? 'text-blue-400' : 'text-muted-foreground')}>
          {lensMode === 'unfixed' ? 'Unfixed (Câmera em Movimento)' : 'Fixed (Câmera Estática)'}
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VideoIA() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get('taskId');
  const userId = user?.id || null;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dbFrom = (table: string) => (supabase as any).from(table);

  // Tab state
  const [activeTab, setActiveTab] = useState('express');

  // Load task context from campaign_tasks if taskId present
  useEffect(() => {
    if (!taskId) return;
    (async () => {
      const { data } = await dbFrom('campaign_tasks').select('*').eq('id', taskId).single();
      if (data) {
        const ctx = data.campaign_context || {};
        const briefingParts = [
          ctx.objective && `📋 OBJETIVO: ${ctx.objective}`,
          ctx.campaignSummary && `📝 RESUMO: ${ctx.campaignSummary}`,
          ctx.keyMessage && `💡 MENSAGEM CENTRAL: ${ctx.keyMessage}`,
          ctx.emotionalAngle && `🎯 ÂNGULO: ${ctx.emotionalAngle}`,
          ctx.targetAudience && `👥 PÚBLICO: ${ctx.targetAudience}`,
          ctx.cta && `🔗 CTA: ${ctx.cta}`,
          ctx.hooks?.length > 0 && `🪝 HOOKS: ${ctx.hooks.join(' | ')}`,
          ctx.viralLogic && `🚀 LÓGICA VIRAL: ${ctx.viralLogic}`,
          ctx.toneGuidance && `🗣️ TOM: ${ctx.toneGuidance}`,
          ctx.avoid && `🚫 EVITAR: ${ctx.avoid}`,
          ctx.funnel && `🔄 FUNIL: ${ctx.funnel}`,
          ctx.channelBudget && `💰 VERBA DO CANAL: R$ ${Number(ctx.channelBudget).toLocaleString('pt-BR')}`,
        ].filter(Boolean).join('\n');
        
        setActiveTab('express');
        setExpressText(briefingParts);
        if (ctx.emotionalAngle) setExpressAngle(ctx.emotionalAngle);
        // Set aspect ratio from format
        if (data.format_ratio) {
          const ratio = data.format_ratio.replace(':', ':');
          if (ASPECT_RATIOS.includes(ratio)) setExpressAspect(ratio);
        }
        toast({ title: '📋 Briefing da campanha carregado', description: `Tarefa: ${data.title} · ${data.channel}` });
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  // Load reference from Instagram post (Canais Orgânicos → "Usar como Ref.")
  useEffect(() => {
    const raw = localStorage.getItem('ig_ref_to_video');
    if (!raw) return;
    try {
      const ref = JSON.parse(raw);
      const refBriefing = [
        '📌 REFERÊNCIA DE REEL/VÍDEO INSTAGRAM (usar como base criativa):',
        ref.caption && `Caption original: "${ref.caption.slice(0, 300)}"`,
        ref.engRate && `Engagement Rate: ${ref.engRate}%`,
        ref.likes && `Likes: ${ref.likes} | Saves: ${ref.saves} | Shares: ${ref.shares}`,
        ref.reach && `Alcance: ${ref.reach}`,
        ref.permalink && `Link: ${ref.permalink}`,
        '',
        '➡️ Crie um novo vídeo/reel inspirado nesta referência, mantendo o que funcionou e melhorando o engajamento.',
      ].filter(Boolean).join('\n');
      setActiveTab('express');
      setExpressText(refBriefing);
      toast({ title: '📋 Referência do Instagram carregada', description: `Reel com ${ref.engRate}% de engagement` });
      localStorage.removeItem('ig_ref_to_video');
    } catch {}
  }, []);


  const [expressText, setExpressText] = useState('');
  const [expressModel, setExpressModel] = useState('Seedance 1.5 Pro');
  const [expressAspect, setExpressAspect] = useState('9:16');
  const [expressDuration, setExpressDuration] = useState(10);
  const [expressResult, setExpressResult] = useState<ExpressResult | null>(null);
  const [loadingExpress, setLoadingExpress] = useState(false);
  const [expressAngle, setExpressAngle] = useState('');
  const [expressStrategyCtx, setExpressStrategyCtx] = useState<StrategyContext | null>(null);
  const [expressCampaignCtx, setExpressCampaignCtx] = useState('');

  // Project mode state
  const [projectStep, setProjectStep] = useState(1);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectConcept, setProjectConcept] = useState('');
  const [projectModel, setProjectModel] = useState('Seedance 1.5 Pro');
  const [projectAspect, setProjectAspect] = useState('9:16');
  const [projectDuration, setProjectDuration] = useState(10);
  const [projectAngle, setProjectAngle] = useState('');
  const [projectStrategyCtx, setProjectStrategyCtx] = useState<StrategyContext | null>(null);
  const [projectCampaignCtx, setProjectCampaignCtx] = useState('');
  const [storyboard, setStoryboard] = useState<Shot[]>([]);
  const [storyboardMeta, setStoryboardMeta] = useState<{ title?: string; concept?: string; caption?: string; viralTrigger?: string } | null>(null);
  const [loadingStoryboard, setLoadingStoryboard] = useState(false);
  const [loadingFrameId, setLoadingFrameId] = useState<number | null>(null);
  const [loadingMotionId, setLoadingMotionId] = useState<number | null>(null);
  const [savingProject, setSavingProject] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // File upload for express
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const stripped = file.name.endsWith('.html')
        ? text.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 8000)
        : text.slice(0, 8000);
      setExpressText(stripped);
      toast({ title: 'Arquivo carregado', description: `${file.name} — conteúdo extraído.` });
    };
    reader.readAsText(file);
  };

  // Express generation
  const handleExpress = async () => {
    if (!expressText.trim()) { toast({ title: 'Insira uma ideia', variant: 'destructive' }); return; }
    setLoadingExpress(true);
    setExpressResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-video-assets', {
        body: {
          operation: 'express_prompts',
          freeText: expressText.trim(),
          videoModel: expressModel,
          aspectRatio: expressAspect,
          duration: expressDuration,
          contentAngle: expressAngle || undefined,
          strategyContext: [expressCampaignCtx, expressStrategyCtx?.combined].filter(Boolean).join('\n\n') || undefined,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setExpressResult(data);
    } catch (e: unknown) {
      toast({ title: 'Erro', description: String(e), variant: 'destructive' });
    } finally {
      setLoadingExpress(false);
    }
  };

  // Project — Generate storyboard
  const handleGenerateStoryboard = async () => {
    if (!projectConcept.trim()) { toast({ title: 'Descreva o conceito do vídeo', variant: 'destructive' }); return; }
    setLoadingStoryboard(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-video-assets', {
        body: {
          operation: 'storyboard',
          freeText: projectConcept.trim(),
          videoModel: projectModel,
          aspectRatio: projectAspect,
          duration: projectDuration,
          contentAngle: projectAngle || undefined,
          strategyContext: [projectCampaignCtx, projectStrategyCtx?.combined].filter(Boolean).join('\n\n') || undefined,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const shots: Shot[] = (data.shots || []).map((s: any, i: number) => ({
        id: i + 1,
        title: s.title || `Shot ${i + 1}`,
        duration: s.duration || '3s',
        description: s.description || '',
        type: s.type || 'setup',
        recommendedModel: s.recommendedModel || projectModel,
        frameApproved: false,
        motionReady: false,
      }));

      setStoryboard(shots);
      setStoryboardMeta({
        title: data.videoTitle || projectTitle || 'Sem título',
        concept: data.narrativeConcept,
        caption: data.captionSuggestion,
        viralTrigger: data.viralTrigger,
      });
      if (!projectTitle && data.videoTitle) setProjectTitle(data.videoTitle);
      setProjectStep(2);
    } catch (e: unknown) {
      toast({ title: 'Erro ao gerar storyboard', description: String(e), variant: 'destructive' });
    } finally {
      setLoadingStoryboard(false);
    }
  };

  // Project — Generate frame prompt for a shot
  const handleGenerateFrame = async (shotId: number) => {
    const shot = storyboard.find(s => s.id === shotId);
    if (!shot) return;
    setLoadingFrameId(shotId);
    try {
      const { data, error } = await supabase.functions.invoke('generate-video-assets', {
        body: {
          operation: 'shot_frame_prompt',
          scene: shot.description,
          videoModel: shot.recommendedModel,
          aspectRatio: projectAspect,
          duration: parseInt(shot.duration),
          strategyContext: projectStrategyCtx?.combined || undefined,
          shotContext: {
            shotNumber: shot.id,
            totalShots: storyboard.length,
            shotType: shot.type,
            shotTitle: shot.title,
          },
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setStoryboard(prev => prev.map(s =>
        s.id === shotId ? { ...s, framePrompt: data.imagePrompt, framePromptPtBr: data.imagePromptPtBr } : s
      ));
    } catch (e: unknown) {
      toast({ title: 'Erro', description: String(e), variant: 'destructive' });
    } finally {
      setLoadingFrameId(null);
    }
  };

  // Project — Approve frame
  const handleApproveFrame = (shotId: number) => {
    setStoryboard(prev => prev.map(s =>
      s.id === shotId ? { ...s, frameApproved: true } : s
    ));
  };

  // Project — Generate motion prompt for a shot
  const handleGenerateMotion = async (shotId: number) => {
    const shot = storyboard.find(s => s.id === shotId);
    if (!shot) return;
    setLoadingMotionId(shotId);
    try {
      const { data, error } = await supabase.functions.invoke('generate-video-assets', {
        body: {
          operation: 'shot_motion_prompt',
          scene: shot.description,
          videoModel: shot.recommendedModel,
          aspectRatio: projectAspect,
          duration: parseInt(shot.duration),
          imagePrompt: shot.framePrompt,
          strategyContext: projectStrategyCtx?.combined || undefined,
          shotContext: {
            shotNumber: shot.id,
            totalShots: storyboard.length,
            shotType: shot.type,
            shotTitle: shot.title,
          },
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setStoryboard(prev => prev.map(s =>
        s.id === shotId ? { ...s, motionPrompt: data.videoPrompt, motionPromptPtBr: data.videoPromptPtBr, motionReady: true } : s
      ));
    } catch (e: unknown) {
      toast({ title: 'Erro', description: String(e), variant: 'destructive' });
    } finally {
      setLoadingMotionId(null);
    }
  };

  // Save project
  const handleSaveProject = async () => {
    if (!userId) { toast({ title: 'Faça login para salvar', variant: 'destructive' }); return; }
    setSavingProject(true);
    try {
      const projectData = {
        user_id: userId,
        title: projectTitle || storyboardMeta?.title || 'Projeto sem título',
        concept: projectConcept,
        briefing_data: {
          model: projectModel,
          aspect: projectAspect,
          duration: projectDuration,
          angle: projectAngle,
          strategyContext: projectStrategyCtx?.combined?.slice(0, 2000),
        },
        storyboard: storyboard,
        shot_frames: Object.fromEntries(storyboard.filter(s => s.framePrompt).map(s => [s.id, { prompt: s.framePrompt, ptBr: s.framePromptPtBr }])),
        shot_motions: Object.fromEntries(storyboard.filter(s => s.motionPrompt).map(s => [s.id, { prompt: s.motionPrompt, ptBr: s.motionPromptPtBr }])),
        pipeline_notes: storyboardMeta,
        status: storyboard.every(s => s.motionReady) ? 'done' : storyboard.some(s => s.frameApproved) ? 'in_production' : 'draft',
      };

      if (currentProjectId) {
        await dbFrom('video_projects').update(projectData).eq('id', currentProjectId);
      } else {
        const { data } = await dbFrom('video_projects').insert(projectData).select('id').single();
        if (data) setCurrentProjectId(data.id);
      }
      toast({ title: 'Projeto salvo!' });
    } catch (e: unknown) {
      toast({ title: 'Erro ao salvar', description: String(e), variant: 'destructive' });
    } finally {
      setSavingProject(false);
    }
  };

  // Load project from list
  const handleLoadProject = (project: any) => {
    setActiveTab('project');
    setCurrentProjectId(project.id);
    setProjectTitle(project.title);
    setProjectConcept(project.concept || '');
    const bd = project.briefing_data || {};
    setProjectModel(bd.model || 'Seedance 1.5 Pro');
    setProjectAspect(bd.aspect || '9:16');
    setProjectDuration(bd.duration || 10);
    setProjectAngle(bd.angle || '');

    const shots: Shot[] = (project.storyboard || []).map((s: any) => {
      const frames = project.shot_frames || {};
      const motions = project.shot_motions || {};
      const f = frames[s.id] || {};
      const m = motions[s.id] || {};
      return {
        ...s,
        framePrompt: f.prompt || s.framePrompt,
        framePromptPtBr: f.ptBr || s.framePromptPtBr,
        motionPrompt: m.prompt || s.motionPrompt,
        motionPromptPtBr: m.ptBr || s.motionPromptPtBr,
      };
    });
    setStoryboard(shots);
    setStoryboardMeta(project.pipeline_notes || null);
    setProjectStep(shots.length > 0 ? 2 : 1);
  };

  const allFramesApproved = storyboard.length > 0 && storyboard.every(s => s.frameApproved);
  const allMotionReady = storyboard.length > 0 && storyboard.every(s => s.motionReady);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20">
          <Clapperboard className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-black text-foreground">Video IA — Produção Cinematográfica</h1>
          <p className="text-xs text-muted-foreground">Workflow completo para criar vídeos com IA para Higgsfield</p>
        </div>
        <Badge variant="outline" className="ml-auto border-primary/30 text-primary text-[10px]">Higgsfield Compatible</Badge>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="express" className="gap-1.5 text-xs">
            <Zap className="h-3.5 w-3.5" /> Express
          </TabsTrigger>
          <TabsTrigger value="project" className="gap-1.5 text-xs">
            <Clapperboard className="h-3.5 w-3.5" /> Projeto de Vídeo
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-1.5 text-xs">
            <FolderOpen className="h-3.5 w-3.5" /> Meus Projetos
          </TabsTrigger>
        </TabsList>

        {/* ═══════ EXPRESS TAB ═══════ */}
        <TabsContent value="express" className="space-y-4 mt-4">
          {/* Campaign as knowledge base */}
          <CampaignKnowledgeSelector onContextChange={setExpressCampaignCtx} />

          {/* Strategy context panel */}
          <StrategyContextPanel onContextChange={setExpressStrategyCtx} userId={userId} />

          {/* Input area */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground uppercase tracking-wider">📝 Ideia / Referência / Roteiro</p>
              <div className="flex gap-2">
                <input ref={fileInputRef} type="file" accept=".txt,.html,.md" className="hidden" onChange={handleFileUpload} />
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-all">
                  <Upload className="h-3.5 w-3.5" /> Arquivo
                </button>
                {expressText && (
                  <button onClick={() => setExpressText('')} className="flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground hover:border-destructive/40 hover:text-destructive transition-all">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <Textarea
              placeholder="Cole aqui qualquer referência: roteiro de carrossel, ideia de campanha, conceito visual, briefing..."
              value={expressText}
              onChange={e => setExpressText(e.target.value)}
              className="min-h-[120px] resize-none text-xs bg-background border-border font-mono"
            />
            {expressText && <p className="text-[10px] text-muted-foreground">{expressText.length.toLocaleString()} caracteres</p>}
          </div>

          {/* Quick settings */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Modelo de Vídeo</p>
              <div className="flex flex-col gap-1">
                {VIDEO_MODELS.map(m => (
                  <button key={m.id} onClick={() => setExpressModel(m.id)}
                    className={cn('rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-medium transition-all',
                      expressModel === m.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30')}>
                    {m.label} <span className={cn('ml-1.5 text-[9px]', m.badgeColor.split(' ')[1])}>{m.cost}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Aspecto</p>
              <div className="flex flex-wrap gap-1.5">
                {ASPECT_RATIOS.map(ar => (
                  <button key={ar} onClick={() => setExpressAspect(ar)}
                    className={cn('rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all',
                      expressAspect === ar ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                    {ar}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 mb-1.5 uppercase tracking-wider">Duração</p>
              <div className="flex flex-wrap gap-1.5">
                {DURATIONS.map(d => (
                  <button key={d} onClick={() => setExpressDuration(d)}
                    className={cn('rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all',
                      expressDuration === d ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                    {d}s
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Ângulo (opcional)</p>
              <div className="flex flex-col gap-1">
                {['', ...CONTENT_ANGLES.map(a => a.id)].map(a => (
                  <button key={a} onClick={() => setExpressAngle(a)}
                    className={cn('rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition-all',
                      expressAngle === a ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30')}>
                    {a === '' ? '🤖 Detectar automaticamente' : CONTENT_ANGLES.find(x => x.id === a)?.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button onClick={handleExpress} disabled={loadingExpress || !expressText.trim()} size="lg" className="w-full gap-2 font-bold">
            {loadingExpress ? <><RefreshCw className="h-4 w-4 animate-spin" /> Gerando prompts...</> : <><Zap className="h-4 w-4" /> Gerar Prompt de Imagem + Vídeo</>}
          </Button>

          {/* Express Results */}
          {expressResult && (
            <div className="space-y-4 animate-fade-in pt-2 border-t border-border">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <ModelBadge modelId={expressModel} />
                    {expressResult.suggestedAngle && <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">{expressResult.suggestedAngle}</Badge>}
                  </div>
                  {expressResult.extractedScene && <p className="text-[11px] text-muted-foreground"><span className="text-muted-foreground/60">Cena: </span>{expressResult.extractedScene}</p>}
                </div>
                {expressResult.promptConfidenceScore > 0 && <div className="w-full sm:w-56"><PromptQualityScore score={expressResult.promptConfidenceScore} /></div>}
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {/* Image Prompt */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><Camera className="h-4 w-4 text-primary" /><p className="text-xs font-black text-foreground uppercase tracking-wider">Frame Inicial</p></div>
                    <CopyButton text={expressResult.imagePrompt} label="Copiar EN" />
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3"><p className="text-[11px] font-mono text-foreground leading-relaxed">{expressResult.imagePrompt}</p></div>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5">
                    <p className="text-[10px] font-bold text-primary mb-1">Tradução</p>
                    <p className="text-[11px] text-foreground leading-relaxed">{expressResult.imagePromptPtBr}</p>
                  </div>
                  {expressResult.animationPotential && (
                    <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2">
                      <p className="text-[9px] uppercase tracking-wider text-blue-400 mb-0.5">Potencial de Animação</p>
                      <p className="text-[11px] text-foreground">{expressResult.animationPotential}</p>
                    </div>
                  )}
                </div>

                {/* Video Prompt */}
                <div className="space-y-3">
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2"><Film className="h-4 w-4 text-primary" /><p className="text-xs font-black text-foreground uppercase tracking-wider">Prompt de Vídeo</p></div>
                      <CopyButton text={expressResult.videoPrompt} label="Copiar EN" />
                    </div>
                    <PromptSections prompt={expressResult.videoPrompt} model={expressModel} />
                    <div className="mt-3 rounded-lg bg-muted/30 p-2.5">
                      <p className="text-[10px] font-bold text-muted-foreground mb-1">Análise do Diretor</p>
                      <p className="text-[11px] text-foreground leading-relaxed">{expressResult.videoPromptPtBr}</p>
                    </div>
                  </div>
                  {expressResult.lensMode && <LensModeBadge lensMode={expressResult.lensMode} />}
                  {expressResult.audioInstructions && <AudioInstructionsCard audio={expressResult.audioInstructions} />}
                  <div className="grid grid-cols-2 gap-2">
                    <SpecTag icon={Camera} label="Modelo" value={expressResult.technicalSpecs?.model || expressModel} />
                    <SpecTag icon={Clock} label="Duração" value={expressResult.technicalSpecs?.duration || `${expressDuration}s`} />
                    <SpecTag icon={Monitor} label="Aspecto" value={expressResult.technicalSpecs?.aspectRatio || expressAspect} />
                    <SpecTag icon={Monitor} label="Resolução" value={expressResult.technicalSpecs?.resolution || '1080p'} />
                  </div>
                  {expressResult.directorNotes && (
                    <div className="rounded-xl border border-border bg-card p-3">
                      <div className="flex items-center gap-2 mb-1.5"><Clapperboard className="h-3.5 w-3.5 text-primary" /><p className="text-[10px] font-bold text-foreground uppercase tracking-wider">Notas do Diretor</p></div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{expressResult.directorNotes}</p>
                    </div>
                  )}
                  {expressResult.warningsAndTips?.length > 0 && (
                    <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3">
                      <div className="flex items-center gap-2 mb-1.5"><AlertTriangle className="h-3.5 w-3.5 text-yellow-400" /><p className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">Dicas</p></div>
                      <ul className="space-y-1">{expressResult.warningsAndTips.map((tip, i) => (<li key={i} className="flex items-start gap-2 text-[11px] text-foreground"><Lightbulb className="h-3.5 w-3.5 text-yellow-400 shrink-0 mt-0.5" />{tip}</li>))}</ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Next steps */}
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
                <p className="text-xs font-bold text-green-400 mb-1">✅ Próximos passos no Higgsfield</p>
                <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2 text-[11px] text-foreground">
                  <p>1. Copie o <strong>Frame Inicial</strong> → gere a imagem</p>
                  <p>2. Upload como <strong>Start Frame</strong> no Higgsfield</p>
                  <p>3. Cole o <strong>Prompt de Vídeo</strong></p>
                  <p>4. Configure: <strong>{expressResult.technicalSpecs?.model || expressModel}</strong> · {expressResult.technicalSpecs?.aspectRatio || expressAspect} · {expressResult.technicalSpecs?.duration || `${expressDuration}s`}</p>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ═══════ PROJECT TAB ═══════ */}
        <TabsContent value="project" className="space-y-4 mt-4">
          {/* Stepper */}
          <div className="flex items-center gap-0 overflow-x-auto pb-1">
            {PROJECT_STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = projectStep === s.id;
              const done = projectStep > s.id;
              return (
                <div key={s.id} className="flex items-center shrink-0">
                  <button onClick={() => done && setProjectStep(s.id)}
                    className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all',
                      active ? 'bg-primary/20 text-primary' : done ? 'text-muted-foreground hover:text-foreground cursor-pointer' : 'text-muted-foreground/40 cursor-default')}>
                    <div className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black',
                      active ? 'bg-primary text-primary-foreground' : done ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground')}>
                      {done ? '✓' : s.id}
                    </div>
                    <span className="hidden sm:block">{s.label}</span>
                  </button>
                  {i < PROJECT_STEPS.length - 1 && <ChevronRight className={cn('h-4 w-4 shrink-0', projectStep > s.id ? 'text-primary/40' : 'text-border')} />}
                </div>
              );
            })}
          </div>

          {/* Step 1: Briefing */}
          {projectStep === 1 && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider">📝 Conceito do Vídeo</p>
                  <input
                    type="text" placeholder="Título do projeto (ex: Piscineiro PIX - Campanha Awareness)"
                    value={projectTitle} onChange={e => setProjectTitle(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Textarea
                    placeholder="Descreva o conceito: quem é o personagem, o que acontece, qual emoção transmitir, referências visuais..."
                    value={projectConcept} onChange={e => setProjectConcept(e.target.value)}
                    className="min-h-[120px] resize-none text-xs bg-background border-border"
                  />
                </div>

                {/* Settings */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Modelo</p>
                    <div className="flex flex-col gap-1">
                      {VIDEO_MODELS.map(m => (
                        <button key={m.id} onClick={() => setProjectModel(m.id)}
                          className={cn('rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-medium transition-all',
                            projectModel === m.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30')}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Aspecto</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ASPECT_RATIOS.map(ar => (
                        <button key={ar} onClick={() => setProjectAspect(ar)}
                          className={cn('rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all',
                            projectAspect === ar ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>{ar}</button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-3 mb-1.5 uppercase tracking-wider">Duração</p>
                    <div className="flex flex-wrap gap-1.5">
                      {DURATIONS.map(d => (
                        <button key={d} onClick={() => setProjectDuration(d)}
                          className={cn('rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all',
                            projectDuration === d ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>{d}s</button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Ângulo</p>
                    <div className="flex flex-col gap-1">
                      {CONTENT_ANGLES.map(a => (
                        <button key={a.id} onClick={() => setProjectAngle(a.id)}
                          className={cn('rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition-all',
                            projectAngle === a.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30')}>
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Button onClick={handleGenerateStoryboard} disabled={loadingStoryboard || !projectConcept.trim()} size="lg" className="w-full gap-2 font-bold">
                  {loadingStoryboard ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando storyboard...</> : <><Sparkles className="h-4 w-4" /> Gerar Storyboard com IA</>}
                </Button>
              </div>

              {/* Strategy context sidebar */}
              <div>
                <CampaignKnowledgeSelector onContextChange={setProjectCampaignCtx} />
                <StrategyContextPanel onContextChange={setProjectStrategyCtx} userId={userId} />
              </div>
            </div>
          )}

          {/* Step 2: Storyboard */}
          {projectStep === 2 && (
            <div className="space-y-4">
              {storyboardMeta && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-sm font-black text-foreground mb-1">{storyboardMeta.title}</p>
                  {storyboardMeta.concept && <p className="text-xs text-muted-foreground mb-2">{storyboardMeta.concept}</p>}
                  <div className="flex flex-wrap gap-2">
                    {storyboardMeta.caption && (
                      <div className="flex items-center gap-1.5"><Badge variant="outline" className="text-[10px]">Caption</Badge><CopyButton text={storyboardMeta.caption} /></div>
                    )}
                    {storyboardMeta.viralTrigger && (
                      <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">🎯 {storyboardMeta.viralTrigger}</Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {storyboard.map(shot => (
                  <ShotCard
                    key={shot.id}
                    shot={shot}
                    showFramePrompt={false}
                    showMotionPrompt={false}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setProjectStep(1)} className="gap-1.5 text-xs">
                  ← Voltar ao Briefing
                </Button>
                <Button onClick={() => setProjectStep(3)} disabled={storyboard.length === 0} className="flex-1 gap-1.5 font-bold">
                  Gerar Frame Prompts <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Frame Prompts */}
          {projectStep === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs font-bold text-foreground mb-1">📸 Frame Prompts — Gere e aprove cada shot</p>
                <p className="text-[11px] text-muted-foreground">Cada frame prompt será usado como Start Frame no Higgsfield. Aprove antes de prosseguir.</p>
              </div>

              <div className="space-y-2">
                {storyboard.map(shot => (
                  <ShotCard
                    key={shot.id}
                    shot={shot}
                    showFramePrompt={true}
                    showMotionPrompt={false}
                    onGenerateFrame={handleGenerateFrame}
                    onApproveFrame={handleApproveFrame}
                    loadingFrame={loadingFrameId === shot.id}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setProjectStep(2)} className="gap-1.5 text-xs">← Storyboard</Button>
                <Button onClick={() => setProjectStep(4)} disabled={!allFramesApproved} className="flex-1 gap-1.5 font-bold">
                  {allFramesApproved ? <>Gerar Motion Prompts <ChevronRight className="h-4 w-4" /></> : `Aprove todos os frames (${storyboard.filter(s => s.frameApproved).length}/${storyboard.length})`}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Motion Prompts */}
          {projectStep === 4 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs font-bold text-foreground mb-1">🎬 Motion Prompts — Direção de movimento por shot</p>
                <p className="text-[11px] text-muted-foreground">Prompts otimizados para o modelo selecionado com timing e coreografia de câmera.</p>
              </div>

              <div className="space-y-2">
                {storyboard.map(shot => (
                  <ShotCard
                    key={shot.id}
                    shot={shot}
                    showFramePrompt={true}
                    showMotionPrompt={true}
                    onGenerateMotion={handleGenerateMotion}
                    loadingMotion={loadingMotionId === shot.id}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setProjectStep(3)} className="gap-1.5 text-xs">← Frames</Button>
                <Button onClick={() => setProjectStep(5)} disabled={!allMotionReady} className="flex-1 gap-1.5 font-bold">
                  {allMotionReady ? <>Pipeline & Exportação <ChevronRight className="h-4 w-4" /></> : `Gere motion para todos (${storyboard.filter(s => s.motionReady).length}/${storyboard.length})`}
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Pipeline & Export */}
          {projectStep === 5 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                <p className="text-sm font-bold text-green-400 mb-3">✅ Pipeline de Exportação — Higgsfield</p>
                <div className="space-y-2">
                  {storyboard.map(shot => (
                    <div key={shot.id} className="flex items-center gap-3 rounded-lg bg-card border border-border p-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500/10 text-green-400 text-xs font-black">{shot.id}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{shot.title}</p>
                        <p className="text-[10px] text-muted-foreground">{shot.recommendedModel} · {shot.duration}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {shot.frameApproved && <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[9px]">Frame ✓</Badge>}
                        {shot.motionReady && <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px]">Motion ✓</Badge>}
                        {shot.motionPrompt && <CopyButton text={shot.motionPrompt} label="Motion" />}
                        {shot.framePrompt && <CopyButton text={shot.framePrompt} label="Frame" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {storyboardMeta?.caption && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-foreground uppercase tracking-wider">📱 Caption Sugerida</p>
                    <CopyButton text={storyboardMeta.caption} />
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">{storyboardMeta.caption}</p>
                </div>
              )}

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">📋 Pós-Produção</p>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 text-[11px] text-foreground">
                  <p>1. Gere as imagens dos frames (Higgsfield ou outro)</p>
                  <p>2. Gere os vídeos por shot com os motion prompts</p>
                  <p>3. Sequencie os shots no editor de vídeo</p>
                  <p>4. Adicione texto overlay, logo e SFX</p>
                  <p>5. Exporte em {projectAspect} para a plataforma alvo</p>
                  <p>6. Revise a caption e publique</p>
                </div>
              </div>

              <Button onClick={handleSaveProject} disabled={savingProject} size="lg" className="w-full gap-2 font-bold">
                {savingProject ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : <><Save className="h-4 w-4" /> Salvar Projeto</>}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ═══════ MY PROJECTS TAB ═══════ */}
        <TabsContent value="projects" className="mt-4">
          <VideoProjectsList userId={userId} onLoadProject={handleLoadProject} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
