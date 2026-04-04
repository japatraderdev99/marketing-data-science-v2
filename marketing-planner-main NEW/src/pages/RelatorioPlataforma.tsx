import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Brain, Clapperboard, Image, MessageSquare, Zap, DollarSign,
  BarChart3, Shield, Layers, Sparkles, TrendingUp, Clock,
  FileText, Target, Palette, Video, Bot, ArrowRight, Download
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Cost Data ────────────────────────────────────────────────────────────────

const MODEL_INFO = [
  {
    name: 'Claude Sonnet 4',
    provider: 'Anthropic (via OpenRouter)',
    tasks: ['Copywriting', 'Análise de benchmark', 'Geração de carrosséis'],
    costPer1M: { input: 3, output: 15 },
    icon: MessageSquare,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/20',
    description: 'Especialista em textos criativos e análises de conteúdo. Gera copies de alta conversão e analisa concorrentes.',
  },
  {
    name: 'Claude Opus 4',
    provider: 'Anthropic (via OpenRouter)',
    tasks: ['Estratégia semanal', 'Auditoria de campanhas'],
    costPer1M: { input: 15, output: 75 },
    icon: Brain,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
    description: 'O modelo mais avançado para raciocínio estratégico. Usado na revisão semanal de desempenho e recomendações.',
  },
  {
    name: 'DeepSeek V3',
    provider: 'DeepSeek (via OpenRouter)',
    tasks: ['Classificação de mídia', 'Sugestões de conteúdo'],
    costPer1M: { input: 0.14, output: 0.28 },
    icon: Zap,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10 border-green-500/20',
    description: 'Modelo de altíssimo custo-benefício para tarefas simples como classificação e busca de conteúdo similar.',
  },
  {
    name: 'Gemini 2.5 Flash',
    provider: 'Google (Lovable AI)',
    tasks: ['Storyboard de vídeo', 'Prompts de frame e motion'],
    costPer1M: { input: 0.15, output: 0.6 },
    icon: Video,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    description: 'Modelo rápido e econômico para geração de roteiros visuais e prompts técnicos de vídeo.',
  },
  {
    name: 'Gemini Flash Image',
    provider: 'Google (Lovable AI)',
    tasks: ['Geração de frames iniciais', 'Edição de imagens'],
    costPer1M: { input: 0.15, output: 0.6 },
    icon: Image,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10 border-cyan-500/20',
    description: 'Gera as imagens estáticas (frames) que servem de base para a animação de vídeo.',
  },
  {
    name: 'FLUX 1.1 Pro',
    provider: 'Black Forest Labs (via OpenRouter)',
    tasks: ['Geração de imagens de alta qualidade'],
    costPer1M: { input: 0, output: 0 },
    icon: Palette,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10 border-pink-500/20',
    description: 'Motor de imagem para criação de visuais fotorrealistas e artísticos de alta resolução.',
  },
];

const VIDEO_COSTS = [
  { model: 'VEO 3.1 (Google)', creditsPerVideo: 58, platform: 'Higgsfield', duration: '8s', costEstimate: '~R$ 2,90' },
  { model: 'Sora 2 Pro Max (OpenAI)', creditsPerVideo: 108, platform: 'Higgsfield', duration: '8s', costEstimate: '~R$ 5,40' },
  { model: 'Seedance 1.5 Pro (ByteDance)', creditsPerVideo: 20, platform: 'Higgsfield', duration: '5-10s', costEstimate: '~R$ 1,00' },
];

const PLATFORM_MODULES = [
  { name: 'Campanhas', desc: 'Criação e gestão de campanhas com plano gerado por IA, alocação de verba por canal e geração automática de tarefas.', icon: Target },
  { name: 'Kanban', desc: 'Quadro de tarefas inteligente que recebe as tarefas geradas das campanhas com formato, canal e briefing pré-configurados.', icon: Layers },
  { name: 'AI Carrosséis', desc: 'Geração completa de carrosséis para Instagram/TikTok com 5 slides, copy, direção visual e exportação em PNG de alta resolução.', icon: Sparkles },
  { name: 'Vídeo IA', desc: 'Produção de vídeo cinematográfico com storyboard, frame prompts e motion prompts otimizados para VEO 3.1, Sora e Seedance.', icon: Clapperboard },
  { name: 'Estratégia', desc: 'Upload de documentos estratégicos (playbooks, pitch decks) que alimentam TODAS as gerações de conteúdo automaticamente.', icon: FileText },
  { name: 'Analytics', desc: 'Dashboard executivo com monitoramento de custos de IA, uso de tokens e performance das campanhas.', icon: BarChart3 },
  { name: 'Fórum', desc: 'Canal de comunicação da equipe onde campanhas aprovadas são publicadas automaticamente para o time criativo.', icon: MessageSquare },
  { name: 'Brand Kit', desc: 'Repositório centralizado de logos, cores, fontes e assets da marca, acessível por todas as ferramentas de criação.', icon: Palette },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function RelatorioPlataforma() {
  const { user } = useAuth();
  const [usageStats, setUsageStats] = useState<{ totalCalls: number; totalCost: number; totalTokens: number } | null>(null);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any).from('ai_usage_log')
        .select('cost_estimate, tokens_input, tokens_output')
        .eq('user_id', user.id);
      if (data) {
        setUsageStats({
          totalCalls: data.length,
          totalCost: data.reduce((s: number, r: any) => s + (r.cost_estimate || 0), 0),
          totalTokens: data.reduce((s: number, r: any) => s + (r.tokens_input || 0) + (r.tokens_output || 0), 0),
        });
      }
    })();
  }, [user]);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: `DQEF_Relatorio_Executivo_${new Date().toISOString().slice(0, 10)}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#0c0a09' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        })
        .from(reportRef.current)
        .save();
      toast.success('PDF exportado com sucesso!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao exportar PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Export button - fixed top right */}
      <div className="sticky top-0 z-10 flex justify-end px-4 py-3 bg-background/80 backdrop-blur-sm border-b border-border print:hidden">
        <Button onClick={handleExportPDF} disabled={exporting} size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          {exporting ? 'Gerando PDF…' : 'Exportar PDF'}
        </Button>
      </div>

      <div ref={reportRef} className="max-w-5xl mx-auto px-4 py-8 space-y-8" style={{ backgroundColor: '#0c0a09', color: '#fafaf9' }}>

        {/* Header */}
        <div className="text-center space-y-3">
          <Badge variant="outline" className="text-xs border-primary/30 text-primary">Relatório Executivo</Badge>
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            DQEF Marketing Hub — <span className="text-primary">Plataforma de IA</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Visão geral da plataforma de produção de conteúdo da Deixa Que Eu Faço. 
            Uma ferramenta que centraliza a criação de campanhas, conteúdo visual e vídeo 
            utilizando inteligência artificial para acelerar a produção e reduzir custos.
          </p>
        </div>

        {/* O que é */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4" style={{ pageBreakInside: 'avoid' }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">O que é o DQEF Marketing Hub?</h2>
              <p className="text-xs text-muted-foreground">Para sócios e conselho</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
            <p>
              O Hub é uma <strong className="text-foreground">ferramenta de produção de conteúdo</strong> que usa 
              inteligência artificial para criar campanhas de marketing digital de forma mais rápida e econômica 
              do que contratar agências tradicionais ou freelancers para cada peça.
            </p>
            <p>
              Em termos simples: ao invés de briefar um designer, esperar dias e pagar por peça, 
              o CMO descreve o que quer e a plataforma gera automaticamente os textos, imagens e 
              roteiros de vídeo — tudo alinhado à identidade visual da DQEF.
            </p>
            <p>
              A plataforma <strong className="text-foreground">não substitui profissionais</strong> — ela 
              acelera o processo criativo. Um humano sempre revisa, aprova e ajusta antes de publicar.
            </p>
          </div>
        </div>

        {/* Módulos */}
        <div className="space-y-4" style={{ pageBreakInside: 'avoid' }}>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Módulos da Plataforma
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PLATFORM_MODULES.map(m => (
              <div key={m.name} className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <m.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{m.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modelos de IA */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Modelos de IA Utilizados
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A plataforma usa diferentes "cérebros" de IA para diferentes tarefas — assim como uma empresa 
            contrata diferentes especialistas. Modelos mais baratos fazem tarefas simples; modelos 
            mais caros são usados apenas quando a qualidade é crítica.
          </p>
          <div className="space-y-3">
            {MODEL_INFO.map(m => (
              <div key={m.name} className={cn('rounded-xl border p-4', m.bgColor)} style={{ pageBreakInside: 'avoid' }}>
                <div className="flex items-center gap-3 mb-2">
                  <m.icon className={cn('h-5 w-5', m.color)} />
                  <div className="flex-1">
                    <p className={cn('text-sm font-bold', m.color)}>{m.name}</p>
                    <p className="text-[10px] text-muted-foreground">{m.provider}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Custo por 1M tokens</p>
                    <p className="text-xs font-mono text-foreground">
                      ${m.costPer1M.input} in / ${m.costPer1M.output} out
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{m.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {m.tasks.map(t => (
                    <span key={t} className="text-[9px] px-2 py-0.5 rounded-full bg-background/50 text-foreground border border-border/50">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custos de Vídeo */}
        <div className="space-y-4" style={{ pageBreakInside: 'avoid' }}>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Custo de Produção de Vídeo com IA
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A geração de vídeo funciona em etapas: primeiro a IA cria uma imagem estática (frame), 
            depois outro modelo "anima" essa imagem. Cada vídeo de ~8 segundos consome créditos 
            na plataforma de animação (Higgsfield).
          </p>

          {/* Higgsfield Plan Info */}
          <div className="rounded-xl border border-border bg-muted/20 p-4" style={{ pageBreakInside: 'avoid' }}>
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <p className="text-sm font-bold text-foreground">Plano Higgsfield — Custo Base</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-black text-primary">$150</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Custo mensal (USD)</p>
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">6.000</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Créditos inclusos</p>
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">$0,025</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Custo por crédito</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              Com 6.000 créditos mensais, é possível gerar aproximadamente <strong className="text-foreground">103 vídeos de 8s com VEO 3.1</strong> (58 créditos cada), 
              ou <strong className="text-foreground">55 vídeos com Sora 2</strong> (108 créditos cada), 
              ou <strong className="text-foreground">300 vídeos com Seedance</strong> (20 créditos cada).
            </p>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Modelo</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Créditos</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Duração</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Custo Est.</th>
                </tr>
              </thead>
              <tbody>
                {VIDEO_COSTS.map(v => (
                  <tr key={v.model} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-foreground">{v.model}</p>
                      <p className="text-[10px] text-muted-foreground">{v.platform}</p>
                    </td>
                    <td className="text-center px-4 py-3 font-mono text-sm text-foreground">{v.creditsPerVideo}</td>
                    <td className="text-center px-4 py-3 text-sm text-muted-foreground">{v.duration}</td>
                    <td className="text-right px-4 py-3 font-bold text-sm text-primary">{v.costEstimate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            * Custo estimado por vídeo = (créditos × $0,025) convertido a R$ pela cotação aproximada de R$ 5,80/USD.
          </p>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4" style={{ pageBreakInside: 'avoid' }}>
            <p className="text-xs font-bold text-primary mb-2">💡 Exemplo prático — Vídeo "O Ninja do AR Condicionado"</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Um vídeo de 32 segundos (4 takes de 8s) usando <strong className="text-foreground">VEO 3.1</strong>:<br />
              • 4 frames gerados por IA (Gemini Flash Image): ~R$ 0,10 total<br />
              • 4 vídeos de 8s no VEO 3.1 (58 créditos cada): 232 créditos ≈ <strong className="text-foreground">R$ 11,60</strong><br />
              • Storyboard + prompts (Gemini Flash): ~R$ 0,05<br />
              • <strong className="text-primary">Custo total estimado: ~R$ 12,00</strong> para um vídeo de 32 segundos com qualidade cinematográfica.
            </p>
            <p className="text-[10px] text-muted-foreground mt-2">
              Comparativo: uma produção equivalente com equipe (ator, cinegrafista, editor) custaria R$ 3.000–8.000.
            </p>
          </div>
        </div>

        {/* Usage stats */}
        {usageStats && (
          <div className="space-y-4" style={{ pageBreakInside: 'avoid' }}>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Uso Atual da Plataforma
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-card p-4 text-center">
                <p className="text-2xl font-black text-foreground">{usageStats.totalCalls}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Chamadas de IA</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 text-center">
                <p className="text-2xl font-black text-primary">
                  ${usageStats.totalCost.toFixed(4)}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Custo Total (USD)</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 text-center">
                <p className="text-2xl font-black text-foreground">
                  {(usageStats.totalTokens / 1000).toFixed(0)}k
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Tokens Processados</p>
              </div>
            </div>
          </div>
        )}

        {/* Workflow */}
        <div className="space-y-4" style={{ pageBreakInside: 'avoid' }}>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Como Funciona na Prática
          </h2>
          <div className="space-y-3">
            {[
              { step: '1', title: 'CMO define a campanha', desc: 'Nome, objetivo, público, canais, verba e ângulo emocional.' },
              { step: '2', title: 'IA gera o plano', desc: 'A plataforma sugere cronograma, distribuição de verba e peças criativas por canal.' },
              { step: '3', title: 'CMO aprova e ajusta', desc: 'Revisão humana. Pode pedir refinamentos à IA até o plano ficar ideal.' },
              { step: '4', title: 'Tarefas são criadas', desc: 'Carrosséis, vídeos e posts viram tarefas com formato, briefing e deadline pré-configurados.' },
              { step: '5', title: 'Criativo executa', desc: 'Cada tarefa abre na ferramenta certa com o contexto da campanha já preenchido.' },
              { step: '6', title: 'Aprovação e publicação', desc: 'Peças finalizadas passam por aprovação antes de ir ao ar.' },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-black text-primary">{s.step}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-6 border-t border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            DQEF Marketing Hub · Relatório Executivo · {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
}
