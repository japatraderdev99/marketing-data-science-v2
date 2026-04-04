import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sparkles, BookOpen, Target, Megaphone, Palette, TrendingUp,
  ArrowRight, ArrowLeft, X, CheckCircle2, AlertCircle,
  Brain, Users, MessageSquare, Cpu, FileText, ChevronRight,
  Zap, BarChart3, Layers
} from 'lucide-react';

interface OnboardingTutorialProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PillarStatus {
  key: string;
  label: string;
  icon: React.ReactNode;
  filled: boolean;
}

const PILLAR_KEYS = [
  { key: 'essencia', label: 'Essência da Marca', icon: <Sparkles className="h-4 w-4" /> },
  { key: 'posicionamento', label: 'Posicionamento', icon: <Target className="h-4 w-4" /> },
  { key: 'persona', label: 'Persona / ICP', icon: <Users className="h-4 w-4" /> },
  { key: 'tom', label: 'Tom de Voz', icon: <MessageSquare className="h-4 w-4" /> },
  { key: 'system_prompt', label: 'System Prompt IA', icon: <Cpu className="h-4 w-4" /> },
];

export function OnboardingTutorial({ open, onOpenChange }: OnboardingTutorialProps) {
  const [step, setStep] = useState(0);
  const [pillars, setPillars] = useState<PillarStatus[]>([]);
  const [kbCount, setKbCount] = useState(0);
  const [score, setScore] = useState(0);
  const [animateScore, setAnimateScore] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const totalSteps = 5;

  // Load real data for step 5
  useEffect(() => {
    if (!open || step !== 4) return;

    // Load strategy metafields from localStorage
    const raw = localStorage.getItem('dqef_strategy_metafields_v1');
    const meta = raw ? JSON.parse(raw) : null;

    const statuses = PILLAR_KEYS.map(p => {
      let filled = false;
      if (meta) {
        if (p.key === 'essencia') filled = !!(meta.brandEssence || meta.mission);
        else if (p.key === 'posicionamento') filled = !!(meta.positioning || meta.uniqueValue);
        else if (p.key === 'persona') filled = !!(meta.targetAudience || (meta.icpTraits && meta.icpTraits.length > 0));
        else if (p.key === 'tom') filled = !!(meta.toneOfVoice || (meta.communicationPillars && meta.communicationPillars.length > 0));
        else if (p.key === 'system_prompt') filled = !!(meta.systemPrompt);
      }
      return { ...p, filled };
    });
    setPillars(statuses);

    // Load KB docs count
    if (user) {
      supabase
        .from('strategy_knowledge')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .then(({ count }) => setKbCount(count ?? 0));
    }

    const filledCount = statuses.filter(p => p.filled).length;
    const kbScore = kbCount > 0 ? 1 : 0;
    const total = Math.round(((filledCount + kbScore) / 6) * 100);
    setScore(0);
    setTimeout(() => {
      setScore(total);
      setAnimateScore(true);
    }, 300);
  }, [open, step, user, kbCount]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowRight' && step < totalSteps - 1) setStep(s => s + 1);
    if (e.key === 'ArrowLeft' && step > 0) setStep(s => s - 1);
    if (e.key === 'Escape') handleClose();
  }, [open, step]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleClose = () => {
    localStorage.setItem('dqef_tutorial_completed', 'true');
    onOpenChange(false);
    setStep(0);
  };

  const handleGoToStrategy = () => {
    handleClose();
    navigate('/estrategia');
  };

  const scoreColor = score < 40 ? 'text-red-400' : score < 70 ? 'text-yellow-400' : 'text-emerald-400';
  const scoreBarColor = score < 40 ? 'bg-red-500' : score < 70 ? 'bg-yellow-500' : 'bg-emerald-500';

  const steps = [
    // Step 1 — Welcome
    <div key="s1" className="flex flex-col items-center gap-8 text-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl animate-pulse" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full gradient-orange">
          <Sparkles className="h-12 w-12 text-white animate-bounce" />
        </div>
      </div>
      <div className="space-y-3">
        <h2 className="text-3xl font-bold text-foreground">Bem-vindo ao DQEF Hub</h2>
        <p className="text-lg text-muted-foreground max-w-md">
          Sua central de marketing inteligente. Quanto mais contexto você fornece, melhores são os resultados da IA.
        </p>
      </div>
      <div className="flex items-center gap-4 mt-4">
        {[
          { icon: <BookOpen className="h-6 w-6" />, label: 'Estratégia', color: 'from-orange-500 to-amber-500' },
          { icon: <Megaphone className="h-6 w-6" />, label: 'Campanhas', color: 'from-teal-500 to-cyan-500' },
          { icon: <Palette className="h-6 w-6" />, label: 'Criativos', color: 'from-violet-500 to-purple-500' },
        ].map((item, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} text-white shadow-lg`}>
              {item.icon}
            </div>
            <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
            {i < 2 && <ChevronRight className="absolute text-muted-foreground/40 h-4 w-4" style={{ display: 'none' }} />}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
        <ArrowRight className="h-4 w-4 text-primary" />
        <span>Dados fluem entre as abas para criar resultados únicos</span>
      </div>
    </div>,

    // Step 2 — Playbook Estratégico
    <div key="s2" className="flex flex-col items-center gap-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg">
        <BookOpen className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Fundação: Playbook Estratégico</h2>
        <p className="text-muted-foreground max-w-lg">
          Tudo começa na aba <span className="text-primary font-semibold">Estratégia</span>. Preencha os 5 pilares da sua marca e alimente o Knowledge Base com seus documentos.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg mt-2">
        {PILLAR_KEYS.map((p, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              {p.icon}
            </div>
            <span className="text-sm font-medium text-foreground">{p.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-teal bg-teal/5 p-3 text-left">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal/10 text-teal shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium text-foreground">Knowledge Base</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2 max-w-md">
        Cada pilar preenchido enriquece o contexto que a IA usa para gerar campanhas e criativos.
      </p>
    </div>,

    // Step 3 — Campanhas CMO
    <div key="s3" className="flex flex-col items-center gap-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
        <Megaphone className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Campanhas com Diretrizes CMO</h2>
        <p className="text-muted-foreground max-w-lg">
          As diretrizes que você preenche alimentam diretamente o plano gerado pela IA. Quanto mais específicas, mais personalizado o resultado.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-4 mt-4 max-w-lg w-full">
        <div className="flex-1 rounded-xl border border-border bg-card p-4 space-y-2 text-left">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider">Entrada</div>
          <div className="space-y-1.5">
            {['Objetivo', 'Público-alvo', 'Canal', 'Orçamento'].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                {f}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Zap className="h-6 w-6 text-primary animate-pulse" />
          <span className="text-[10px] text-muted-foreground font-medium">IA</span>
        </div>
        <div className="flex-1 rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2 text-left shadow-[0_0_20px_hsl(var(--primary)/0.1)]">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider">Resultado</div>
          <div className="space-y-1.5">
            {['Plano completo', 'Tasks por fase', 'Conteúdo sugerido', 'Métricas KPI'].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,

    // Step 4 — Criativos
    <div key="s4" className="flex flex-col items-center gap-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
        <Palette className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Criativos que Entendem sua Marca</h2>
        <p className="text-muted-foreground max-w-lg">
          Com a Fundação Estratégica ativa, seus carrosséis falam a língua da sua marca — não são genéricos.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 max-w-lg w-full mt-2">
        <div className="rounded-xl border border-border bg-card p-4 space-y-3 text-left">
          <div className="flex items-center gap-2 text-xs font-semibold text-red-400 uppercase tracking-wider">
            <AlertCircle className="h-3.5 w-3.5" /> Sem contexto
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>"5 dicas de marketing digital"</p>
            <p className="text-xs italic">Tom genérico, sem personalidade</p>
          </div>
        </div>
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 text-left shadow-[0_0_20px_hsl(var(--primary)/0.1)]">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            <CheckCircle2 className="h-3.5 w-3.5" /> Com contexto
          </div>
          <div className="space-y-2 text-sm text-foreground">
            <p>"5 estratégias que usamos para triplicar leads B2B"</p>
            <p className="text-xs italic text-muted-foreground">Tom especialista, dados reais, alinhado com posicionamento</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
        <Brain className="h-4 w-4 text-primary" />
        <span>A IA usa todo o seu playbook para gerar cada slide</span>
      </div>
    </div>,

    // Step 5 — Scorecard
    <div key="s5" className="flex flex-col items-center gap-6 text-center">
      <div className="relative">
        <div className={`absolute inset-0 rounded-full blur-2xl ${score >= 70 ? 'bg-emerald-500/20' : score >= 40 ? 'bg-yellow-500/20' : 'bg-red-500/20'} transition-colors duration-1000`} />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-border bg-card">
          <span className={`text-2xl font-bold ${scoreColor} transition-colors duration-1000`}>
            {animateScore ? score : 0}%
          </span>
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Prontidão da sua IA</h2>
        <p className="text-muted-foreground max-w-md">
          Quanto mais dados, melhor o resultado. Veja o que já está preenchido e o que falta.
        </p>
      </div>
      <div className="w-full max-w-md">
        <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full rounded-full ${scoreBarColor} transition-all duration-1000 ease-out`}
            style={{ width: `${animateScore ? score : 0}%` }}
          />
        </div>
      </div>
      <div className="w-full max-w-md space-y-2">
        {pillars.map((p, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <div className={`flex h-7 w-7 items-center justify-center rounded-md ${p.filled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                {p.icon}
              </div>
              <span className="text-sm font-medium text-foreground">{p.label}</span>
            </div>
            {p.filled ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <button
                onClick={handleGoToStrategy}
                className="text-xs font-medium text-primary hover:underline"
              >
                Ir preencher →
              </button>
            )}
          </div>
        ))}
        <div className="flex items-center justify-between rounded-lg border border-dashed border-teal bg-teal/5 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className={`flex h-7 w-7 items-center justify-center rounded-md ${kbCount > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
              <FileText className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-foreground">Knowledge Base</span>
            {kbCount > 0 && <span className="text-xs text-muted-foreground">({kbCount} doc{kbCount !== 1 ? 's' : ''})</span>}
          </div>
          {kbCount > 0 ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <button onClick={handleGoToStrategy} className="text-xs font-medium text-primary hover:underline">
              Enviar docs →
            </button>
          )}
        </div>
      </div>
    </div>,
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-border bg-background">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-border px-6 py-3">
          <div className="flex items-center gap-3">
            <Layers className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Passo {step + 1} de {totalSteps}
            </span>
          </div>
          <button onClick={handleClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Pular tutorial
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 pt-3">
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  i <= step ? 'bg-primary' : 'bg-secondary'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-8 min-h-[400px] flex items-center justify-center">
          <div
            key={step}
            className="w-full animate-fade-in"
          >
            {steps[step]}
          </div>
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Anterior
          </Button>
          {step < totalSteps - 1 ? (
            <Button
              size="sm"
              onClick={() => setStep(s => s + 1)}
              className="gap-1.5"
            >
              Próximo <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleClose}
              className="gap-1.5 gradient-orange border-0 text-white"
            >
              Começar a usar <Sparkles className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
