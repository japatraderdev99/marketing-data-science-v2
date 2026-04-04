import { useState } from 'react';
import {
  Target, TrendingUp, Users, AlertTriangle, Megaphone,
  BookOpen, Shield, Zap, ChevronDown, ChevronUp, Info, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SECTIONS = [
  {
    key: 'positioning', label: 'Posicionamento', icon: Target,
    color: 'text-orange-400', bgColor: 'bg-orange-400/10 border-orange-400/20',
    description: 'A âncora de tudo. Define como a marca ocupa espaço único na mente do cliente.',
    weight: 'critical' as const,
    mockValue: "Solução para a procrastinação e a sobrecarga da vida moderna, onde o cliente não precisa 'chamar um encanador', mas sim 'cuidar da casa dele', e o prestador não 'pega um serviço', mas 'gere o negócio dele'.",
  },
  {
    key: 'differentials', label: 'Diferenciais Competitivos', icon: TrendingUp,
    color: 'text-emerald-400', bgColor: 'bg-emerald-400/10 border-emerald-400/20',
    description: 'Diferenciais com números convertem. Adjetivos não.',
    weight: 'critical' as const,
    mockValue: 'Foco na retenção do cliente e do prestador através de mecanismos como histórico completo, profissionais favoritos, recorrência programada, carteira de clientes e capacitação. Modelo de monetização diversificado, incluindo comissão de serviço (15% sobre transação), taxas de conveniência, assinaturas premium para prestadores e clientes, e receitas de produto, mídia e financeiras. Taxas justas de 10-15% sobre trabalhos concluídos, diferente de apps que cobram 27%.',
  },
  {
    key: 'targetAudience', label: 'Público-Alvo', icon: Users,
    color: 'text-blue-400', bgColor: 'bg-blue-400/10 border-blue-400/20',
    description: 'Fale para uma pessoa, não para "todo mundo". Quanto mais específico, mais efetivo.',
    weight: 'critical' as const,
    mockValue: 'Brasileiro com uma lista invisível de coisas para resolver em casa, que se sente cobrado pela vida moderna (trabalho, família, saúde, social) e não tem tempo para consertar ou manter sua casa. Sente-se sobrecarregado, procrastina tarefas domésticas, busca alívio e praticidade, valoriza o tempo livre e a qualidade de vida. Prestadores de serviços locais e clientes que buscam profissionais confiáveis, com idade entre 25-45 anos, de diversas etnias (pardos, brancos, negros).',
  },
  {
    key: 'pains', label: 'Dores e Frustrações', icon: AlertTriangle,
    color: 'text-red-400', bgColor: 'bg-red-400/10 border-red-400/20',
    description: 'Copie a voz do cliente. Quem escreve como o cliente, vende.',
    weight: 'high' as const,
    mockValue: 'Minha lista de afazeres domésticos e de manutenção só cresce e nunca é resolvida, me gerando frustração e falta de tempo. Eu me sinto cobrado pela vida moderna e não tenho tempo para cuidar da minha casa. Para prestadores: taxas abusivas, leads que não convertem, pagamentos que demoram 30 dias. Para clientes: dificuldade de encontrar profissionais confiáveis e seguros.',
  },
  {
    key: 'toneOfVoice', label: 'Tom de Voz', icon: Megaphone,
    color: 'text-purple-400', bgColor: 'bg-purple-400/10 border-purple-400/20',
    description: 'O tom que a IA deve imitar. Exemplos concretos valem mais que adjetivos.',
    weight: 'high' as const,
    mockValue: "Cotidiano, leve, cúmplice, direto e honesto, acessível e humano, confiável e sério, otimista e engajador, justo e transparente. ✅ Use linguagem que gera identificação ('Isso sou eu', 'Me senti atacado'), humor de reconhecimento, linguagem que valida a procrastinação ('Todo mundo é assim'), formato familiar que parece conteúdo, frases replicáveis que podem virar meme ('Deixa que eu faço'). Para prestadores: parceria, respeito e empoderamento.",
  },
  {
    key: 'competitors', label: 'Concorrentes', icon: BookOpen,
    color: 'text-yellow-400', bgColor: 'bg-yellow-400/10 border-yellow-400/20',
    description: 'Comparativos geram conteúdo viral. Nomeie com precisão estratégica.',
    weight: 'medium' as const,
    mockValue: 'GetNinjas & Similares, Parafuzo, Triider, iFood & Rappi (SuperApps).',
  },
  {
    key: 'forbiddenTopics', label: 'Tópicos Proibidos', icon: Shield,
    color: 'text-rose-400', bgColor: 'bg-rose-400/10 border-rose-400/20',
    description: 'Limites claros evitam crises de comunicação. Seja específico.',
    weight: 'high' as const,
    mockValue: "Jargão corporativo ('otimize sua jornada'), promessas vazias ('seja um empreendedor de sucesso'), paternalismo ('vamos te ensinar a trabalhar'), urgência artificial ('ÚLTIMAS VAGAS!'), superlativos vazios ('o melhor do Brasil!'), linguagem complexa ou burocrática.",
  },
  {
    key: 'currentObjective', label: 'Objetivo Atual (30–90 dias)', icon: Zap,
    color: 'text-amber-400', bgColor: 'bg-amber-400/10 border-amber-400/20',
    description: 'O objetivo muda o tipo de conteúdo e o CTA. Seja específico com prazo e número.',
    weight: 'critical' as const,
    mockValue: "Lançamento e operação da marca, com foco na retenção de clientes e prestadores e na criação de um modelo mental de 'cuidar da casa' e 'gerir o negócio'. Conectar quem precisa de serviços com quem sabe fazer, de forma simples, justa e transparente, empoderando prestadores locais e resolvendo problemas do dia a dia dos clientes.",
  },
  {
    key: 'kpis', label: 'KPIs e Metas de Conteúdo', icon: TrendingUp,
    color: 'text-cyan-400', bgColor: 'bg-cyan-400/10 border-cyan-400/20',
    description: 'KPIs guiam o tipo de CTA e o ângulo do conteúdo. Defina metas numéricas.',
    weight: 'medium' as const,
    mockValue: 'Métricas e KPIs detalhados no playbook, incluindo retenção de clientes e prestadores, engajamento, e performance das diversas fontes de receita.',
  },
];

const WEIGHT_LABELS: Record<string, { label: string; color: string }> = {
  critical: { label: 'Crítico', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  high: { label: 'Alto impacto', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  medium: { label: 'Importante', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
};

function SectionCard({ section }: { section: typeof SECTIONS[number] }) {
  const [open, setOpen] = useState(false);
  const filled = section.mockValue.length > 0;
  const Icon = section.icon;
  const weight = WEIGHT_LABELS[section.weight];

  return (
    <div className={cn('rounded-xl border transition-all', filled ? 'border-border bg-surface-elevated' : 'border-border/50 bg-surface-elevated/60')}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', section.bgColor)}>
          <Icon className={cn('h-4 w-4', section.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-text-primary">{section.label}</span>
            <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px] font-bold', weight.color)}>{weight.label}</span>
            {filled && (
              <span className="rounded-full bg-brand/15 px-1.5 py-0.5 text-[9px] font-bold text-brand flex items-center gap-0.5">
                <Check className="h-2.5 w-2.5" /> Preenchido
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-text-muted">{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2.5">
          <div className="flex items-start gap-1.5 rounded-lg bg-surface-hover px-3 py-2">
            <Info className="h-3 w-3 text-text-muted shrink-0 mt-0.5" />
            <p className="text-[11px] text-text-muted leading-relaxed">{section.description}</p>
          </div>
          <div className="rounded-lg bg-surface-hover border border-border/60 px-3 py-3">
            <p className="text-sm text-text-primary leading-relaxed">{section.mockValue}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlaybookSections() {
  const filledCount = SECTIONS.filter(s => s.mockValue.length > 0).length;
  const criticalFilled = SECTIONS.filter(s => s.weight === 'critical' && s.mockValue.length > 0).length;
  const totalCritical = SECTIONS.filter(s => s.weight === 'critical').length;

  return (
    <div className="space-y-3">
      {/* Progress */}
      <div className="text-xs text-text-muted">
        Preenchimento do playbook
        <span className="float-right font-bold text-brand">{Math.round((filledCount / SECTIONS.length) * 100)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-hover overflow-hidden">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(filledCount / SECTIONS.length) * 100}%` }} />
      </div>
      <p className="text-[11px] text-text-muted">
        {filledCount} de {SECTIONS.length} seções preenchidas
        <span className="ml-4 text-emerald-400 font-bold">{criticalFilled}/{totalCritical} críticos ✓</span>
      </p>

      {/* Section Cards */}
      <div className="space-y-2">
        {SECTIONS.map(section => (
          <SectionCard key={section.key} section={section} />
        ))}
      </div>
    </div>
  );
}
