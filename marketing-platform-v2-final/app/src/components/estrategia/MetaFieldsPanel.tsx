import { Brain, RefreshCw, BookMarked, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Mock Meta-Fields Data ── */
const MOCK_META: MetaFields = {
  promptContext: "A marca 'Deixa Que Eu Faço' é uma plataforma de confiança e justiça para prestadores de serviços autônomos e clientes que buscam resolver problemas domésticos. Ela se posiciona como uma alternativa justa e transparente, com comissões baixas (10-15%), pagamento instantâneo via PIX para prestadores, e verificação rigorosa de profissionais. O tom de voz é confiante, justo, empático, resolutivo, empoderador, cotidiano, leve e cúmplice, usando humor de reconhecimento e linguagem familiar. As campanhas devem focar em ativar a raiva contra plataformas injustas, validar o orgulho do ofício, e destacar a simplicidade e o valor imediato do PIX, além de oferecer alívio para a 'lista invisível' de tarefas domésticas. Evitar jargões corporativos, promessas vazias e linguagem complexa. O objetivo atual é o lançamento e operação, com foco na retenção e na criação de um modelo mental de 'cuidar da casa' e 'gerir o negócio'.",
  brandEssence: 'A Plataforma da Confiança e da Justiça que empodera prestadores de serviço autônomos e oferece alívio para quem busca resolver problemas domésticos.',
  uniqueValueProp: 'Conectamos tecnologia avançada com profissionais verificados e pagamentos seguros, garantindo que o prestador receba o valor justo pelo seu trabalho e o cliente tenha confiança, qualidade e alívio das preocupações domésticas.',
  targetPersona: {
    profile: 'Prestadores de serviços autônomos e consumidores urbanos com vida moderna corrida que buscam resolver problemas domésticos de forma eficiente e segura.',
    demographics: 'Brasileiros, 25-50 anos, classe B/C, urbanos, digitalmente ativos',
    digitalBehavior: 'WhatsApp e Instagram como canais primários',
    biggestPain: 'Instabilidade de renda, pagar por leads que não convertem, comissões abusivas, invisibilidade digital (prestadores); Falta de confiança em prestadores, dificuldade de encontrar qualificados, insegurança de pagamento, \'lista invisível\' de tarefas domésticas (clientes).',
    dream: 'Ter trabalho o ano inteiro com pagamento justo e imediato (prestadores); Casa sempre em ordem sem estresse (clientes)',
  },
  toneRules: {
    use: [
      "Ativar a raiva contra plataformas que vendem promessas e entregam frustração",
      "Nomear a dor que o prestador sente mas não sabe articular",
      "Validar o orgulho do ofício e mostrar que o digital é para ele",
      "Focar na prova social de 'par para par'",
      "Destacar a simplicidade e o valor imediato do PIX na hora",
      "Criar urgência em períodos sazonais",
      "Humor baseado em riso de reconhecimento, não piada forçada",
      "Linguagem familiar que parece conteúdo, não publicidade",
      "Frases replicáveis que podem virar memes",
      "Linguagem que gera identificação ('Isso sou eu', 'Me senti atacado')",
      "Linguagem que valida a procrastinação ('Todo mundo é assim')",
      "Para prestadores: parceria, respeito e empoderamento, falando de igual para igual. Ex: 'Você fica com 90%. Nós ficamos com 10%.'",
      "Para clientes: tranquilizador, claro e prático. Ex: 'Encontre profissionais verificados em 3 cliques.'",
    ],
    avoid: [
      'Vender apenas um aplicativo',
      'Fingir que a memória negativa de outras plataformas não existe',
      'Piadas forçadas ou linguagem que não gere identificação',
      "Jargão corporativo ('otimize sua jornada')",
      "Promessas vazias ('seja um empreendedor de sucesso')",
      "Paternalismo ('vamos te ensinar a trabalhar')",
      "Urgência artificial ('ÚLTIMAS VAGAS!')",
      "Superlativos vazios ('o melhor do Brasil!')",
      'Linguagem complexa ou burocrática',
    ],
  },
  keyMessages: [
    'Comissão justa de 10-15%', 'PIX na hora', 'Profissionais verificados',
    'Sem pagar por lead', 'Sua casa, resolvida',
  ],
  painPoints: [
    'Instabilidade de renda e comissões abusivas em outras plataformas para prestadores.',
    'Pagar por leads que não convertem e a invisibilidade digital para prestadores.',
    'Falta de confiança e dificuldade em encontrar profissionais qualificados para clientes.',
    "Insegurança de pagamento e a 'lista invisível' de tarefas domésticas que nunca diminui para clientes.",
  ],
  competitiveEdge: [
    'Comissão significativamente menor (10-15% vs. 25-27% de concorrentes como iFood e GetNinjas).',
    'Pagamento instantâneo no dia do serviço (PIX na hora) vs. 7, 15, 30 dias de espera de concorrentes.',
    'Garantia de não pagar por lead que não converte, ao contrário de plataformas que vendem leads.',
    'Foco na valorização do profissional e na construção de reputação digital, com ferramentas gratuitas para crescimento.',
    'Verificação rigorosa de background e certificações de profissionais para segurança e confiança.',
    'IA avançada para matching inteligente baseado em localização, avaliações e disponibilidade.',
    'Escrow digital e pagamento liberado após confirmação do cliente, com resolução de disputas automatizada.',
    'Modelo de retenção de clientes e prestadores através de design de produto (histórico, favoritos, recorrência, carteira de clientes, capacitação).',
  ],
  forbiddenTopics: [
    "Jargão corporativo ('otimize sua jornada')",
    "Promessas vazias ('seja um empreendedor de sucesso')",
    "Paternalismo ('vamos te ensinar a trabalhar')",
    "Urgência artificial ('ÚLTIMAS VAGAS!')",
    "Superlativos vazios ('o melhor do Brasil!')",
    'Linguagem complexa ou burocrática',
  ],
  currentCampaignFocus: "Lançamento e operação da marca, com foco na retenção e na criação de um modelo mental de 'cuidar da casa' e 'gerir o negócio'.",
  contentAngles: ['Comparativo de comissão', 'PIX na hora', 'Prova social', 'Lista invisível', 'Orgulho do ofício'],
  ctaStyle: 'pronto. resolvido.',
  kpiPriorities: ['Retenção de clientes', 'Retenção de prestadores', 'Engajamento', 'Performance das diversas fontes de receita'],
  completenessScore: 95,
  missingCritical: [],
};

interface MetaFields {
  promptContext: string;
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
  completenessScore: number;
  missingCritical: string[];
}

function MetaTag({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-surface-hover px-3 py-2.5 group cursor-pointer hover:bg-surface-active transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-0.5">{label}</p>
          <p className="text-xs text-text-primary leading-relaxed">{value}</p>
        </div>
        <Copy className="h-3 w-3 text-text-muted group-hover:text-brand shrink-0 mt-0.5 transition-colors" />
      </div>
    </div>
  );
}

function TagList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={i} className="rounded-full border border-border/50 bg-surface-hover px-2.5 py-1 text-[11px] text-text-primary/80">{item}</span>
        ))}
      </div>
    </div>
  );
}

export default function MetaFieldsPanel() {
  const m = MOCK_META;
  const scoreColor = m.completenessScore >= 80 ? 'text-emerald-400' : 'text-amber-400';
  const barColor = m.completenessScore >= 80 ? 'bg-emerald-400' : 'bg-amber-400';

  return (
    <div className="space-y-5">
      {/* Regenerate button */}
      <button className="w-full flex items-center justify-center gap-2 rounded-lg border border-brand/30 bg-brand/5 px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand/10 transition-colors">
        <RefreshCw className="h-4 w-4" /> Regenerar meta-fields da IA
      </button>

      {/* Panel */}
      <div className="rounded-xl border border-brand/20 bg-gradient-to-br from-brand/5 to-transparent p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-brand/15 p-1.5 border border-brand/20">
              <Brain className="h-4 w-4 text-brand" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">Meta-Fields Extraídos pela IA</p>
              <p className="text-[11px] text-text-muted">Alimentam automaticamente campanhas, copies e carrosséis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('text-lg font-black font-mono', scoreColor)}>{m.completenessScore}%</span>
            <button className="rounded-lg border border-border/60 p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Fill from KB */}
        <button className="w-full flex items-center justify-center gap-2 rounded-lg border border-teal/30 bg-teal/5 px-4 py-2.5 text-sm font-semibold text-teal hover:bg-teal/10 transition-colors">
          <BookMarked className="h-4 w-4" /> Preencher campos faltantes com Knowledge Base (IA Pro)
        </button>

        <div className="h-1.5 w-full rounded-full bg-surface-hover overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${m.completenessScore}%` }} />
        </div>

        {/* System Prompt */}
        <div className="rounded-lg border border-brand/15 bg-brand/5 p-3 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand/70">🎯 SYSTEM PROMPT DA MARCA</p>
          <p className="text-xs text-text-primary/90 leading-relaxed">{m.promptContext}</p>
        </div>

        {/* Meta Tags Grid */}
        <div className="grid grid-cols-2 gap-3">
          <MetaTag label="ESSÊNCIA DA MARCA" value={m.brandEssence} />
          <MetaTag label="PROPOSTA DE VALOR ÚNICA" value={m.uniqueValueProp} />
          <MetaTag label="PERSONA" value={m.targetPersona.profile} />
          <MetaTag label="MAIOR DOR" value={m.targetPersona.biggestPain} />
          <MetaTag label="SONHO DO PÚBLICO" value={m.targetPersona.dream} />
          <MetaTag label="FOCO ATUAL DE CAMPANHA" value={m.currentCampaignFocus} />
        </div>

        <TagList label="Dores Mapeadas" items={m.painPoints} />
        <TagList label="Vantagens Competitivas" items={m.competitiveEdge} />
        <TagList label="KPIs Prioritários" items={m.kpiPriorities} />

        {/* Tone Rules */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/70 mb-1.5">✅ TOM — PODE USAR</p>
            <div className="space-y-1">
              {m.toneRules.use.map((r, i) => (
                <p key={i} className="text-[11px] text-text-primary/75 pl-2 border-l border-emerald-400/30">{r}</p>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-400/70 mb-1.5">❌ TOM — PROIBIDO</p>
            <div className="space-y-1">
              {m.toneRules.avoid.map((r, i) => (
                <p key={i} className="text-[11px] text-text-primary/75 pl-2 border-l border-red-400/30">{r}</p>
              ))}
            </div>
          </div>
        </div>

        <TagList label="TÓPICOS PROIBIDOS" items={m.forbiddenTopics} />
      </div>
    </div>
  );
}
