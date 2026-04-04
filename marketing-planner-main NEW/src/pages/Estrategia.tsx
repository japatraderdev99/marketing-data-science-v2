import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Target, TrendingUp, Users, Megaphone, BookOpen, AlertTriangle,
  X, Zap, FileText, PlusCircle, File, Eye, Download, Trash2,
  ImageIcon, Check, Shield, Save, ChevronDown, ChevronUp, Info,
  Sparkles, Brain, RefreshCw, Copy, BookMarked, Loader2, CheckCircle2,
  XCircle, Clock, Search, ExternalLink, Lightbulb, BarChart3,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StrategyDoc {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

interface StrategyData {
  positioning: string;
  differentials: string;
  targetAudience: string;
  pains: string;
  toneOfVoice: string;
  competitors: string;
  forbiddenTopics: string;
  currentObjective: string;
  kpis: string;
  docs: StrategyDoc[];
}

interface MetaFields {
  brandEssence: string;
  uniqueValueProp: string;
  targetPersona: {
    profile: string;
    demographics: string;
    digitalBehavior: string;
    biggestPain: string;
    dream: string;
  };
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

interface KnowledgeDoc {
  id: string;
  document_name: string;
  document_url: string;
  document_type: string | null;
  file_size: number | null;
  status: 'pending' | 'analyzing' | 'done' | 'error';
  extracted_knowledge: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
}

interface BenchmarkDoc {
  id: string;
  competitor_name: string;
  platform: string | null;
  format_type: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  notes: string | null;
  ai_insights: Record<string, unknown> | null;
  tags: string[];
  status: 'pending' | 'analyzing' | 'done' | 'error';
  created_at: string;
}

const PLATFORMS_LIST = ['Instagram', 'TikTok', 'LinkedIn', 'Facebook', 'YouTube', 'Google Ads', 'Pinterest', 'X/Twitter'] as const;
const FORMAT_TYPES = ['Carrossel', 'Reels/Shorts', 'Stories', 'Feed Post', 'Anúncio', 'Landing Page', 'Email', 'Banner'] as const;

const STRATEGY_STORAGE_KEY = 'dqef_strategy_v1';
const METAFIELDS_STORAGE_KEY = 'dqef_strategy_metafields_v1';

// ─── Section definitions ──────────────────────────────────────────────────────

const SECTIONS = [
  {
    key: 'positioning',
    label: 'Posicionamento',
    icon: Target,
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10 border-orange-400/20',
    dotColor: 'bg-orange-400',
    description: 'A âncora de tudo. Define como a marca ocupa espaço único na mente do cliente.',
    placeholder: 'Como a marca se posiciona no mercado? Qual é a promessa central?\n\nEx: Somos a única plataforma que paga o prestador na hora da conclusão, com comissão justa e profissionais verificados — sem burocracia, sem espera.',
    rows: 4,
    weight: 'critical',
  },
  {
    key: 'differentials',
    label: 'Diferenciais Competitivos',
    icon: TrendingUp,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10 border-emerald-400/20',
    dotColor: 'bg-emerald-400',
    description: 'Diferenciais com números convertem. Adjetivos não.',
    placeholder: 'Liste os diferenciais reais com dados concretos:\n\n• Comissão de 10-15% vs 27% da concorrência\n• PIX imediato na conclusão do serviço\n• Profissionais verificados por KYC (não qualquer um)\n• Zero cobrança quando não tem trabalho',
    rows: 5,
    weight: 'critical',
  },
  {
    key: 'targetAudience',
    label: 'Público-Alvo',
    icon: Users,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10 border-blue-400/20',
    dotColor: 'bg-blue-400',
    description: 'Fale para uma pessoa, não para "todo mundo". Quanto mais específico, mais efetivo.',
    placeholder: 'Descreva quem é o público principal com detalhes humanos:\n\nPerfil: Piscineiro autônomo, 28-45 anos, trabalha por conta própria\nRenda atual: R$ 3.000–8.000/mês dependendo da temporada\nDigital: WhatsApp e Instagram, nunca fez tráfego pago\nSonho: ter trabalho o ano inteiro sem depender de indicação',
    rows: 5,
    weight: 'critical',
  },
  {
    key: 'pains',
    label: 'Dores e Frustrações',
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-400/10 border-red-400/20',
    dotColor: 'bg-red-400',
    description: 'Copie a voz do cliente. Quem escreve como o cliente, vende.',
    placeholder: 'Quais as frases que o público pensa ou fala em voz alta?\n\n• "Pago 27% pro GetNinjas e ainda não fico com o cliente"\n• "No mês fraco fico sem renda e sem perspectiva"\n• "Nunca aprendi a me vender no digital"\n• "O cara que cobra menos que eu aparece na frente no Google"\n• "Trabalho 10 horas por dia e ainda não consigo escalar"',
    rows: 6,
    weight: 'high',
  },
  {
    key: 'toneOfVoice',
    label: 'Tom de Voz',
    icon: Megaphone,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10 border-purple-400/20',
    dotColor: 'bg-purple-400',
    description: 'O tom que a IA deve imitar. Exemplos concretos valem mais que adjetivos.',
    placeholder: 'Como a marca fala? Dê exemplos reais:\n\n✅ PODE: "Tu manda bem. Tu merece mais."\n✅ PODE: "O trampo é teu. A comissão não precisa ser deles."\n✅ PODE: Dados duros sem rodeios. Números que doem.\n\n❌ NÃO PODE: "Você possui habilidades excepcionais."\n❌ NÃO PODE: Linguagem corporativa, jargão de startup\n❌ NÃO PODE: Promessas vagas ("transforme sua vida")',
    rows: 6,
    weight: 'high',
  },
  {
    key: 'competitors',
    label: 'Concorrentes',
    icon: BookOpen,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10 border-yellow-400/20',
    dotColor: 'bg-yellow-400',
    description: 'Comparativos geram conteúdo viral. Nomeie com precisão estratégica.',
    placeholder: 'Quem são os concorrentes e como a marca se diferencia de cada um?\n\n• GetNinjas: cobra por lead, sem garantia de fechamento → nós cobramos só se o serviço for concluído\n• Parafuzo: taxa de 35% → nós cobramos 10-15%\n• Indicação direta: sem rastreamento, sem segurança → nós oferecemos contrato e KYC',
    rows: 4,
    weight: 'medium',
  },
  {
    key: 'forbiddenTopics',
    label: 'Tópicos Proibidos',
    icon: Shield,
    color: 'text-rose-400',
    bgColor: 'bg-rose-400/10 border-rose-400/20',
    dotColor: 'bg-rose-400',
    description: 'Limites claros evitam crises de comunicação. Seja específico.',
    placeholder: 'O que a marca nunca deve dizer, prometer ou implicar?\n\n• Não mencionar cidades ou regiões específicas nos posts\n• Não prometer "renda garantida" ou "trabalho todo dia"\n• Não atacar concorrentes pelo nome diretamente nos anúncios\n• Não usar linguagem que soe como pirâmide ou esquema',
    rows: 4,
    weight: 'high',
  },
  {
    key: 'currentObjective',
    label: 'Objetivo Atual (30–90 dias)',
    icon: Zap,
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10 border-amber-400/20',
    dotColor: 'bg-amber-400',
    description: 'O objetivo muda o tipo de conteúdo e o CTA. Seja específico com prazo e número.',
    placeholder: 'Qual é o objetivo dos próximos 30–90 dias?\n\nEx: Cadastrar 200 prestadores verificados até março de 2026.\nFoco: conversão (cadastro), não awareness.\nCanal principal: Instagram Feed + Stories.\nConteúdo: provas sociais, comparativos de comissão, depoimentos.',
    rows: 4,
    weight: 'critical',
  },
  {
    key: 'kpis',
    label: 'KPIs e Metas de Conteúdo',
    icon: TrendingUp,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10 border-cyan-400/20',
    dotColor: 'bg-cyan-400',
    description: 'KPIs guiam o tipo de CTA e o ângulo do conteúdo. Defina metas numéricas.',
    placeholder: 'Quais métricas definem sucesso para o conteúdo?\n\n• Taxa de salvamento acima de 8% (indica intenção de ação)\n• 500 cliques no link da bio por mês\n• 30% de aumento de cadastros orgânicos em 60 dias\n• CPL (Custo por Lead) abaixo de R$ 12,00\n• Taxa de conclusão de carrosséis acima de 70%',
    rows: 4,
    weight: 'medium',
  },
] as const;

type SectionKey = typeof SECTIONS[number]['key'];

const WEIGHT_LABELS: Record<string, { label: string; color: string }> = {
  critical: { label: 'Crítico', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  high: { label: 'Alto impacto', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  medium: { label: 'Importante', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-blue-400" />;
  if (type.includes('pdf')) return <FileText className="h-4 w-4 text-red-400" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

// ─── SectionCard ──────────────────────────────────────────────────────────────

function SectionCard({
  section,
  value,
  onChange,
}: {
  section: typeof SECTIONS[number];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const filled = value.trim().length > 0;
  const Icon = section.icon;
  const weight = WEIGHT_LABELS[section.weight];

  return (
    <div className={cn(
      'rounded-xl border transition-all duration-200',
      filled ? 'border-border bg-card' : 'border-border/50 bg-card/60'
    )}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', section.bgColor)}>
          <Icon className={cn('h-4 w-4', section.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{section.label}</span>
            <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px] font-bold', weight.color)}>
              {weight.label}
            </span>
            {filled && (
              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary flex items-center gap-0.5">
                <Check className="h-2.5 w-2.5" /> Preenchido
              </span>
            )}
          </div>
          {!open && filled && (
            <p className="text-xs text-muted-foreground/60 mt-0.5 truncate max-w-xs">{value.split('\n')[0]}</p>
          )}
        </div>
        <div className="shrink-0 text-muted-foreground/50">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 space-y-2.5">
          <div className="flex items-start gap-1.5 rounded-lg bg-muted/30 px-3 py-2">
            <Info className="h-3 w-3 text-muted-foreground/60 shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{section.description}</p>
          </div>
          <Textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={section.placeholder}
            rows={section.rows}
            className="text-sm resize-none bg-muted/20 border-border/60 placeholder:text-muted-foreground/35 leading-relaxed"
          />
        </div>
      )}
    </div>
  );
}

// ─── MetaFields Panel ─────────────────────────────────────────────────────────

function MetaTag({ label, value }: { label: string; value: string }) {
  const { toast } = useToast();
  return (
    <div
      className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors group"
      onClick={() => { navigator.clipboard.writeText(value); toast({ title: 'Copiado ✅', description: label }); }}
      title="Clique para copiar"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-0.5">{label}</p>
        <p className="text-xs text-foreground leading-relaxed">{value}</p>
      </div>
      <Copy className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
    </div>
  );
}

function MetaTagList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={i} className="rounded-full border border-border/50 bg-muted/30 px-2.5 py-1 text-[11px] text-foreground/80">{item}</span>
        ))}
      </div>
    </div>
  );
}

function MetaFieldsPanel({ metafields, onRegenerate, loading, onFillFromKB, fillingFromKB, hasKBDocs }: {
  metafields: MetaFields | null;
  onRegenerate: () => void;
  loading: boolean;
  onFillFromKB: () => void;
  fillingFromKB: boolean;
  hasKBDocs: boolean;
}) {
  if (!metafields) return null;
  const score = metafields.completenessScore;
  const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';
  const scoreBarColor = score >= 80 ? 'bg-emerald-400' : score >= 50 ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/15 p-1.5 border border-primary/20">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Meta-Fields Extraídos pela IA</p>
            <p className="text-[11px] text-muted-foreground">Alimentam automaticamente campanhas, copies e carrosséis</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-lg font-black font-mono', scoreColor)}>{score}%</span>
          <button
            onClick={onRegenerate}
            disabled={loading || fillingFromKB}
            className="rounded-lg border border-border/60 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40"
            title="Regenerar"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Fill from KB button */}
      {hasKBDocs && score < 100 && (
        <button
          onClick={onFillFromKB}
          disabled={fillingFromKB || loading}
          className={cn(
            'w-full flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all',
            fillingFromKB
              ? 'border-primary/30 bg-primary/10 text-primary cursor-wait'
              : 'border-teal/30 bg-teal/5 text-teal hover:bg-teal/10 hover:border-teal/50'
          )}
        >
          {fillingFromKB ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Analisando KB com modelo avançado...</>
          ) : (
            <><BookMarked className="h-4 w-4" /> Preencher campos faltantes com Knowledge Base (IA Pro)</>
          )}
        </button>
      )}
      <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-700', scoreBarColor)} style={{ width: `${score}%` }} />
      </div>
      {metafields.missingCritical.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-amber-400 mb-1">Preencha para melhorar a assertividade:</p>
            <div className="flex flex-wrap gap-1">
              {metafields.missingCritical.map((m, i) => (
                <span key={i} className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-400">{m}</span>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="rounded-lg border border-primary/15 bg-primary/5 p-3 space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70">🎯 System Prompt da Marca</p>
        <p className="text-xs text-foreground/90 leading-relaxed">{metafields.promptContext}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MetaTag label="Essência da Marca" value={metafields.brandEssence} />
        <MetaTag label="Proposta de Valor Única" value={metafields.uniqueValueProp} />
        <MetaTag label="Persona" value={metafields.targetPersona.profile} />
        <MetaTag label="Maior Dor" value={metafields.targetPersona.biggestPain} />
        <MetaTag label="Sonho do Público" value={metafields.targetPersona.dream} />
        <MetaTag label="Foco Atual de Campanha" value={metafields.currentCampaignFocus} />
        <MetaTag label="Estilo de CTA" value={metafields.ctaStyle} />
        <MetaTag label="Perfil Demográfico" value={metafields.targetPersona.demographics} />
      </div>
      <MetaTagList label="Mensagens Centrais" items={metafields.keyMessages} />
      <MetaTagList label="Ângulos de Conteúdo" items={metafields.contentAngles} />
      <MetaTagList label="Dores Mapeadas" items={metafields.painPoints} />
      <MetaTagList label="Vantagens Competitivas" items={metafields.competitiveEdge} />
      <MetaTagList label="KPIs Prioritários" items={metafields.kpiPriorities} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/70 mb-1.5">✅ Tom — Pode usar</p>
          <div className="space-y-1">
            {metafields.toneRules.use.map((r, i) => (
              <p key={i} className="text-[11px] text-foreground/75 pl-2 border-l border-emerald-400/30">{r}</p>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-400/70 mb-1.5">❌ Tom — Proibido</p>
          <div className="space-y-1">
            {metafields.toneRules.avoid.map((r, i) => (
              <p key={i} className="text-[11px] text-foreground/75 pl-2 border-l border-red-400/30">{r}</p>
            ))}
          </div>
        </div>
      </div>
      <MetaTagList label="Tópicos Proibidos" items={metafields.forbiddenTopics} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Estrategia() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [metafields, setMetafields] = useState<MetaFields | null>(() => {
    try {
      const raw = localStorage.getItem(METAFIELDS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const defaultData: StrategyData = {
    positioning: '',
    differentials: '',
    targetAudience: '',
    pains: '',
    toneOfVoice: '',
    competitors: '',
    forbiddenTopics: '',
    currentObjective: '',
    kpis: '',
    docs: [],
  };

  const [data, setData] = useState<StrategyData>(() => {
    try {
      const raw = localStorage.getItem(STRATEGY_STORAGE_KEY);
      return raw ? JSON.parse(raw) : defaultData;
    } catch {
      return defaultData;
    }
  });

  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>([]);
  const [brandBookUploading, setBrandBookUploading] = useState(false);
  const [expandedKnowledge, setExpandedKnowledge] = useState<string | null>(null);
  const [fillingFromKnowledge, setFillingFromKnowledge] = useState(false);
  const [fillingMetaFromKB, setFillingMetaFromKB] = useState(false);
  const brandBookInputRef = useRef<HTMLInputElement>(null);

  const [benchmarks, setBenchmarks] = useState<BenchmarkDoc[]>([]);
  const [benchmarkUploading, setBenchmarkUploading] = useState(false);
  const [expandedBenchmark, setExpandedBenchmark] = useState<string | null>(null);
  const [benchmarkCompetitor, setBenchmarkCompetitor] = useState('');
  const [benchmarkPlatform, setBenchmarkPlatform] = useState('');
  const [benchmarkFormat, setBenchmarkFormat] = useState('');
  const benchmarkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const loadKnowledgeDocs = useCallback(async () => {
    const { data: docs } = await supabase
      .from('strategy_knowledge')
      .select('*')
      .order('created_at', { ascending: false });
    if (docs) setKnowledgeDocs(docs as KnowledgeDoc[]);
  }, []);

  const loadBenchmarks = useCallback(async () => {
    const { data: docs } = await supabase
      .from('competitor_benchmarks')
      .select('*')
      .order('created_at', { ascending: false });
    if (docs) setBenchmarks(docs as unknown as BenchmarkDoc[]);
  }, []);

  useEffect(() => {
    loadKnowledgeDocs();
    loadBenchmarks();
  }, [loadKnowledgeDocs, loadBenchmarks]);

  const handleBrandBookUpload = async (files: FileList | null) => {
    if (!files || !userId) return;
    setBrandBookUploading(true);

    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) {
        toast({ title: 'Arquivo muito grande', description: `${file.name} excede 20MB.`, variant: 'destructive' });
        continue;
      }
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
      const uuid = crypto.randomUUID();
      const storagePath = `${userId}/brandbooks/${uuid}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('media-library')
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        toast({ title: 'Erro no upload', description: uploadError.message, variant: 'destructive' });
        continue;
      }

      const { data: urlData } = supabase.storage.from('media-library').getPublicUrl(storagePath);

      // Insert record in DB (pending status)
      const { data: inserted, error: insertError } = await supabase
        .from('strategy_knowledge')
        .insert({
          user_id: userId,
          document_name: file.name,
          document_url: urlData.publicUrl,
          document_type: file.type,
          file_size: file.size,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError || !inserted) {
        toast({ title: 'Erro ao registrar documento', description: insertError?.message, variant: 'destructive' });
        continue;
      }

      await loadKnowledgeDocs();
      toast({ title: `${file.name} enviado ✅`, description: 'Clique em "Analisar com IA" para extrair o knowledge base.' });

      // Auto-trigger analysis
      await triggerAnalysis(inserted.id, urlData.publicUrl, file.name);
    }

    setBrandBookUploading(false);
  };

  const triggerAnalysis = async (knowledgeId: string, documentUrl: string, documentName: string) => {
    setKnowledgeDocs(prev => prev.map(d => d.id === knowledgeId ? { ...d, status: 'analyzing' } : d));
    try {
      const { data: result, error } = await supabase.functions.invoke('analyze-brand-document', {
        body: { knowledgeId, documentUrl, documentName },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      toast({ title: 'Brand book analisado ✅', description: `Knowledge base extraído e salvo no backend.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro na análise', description: msg, variant: 'destructive' });
    }
    await loadKnowledgeDocs();
  };

  const handleFillFromKnowledge = async () => {
    const doneDocs = knowledgeDocs.filter(d => d.status === 'done');
    if (doneDocs.length === 0) {
      toast({ title: 'Nenhum documento analisado', description: 'Faça upload de um brand book e aguarde a análise da IA antes de preencher.', variant: 'destructive' });
      return;
    }
    setFillingFromKnowledge(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('fill-playbook-from-knowledge', {
        body: { currentData: data },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      const playbook = result.playbook;
      const filled = result.playbook?.filledFields as string[] ?? [];

      setData(prev => {
        const updated = {
          ...prev,
          positioning: playbook.positioning || prev.positioning,
          differentials: playbook.differentials || prev.differentials,
          targetAudience: playbook.targetAudience || prev.targetAudience,
          pains: playbook.pains || prev.pains,
          toneOfVoice: playbook.toneOfVoice || prev.toneOfVoice,
          competitors: playbook.competitors || prev.competitors,
          forbiddenTopics: playbook.forbiddenTopics || prev.forbiddenTopics,
          currentObjective: playbook.currentObjective || prev.currentObjective,
          kpis: playbook.kpis || prev.kpis,
        };
        localStorage.setItem(STRATEGY_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
      setSaved(false);
      toast({
        title: `✅ Playbook preenchido com knowledge base`,
        description: filled.length > 0
          ? `${filled.length} seção(ões) preenchidas: ${filled.slice(0, 3).join(', ')}${filled.length > 3 ? '...' : ''}`
          : `Campos atualizados com base em ${result.documentsUsed} documento(s).`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro ao preencher playbook', description: msg, variant: 'destructive' });
    } finally {
      setFillingFromKnowledge(false);
    }
  };

  const handleDeleteKnowledgeDoc = async (doc: KnowledgeDoc) => {
    const parts = doc.document_url.split('/media-library/');
    if (parts[1]) await supabase.storage.from('media-library').remove([parts[1]]);
    await supabase.from('strategy_knowledge').delete().eq('id', doc.id);
    setKnowledgeDocs(prev => prev.filter(d => d.id !== doc.id));
    toast({ title: 'Documento removido', description: doc.document_name });
  };

  // ─── Benchmark handlers ────────────────────────────────────────────────────
  const handleBenchmarkUpload = async (files: FileList | null) => {
    if (!files || !userId || !benchmarkCompetitor.trim()) {
      if (!benchmarkCompetitor.trim()) {
        toast({ title: 'Nome do concorrente obrigatório', description: 'Preencha o nome antes de enviar.', variant: 'destructive' });
      }
      return;
    }
    setBenchmarkUploading(true);

    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) {
        toast({ title: 'Arquivo muito grande', description: `${file.name} excede 20MB.`, variant: 'destructive' });
        continue;
      }
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
      const uuid = crypto.randomUUID();
      const storagePath = `${userId}/benchmarks/${uuid}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('benchmarks')
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        toast({ title: 'Erro no upload', description: uploadError.message, variant: 'destructive' });
        continue;
      }

      const { data: urlData } = supabase.storage.from('benchmarks').getPublicUrl(storagePath);

      const { data: inserted, error: insertError } = await supabase
        .from('competitor_benchmarks')
        .insert({
          user_id: userId,
          competitor_name: benchmarkCompetitor.trim(),
          platform: benchmarkPlatform || null,
          format_type: benchmarkFormat || null,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError || !inserted) {
        toast({ title: 'Erro ao registrar benchmark', description: insertError?.message, variant: 'destructive' });
        continue;
      }

      await loadBenchmarks();
      toast({ title: `${file.name} enviado ✅`, description: 'Analisando com IA...' });

      await triggerBenchmarkAnalysis(inserted.id, urlData.publicUrl, benchmarkCompetitor.trim(), benchmarkPlatform, benchmarkFormat);
    }

    setBenchmarkUploading(false);
    setBenchmarkCompetitor('');
    setBenchmarkPlatform('');
    setBenchmarkFormat('');
  };

  const triggerBenchmarkAnalysis = async (benchmarkId: string, fileUrl: string, competitorName: string, platform: string, formatType: string) => {
    setBenchmarks(prev => prev.map(b => b.id === benchmarkId ? { ...b, status: 'analyzing' } : b));
    try {
      const { data: result, error } = await supabase.functions.invoke('analyze-benchmark', {
        body: { benchmarkId, fileUrl, competitorName, platform, formatType },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      toast({ title: 'Benchmark analisado ✅', description: 'Insights gerados com a voz da sua marca.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro na análise', description: msg, variant: 'destructive' });
    }
    await loadBenchmarks();
  };

  const handleDeleteBenchmark = async (doc: BenchmarkDoc) => {
    if (doc.file_url) {
      const parts = doc.file_url.split('/benchmarks/');
      if (parts[1]) await supabase.storage.from('benchmarks').remove([parts[1]]);
    }
    await supabase.from('competitor_benchmarks').delete().eq('id', doc.id);
    setBenchmarks(prev => prev.filter(b => b.id !== doc.id));
    toast({ title: 'Benchmark removido' });
  };

  const update = (field: SectionKey, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem(STRATEGY_STORAGE_KEY, JSON.stringify(data));
    setSaved(true);
    toast({ title: 'Playbook salvo ✅', description: 'Estratégia armazenada e pronta para alimentar a IA.' });
    setTimeout(() => setSaved(false), 4000);
  };

  const handleExtract = async () => {
    setExtracting(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('extract-strategy-metafields', {
        body: { strategyData: data },
      });
      if (error) throw error;
      const mf = result.metafields as MetaFields;
      setMetafields(mf);
      localStorage.setItem(METAFIELDS_STORAGE_KEY, JSON.stringify(mf));
      toast({ title: 'Meta-fields extraídos ✅', description: `Score do playbook: ${mf.completenessScore}%` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro ao extrair meta-fields', description: msg, variant: 'destructive' });
    } finally {
      setExtracting(false);
    }
  };

  const handleFillMetaFromKB = async () => {
    const doneDocs = knowledgeDocs.filter(d => d.status === 'done');
    if (doneDocs.length === 0) {
      toast({ title: 'Nenhum documento analisado', description: 'Envie e analise documentos no Knowledge Base primeiro.', variant: 'destructive' });
      return;
    }
    setFillingMetaFromKB(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('fill-metafields-from-knowledge', {
        body: { currentMetafields: metafields, strategyData: data },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      const mf = result.metafields as MetaFields;
      setMetafields(mf);
      localStorage.setItem(METAFIELDS_STORAGE_KEY, JSON.stringify(mf));

      const filledFromKB = (mf as any).filledFromKB as string[] | undefined;
      const confidenceNotes = (mf as any).confidenceNotes as { high?: string[]; medium?: string[]; low?: string[] } | undefined;

      toast({
        title: `✅ Meta-fields preenchidos via Knowledge Base`,
        description: filledFromKB && filledFromKB.length > 0
          ? `${filledFromKB.length} campo(s) preenchidos/melhorados. ${confidenceNotes?.low?.length ? `⚠️ ${confidenceNotes.low.length} campo(s) precisam de validação.` : 'Valide os resultados abaixo.'}`
          : `Análise concluída com ${result.documentsUsed} documento(s). Valide os resultados.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro ao preencher meta-fields', description: msg, variant: 'destructive' });
    } finally {
      setFillingMetaFromKB(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !userId) return;
    setUploading(true);
    const newDocs: StrategyDoc[] = [];

    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) {
        toast({ title: 'Arquivo muito grande', description: `${file.name} excede 20MB.`, variant: 'destructive' });
        continue;
      }
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
      const uuid = crypto.randomUUID();
      const storagePath = `${userId}/strategy/${uuid}.${ext}`;

      const { error } = await supabase.storage
        .from('media-library')
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (error) {
        toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
        continue;
      }

      const { data: urlData } = supabase.storage.from('media-library').getPublicUrl(storagePath);
      newDocs.push({
        id: uuid, name: file.name, url: urlData.publicUrl,
        size: file.size, type: file.type, uploadedAt: new Date().toISOString(),
      });
    }

    setUploading(false);
    if (newDocs.length > 0) {
      setData(prev => {
        const updated = { ...prev, docs: [...prev.docs, ...newDocs] };
        localStorage.setItem(STRATEGY_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
      toast({ title: `${newDocs.length} arquivo(s) enviado(s) ✅` });
    }
  };

  const handleDeleteDoc = async (doc: StrategyDoc) => {
    if (!userId) return;
    const parts = doc.url.split('/media-library/');
    if (parts[1]) await supabase.storage.from('media-library').remove([parts[1]]);
    setData(prev => {
      const updated = { ...prev, docs: prev.docs.filter(d => d.id !== doc.id) };
      localStorage.setItem(STRATEGY_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    toast({ title: 'Arquivo removido', description: doc.name });
  };

  // Progress
  const filledCount = SECTIONS.filter(s => (data[s.key as SectionKey] as string).trim().length > 0).length;
  const pct = Math.round((filledCount / SECTIONS.length) * 100);

  const criticalSections = SECTIONS.filter(s => s.weight === 'critical');
  const criticalFilled = criticalSections.filter(s => (data[s.key as SectionKey] as string).trim().length > 0).length;

  // Scorecard data derived from strategy
  const scorecardItems = [
    { label: 'Seções Críticas', value: `${criticalFilled}/${criticalSections.length}`, ok: criticalFilled === criticalSections.length, icon: Target },
    { label: 'Completude Geral', value: `${pct}%`, ok: pct >= 80, icon: TrendingUp },
    { label: 'Brand Book', value: knowledgeDocs.filter(d => d.status === 'done').length > 0 ? 'Ativo' : 'Pendente', ok: knowledgeDocs.some(d => d.status === 'done'), icon: BookMarked },
    { label: 'Benchmarks', value: benchmarks.filter(b => b.status === 'done').length > 0 ? `${benchmarks.filter(b => b.status === 'done').length} ref.` : 'Nenhum', ok: benchmarks.some(b => b.status === 'done'), icon: BarChart3 },
    { label: 'Meta-Fields IA', value: metafields ? `${metafields.completenessScore}%` : 'Não gerado', ok: !!metafields && (metafields.completenessScore ?? 0) >= 70, icon: Brain },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* ── C-Level Scorecard ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {scorecardItems.map(({ label, value, ok, icon: Icon }) => (
            <div key={label} className={cn(
              'rounded-xl border p-3.5 flex flex-col gap-2',
              ok ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-amber-500/25 bg-amber-500/5'
            )}>
              <div className="flex items-center justify-between">
                <Icon className={cn('h-4 w-4', ok ? 'text-emerald-400' : 'text-amber-400')} />
                {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
              </div>
              <p className={cn('text-lg font-black', ok ? 'text-emerald-400' : 'text-amber-400')}>{value}</p>
              <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Hero header ── */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary/15 p-3 border border-primary/20">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-black text-foreground tracking-tight mb-1">Playbook Estratégico</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Este documento norteia <strong className="text-foreground">todas</strong> as criações e comunicações da marca.
                Quanto mais preciso, mais assertivo é o conteúdo gerado pela IA.
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Preenchimento do playbook</span>
              <span className="font-mono font-bold text-primary">{pct}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground/60">
              <span>{filledCount} de {SECTIONS.length} seções preenchidas</span>
              <span className={cn(
                'font-semibold',
                criticalFilled === criticalSections.length ? 'text-emerald-400' : 'text-orange-400'
              )}>
                {criticalFilled}/{criticalSections.length} críticos ✓
              </span>
            </div>
          </div>
        </div>

        {/* ── Status badges ── */}
        {pct < 100 && (
          <div className="flex flex-wrap gap-2">
            {SECTIONS.filter(s => !(data[s.key as SectionKey] as string).trim()).map(s => (
              <span key={s.key} className={cn(
                'flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold',
                WEIGHT_LABELS[s.weight].color
              )}>
                <s.icon className="h-2.5 w-2.5" />
                {s.label} · {WEIGHT_LABELS[s.weight].label}
              </span>
            ))}
          </div>
        )}

        {/* ── Knowledge Base Upload (prominent position) ── */}
        <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/8 to-transparent p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/15 p-2.5 border border-primary/20">
                <BookMarked className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-base font-black text-foreground flex items-center gap-2">
                  📚 Knowledge Base
                  {knowledgeDocs.length > 0 && (
                    <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
                      {knowledgeDocs.filter(d => d.status === 'done').length}/{knowledgeDocs.length} analisados
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Envie seu playbook de marketing, brand book, pitch deck, guias de marca e documentos estratégicos. A IA extrai e salva o conhecimento automaticamente.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-muted/30 border border-border px-3 py-2.5">
            <Lightbulb className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
               <strong className="text-foreground">Dica:</strong> Envie PDFs do playbook de marketing, pitch decks, apresentações de brand book, documentos de posicionamento e guias de tom de voz. 
               Quanto mais completa a base, mais precisa será a IA nas campanhas e criativos.
            </p>
          </div>

          <input ref={brandBookInputRef} type="file" multiple
            accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp" className="hidden"
            onChange={e => handleBrandBookUpload(e.target.files)} />
          <button
            onClick={() => brandBookInputRef.current?.click()}
            disabled={brandBookUploading || !userId}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary/70 hover:bg-primary/10 transition-all py-6 text-sm font-semibold text-muted-foreground hover:text-primary disabled:opacity-40"
          >
            {brandBookUploading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando e analisando...</>
              : <><PlusCircle className="h-5 w-5 text-primary/60" /> Enviar documentos estratégicos <span className="text-[11px] text-muted-foreground/50">· PDF, PPT, DOC, imagem · máx 20MB</span></>
            }
          </button>

          {knowledgeDocs.length > 0 && (
            <div className="space-y-2">
              {knowledgeDocs.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
                  <div className="shrink-0">
                    {doc.document_type?.includes('pdf') ? <FileText className="h-4 w-4 text-red-400" />
                      : doc.document_type?.startsWith('image/') ? <ImageIcon className="h-4 w-4 text-blue-400" />
                      : <File className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{doc.document_name}</p>
                    <p className="text-[10px] text-muted-foreground/60">
                      {doc.file_size ? formatBytes(doc.file_size) : ''} · {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {doc.status === 'done' && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-2.5 w-2.5" /> Extraído</span>}
                    {doc.status === 'analyzing' && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400 flex items-center gap-1"><Loader2 className="h-2.5 w-2.5 animate-spin" /> Analisando</span>}
                    {doc.status === 'pending' && <button onClick={() => triggerAnalysis(doc.id, doc.document_url, doc.document_name)} className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/25"><Sparkles className="h-2.5 w-2.5 inline mr-0.5" />Analisar</button>}
                    {doc.status === 'error' && <button onClick={() => triggerAnalysis(doc.id, doc.document_url, doc.document_name)} className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400 hover:bg-red-500/25"><XCircle className="h-2.5 w-2.5 inline mr-0.5" />Tentar</button>}
                    <button onClick={() => handleDeleteKnowledgeDoc(doc)} className="rounded p-1 hover:bg-destructive/15 transition-colors group"><Trash2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-destructive" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {knowledgeDocs.some(d => d.status === 'done') && (
            <button
              onClick={handleFillFromKnowledge}
              disabled={fillingFromKnowledge}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/8 hover:bg-primary/15 hover:border-primary/60 transition-all py-3 text-sm font-semibold text-primary disabled:opacity-40"
            >
              {fillingFromKnowledge
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Preenchendo playbook com KB...</>
                : <><Sparkles className="h-4 w-4" /> Preencher playbook automaticamente com Knowledge Base</>
              }
            </button>
          )}
        </div>

        {/* ── Sections ── */}
        <div className="space-y-3">
          {SECTIONS.map(section => (
            <SectionCard
              key={section.key}
              section={section}
              value={data[section.key as SectionKey] as string}
              onChange={v => update(section.key as SectionKey, v)}
            />
          ))}
        </div>




        {/* ── Arquivos de Referência Avulsos ── */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted/50 p-2 border border-border">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                Arquivos de Referência
                {data.docs.length > 0 && (
                  <span className="rounded-full bg-muted/60 px-2 py-0.5 text-xs font-bold text-muted-foreground">
                    {data.docs.length}
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Decks, guides de marca, pesquisas, briefings, referências visuais
              </p>
            </div>
          </div>

          {/* Doc list */}
          {data.docs.length > 0 && (
            <div className="space-y-2">
              {data.docs.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                  <div className="shrink-0">{getFileIcon(doc.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                    <p className="text-[10px] text-muted-foreground/60">
                      {formatBytes(doc.size)} · {new Date(doc.uploadedAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {doc.type.startsWith('image/') && (
                      <button
                        onClick={() => setPreview(preview === doc.url ? null : doc.url)}
                        className="rounded p-1.5 hover:bg-muted transition-colors"
                        title="Visualizar"
                      >
                        <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded p-1.5 hover:bg-muted transition-colors"
                      title="Abrir"
                    >
                      <Download className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </a>
                    <button
                      onClick={() => handleDeleteDoc(doc)}
                      className="rounded p-1.5 hover:bg-destructive/15 transition-colors group"
                      title="Remover"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Image preview */}
          {preview && (
            <div className="relative rounded-xl overflow-hidden border border-border">
              <img src={preview} alt="Preview" className="w-full object-contain max-h-64" />
              <button
                onClick={() => setPreview(null)}
                className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 hover:bg-black/80"
              >
                <X className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          )}

          {/* Upload button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={e => handleFileUpload(e.target.files)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !userId}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all py-4 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            {uploading
              ? <><span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Enviando...</>
              : <><PlusCircle className="h-4 w-4" /> Adicionar arquivo de referência</>
            }
          </button>
        </div>

        {/* ── Benchmark de Concorrentes ── */}
        <div className="rounded-xl border border-amber-500/20 bg-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/15 p-2 border border-amber-500/20">
              <BarChart3 className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                Benchmark de Concorrentes
                {benchmarks.length > 0 && (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-400">
                    {benchmarks.length}
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Envie materiais de concorrentes — a IA analisa e gera insights adaptados à comunicação da sua marca
              </p>
            </div>
          </div>

          {/* Upload form */}
          <div className="space-y-3 rounded-xl border border-border bg-muted/10 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input
                value={benchmarkCompetitor}
                onChange={e => setBenchmarkCompetitor(e.target.value)}
                placeholder="Nome do concorrente *"
                className="text-sm bg-muted/20"
              />
              <select
                value={benchmarkPlatform}
                onChange={e => setBenchmarkPlatform(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Plataforma (opcional)</option>
                {PLATFORMS_LIST.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select
                value={benchmarkFormat}
                onChange={e => setBenchmarkFormat(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Formato (opcional)</option>
                {FORMAT_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <input ref={benchmarkInputRef} type="file" multiple
              accept="image/*,.pdf,.png,.jpg,.jpeg,.webp,.gif" className="hidden"
              onChange={e => handleBenchmarkUpload(e.target.files)} />
            <button
              onClick={() => benchmarkInputRef.current?.click()}
              disabled={benchmarkUploading || !userId || !benchmarkCompetitor.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/5 transition-all py-4 text-sm font-medium text-muted-foreground hover:text-amber-400 disabled:opacity-40"
            >
              {benchmarkUploading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando e analisando...</>
                : <><Search className="h-4 w-4" /> Upload de material do concorrente <span className="text-[11px] text-muted-foreground/50">· Print, anúncio, carrossel · máx 20MB</span></>
              }
            </button>
          </div>

          {/* Benchmark list */}
          {benchmarks.length > 0 && (
            <div className="space-y-3">
              {benchmarks.map(doc => (
                <div key={doc.id} className="rounded-xl border border-border bg-muted/20 overflow-hidden">
                  <div className="flex items-center gap-3 px-3 py-3">
                    {doc.file_url && doc.file_url.match(/\.(png|jpg|jpeg|webp|gif)$/i) ? (
                      <img src={doc.file_url} alt="" className="h-12 w-12 rounded-lg object-cover border border-border shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-amber-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{doc.competitor_name}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {doc.platform && <span className="text-[10px] rounded-full bg-muted/50 px-1.5 py-0.5 text-muted-foreground">{doc.platform}</span>}
                        {doc.format_type && <span className="text-[10px] rounded-full bg-muted/50 px-1.5 py-0.5 text-muted-foreground">{doc.format_type}</span>}
                        <span className="text-[10px] text-muted-foreground/50">{doc.file_name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {doc.status === 'pending' && (
                        <button onClick={() => doc.file_url && triggerBenchmarkAnalysis(doc.id, doc.file_url, doc.competitor_name, doc.platform || '', doc.format_type || '')}
                          className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400 hover:bg-amber-500/25 transition-colors">
                          <Sparkles className="h-2.5 w-2.5" /> Analisar
                        </button>
                      )}
                      {doc.status === 'analyzing' && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                          <Loader2 className="h-2.5 w-2.5 animate-spin" /> Analisando...
                        </span>
                      )}
                      {doc.status === 'done' && (
                        <button onClick={() => setExpandedBenchmark(expandedBenchmark === doc.id ? null : doc.id)}
                          className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-500/25 transition-colors">
                          <Lightbulb className="h-2.5 w-2.5" /> Insights · {expandedBenchmark === doc.id ? 'Fechar' : 'Ver'}
                        </button>
                      )}
                      {doc.status === 'error' && (
                        <button onClick={() => doc.file_url && triggerBenchmarkAnalysis(doc.id, doc.file_url, doc.competitor_name, doc.platform || '', doc.format_type || '')}
                          className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400 hover:bg-red-500/25 transition-colors">
                          <XCircle className="h-2.5 w-2.5" /> Erro · Tentar novamente
                        </button>
                      )}
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="rounded p-1.5 hover:bg-muted transition-colors">
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                        </a>
                      )}
                      <button onClick={() => handleDeleteBenchmark(doc)} className="rounded p-1.5 hover:bg-destructive/15 transition-colors group">
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-destructive" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded insights */}
                  {doc.status === 'done' && expandedBenchmark === doc.id && doc.ai_insights && (
                    <div className="border-t border-border bg-muted/10 px-4 py-4 space-y-4">
                      {doc.ai_insights.summary && (
                        <div className="rounded-lg bg-amber-500/5 border border-amber-500/15 px-3 py-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/70 mb-1">📊 Resumo da Análise</p>
                          <p className="text-xs text-foreground/85 leading-relaxed">{String(doc.ai_insights.summary)}</p>
                        </div>
                      )}

                      {doc.ai_insights.competitorAnalysis && (() => {
                        const ca = doc.ai_insights.competitorAnalysis as Record<string, unknown>;
                        return (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Análise do Concorrente</p>
                            <div className="grid grid-cols-2 gap-2">
                              {Array.isArray(ca.strengths) && ca.strengths.length > 0 && (
                                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                                  <p className="text-[10px] font-bold text-emerald-400 mb-1">✅ Pontos fortes</p>
                                  {(ca.strengths as string[]).map((s, i) => <p key={i} className="text-[11px] text-foreground/80">• {s}</p>)}
                                </div>
                              )}
                              {Array.isArray(ca.weaknesses) && ca.weaknesses.length > 0 && (
                                <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
                                  <p className="text-[10px] font-bold text-red-400 mb-1">❌ Pontos fracos</p>
                                  {(ca.weaknesses as string[]).map((s, i) => <p key={i} className="text-[11px] text-foreground/80">• {s}</p>)}
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {ca.copyStyle && (
                                <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                                  <p className="text-[10px] font-bold text-muted-foreground/60 mb-0.5">ESTILO DE COPY</p>
                                  <p className="text-foreground">{String(ca.copyStyle)}</p>
                                </div>
                              )}
                              {ca.hook && (
                                <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                                  <p className="text-[10px] font-bold text-muted-foreground/60 mb-0.5">GANCHO</p>
                                  <p className="text-foreground">{String(ca.hook)}</p>
                                </div>
                              )}
                              {ca.cta && (
                                <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                                  <p className="text-[10px] font-bold text-muted-foreground/60 mb-0.5">CTA</p>
                                  <p className="text-foreground">{String(ca.cta)}</p>
                                </div>
                              )}
                              {ca.visualStyle && (
                                <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                                  <p className="text-[10px] font-bold text-muted-foreground/60 mb-0.5">ESTILO VISUAL</p>
                                  <p className="text-foreground">{String(ca.visualStyle)}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {doc.ai_insights.adaptationInsights && (() => {
                        const ai = doc.ai_insights.adaptationInsights as Record<string, unknown>;
                        return (
                          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-3 space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70">🎯 Como adaptar para a sua marca</p>
                            {Array.isArray(ai.whatToAdapt) && ai.whatToAdapt.length > 0 && (
                              <div>
                                <p className="text-[10px] font-semibold text-emerald-400 mb-1">Adaptar:</p>
                                {(ai.whatToAdapt as string[]).map((s, i) => <p key={i} className="text-[11px] text-foreground/80 pl-2 border-l border-emerald-400/30">→ {s}</p>)}
                              </div>
                            )}
                            {Array.isArray(ai.whatToAvoid) && ai.whatToAvoid.length > 0 && (
                              <div>
                                <p className="text-[10px] font-semibold text-red-400 mb-1">Não copiar:</p>
                                {(ai.whatToAvoid as string[]).map((s, i) => <p key={i} className="text-[11px] text-foreground/80 pl-2 border-l border-red-400/30">✗ {s}</p>)}
                              </div>
                            )}
                            {ai.suggestedAngle && (
                              <div className="rounded bg-primary/10 px-2.5 py-1.5">
                                <p className="text-[10px] font-bold text-primary/70">Ângulo sugerido</p>
                                <p className="text-xs text-foreground">{String(ai.suggestedAngle)}</p>
                              </div>
                            )}
                            {ai.suggestedHook && (
                              <div className="rounded bg-primary/10 px-2.5 py-1.5">
                                <p className="text-[10px] font-bold text-primary/70">Gancho adaptado</p>
                                <p className="text-xs text-foreground">{String(ai.suggestedHook)}</p>
                              </div>
                            )}
                            {ai.suggestedCTA && (
                              <div className="rounded bg-primary/10 px-2.5 py-1.5">
                                <p className="text-[10px] font-bold text-primary/70">CTA adaptado</p>
                                <p className="text-xs text-foreground">{String(ai.suggestedCTA)}</p>
                              </div>
                            )}
                            {ai.differentiationOpportunity && (
                              <div className="rounded bg-amber-500/10 px-2.5 py-1.5">
                                <p className="text-[10px] font-bold text-amber-400/70">💡 Oportunidade de diferenciação</p>
                                <p className="text-xs text-foreground">{String(ai.differentiationOpportunity)}</p>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {Array.isArray(doc.ai_insights.actionItems) && (doc.ai_insights.actionItems as string[]).length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">📋 Ações Concretas</p>
                          <div className="space-y-1">
                            {(doc.ai_insights.actionItems as string[]).map((item, i) => (
                              <div key={i} className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                                <span className="text-primary text-xs mt-0.5 font-bold">{i + 1}.</span>
                                <p className="text-xs text-foreground/80">{item}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {typeof doc.ai_insights.overallScore === 'number' && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground">Relevância para benchmark:</span>
                          <span className={cn('text-sm font-bold font-mono',
                            (doc.ai_insights.overallScore as number) >= 70 ? 'text-emerald-400'
                              : (doc.ai_insights.overallScore as number) >= 40 ? 'text-amber-400' : 'text-red-400'
                          )}>{String(doc.ai_insights.overallScore)}%</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="text-center text-[11px] text-muted-foreground/40">
            A IA analisa o material do concorrente e gera insights com a comunicação e marca pessoal da Deixa Que Eu Faço
          </p>
        </div>

        {/* ── AI Extract + MetaFields ── */}
        <div className="space-y-3">
          <Button
            onClick={handleExtract}
            disabled={extracting}
            size="lg"
            variant="outline"
            className="w-full h-12 text-sm font-bold rounded-xl border-primary/30 hover:border-primary/60 hover:bg-primary/5 text-primary gap-2"
          >
            {extracting
              ? <><RefreshCw className="h-4 w-4 animate-spin" /> Analisando playbook com IA...</>
              : <><Sparkles className="h-4 w-4" /> {metafields ? 'Regenerar meta-fields da IA' : 'Extrair meta-fields com IA'}</>
            }
          </Button>
          {!metafields && !extracting && (
            <p className="text-center text-[11px] text-muted-foreground/50">
              A IA analisa seu playbook e extrai campos estruturados que norteiam campanhas e copies
            </p>
          )}
          <MetaFieldsPanel
            metafields={metafields}
            onRegenerate={handleExtract}
            loading={extracting}
            onFillFromKB={handleFillMetaFromKB}
            fillingFromKB={fillingMetaFromKB}
            hasKBDocs={knowledgeDocs.some(d => d.status === 'done')}
          />
        </div>

        {/* ── Save ── */}
        <div className="sticky bottom-4">
          <Button
            onClick={handleSave}
            size="lg"
            className={cn(
              'w-full h-13 text-base font-bold rounded-xl shadow-lg transition-all',
              saved
                ? 'bg-emerald-600 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20'
            )}
          >
            {saved
              ? <><Check className="h-5 w-5 mr-2" /> Playbook salvo com sucesso</>
              : <><Save className="h-5 w-5 mr-2" /> Salvar playbook estratégico</>
            }
          </Button>
          <p className="text-center text-[11px] text-muted-foreground/50 mt-2">
            Os dados são salvos localmente e alimentam a IA em todas as gerações
          </p>
        </div>

      </div>
    </div>
  );
}
